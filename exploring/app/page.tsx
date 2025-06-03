import Link from "next/link";
import { createClient } from "@/utils/supabase/server";

export default async function TrackRecordsPage() {
  const supabase = await createClient();

  // Fetch all tracks
  const { data: tracks, error } = await supabase
    .from("tracks")
    .select("id, track_name")
    .order("track_name");

  if (error) {
    console.error("Error fetching tracks:", error.message);
    return (
      <div className="text-red-500 px-4 py-2 text-center">
        Failed to load tracks: {error.message}
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-8">
      <h1 className="text-xl sm:text-3xl font-bold text-center">
        Track Records
      </h1>

      {tracks && tracks.length > 0 ? (
        <div className="grid gap-3 sm:gap-4">
          {tracks.map((track) => (
            <Link
              href={`/${track.id}`}
              key={track.id}
              className="block p-4 sm:p-6 dark:bg-slate-700 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <h2 className="text-lg sm:text-2xl font-semibold text-center break-words">
                {track.track_name}
              </h2>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-base sm:text-lg text-center">No tracks found.</p>
      )}
    </div>
  );
}
