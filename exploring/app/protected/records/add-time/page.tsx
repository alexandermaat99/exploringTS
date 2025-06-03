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

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // Get current user's league
  const { data: currentUserProfile } = await supabase
    .from("user_profiles")
    .select("league_id")
    .eq("id", user.id)
    .single();

  // Get all users from the same league
  const { data: leagueUsers } = await supabase
    .from("user_profiles")
    .select("id, display_name")
    .eq("league_id", currentUserProfile?.league_id)
    .order("display_name");

  // Fetch cars for dropdown
  const { data: cars } = await supabase
    .from("cars")
    .select("id, car_name")
    .order("car_name");

  // Fetch tracks for dropdown
  const { data: tracks } = await supabase
    .from("tracks")
    .select("id, track_name")
    .order("track_name");

  // Fetch track configurations for dropdown
  const { data: trackConfigs } = await supabase
    .from("track_configs")
    .select("id, config_name, track_id")
    .order("config_name");

  return (
    <div className="max-w-2xl mx-auto p-6 dark:bg-slate-700 bg-white rounded-lg shadow-md">
      <h1 className="text-3xl font-bold mb-6">Add New Track Time</h1>

      <form action={addTrackTime} className="space-y-6">
        {/* Driver Selection */}
        <div>
          <label
            htmlFor="user_id"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Driver
          </label>
          <select
            id="user_id"
            name="user_id"
            required
            defaultValue={user.id}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            {leagueUsers?.map((leagueUser) => (
              <option key={leagueUser.id} value={leagueUser.id}>
                {leagueUser.display_name ||
                  `User ${leagueUser.id.substring(0, 8)}...`}
              </option>
            ))}
          </select>
        </div>

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
            htmlFor="lap_time_minutes"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Lap Time
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <input
                type="number"
                id="lap_time_minutes"
                name="lap_time_minutes"
                required
                min="0"
                max="59"
                placeholder="00"
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-center"
              />
              <p className="mt-1 text-xs text-gray-500 text-center">Minutes</p>
            </div>
            <span className="text-xl font-bold">:</span>
            <div className="flex-1">
              <input
                type="number"
                id="lap_time_seconds"
                name="lap_time_seconds"
                required
                min="0"
                max="59"
                placeholder="00"
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-center"
              />
              <p className="mt-1 text-xs text-gray-500 text-center">Seconds</p>
            </div>
            <span className="text-xl font-bold">.</span>
            <div className="flex-1">
              <input
                type="number"
                id="lap_time_ms"
                name="lap_time_ms"
                required
                min="0"
                max="999"
                placeholder="000"
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-center"
              />
              <p className="mt-1 text-xs text-gray-500 text-center">
                Milliseconds
              </p>
            </div>
          </div>
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
  const userId = formData.get("user_id") as string;
  const carId = parseInt(formData.get("car_id") as string);
  const configId = parseInt(formData.get("config_id") as string);

  // Verify the selected user is in the same league as the current user
  const { data: currentUserProfile } = await supabase
    .from("user_profiles")
    .select("league_id")
    .eq("id", user.id)
    .single();

  const { data: selectedUserProfile } = await supabase
    .from("user_profiles")
    .select("league_id")
    .eq("id", userId)
    .single();

  if (currentUserProfile?.league_id !== selectedUserProfile?.league_id) {
    throw new Error("You can only add times for drivers in your league");
  }

  // Get time components
  const minutes = parseInt(formData.get("lap_time_minutes") as string) || 0;
  const seconds = parseInt(formData.get("lap_time_seconds") as string) || 0;
  const milliseconds = parseInt(formData.get("lap_time_ms") as string) || 0;

  // Convert to total seconds
  const lapTimeFloat = minutes * 60 + seconds + milliseconds / 1000;

  // Insert new track time
  const { error } = await supabase.from("track_times").insert({
    user_id: userId,
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
