"use client";

import { useState, useEffect } from "react";

type Track = { id: number; track_name: string };
type TrackConfig = { id: number; config_name: string; track_id: number };

export default function TrackAndConfigSelection({
  tracks,
  trackConfigs,
  defaultTrackId = null,
  defaultConfigId = null,
}: {
  tracks: Track[];
  trackConfigs: TrackConfig[];
  defaultTrackId?: number | null;
  defaultConfigId?: number | null;
}) {
  const [selectedTrackId, setSelectedTrackId] = useState<number | null>(
    defaultTrackId
  );

  // Set default track when component mounts
  useEffect(() => {
    if (defaultTrackId) {
      setSelectedTrackId(defaultTrackId);
    }
  }, [defaultTrackId]);

  // Filter configurations based on selected track
  const filteredConfigs = selectedTrackId
    ? trackConfigs.filter((config) => config.track_id === selectedTrackId)
    : [];

  return (
    <>
      {/* Track Selection */}
      <div>
        <label
          htmlFor="track_id"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Track
        </label>
        <select
          id="track_id"
          name="track_id"
          required
          value={selectedTrackId || ""}
          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          onChange={(e) => setSelectedTrackId(parseInt(e.target.value))}
        >
          <option value="">Select a Track</option>
          {tracks.map((track) => (
            <option key={track.id} value={track.id}>
              {track.track_name}
            </option>
          ))}
        </select>
      </div>

      {/* Track Configuration Selection */}
      <div>
        <label
          htmlFor="config_id"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Track Configuration
        </label>
        <select
          id="config_id"
          name="config_id"
          required
          disabled={!selectedTrackId}
          defaultValue={defaultConfigId || ""}
          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">
            {selectedTrackId
              ? "Select a Configuration"
              : "Select a Track First"}
          </option>
          {filteredConfigs.map((config) => (
            <option key={config.id} value={config.id}>
              {config.config_name}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
