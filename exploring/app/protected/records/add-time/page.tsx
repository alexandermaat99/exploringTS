import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import TrackAndConfigSelection from "./TrackAndConfigSelection";

// Define types for dropdown options
type Car = { id: number; car_name: string };
type Track = { id: number; track_name: string };
type TrackConfig = { id: number; config_name: string; track_id: number };

export default async function AddTrackTimePage() {
  // Create Supabase client
  const supabase = await createClient();

  // Fetch cars for dropdown
  const { data: cars } = await supabase
    .from("Cars")
    .select("id, car_name")
    .order("car_name");

  // Fetch tracks for dropdown
  const { data: tracks } = await supabase
    .from("Tracks")
    .select("id, track_name")
    .order("track_name");

  // Fetch track configurations for dropdown
  const { data: trackConfigs } = await supabase
    .from("Track Config")
    .select("id, config_name, track_id")
    .order("config_name");

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-3xl font-bold mb-6">Add New Track Time</h1>

      <form action={addTrackTime} className="space-y-6">
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
            Add Track Time
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
async function addTrackTime(formData: FormData) {
  "use server";

  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("You must be logged in to add track times");
  }

  // Extract form data
  const carId = parseInt(formData.get("car_id") as string);
  const configId = parseInt(formData.get("config_id") as string);
  const lapTimeStr = formData.get("lap_time") as string;

  // Convert HH:MM:SS.ms to seconds (float)
  const lapTimeFloat = convertTimeStringToSeconds(lapTimeStr);

  // Insert new track time
  const { error } = await supabase.from("Track Times").insert({
    user_id: user.id,
    car_id: carId,
    config_id: configId,
    lap_record: lapTimeFloat,
  });

  if (error) {
    console.error("Error adding track time:", error);
    throw new Error(error.message);
  }

  // Redirect to track times list on success
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
