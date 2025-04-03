import Link from "next/link";
import { createClient } from "@/utils/supabase/server";

export default async function TracksPage() {
  const supabase = await createClient();

  // Fetch all tracks from the tracks table
  const { data: tracks, error } = await supabase
    .from("Tracks")
    .select("*")
    .order("track_name", { ascending: true });
  if (error) {
    return (
      <div className="text-red-500">Failed to load tracks: {error.message}</div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-3xl font-bold">Tracks</h1>

      {tracks && tracks.length > 0 ? (
        <ul className="space-y-4">
          {tracks.map((track) => (
            <li
              key={track.id}
              className="p-4 border rounded-md shadow-sm bg-white flex justify-between items-center"
            >
              <div>
                <h2 className="text-xl font-semibold">{track.track_name}</h2>
              </div>
              <Link href={`/protected/tracks/edit-track/${track.id}`}>
                <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                  Edit
                </button>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p>No tracks found in the database.</p>
      )}
      <Link href="/protected/tracks/add-track">
        <button className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
          Add New Track
        </button>
      </Link>
    </div>
  );
}
