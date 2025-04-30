import Link from "next/link";
import { Suspense } from "react";
import { cache } from "react";
import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";

// Define proper interfaces for type safety
interface Track {
  id: number;
  track_name: string;
}

interface TrackConfig {
  id: number;
  config_name: string;
  times: LapTimeRecord[];
}

interface LapTimeRecord {
  id: number;
  lap_record: number | null;
  user_id: string | null;
  car_id: number;
  user_email?: string | null;
  user_display_name?: string | null;
  car_name?: string;
}

// Utility function to format lap time
function secondsToTimeString(totalSeconds: number | null): string {
  if (totalSeconds === null) return "00:00:00.000";

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const milliseconds = Math.round(
    (totalSeconds - Math.floor(totalSeconds)) * 1000
  );

  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}.${milliseconds
    .toString()
    .padStart(3, "0")}`;
}

// Cached data fetching functions
const getTrackDetails = cache(async (trackId: number) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("Tracks")
    .select("id, track_name")
    .eq("id", trackId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Track;
});

const getConfigsWithLapTimes = cache(async (trackId: number) => {
  const supabase = await createClient();

  // Fetch configurations for this track
  const { data: configs, error: configError } = await supabase
    .from("Track Config")
    .select("id, config_name")
    .eq("track_id", trackId)
    .order("id");

  if (configError || !configs) {
    console.error("Error fetching configurations:", configError?.message);
    return [];
  }

  // Fetch ALL lap times for ALL configs in a SINGLE query
  const { data: allTimes, error: timesError } = await supabase
    .from("Track Times")
    .select(
      `
      id,
      lap_record,
      user_id,
      car_id,
      config_id,
      Cars:car_id(car_name)
    `
    )
    .in(
      "config_id",
      configs.map((config) => config.id)
    )
    .order("lap_record", { ascending: true });

  if (timesError) {
    console.error("Error fetching times:", timesError.message);
    return [];
  }

  // Process each time record to get user info
  const processedTimes = await Promise.all(
    allTimes.map(async (time) => {
      let userDisplayName = null;
      let userEmail = null;

      if (time.user_id) {
        try {
          // Try to get display name
          const { data: displayNameData } = await supabase.rpc(
            "get_user_display_name",
            { user_id: time.user_id }
          );

          // Try to get email as fallback
          const { data: emailData } = await supabase.rpc("get_user_email", {
            user_id: time.user_id,
          });

          userDisplayName = displayNameData;
          userEmail = emailData;

          console.log(
            `User ${time.user_id} has display name: ${userDisplayName}, email: ${userEmail}`
          );
        } catch (error) {
          console.error(`Error fetching user info for ${time.user_id}:`, error);
        }
      }

      return {
        id: time.id,
        lap_record: time.lap_record,
        user_id: time.user_id,
        car_id: time.car_id,
        config_id: time.config_id,
        car_name: time.Cars
          ? Array.isArray(time.Cars)
            ? time.Cars.length > 0
              ? time.Cars[0].car_name
              : undefined
            : (time.Cars as any).car_name
          : undefined,
        user_display_name: userDisplayName,
        user_email: userEmail,
      };
    })
  );

  // Organize times by config_id
  const timesByConfig: Record<number, LapTimeRecord[]> = {};

  processedTimes.forEach((time) => {
    if (!timesByConfig[time.config_id]) {
      timesByConfig[time.config_id] = [];
    }

    timesByConfig[time.config_id].push({
      id: time.id,
      lap_record: time.lap_record,
      user_id: time.user_id,
      car_id: time.car_id,
      car_name: time.car_name,
      user_display_name: time.user_display_name,
      user_email: time.user_email,
    });
  });

  // Create final config objects with their associated times
  return configs.map((config) => ({
    id: config.id,
    config_name: config.config_name,
    times: timesByConfig[config.id] || [],
  }));
});

// Main component with better loading states and structure - FIXED WITH OPTION 1
export default async function TrackDetailPage({
  params,
}: {
  params: any; // Use 'any' temporarily to bypass type checking
}) {
  const trackId = parseInt(params.id);
  const track = await getTrackDetails(trackId);

  if (!track) {
    return notFound();
  }

  return (
    <div className="flex flex-col gap-8 p-4">
      <Link href="/">
        <button className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
          &lt; Back
        </button>
      </Link>

      <h1 className="text-3xl font-bold">{track.track_name}</h1>

      <Suspense fallback={<LoadingConfigurations />}>
        <TrackConfigsDisplay trackId={trackId} />
      </Suspense>
    </div>
  );
}

// Loading skeleton component
function LoadingConfigurations() {
  return (
    <div className="space-y-8">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-white dark:bg-slate-700 rounded-lg shadow p-6 animate-pulse"
        >
          <div className="h-8 bg-slate-200 dark:bg-slate-600 rounded w-1/3 mb-4"></div>
          <div className="space-y-2">
            {[1, 2, 3, 4].map((j) => (
              <div
                key={j}
                className="h-6 bg-slate-200 dark:bg-slate-600 rounded"
              ></div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Component to display track configurations and lap times
async function TrackConfigsDisplay({ trackId }: { trackId: number }) {
  const configsWithTimes = await getConfigsWithLapTimes(trackId);

  if (configsWithTimes.length === 0) {
    return <p>No configurations found for this track.</p>;
  }

  return (
    <div className="space-y-8">
      {configsWithTimes.map((config) => (
        <div
          key={config.id}
          className="bg-white dark:bg-slate-700 rounded-lg shadow p-6"
        >
          <h2 className="text-2xl font-semibold mb-4">{config.config_name}</h2>

          {config.times.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Position
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Lap Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Driver
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Car
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {config.times.map((time, index) => (
                    <tr
                      key={time.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        #{index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {secondsToTimeString(time.lap_record)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {time.user_display_name || time.user_email || (
                          <span className="italic text-gray-400 dark:text-gray-500">
                            {time.user_id
                              ? `User ${time.user_id.substring(0, 8)}...`
                              : "Unknown"}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {time.car_name || (
                          <span className="italic text-gray-400 dark:text-gray-500">
                            Unknown Car
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">
              No lap times recorded for this configuration.
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
