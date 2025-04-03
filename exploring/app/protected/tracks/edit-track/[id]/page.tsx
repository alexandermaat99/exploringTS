"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function EditTrackPage() {
  const router = useRouter();
  const { id } = useParams();
  const [trackName, setTrackName] = useState("");
  const [configurations, setConfigurations] = useState([{ id: "", name: "" }]);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const supabase = createClientComponentClient();

  // Fetch track details and configurations when the component mounts
  useEffect(() => {
    const fetchTrack = async () => {
      const { data: trackData, error: trackError } = await supabase
        .from("Tracks")
        .select("*")
        .eq("id", id)
        .single();

      if (trackError) {
        setError(`Failed to fetch track: ${trackError.message}`);
        return;
      }

      setTrackName(trackData.track_name);

      // Fetch configurations for this track
      const { data: configData, error: configError } = await supabase
        .from("Track Config")
        .select("*")
        .eq("track_id", id);

      if (configError) {
        setError(`Failed to fetch configurations: ${configError.message}`);
        return;
      }

      // Map the fetched configurations to the state format
      setConfigurations(
        configData.map((config) => ({
          id: config.id,
          name: config.config_name,
        }))
      );
    };
    fetchTrack();
  }, [id]);

  // Update track name
  const handleUpdateTrack = async () => {
    if (!trackName) {
      setError("Track name is required.");
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from("Tracks")
        .update({ track_name: trackName })
        .eq("id", id);

      if (updateError) {
        setError(`Failed to update track: ${updateError.message}`);
        return;
      }

      router.push("/protected/tracks");
    } catch (e) {
      setError(`Unexpected error: ${(e as Error).message}`);
    }
  };

  // Add a new configuration input
  const handleAddConfiguration = () => {
    setConfigurations([...configurations, { id: "", name: "" }]);
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

  // Update configurations
  const handleUpdateConfigurations = async () => {
    if (configurations.some((config) => !config.name)) {
      setError("All configuration names are required.");
      return;
    }

    try {
      // Delete existing configurations for this track
      await supabase.from("Track Config").delete().eq("track_id", id);

      // Insert new configurations
      const configurationsToInsert = configurations.map((config) => ({
        track_id: id,
        config_name: config.name,
      }));

      const { error: configError } = await supabase
        .from("Track Config")
        .insert(configurationsToInsert);

      if (configError) {
        setError(`Failed to update configurations: ${configError.message}`);
        return;
      }

      router.push("/protected/tracks");
    } catch (e) {
      setError(`Unexpected error: ${(e as Error).message}`);
    }
  };

  // Delete track
  const handleDeleteTrack = async () => {
    try {
      // Delete configurations first
      await supabase.from("Track Config").delete().eq("track_id", id);

      // Then delete the track
      const { error: deleteError } = await supabase
        .from("Tracks")
        .delete()
        .eq("id", id);

      if (deleteError) {
        setError(`Failed to delete track: ${deleteError.message}`);
        return;
      }

      router.push("/protected/tracks");
    } catch (e) {
      setError(`Unexpected error: ${(e as Error).message}`);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-lg mx-auto mt-10">
      <h1 className="text-3xl font-bold">Edit Track</h1>

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

      {/* Update Track Button */}
      <button
        onClick={handleUpdateTrack}
        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
      >
        Update Track
      </button>

      {/* Update Configurations Button */}
      <button
        onClick={handleUpdateConfigurations}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Update Configurations
      </button>

      {/* Delete Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
      >
        Delete Track
      </button>

      {/* Confirmation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded shadow-lg">
            <h2 className="text-xl font-bold mb-4">Confirm Deletion</h2>
            <p>
              Are you sure you want to delete this track and all its
              configurations?
            </p>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 mr-2"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await handleDeleteTrack();
                  setIsModalOpen(false);
                }}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

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
