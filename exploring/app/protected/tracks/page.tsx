import Link from "next/link";
import { createClient } from "@/utils/supabase/server";

export default async function TracksPage() {
  const supabase = await createClient();

  // Fetch all tracks from the tracks table
  const { data: tracks, error } = await supabase
    .from("tracks")
    .select("*")
    .order("track_name", { ascending: true });
  if (error) {
    return (
      <div className="text-red-500">Failed to load tracks: {error.message}</div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-8">
      <h1 className="text-xl sm:text-3xl font-bold">Tracks</h1>
      <Link
        href="/protected/tracks/add-track"
        className="block w-full sm:w-auto"
      >
        <button className="w-full sm:w-auto px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
          Add New Track
        </button>
      </Link>
      {tracks && tracks.length > 0 ? (
        <ul className="space-y-3 sm:space-y-4">
          {tracks.map((track) => (
            <li
              key={track.id}
              className="p-3 sm:p-4 border rounded-md shadow-sm dark:bg-slate-700 bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4"
            >
              <div>
                <h2 className="text-lg sm:text-xl font-semibold break-words">
                  {track.track_name}
                </h2>
              </div>
              <Link
                href={`/protected/tracks/edit-track/${track.id}`}
                className="block w-full sm:w-auto"
              >
                <button className="w-full sm:w-auto px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                  Edit
                </button>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-base sm:text-lg text-center">
          No tracks found in the database.
        </p>
      )}
    </div>
  );
}
