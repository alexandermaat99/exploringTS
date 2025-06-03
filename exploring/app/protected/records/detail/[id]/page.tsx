import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/utils/supabase/server";

function secondsToTimeString(totalSeconds: number | null): string {
  if (totalSeconds === null) return "00:00.000";

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const milliseconds = Math.round(
    (totalSeconds - Math.floor(totalSeconds)) * 1000
  );

  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}.${milliseconds.toString().padStart(3, "0")}`;
}

export default async function RecordDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const { id } = await params;
  const recordId = parseInt(id);

  // Fetch the record with all related data
  const { data: record, error } = await supabase
    .from("track_times")
    .select(
      `
      id,
      lap_record,
      created_at,
      user_id,
      cars!car_id (
        car_name
      ),
      track_configs!config_id (
        config_name,
        tracks!track_id (
          id,
          track_name
        )
      )
    `
    )
    .eq("id", recordId)
    .single();

  if (error || !record) {
    return notFound();
  }

  // Get user info
  const { data: userDisplayName } = await supabase.rpc(
    "get_user_display_name",
    {
      user_id: record.user_id,
    }
  );

  const { data: userEmail } = await supabase.rpc("get_user_email", {
    user_id: record.user_id,
  });

  // Get track ID for back navigation
  const trackId = record.track_configs.tracks.id;

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <Link
        href={`/${trackId}`}
        className="flex items-center gap-2 text-blue-500 hover:text-blue-600"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Track Records</span>
      </Link>

      <div className="bg-white dark:bg-slate-700 rounded-lg shadow p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">
            {record.track_configs?.[0]?.tracks?.[0]?.track_name}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {record.track_configs?.[0]?.config_name}
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-1">Lap Time</h2>
            <p className="text-3xl font-mono">
              {secondsToTimeString(record.lap_record)}
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-1">Driver</h2>
            <p>
              {userDisplayName || userEmail || (
                <span className="italic text-gray-500">
                  {record.user_id
                    ? `User ${record.user_id.substring(0, 8)}...`
                    : "Unknown"}
                </span>
              )}
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-1">Car</h2>
            <p>
              {record.cars?.[0]?.car_name || (
                <span className="italic text-gray-500">Unknown Car</span>
              )}
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-1">Date Set</h2>
            <p>
              {new Date(record.created_at).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
