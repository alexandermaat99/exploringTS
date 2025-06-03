import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/utils/supabase/server";

interface Track {
  id: number;
  track_name: string;
}

interface TrackConfig {
  config_name: string;
  tracks: Track | Track[];
}

interface Car {
  car_name: string;
}

interface TrackTimeRecord {
  id: number;
  lap_record: number;
  created_at: string;
  user_id: string;
  cars: Car | Car[];
  track_configs: TrackConfig | TrackConfig[];
}

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

  // Cast to proper type
  const typedRecord = record as TrackTimeRecord;

  // Get user info
  const { data: userDisplayName } = await supabase.rpc(
    "get_user_display_name",
    {
      user_id: typedRecord.user_id,
    }
  );

  const { data: userEmail } = await supabase.rpc("get_user_email", {
    user_id: typedRecord.user_id,
  });

  // Get track ID for back navigation with proper fallback handling
  const trackConfig = Array.isArray(typedRecord.track_configs)
    ? typedRecord.track_configs[0]
    : typedRecord.track_configs;
  const tracks = trackConfig?.tracks;
  const trackId = Array.isArray(tracks) ? tracks[0]?.id : tracks?.id;

  // Helper function to safely get car name
  const getCarName = () => {
    if (!typedRecord.cars) return null;
    if (Array.isArray(typedRecord.cars)) {
      return typedRecord.cars.length > 0 ? typedRecord.cars[0].car_name : null;
    }
    return typedRecord.cars.car_name;
  };

  // Helper function to safely get track name
  const getTrackName = () => {
    if (Array.isArray(tracks)) {
      return tracks[0]?.track_name;
    }
    return tracks?.track_name;
  };

  // Helper function to safely get config name
  const getConfigName = () => {
    return trackConfig?.config_name;
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <Link
        href={trackId ? `/${trackId}` : "/"}
        className="flex items-center gap-2 text-blue-500 hover:text-blue-600"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Track Records</span>
      </Link>

      <div className="bg-white dark:bg-slate-700 rounded-lg shadow p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">
            {getTrackName() || "Unknown Track"}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {getConfigName() || "Unknown Configuration"}
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-1">Lap Time</h2>
            <p className="text-3xl font-mono">
              {secondsToTimeString(typedRecord.lap_record)}
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-1">Driver</h2>
            <p>
              {userDisplayName || userEmail || (
                <span className="italic text-gray-500">
                  {typedRecord.user_id
                    ? `User ${typedRecord.user_id.substring(0, 8)}...`
                    : "Unknown"}
                </span>
              )}
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-1">Car</h2>
            <p>
              {getCarName() || (
                <span className="italic text-gray-500">Unknown Car</span>
              )}
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-1">Date Set</h2>
            <p>
              {new Date(typedRecord.created_at).toLocaleDateString(undefined, {
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
