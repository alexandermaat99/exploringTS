import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";

// Define proper interfaces for type safety
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
  user_display_name?: string | null; // Added display name field
  Cars: any; // We'll handle the array/object access with conditional logic
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

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}.${milliseconds.toString().padStart(3, "0")}`;
}
type RouteParams = { id: string };
type PageProps = { params: RouteParams };

export default async function TrackDetailPage({ params }: PageProps) {
  const supabase = await createClient();
  const trackId = parseInt(params.id);

  // Fetch track details
  const { data: track, error: trackError } = await supabase
    .from("Tracks")
    .select("id, track_name")
    .eq("id", trackId)
    .single();

  if (trackError || !track) {
    return notFound();
  }

  // Fetch configurations for this track
  const { data: configs, error: configError } = await supabase
    .from("Track Config")
    .select("id, config_name")
    .eq("track_id", trackId)
    .order("id");

  if (configError) {
    console.error("Error fetching configurations:", configError.message);
    return (
      <div className="text-red-500">Failed to load track configurations.</div>
    );
  }

  // For each configuration, fetch lap times
  const configsWithTimes: TrackConfig[] = await Promise.all(
    configs.map(async (config) => {
      const { data: times, error: timesError } = await supabase
        .from("Track Times")
        .select(
          `
          id,
          lap_record,
          user_id,
          car_id,
          Cars!car_id (
            car_name
          )
        `
        )
        .eq("config_id", config.id)
        .order("lap_record", { ascending: true });

      if (timesError) {
        console.error(
          `Error fetching times for config ${config.id}:`,
          timesError.message
        );
        return { ...config, times: [] };
      }

      // Fetch user info for each time record
      const timesWithUserInfo = await Promise.all(
        times.map(async (time) => {
          let userDisplayName = null;
          let userEmail = null;

          if (time.user_id) {
            // Get display name
            const { data: displayNameData } = await supabase.rpc(
              "get_user_display_name",
              { user_id: time.user_id }
            );

            // Get email as fallback
            const { data: emailData } = await supabase.rpc("get_user_email", {
              user_id: time.user_id,
            });

            userDisplayName = displayNameData;
            userEmail = emailData;
          }

          // Return a new object with all properties including user info
          return {
            id: time.id,
            lap_record: time.lap_record,
            user_id: time.user_id,
            car_id: time.car_id,
            Cars: time.Cars,
            user_email: userEmail,
            user_display_name: userDisplayName,
          } as LapTimeRecord;
        })
      );

      return {
        id: config.id,
        config_name: config.config_name,
        times: timesWithUserInfo,
      };
    })
  );

  return (
    <div className="flex flex-col gap-8 p-4">
      <Link href="/">
        <button className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
          &lt; Back
        </button>
      </Link>
      <h1 className="text-3xl font-bold">{track.track_name}</h1>
      <div className="flex items-center gap-4"></div>

      {configsWithTimes.length > 0 ? (
        <div className="space-y-8">
          {configsWithTimes.map((config) => (
            <div key={config.id} className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-semibold mb-4">
                {config.config_name}
              </h2>

              {config.times.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Position
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Lap Time
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Driver
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Car
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {config.times.map((time, index) => (
                        <tr key={time.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            #{index + 1}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {secondsToTimeString(time.lap_record)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {/* Show display name with fallbacks */}
                            {time.user_display_name ||
                              time.user_email ||
                              time.user_id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {/* Handle Cars being either an array or object */}
                            {Array.isArray(time.Cars) && time.Cars.length > 0
                              ? time.Cars[0].car_name
                              : time.Cars?.car_name}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500">
                  No lap times recorded for this configuration.
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p>No configurations found for this track.</p>
      )}
    </div>
  );
}
