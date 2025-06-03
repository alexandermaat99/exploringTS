"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function EditCarPage() {
  const router = useRouter();
  const { id } = useParams();
  const [carName, setCarName] = useState("");
  const [carType, setCarType] = useState("");
  const [carSeries, setCarSeries] = useState("");
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const supabase = createClientComponentClient();

  // Fetch car details when the component mounts
  useEffect(() => {
    const fetchCar = async () => {
      const { data, error } = await supabase
        .from("cars")
        .select("*")
        .eq("id", id)
        .single();
      if (error) {
        setError(`Failed to fetch car: ${error.message}`);
      } else {
        setCarName(data.car_name);
        setCarType(data.car_type);
        setCarSeries(data.car_series);
      }
    };
    fetchCar();
  }, [id]);

  const handleUpdateCar = async () => {
    if (!carName || !carType || !carSeries) {
      setError("All fields are required.");
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from("cars")
        .update({
          car_name: carName,
          car_type: carType,
          car_series: carSeries,
        })
        .eq("id", id);

      if (updateError) {
        setError(`Failed to update car: ${updateError.message}`);
        return;
      }

      router.push("/protected/cars");
    } catch (e) {
      setError(`Unexpected error: ${(e as Error).message}`);
    }
  };

  const handleDeleteCar = async () => {
    try {
      const { error: deleteError } = await supabase
        .from("cars")
        .delete()
        .eq("id", id);

      if (deleteError) {
        setError(`Failed to delete car: ${deleteError.message}`);
        return;
      }

      router.push("/protected/cars");
    } catch (e) {
      setError(`Unexpected error: ${(e as Error).message}`);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-lg mx-auto mt-10">
      <h1 className="text-3xl font-bold">Edit Car</h1>

      {error && <div className="text-red-500">{error}</div>}

      <input
        type="text"
        placeholder="Car Name"
        value={carName}
        onChange={(e) => setCarName(e.target.value)}
        className="border p-2 rounded w-full"
      />
      <input
        type="text"
        placeholder="Car Type"
        value={carType}
        onChange={(e) => setCarType(e.target.value)}
        className="border p-2 rounded w-full"
      />
      <input
        type="text"
        placeholder="Car Series"
        value={carSeries}
        onChange={(e) => setCarSeries(e.target.value)}
        className="border p-2 rounded w-full"
      />

      {/* Update Button */}
      <button
        onClick={handleUpdateCar}
        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
      >
        Update Car
      </button>

      {/* Delete Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
      >
        Delete Car
      </button>

      {/* Confirmation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded shadow-lg">
            <h2 className="text-xl font-bold mb-4">Confirm Deletion</h2>
            <p>Are you sure you want to delete this car?</p>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 mr-2"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await handleDeleteCar();
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
        onClick={() => router.push("/protected/cars")}
        className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
      >
        Cancel
      </button>
    </div>
  );
}
