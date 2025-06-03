"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function AddCarPage() {
  const [carName, setCarName] = useState("");
  const [carType, setCarType] = useState("");
  const [carSeries, setCarSeries] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClientComponentClient();

  const handleAddCar = async () => {
    if (!carName || !carType || !carSeries) {
      setError("All fields are required.");
      return;
    }

    try {
      const { error: insertError } = await supabase.from("cars").insert([
        {
          car_name: carName,
          car_type: carType,
          car_series: carSeries,
        },
      ]);

      if (insertError) {
        setError(`Failed to add car: ${insertError.message}`);
        return;
      }

      router.push("/protected/cars");
    } catch (e) {
      setError(
        `Unexpected error: ${e instanceof Error ? e.message : "Unknown error"}`
      );
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-lg mx-auto mt-10">
      <h1 className="text-3xl font-bold">Add New Car</h1>

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

      <button
        onClick={handleAddCar}
        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
      >
        Add Car
      </button>

      <button
        onClick={() => router.push("/protected/cars")}
        className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
      >
        Cancel
      </button>
    </div>
  );
}
