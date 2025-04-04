import Link from "next/link";
import { createClient } from "@/utils/supabase/server";

export default async function CarsPage() {
  const supabase = await createClient();

  // Fetch all cars from the Cars table
  const { data: cars, error } = await supabase.from("Cars").select("*");

  if (error) {
    return (
      <div className="text-red-500">Failed to load cars: {error.message}</div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-3xl font-bold">Cars</h1>
      <Link href="/protected/cars/add-car">
        <button className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
          Add New Car
        </button>
      </Link>

      {cars && cars.length > 0 ? (
        <ul className="space-y-4">
          {cars.map((car) => (
            <li
              key={car.id}
              className="p-4 border rounded-md shadow-sm bg-white flex justify-between items-center"
            >
              <div>
                <h2 className="text-xl font-semibold">{car.car_name}</h2>
                <p>
                  <strong>Type:</strong> {car.car_type}
                </p>
                <p>
                  <strong>Series:</strong> {car.car_series}
                </p>
              </div>
              <Link href={`/protected/cars/edit-car/${car.id}`}>
                <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                  Edit
                </button>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p>No cars found in the database.</p>
      )}
    </div>
  );
}
