import Link from "next/link";
import { createClient } from "@/utils/supabase/server";

export default async function TrackRecordsPage() {
  const supabase = await createClient();

  // Fetch all tracks
  const { data: tracks, error } = await supabase
    .from("Tracks")
    .select("id, track_name")
    .order("track_name");

  if (error) {
    console.error("Error fetching tracks:", error.message);
    return (
      <div className="text-red-500">Failed to load tracks: {error.message}</div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-4">
      <h1 className="text-3xl  font-bold mb-6">Track Records</h1>

      {tracks && tracks.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-1">
          {tracks.map((track) => (
            <Link
              href={`/${track.id}`}
              key={track.id}
              className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <h2 className="text-2xl px-8 font-semibold text-center">
                {track.track_name}
              </h2>
            </Link>
          ))}
        </div>
      ) : (
        <p>No tracks found.</p>
      )}
    </div>
  );
}
