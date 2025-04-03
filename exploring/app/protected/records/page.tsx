import Link from "next/link";
import { createClient } from "@/utils/supabase/server";

export default async function RecordsPage() {
  const supabase = await createClient();

  // Fetch all tracks from the tracks table
  const { data: records, error } = await supabase
    .from("Track Times")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    return (
      <div className="text-red-500">
        Failed to load track times: {error.message}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-3xl font-bold">Track Times</h1>

      {records && records.length > 0 ? (
        <ul className="space-y-4">
          {records.map((record) => (
            <li
              key={record.id}
              className="p-4 border rounded-md shadow-sm bg-white flex justify-between items-center"
            >
              <div>
                <h2 className="text-xl font-semibold">{record.user_id}</h2>
                <h2 className="text-xl font-semibold">{record.car_id}</h2>
                <h2 className="text-xl font-semibold">{record.config_id}</h2>
                <h2 className="text-xl font-semibold">{record.lap_record}</h2>
              </div>
              <Link href={`/protected/tracks/edit-track/${record.id}`}>
                <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                  Edit
                </button>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p>No Track Times found in the database.</p>
      )}
      <Link href="/protected/tracks/add-track">
        <button className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
          Add New Track Time
        </button>
      </Link>
    </div>
  );
}
