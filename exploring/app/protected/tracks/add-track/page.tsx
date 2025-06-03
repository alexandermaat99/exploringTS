"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function AddTrackPage() {
  const [trackName, setTrackName] = useState("");
  const [configurations, setConfigurations] = useState([{ name: "" }]); // Array of configurations
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClientComponentClient();

  // Add a new configuration input
  const handleAddConfiguration = () => {
    setConfigurations([...configurations, { name: "" }]);
  };

  // Remove a configuration input
  const handleRemoveConfiguration = (index: number) => {
    const updatedConfigurations = configurations.filter((_, i) => i !== index);
    setConfigurations(updatedConfigurations);
  };

  // Update configuration input value
  const handleConfigurationChange = (index: number, value: string) => {
    const updatedConfigurations = [...configurations];
    updatedConfigurations[index].name = value;
    setConfigurations(updatedConfigurations);
  };

  // Submit the track and its configurations
  const handleAddTrack = async () => {
    if (!trackName || configurations.some((config) => !config.name)) {
      setError("Track name and all configurations are required.");
      return;
    }

    try {
      // Insert the track into the Tracks table
      const { data: trackData, error: trackError } = await supabase
        .from("tracks")
        .insert([{ track_name: trackName }])
        .select();

      if (trackError) {
        setError(`Failed to add track: ${trackError.message}`);
        return;
      }

      // Get the inserted track ID
      const trackId = trackData[0]?.id;
      if (!trackId) {
        setError("Failed to retrieve track ID after insertion.");
        return;
      }

      // Prepare configurations for insertion
      const configurationsToInsert = configurations.map((config) => ({
        track_id: trackId,
        config_name: config.name,
      }));

      // Insert configurations into Track Config table
      const { error: configError } = await supabase
        .from("track_configs")
        .insert(configurationsToInsert);

      if (configError) {
        console.error("Configuration Insert Error:", configError);
        setError(`Failed to add configurations: ${configError.message}`);
        return;
      }

      // Redirect back to tracks list on success
      router.push("/protected/tracks");
    } catch (e) {
      console.error("Unexpected error:", e);
      setError(
        `An unexpected error occurred: ${e instanceof Error ? e.message : "Unknown error"}`
      );
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-lg mx-auto mt-10">
      <h1 className="text-3xl font-bold">Add New Track</h1>

      {error && <div className="text-red-500">{error}</div>}

      {/* Track Name Input */}
      <input
        type="text"
        placeholder="Track Name"
        value={trackName}
        onChange={(e) => setTrackName(e.target.value)}
        className="border p-2 rounded w-full"
      />

      {/* Configurations */}
      <div>
        <h2 className="text-xl font-semibold mb-2">Configurations</h2>
        {configurations.map((config, index) => (
          <div key={index} className="flex items-center gap-4 mb-2">
            <input
              type="text"
              placeholder={`Configuration ${index + 1}`}
              value={config.name}
              onChange={(e) => handleConfigurationChange(index, e.target.value)}
              className="border p-2 rounded w-full"
            />
            <button
              onClick={() => handleRemoveConfiguration(index)}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Remove
            </button>
          </div>
        ))}
        <button
          onClick={handleAddConfiguration}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mt-2"
        >
          Add Configuration
        </button>
      </div>

      {/* Submit Button */}
      <button
        onClick={handleAddTrack}
        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
      >
        Add Track
      </button>

      {/* Cancel Button */}
      <button
        onClick={() => router.push("/protected/tracks")}
        className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
      >
        Cancel
      </button>
    </div>
  );
}
