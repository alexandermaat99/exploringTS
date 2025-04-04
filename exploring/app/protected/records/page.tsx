import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import DeleteButton from "@/components/DeleteButton"; // Update with correct path

type TrackTime = {
  id: number;
  created_at: string;
  lap_record: number | null;
  user_id: string | null;
  user_email?: string | null;
  user_display_name?: string | null; // Add this line
  Cars: {
    car_name: string;
  } | null;
  "Track Config": {
    config_name: string;
    Tracks: {
      track_name: string;
    } | null;
  } | null;
};

export default async function RecordsPage() {
  const supabase = await createClient();

  // Get the current logged-in user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch track times with joined data
  const { data, error } = await supabase
    .from("Track Times")
    .select(
      `
      id,
      created_at,
      lap_record,
      user_id,
      Cars!car_id (
        car_name
      ),
      "Track Config"!config_id (
        config_name,
        Tracks!track_id (
          track_name
        )
      )
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching track times:", error.message);
    return (
      <div className="text-red-500">
        Failed to load track times: {error.message}
      </div>
    );
  }

  // Cast data to the correct type
  const records = data as unknown as TrackTime[];

  // Fetch user display names using the RPC function
  if (records && records.length > 0) {
    const userInfoPromises = records.map(async (record) => {
      if (record.user_id) {
        // Get display name
        const { data: displayNameData, error: displayNameError } =
          await supabase.rpc("get_user_display_name", {
            user_id: record.user_id,
          });

        // Get email as fallback
        const { data: emailData, error: emailError } = await supabase.rpc(
          "get_user_email",
          { user_id: record.user_id }
        );

        // Set display name, with email as fallback, with user_id as final fallback
        record.user_display_name =
          displayNameData || emailData || record.user_id;
      }
      return record;
    });

    // Wait for all promises to resolve
    await Promise.all(userInfoPromises);
  }

  return (
    <div className="flex flex-col gap-8 p-4">
      <h1 className="text-3xl font-bold">Track Times</h1>
      <Link href="/protected/records/add-time">
        <button className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
          Add New Track Time
        </button>
      </Link>

      {records && records.length > 0 ? (
        <ul className="space-y-4">
          {records.map((record) => (
            <li
              key={record.id}
              className="p-4 border rounded-md shadow-sm bg-white flex justify-between items-center"
            >
              <div>
                <h2 className="text-xl font-semibold">
                  Driver:{" "}
                  {record.user_display_name ||
                    record.user_email ||
                    record.user_id}
                </h2>
                <h2 className="text-xl font-semibold">
                  Car: {record.Cars?.car_name}
                </h2>
                <h2 className="text-xl font-semibold">
                  Track: {record["Track Config"]?.Tracks?.track_name}
                </h2>
                <h2 className="text-xl font-semibold">
                  Configuration: {record["Track Config"]?.config_name}
                </h2>
                <h2 className="text-xl font-semibold">
                  Lap Record: {secondsToTimeString(record.lap_record)}
                </h2>
              </div>

              {/* Only show Edit/Delete buttons if current user is the record owner */}
              {user && record.user_id === user.id && (
                <div className="flex gap-2">
                  <Link href={`/protected/records/edit-time/${record.id}`}>
                    <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                      Edit
                    </button>
                  </Link>

                  {/* Use the client component for delete button */}
                  <DeleteButton
                    recordId={record.id}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p>No Track Times found in the database.</p>
      )}
    </div>
  );
}

// Server action for deleting a track time
async function deleteTrackTime(formData: FormData) {
  "use server";

  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("You must be logged in to delete track times");
  }

  // Extract record ID
  const recordId = parseInt(formData.get("id") as string);

  // Verify ownership
  const { data: record } = await supabase
    .from("Track Times")
    .select("user_id")
    .eq("id", recordId)
    .single();

  if (!record || record.user_id !== user.id) {
    throw new Error("Unauthorized: You can only delete your own records");
  }

  // Delete the record
  const { error } = await supabase
    .from("Track Times")
    .delete()
    .eq("id", recordId);

  if (error) {
    console.error("Error deleting track time:", error);
    throw new Error(error.message);
  }
}

// Utility function to convert seconds to time string
function secondsToTimeString(totalSeconds: number | null): string {
  if (totalSeconds === null) return "00:00:00.000";

  // Calculate hours, minutes, seconds
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  // Calculate milliseconds (get decimal part)
  const milliseconds = Math.round(
    (totalSeconds - Math.floor(totalSeconds)) * 1000
  );

  // Format the time string (HH:MM:SS.ms)
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}.${milliseconds.toString().padStart(3, "0")}`;
}
// No redirect needed as form submission will refresh the page
