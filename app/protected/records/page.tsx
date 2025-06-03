// Updated type definition to match the actual data structure
interface track_times {
  id: number;
  created_at: string;
  lap_record: number | null;
  user_id: string | null;
  cars: { car_name: string }[];
  track_configs: {
    config_name: string;
    tracks: { track_name: string }[];
  }[];
  user_display_name?: string | null;
  user_email?: string | null;
}

function getTrackName(record: track_times): string | null {
  if (!record.track_configs?.length) return null;
  const tracks = record.track_configs[0].tracks;
  return tracks.length > 0 ? tracks[0].track_name : null;
}

function getConfigName(record: track_times): string | null {
  if (!record.track_configs?.length) return null;
  return record.track_configs[0].config_name;
}
