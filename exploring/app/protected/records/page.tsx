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
  if (!record.cars?.length) return null;
  return record.cars[0].car_name;
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

// Cached data fetching for track times
const getTrackTimes = cache(async () => {
  const supabase = await createClient();

  // First get all track times with related data
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

  // Get user display names for all unique user IDs
  const userIds = Array.from(new Set(trackTimes.map((time) => time.user_id)));
  const userDisplayNames = new Map<string, string>();

  await Promise.all(
    userIds.map(async (userId) => {
      if (!userId) return;

      const { data: displayName } = await supabase.rpc(
        "get_user_display_name",
        {
          user_id: userId,
        }
      );

      if (!displayName) {
        const { data: email } = await supabase.rpc("get_user_email", {
          user_id: userId,
        });
        userDisplayNames.set(
          userId,
          email || `User ${userId.substring(0, 8)}...`
        );
      } else {
        userDisplayNames.set(userId, displayName);
      }
    })
  );

  // Add display names to track times
  const trackTimesWithUsers = trackTimes.map((time) => ({
    ...time,
    user_display_name: time.user_id ? userDisplayNames.get(time.user_id) : null,
  }));

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
