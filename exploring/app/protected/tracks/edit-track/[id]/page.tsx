"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

interface ConfigToUpdate {
  id: number;
  config_name: string;
}

interface ConfigToInsert {
  track_id: number;
  config_name: string;
}

export default function EditTrackPage() {
  const router = useRouter();
  const params = useParams();
  const id = typeof params.id === "string" ? parseInt(params.id) : 0;
  const [trackName, setTrackName] = useState("");
  const [configurations, setConfigurations] = useState([{ id: "", name: "" }]);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const supabase = createClientComponentClient();

  // Fetch track details and configurations when the component mounts
  useEffect(() => {
    const fetchTrack = async () => {
      const { data: trackData, error: trackError } = await supabase
        .from("tracks")
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
        .from("track_configs")
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

  // Combined update function for track and configurations
  const handleUpdate = async () => {
    if (!trackName) {
      setError("Track name is required.");
      return;
    }

    if (configurations.some((config) => !config.name)) {
      setError("All configuration names are required.");
      return;
    }

    try {
      // Update track name
      const { error: trackError } = await supabase
        .from("tracks")
        .update({ track_name: trackName })
        .eq("id", id);

      if (trackError) {
        throw new Error(`Failed to update track: ${trackError.message}`);
      }

      // Update configurations
      // First fetch existing configurations
      const { data: existingConfigs, error: fetchError } = await supabase
        .from("track_configs")
        .select("id, config_name")
        .eq("track_id", id);

      if (fetchError) {
        throw new Error(
          `Failed to fetch existing configurations: ${fetchError.message}`
        );
      }

      // Get IDs of configurations we want to keep
      const configIdsToKeep = configurations
        .map((config) => config.id)
        .filter((id) => id !== "");

      // Find IDs to delete
      const idsToDelete =
        existingConfigs
          ?.filter((config) => !configIdsToKeep.includes(config.id))
          .map((config) => config.id) || [];

      // Delete unwanted configurations
      if (idsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from("track_configs")
          .delete()
          .in("id", idsToDelete);

        if (deleteError) {
          throw new Error(
            `Failed to delete configurations: ${deleteError.message}`
          );
        }
      }

      // Update existing configurations and insert new ones
      for (const config of configurations) {
        if (config.id) {
          // Update existing configuration
          const { error: updateError } = await supabase
            .from("track_configs")
            .update({ config_name: config.name })
            .eq("id", config.id);

          if (updateError) {
            throw new Error(
              `Failed to update configuration: ${updateError.message}`
            );
          }
        } else {
          // Insert new configuration
          const { error: insertError } = await supabase
            .from("track_configs")
            .insert({
              track_id: id,
              config_name: config.name,
            });

          if (insertError) {
            throw new Error(
              `Failed to insert new configuration: ${insertError.message}`
            );
          }
        }
      }

      // Verify the changes
      const { data: finalConfigs, error: verifyError } = await supabase
        .from("track_configs")
        .select("*")
        .eq("track_id", id);

      if (verifyError) {
        throw new Error(`Failed to verify changes: ${verifyError.message}`);
      }

      if (!finalConfigs || finalConfigs.length === 0) {
        throw new Error("No configurations were saved. Please try again.");
      }

      router.push("/protected/tracks");
    } catch (e) {
      console.error("Error updating track and configurations:", e);
      setError(`Error: ${(e as Error).message}`);
    }
  };

  // Delete track
  const handleDeleteTrack = async () => {
    try {
      // Delete configurations first
      await supabase.from("track_configs").delete().eq("track_id", id);

      // Then delete the track
      const { error: deleteError } = await supabase
        .from("tracks")
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

  // Add a new configuration input
  const handleAddConfiguration = () => {
    setConfigurations([...configurations, { id: "", name: "" }]);
  };

  // Remove a configuration input
  const handleRemoveConfiguration = (index: number) => {
    // Don't allow removing the last configuration
    if (configurations.length <= 1) {
      setError("You must have at least one configuration");
      return;
    }

    console.log("Before removal:", configurations);
    // Create a new array without the configuration at the specified index
    const updatedConfigurations = [...configurations];
    updatedConfigurations.splice(index, 1);
    console.log("After removal:", updatedConfigurations);
    setConfigurations(updatedConfigurations);
  };

  // Update configuration input value
  const handleConfigurationChange = (index: number, value: string) => {
    const updatedConfigurations = [...configurations];
    updatedConfigurations[index].name = value;
    setConfigurations(updatedConfigurations);
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

      {/* Save Changes Button */}
      <button
        onClick={handleUpdate}
        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
      >
        Save Changes
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
