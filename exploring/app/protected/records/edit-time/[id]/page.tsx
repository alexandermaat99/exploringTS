import { createClient } from "@/utils/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import TrackAndConfigSelection from "../../add-time/TrackAndConfigSelection";

// Define types for dropdown options
type Car = { id: number; car_name: string };
type Track = { id: number; track_name: string };
type TrackConfig = { id: number; config_name: string; track_id: number };

export default async function EditTrackTimePage({ params }: any) {
  const supabase = await createClient();
  const recordId = parseInt(params.id);

  // Get the current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // Fetch the track time record
  const { data: record, error } = await supabase
    .from("Track Times")
    .select(
      `
    id,
    user_id,
    car_id,
    config_id,
    lap_record,
    Cars!car_id(car_name),
    "Track Config"!config_id(
      config_name,
      track_id,
      Tracks!track_id(track_name)
    )
  `
    )
    .eq("id", recordId)
    .single();

  if (error || !record) {
    return notFound();
  }

  // Check if the current user is the owner of this record
  if (record.user_id !== user.id) {
    // Unauthorized - redirect to records page
    redirect("/protected/records");
  }

  // Format lap time from seconds to HH:MM:SS.ms
  const formattedLapTime = secondsToTimeString(record.lap_record);

  // Fetch all cars, tracks, and configurations for dropdowns
  const { data: cars } = await supabase
    .from("Cars")
    .select("id, car_name")
    .order("car_name");

  const { data: tracks } = await supabase
    .from("Tracks")
    .select("id, track_name")
    .order("track_name");

  const { data: trackConfigs } = await supabase
    .from("Track Config")
    .select("id, config_name, track_id")
    .order("id");

  return (
    <div className="max-w-2xl mx-auto p-6 dark:bg-slate-700 bg-white rounded-lg shadow-md">
      <h1 className="text-3xl font-bold mb-6">Edit Track Time</h1>

      <form action={updateTrackTime} className="space-y-6">
        {/* Hidden input for record ID */}
        <input type="hidden" name="id" value={record.id} />

        {/* Car Selection */}
        <div>
          <label
            htmlFor="car_id"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Car
          </label>
          <select
            id="car_id"
            name="car_id"
            required
            defaultValue={record.car_id}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select a Car</option>
            {cars?.map((car) => (
              <option key={car.id} value={car.id}>
                {car.car_name}
              </option>
            ))}
          </select>
        </div>

        {/* Track and Config Selection Component */}
        <TrackAndConfigSelection
          tracks={tracks || []}
          trackConfigs={trackConfigs || []}
          defaultTrackId={
            (record["Track Config"] as unknown as { track_id?: number })
              ?.track_id
          }
          defaultConfigId={record.config_id}
        />

        {/* Lap Time Input */}
        <div>
          <label
            htmlFor="lap_time"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Lap Time (HH:MM:SS.ms)
          </label>
          <input
            type="text"
            id="lap_time"
            name="lap_time"
            required
            defaultValue={formattedLapTime}
            placeholder="00:01:23.456"
            pattern="[0-9]{2}:[0-9]{2}:[0-9]{2}.[0-9]{1,3}"
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="mt-1 text-sm text-gray-500">
            Format: Hours:Minutes:Seconds.Milliseconds (e.g., 00:01:23.456)
          </p>
        </div>

        {/* Submit and Cancel Buttons */}
        <div className="flex gap-4">
          <button
            type="submit"
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition duration-200"
          >
            Update Track Time
          </button>

          <Link href="/protected/records">
            <button
              type="button"
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded transition duration-200"
            >
              Cancel
            </button>
          </Link>
        </div>
      </form>
    </div>
  );
}

// Server action for form submission
async function updateTrackTime(formData: FormData) {
  "use server";

  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("You must be logged in to update track times");
  }

  // Extract form data
  const recordId = parseInt(formData.get("id") as string);
  const carId = parseInt(formData.get("car_id") as string);
  const configId = parseInt(formData.get("config_id") as string);
  const lapTimeStr = formData.get("lap_time") as string;

  // Convert HH:MM:SS.ms to seconds (float)
  const lapTimeFloat = convertTimeStringToSeconds(lapTimeStr);

  // Verify ownership
  const { data: record } = await supabase
    .from("Track Times")
    .select("user_id")
    .eq("id", recordId)
    .single();

  if (!record || record.user_id !== user.id) {
    throw new Error("Unauthorized: You can only edit your own records");
  }

  // Update the track time
  const { error } = await supabase
    .from("Track Times")
    .update({
      car_id: carId,
      config_id: configId,
      lap_record: lapTimeFloat,
    })
    .eq("id", recordId);

  if (error) {
    console.error("Error updating track time:", error);
    throw new Error(error.message);
  }

  // Redirect to records page on success
  redirect("/protected/records");
}

// Utility function to convert time string to seconds
function convertTimeStringToSeconds(timeString: string): number {
  // Parse HH:MM:SS.ms format to seconds
  const [hourMinSec, ms] = timeString.split(".");
  const [hours, minutes, seconds] = hourMinSec.split(":").map(Number);

  // Calculate total seconds
  const totalSeconds = hours * 3600 + minutes * 60 + seconds;

  // Add milliseconds if present
  const milliseconds = ms ? Number(ms) / 1000 : 0;

  return totalSeconds + milliseconds;
}

// Utility function to convert seconds to time string
function secondsToTimeString(totalSeconds: number): string {
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
