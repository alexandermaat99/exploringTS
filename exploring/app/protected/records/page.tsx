import Link from "next/link";
import { Suspense } from "react";
import { cache } from "react";
import { createClient } from "@/utils/supabase/server";
import DeleteButton from "@/components/DeleteButton";

// Updated type definition to match the actual data structure
interface track_times {
  id: number;
  created_at: string;
  lap_record: number | null;
  user_id: string | null;
  // Handle both array and single object cases
  cars: { car_name: string }[] | { car_name: string } | null;
  track_configs:
    | {
        config_name: string;
        tracks: { track_name: string }[] | { track_name: string } | null;
      }[]
    | {
        config_name: string;
        tracks: { track_name: string }[] | { track_name: string } | null;
      }
    | null;
  user_display_name?: string | null;
  user_email?: string | null;
}

// Helper functions for safer property access
function getCarName(record: track_times): string | null {
  if (!record.cars) return null;
  if (Array.isArray(record.cars)) {
    return record.cars.length > 0 ? record.cars[0].car_name : null;
  }
  return record.cars.car_name;
}

function getTrackName(record: track_times): string | null {
  if (!record["track_configs"]) return null;
  const config = Array.isArray(record["track_configs"])
    ? record["track_configs"][0]
    : record["track_configs"];
  if (!config?.tracks) return null;
  return Array.isArray(config.tracks)
    ? config.tracks.length > 0
      ? config.tracks[0].track_name
      : null
    : config.tracks.track_name;
}

function getConfigName(record: track_times): string | null {
  if (!record["track_configs"]) return null;
  return Array.isArray(record["track_configs"])
    ? record["track_configs"].length > 0
      ? record["track_configs"][0].config_name
      : null
    : record["track_configs"].config_name;
}

// Utility function to format lap time
function secondsToTimeString(totalSeconds: number | null): string {
  if (totalSeconds === null) return "00:00.000";

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const milliseconds = Math.round(
    (totalSeconds - Math.floor(totalSeconds)) * 1000
  );

  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}.${milliseconds.toString().padStart(3, "0")}`;
}

// Helper functions remain the same...
function extractCarName(cars: any): string {
  if (!cars) return "Unknown Car";
  if (Array.isArray(cars)) {
    return cars.length > 0 ? cars[0].car_name || "Unknown Car" : "Unknown Car";
  }
  return cars.car_name || "Unknown Car";
}

function extractTrackInfo(trackConfigs: any): {
  configName: string;
  trackName: string;
} {
  if (!trackConfigs) {
    return { configName: "Unknown Config", trackName: "Unknown Track" };
  }

  let config = Array.isArray(trackConfigs) ? trackConfigs[0] : trackConfigs;
  if (!config) {
    return { configName: "Unknown Config", trackName: "Unknown Track" };
  }

  const configName = config.config_name || "Unknown Config";
  const tracks = config.tracks;

  let trackName = "Unknown Track";
  if (tracks) {
    if (Array.isArray(tracks)) {
      trackName = tracks.length > 0 ? tracks[0].track_name : "Unknown Track";
    } else {
      trackName = tracks.track_name || "Unknown Track";
    }
  }

  return { configName, trackName };
}

function formatLapTime(lapTime: number | null): string {
  if (lapTime === null) return "--";
  const minutes = Math.floor(lapTime / 60);
  const seconds = (lapTime % 60).toFixed(3);
  return `${minutes}:${seconds.padStart(6, "0")}`;
}

// OPTIMIZED: Single batched query instead of N+1 individual queries
const getTrackTimes = cache(async () => {
  const supabase = await createClient();

  // Get all track times with related data in a single query
  const { data: trackTimes, error } = await supabase
    .from("track_times")
    .select(
      `
      id,
      created_at,
      lap_record,
      user_id,
      cars!car_id (
        car_name
      ),
      "track_configs"!config_id (
        config_name,
        tracks!track_id (
          track_name
        )
      )
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching track times:", error.message);
    throw new Error(`Failed to load track times: ${error.message}`);
  }

  // OPTIMIZED: Batch query for all user profiles in one request
  const uniqueUserIds = Array.from(
    new Set(trackTimes.map((time) => time.user_id).filter(Boolean))
  );

  if (uniqueUserIds.length === 0) {
    return trackTimes as unknown as track_times[];
  }

  // Single query to get all user profiles
  const { data: userProfiles } = await supabase
    .from("user_profiles")
    .select("id, display_name")
    .in("id", uniqueUserIds);

  // Create a map for O(1) lookups
  const userProfileMap = new Map(
    userProfiles?.map((profile) => [profile.id, profile.display_name]) || []
  );

  // OPTIMIZED: Batch query for user emails as fallback
  const missingProfileUserIds = uniqueUserIds.filter(
    (id) => !userProfileMap.has(id)
  );
  let userEmailMap = new Map<string, string>();

  if (missingProfileUserIds.length > 0) {
    const { data: userEmails } = await supabase.rpc("get_user_emails_batch", {
      user_ids: missingProfileUserIds,
    });

    if (userEmails) {
      userEmailMap = new Map(
        userEmails.map((item: { user_id: string; email: string }) => [
          item.user_id,
          item.email,
        ])
      );
    }
  }

  // Add display names to track times using the maps
  const trackTimesWithUsers = trackTimes.map((time) => {
    let displayName = null;

    if (time.user_id) {
      displayName =
        userProfileMap.get(time.user_id) ||
        userEmailMap.get(time.user_id) ||
        `User ${time.user_id.substring(0, 8)}...`;
    }

    return {
      ...time,
      user_display_name: displayName,
    };
  });

  return trackTimesWithUsers as unknown as track_times[];
});

// Get current user
const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
});

// Main component
export default async function RecordsPage() {
  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-8">
      <h1 className="text-xl sm:text-3xl font-bold">Track Times</h1>
      <Link
        href="/protected/records/add-time"
        className="block w-full sm:w-auto"
      >
        <button className="w-full sm:w-auto px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
          Add New Track Time
        </button>
      </Link>

      <Suspense fallback={<LoadingTable />}>
        <RecordsTable />
      </Suspense>
    </div>
  );
}

// Loading component
function LoadingTable() {
  return (
    <div className="space-y-3 sm:space-y-4">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="animate-pulse p-3 sm:p-4 border rounded-md bg-gray-100 dark:bg-gray-800"
        >
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      ))}
    </div>
  );
}

// Records table component
async function RecordsTable() {
  const trackTimes = await getTrackTimes();
  const currentUser = await getCurrentUser();

  return (
    <div className="space-y-3 sm:space-y-4">
      {trackTimes.map((time) => {
        const trackConfig = Array.isArray(time.track_configs)
          ? time.track_configs[0]
          : time.track_configs;
        const car = Array.isArray(time.cars) ? time.cars[0] : time.cars;
        const tracks = trackConfig?.tracks;
        const trackName = Array.isArray(tracks)
          ? tracks[0]?.track_name
          : tracks?.track_name;

        return (
          <div
            key={time.id}
            className="p-3 sm:p-4 border rounded-md shadow-sm dark:bg-slate-700 bg-white flex flex-col sm:flex-row gap-3 sm:gap-4"
          >
            <div className="flex-grow space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                <h3 className="text-lg sm:text-xl font-semibold break-words">
                  {trackName}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {trackConfig?.config_name}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm">
                  <span className="font-medium">Driver:</span>{" "}
                  {time.user_display_name || "Unknown"}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Time:</span>{" "}
                  {secondsToTimeString(time.lap_record)}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Car:</span> {car?.car_name}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {new Date(time.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            {currentUser?.id === time.user_id && (
              <div className="flex flex-col sm:flex-row gap-2">
                <Link
                  href={`/protected/records/edit-time/${time.id}`}
                  className="w-full sm:w-auto"
                >
                  <button className="w-full sm:w-auto px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                    Edit
                  </button>
                </Link>
                <DeleteButton
                  recordId={time.id}
                  className="w-full sm:w-auto px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
