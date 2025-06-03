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
  return Array.isArray(record.cars)
    ? record.cars.length > 0
      ? record.cars[0].car_name
      : null
    : record.cars.car_name;
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

  const { data, error } = await supabase
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

  return data as unknown as track_times[];
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
    <div className="flex flex-col gap-8 p-4">
      <h1 className="text-3xl font-bold">Track Times</h1>
      <Link href="/protected/records/add-time">
        <button className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
          Add New Track Time
        </button>
      </Link>

      <Suspense fallback={<LoadingTable />}>
        <RecordsTable />
      </Suspense>
    </div>
  );
}

// Loading skeleton component
function LoadingTable() {
  return (
    <div className="overflow-x-auto w-full animate-pulse">
      <table className="min-w-full divide-y divide-gray-200 shadow-sm">
        <thead className="bg-gray-50 dark:bg-slate-400">
          <tr>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <th key={i} className="px-6 py-3">
                <div className="h-4 bg-gray-200 dark:bg-slate-500 rounded w-20"></div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y dark:bg-slate-700 divide-gray-200">
          {[1, 2, 3, 4, 5].map((row) => (
            <tr key={row}>
              {[1, 2, 3, 4, 5, 6].map((col) => (
                <td key={col} className="px-6 py-4">
                  <div className="h-4 bg-gray-200 dark:bg-slate-500 rounded w-24"></div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Component to display the records table
async function RecordsTable() {
  // Fetch track times and current user in parallel
  const [records, currentUser] = await Promise.all([
    getTrackTimes(),
    getCurrentUser(),
  ]);

  if (!records || records.length === 0) {
    return <p>No Track Times found in the database.</p>;
  }

  // Get a list of all user IDs (filtering out null values and duplicates)
  const userIds = Array.from(
    new Set(
      records
        .filter((record) => record.user_id !== null)
        .map((record) => record.user_id!)
    )
  );

  // Get user information for each record
  const supabase = await createClient();
  const enhancedRecords = [...records]; // Create a copy of records to modify

  // Use Promise.all to process all records in parallel
  await Promise.all(
    enhancedRecords.map(async (record, index) => {
      if (!record.user_id) return; // Skip if no user ID

      try {
        // Get display name (use the direct approach that worked in your original code)
        const { data: displayName } = await supabase.rpc(
          "get_user_display_name",
          { user_id: record.user_id }
        );

        // Get email as fallback
        const { data: email } = await supabase.rpc("get_user_email", {
          user_id: record.user_id,
        });

        // Update the record directly
        enhancedRecords[index].user_display_name = displayName;
        enhancedRecords[index].user_email = email;

        console.log(
          `User ${record.user_id} has display name: ${displayName} and email: ${email}`
        );
      } catch (error) {
        console.error(`Error fetching user info for ${record.user_id}:`, error);
      }
    })
  );

  return (
    <div className="overflow-x-auto w-full">
      <table className="min-w-full divide-y divide-gray-200 shadow-sm">
        <thead className="bg-gray-50 dark:bg-slate-400">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Driver
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Car
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Track
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Configuration
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Lap Record
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y dark:bg-slate-700 divide-gray-200">
          {enhancedRecords.map((record) => (
            <tr
              key={record.id}
              className="hover:bg-gray-50 dark:hover:bg-slate-800"
            >
              <td className="px-6 py-4 whitespace-nowrap">
                {record.user_display_name || record.user_email || (
                  <span className="italic text-gray-400">
                    {record.user_id
                      ? `User ${record.user_id.substring(0, 8)}...`
                      : "Unknown"}
                  </span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {getCarName(record) || (
                  <span className="italic text-gray-400">Unknown</span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {getTrackName(record) || (
                  <span className="italic text-gray-400">Unknown</span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {getConfigName(record) || (
                  <span className="italic text-gray-400">Unknown</span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {secondsToTimeString(record.lap_record)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {currentUser && record.user_id === currentUser.id && (
                  <div className="flex gap-2">
                    <Link href={`/protected/records/edit-time/${record.id}`}>
                      <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                        Edit
                      </button>
                    </Link>
                    <DeleteButton
                      recordId={record.id}
                      className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                    />
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
