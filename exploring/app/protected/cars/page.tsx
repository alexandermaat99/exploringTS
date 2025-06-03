"use client";

import Link from "next/link";
import { Suspense, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCars, getCarsPaginated, getCarsCount } from "./actions";
import CustomErrorBoundary from "./CustomErrorBoundary";

// Define interface for car data
interface cars {
  id: number;
  car_name: string;
  car_type: string;
  car_series: string;
}

// Loading skeleton
function CarsSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="p-4 border rounded-md shadow-sm dark:bg-slate-700 bg-white"
        >
          <div className="h-6 bg-gray-200 dark:bg-slate-600 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-slate-600 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-slate-600 rounded w-1/5"></div>
        </div>
      ))}
    </div>
  );
}

// Error fallback component
function ErrorFallback({
  error,
  resetErrorBoundary,
}: {
  error?: Error;
  resetErrorBoundary?: () => void;
}) {
  return (
    <div className="p-6 border border-red-500 rounded-md bg-red-50 dark:bg-red-900/20">
      <h2 className="text-lg font-semibold text-red-600 dark:text-red-400">
        Something went wrong:
      </h2>
      <p className="text-red-500 dark:text-red-300">
        {error?.message || "An unexpected error occurred"}
      </p>
      {resetErrorBoundary && (
        <button
          className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          onClick={resetErrorBoundary}
        >
          Try again
        </button>
      )}
    </div>
  );
}

// Search component
function CarsSearch({
  initialSearch = "",
  onSearch,
}: {
  initialSearch?: string;
  onSearch: (term: string) => void;
}) {
  const [searchTerm, setSearchTerm] = useState(initialSearch);

  return (
    <div className="mb-6">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Search cars..."
          className="px-4 py-2 border rounded-md w-full dark:bg-slate-800 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSearch(searchTerm)}
          aria-label="Search for cars"
        />
        <button
          onClick={() => onSearch(searchTerm)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          aria-label="Search"
        >
          Search
        </button>
      </div>
    </div>
  );
}

// Cars list with pagination - now with useSearchParams inside
function CarsList({ page, searchTerm }: { page: number; searchTerm: string }) {
  const pageSize = 10;

  const [cars, setCars] = useState<cars[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [carsData, countData] = await Promise.all([
          getCarsPaginated(page, pageSize, searchTerm),
          getCarsCount(searchTerm),
        ]);
        setCars(carsData);
        setTotalCount(countData);
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to fetch cars")
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [page, searchTerm, pageSize]);

  if (loading) return <CarsSkeleton />;
  if (error) return <ErrorFallback error={error} />;

  const totalPages = Math.ceil(totalCount / pageSize);

  if (cars.length === 0) {
    return (
      <div className="my-8 text-center">
        <p className="text-lg">
          No cars found
          {searchTerm ? ` matching "${searchTerm}"` : " in the database"}.
        </p>
        {searchTerm && (
          <Link href="/protected/cars">
            <button className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
              Clear Search
            </button>
          </Link>
        )}
      </div>
    );
  }

  return (
    <>
      <ul className="space-y-4">
        {cars.map((car: cars) => (
          <li
            key={car.id}
            className="p-4 border rounded-md shadow-sm dark:bg-slate-700 bg-white flex justify-between items-center hover:shadow-md transition-shadow"
          >
            <div>
              <h2 className="text-xl font-semibold">{car.car_name}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                <strong>Type:</strong> {car.car_type}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                <strong>Series:</strong> {car.car_series}
              </p>
            </div>
            <Link
              href={`/protected/cars/edit-car/${car.id}`}
              aria-label={`Edit ${car.car_name}`}
            >
              <button
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label={`Edit ${car.car_name}`}
              >
                Edit
              </button>
            </Link>
          </li>
        ))}
      </ul>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {page > 1 && (
            <Link
              href={`?page=${page - 1}${searchTerm ? `&search=${searchTerm}` : ""}`}
            >
              <button className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600">
                &laquo; Prev
              </button>
            </Link>
          )}

          {Array.from({ length: totalPages }, (_, i) => i + 1).map(
            (pageNum) => (
              <Link
                key={pageNum}
                href={`?page=${pageNum}${searchTerm ? `&search=${searchTerm}` : ""}`}
              >
                <button
                  className={`px-3 py-1 rounded ${
                    page === pageNum
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                  }`}
                >
                  {pageNum}
                </button>
              </Link>
            )
          )}

          {page < totalPages && (
            <Link
              href={`?page=${page + 1}${searchTerm ? `&search=${searchTerm}` : ""}`}
            >
              <button className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600">
                Next &raquo;
              </button>
            </Link>
          )}
        </div>
      )}
    </>
  );
}

// Component that handles useSearchParams - properly wrapped in Suspense
function SearchParamsContent() {
  const router = useRouter();
  // Import useSearchParams here to isolate it in a component wrapped with Suspense
  const { useSearchParams } = require("next/navigation");
  const searchParams = useSearchParams();
  const page = parseInt(searchParams.get("page") || "1", 10);
  const currentSearch = searchParams.get("search") || "";

  const handleSearch = (term: string) => {
    const params = new URLSearchParams(searchParams);
    if (term) {
      params.set("search", term);
    } else {
      params.delete("search");
    }
    params.set("page", "1"); // Reset to first page on new search
    router.push(`?${params.toString()}`);
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:justify-between gap-4 items-start">
        <Link href="/protected/cars/add-car" aria-label="Add new car">
          <button
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            aria-label="Add new car"
          >
            Add New Car
          </button>
        </Link>

        <CarsSearch initialSearch={currentSearch} onSearch={handleSearch} />
      </div>

      <CustomErrorBoundary fallback={<ErrorFallback />}>
        <CarsList page={page} searchTerm={currentSearch} />
      </CustomErrorBoundary>
    </>
  );
}

// Main component
export default function CarsPage() {
  return (
    <div className="flex flex-col gap-8 p-4">
      <h1 className="text-3xl font-bold">Cars</h1>

      {/* Wrap the component that uses useSearchParams in Suspense */}
      <Suspense fallback={<div>Loading search parameters...</div>}>
        <SearchParamsContent />
      </Suspense>
    </div>
  );
}
