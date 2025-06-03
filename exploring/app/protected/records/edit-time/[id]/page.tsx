import { createClient } from "@/utils/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import TrackAndConfigSelection from "../../add-time/TrackAndConfigSelection";

// Define types for dropdown options
type Car = { id: number; car_name: string };
type Track = { id: number; track_name: string };
type TrackConfig = { id: number; config_name: string; track_id: number };

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function EditTrackTimePage({ params }: PageProps) {
  const supabase = await createClient();
  const recordId = parseInt(await params.then((p) => p.id));

  // Get the current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // Fetch the track time record
  const { data: record, error } = await supabase
    .from("track_times")
    .select(
      `
    id,
    user_id,
    car_id,
    config_id,
    lap_record,
    cars!car_id(car_name),
    "track_configs"!config_id(
      config_name,
      track_id,
      tracks!track_id(track_name)
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
    .from("cars")
    .select("id, car_name")
    .order("car_name");

  const { data: tracks } = await supabase
    .from("tracks")
    .select("id, track_name")
    .order("track_name");

  const { data: trackConfigs } = await supabase
    .from("track_configs")
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
            (record["track_configs"] as unknown as { track_id?: number })
              ?.track_id
          }
          defaultConfigId={record.config_id}
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
                defaultValue={Math.floor(record.lap_record / 60)}
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
                defaultValue={Math.floor(record.lap_record % 60)}
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
                defaultValue={Math.round((record.lap_record % 1) * 1000)}
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

  // Get time components
  const minutes = parseInt(formData.get("lap_time_minutes") as string) || 0;
  const seconds = parseInt(formData.get("lap_time_seconds") as string) || 0;
  const milliseconds = parseInt(formData.get("lap_time_ms") as string) || 0;

  // Convert to total seconds
  const lapTimeFloat = minutes * 60 + seconds + milliseconds / 1000;

  // Verify ownership
  const { data: record } = await supabase
    .from("track_times")
    .select("user_id")
    .eq("id", recordId)
    .single();

  if (!record || record.user_id !== user.id) {
    throw new Error("Unauthorized: You can only edit your own records");
  }

  // Update the track time
  const { error } = await supabase
    .from("track_times")
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

// Utility function to convert seconds to time string
function secondsToTimeString(totalSeconds: number): string {
  // Calculate minutes, seconds
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);

  // Calculate milliseconds (get decimal part)
  const milliseconds = Math.round(
    (totalSeconds - Math.floor(totalSeconds)) * 1000
  );

  // Format the time string (MM:SS.ms)
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}.${milliseconds.toString().padStart(3, "0")}`;
}
