"use client";

import Link from "next/link";
import {
  Suspense,
  useState,
  useEffect,
  useMemo,
  useCallback,
  memo,
} from "react";
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

// Memoized skeleton component
const CarsSkeleton = memo(() => (
  <div className="space-y-4">
    {Array.from({ length: 5 }).map((_, i) => (
      <div
        key={i}
        className="p-4 border rounded-md shadow-sm bg-gray-100 dark:bg-gray-700 animate-pulse"
      >
        <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
      </div>
    ))}
  </div>
));

CarsSkeleton.displayName = "CarsSkeleton";

// Memoized error component
const ErrorFallback = memo(({ error }: { error?: Error }) => (
  <div className="text-red-500 p-4 border border-red-200 rounded-md">
    <h3 className="font-semibold">Something went wrong:</h3>
    <p>{error?.message || "An unexpected error occurred"}</p>
  </div>
));

ErrorFallback.displayName = "ErrorFallback";

// Memoized search component
const SearchSection = memo(
  ({
    searchTerm,
    onSearchChange,
  }: {
    searchTerm: string;
    onSearchChange: (value: string) => void;
  }) => {
    return (
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search cars..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
      </div>
    );
  }
);

SearchSection.displayName = "SearchSection";

// Memoized pagination component
const Pagination = memo(
  ({
    currentPage,
    totalPages,
    onPageChange,
  }: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  }) => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex justify-center items-center space-x-2 mt-6">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Previous
        </button>

        <span className="px-3 py-1">
          Page {currentPage} of {totalPages}
        </span>

        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Next
        </button>
      </div>
    );
  }
);

Pagination.displayName = "Pagination";

// Cars list with pagination - now with useSearchParams inside
const CarsList = memo(
  ({ page, searchTerm }: { page: number; searchTerm: string }) => {
    const pageSize = 10;

    const [cars, setCars] = useState<cars[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    // Memoize the fetch function to prevent unnecessary re-creations
    const fetchData = useCallback(async () => {
      try {
        setLoading(true);
        setError(null);

        // Use Promise.all for concurrent requests
        const [carsData, countData] = await Promise.all([
          getCarsPaginated(page, pageSize, searchTerm),
          getCarsCount(searchTerm),
        ]);

        setCars(carsData);
        setTotalCount(countData);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err : new Error("Failed to fetch cars");
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }, [page, searchTerm, pageSize]);

    useEffect(() => {
      fetchData();
    }, [fetchData]);

    // Memoize total pages calculation
    const totalPages = useMemo(
      () => Math.ceil(totalCount / pageSize),
      [totalCount, pageSize]
    );

    if (loading) return <CarsSkeleton />;
    if (error) return <ErrorFallback error={error} />;

    if (cars.length === 0) {
      return (
        <div className="my-4 sm:my-8 text-center">
          <p className="text-base sm:text-lg">
            No cars found
            {searchTerm ? ` matching "${searchTerm}"` : " in the database"}.
          </p>
          {searchTerm && (
            <Link href="/protected/cars">
              <button className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 w-full sm:w-auto">
                Clear Search
              </button>
            </Link>
          )}
        </div>
      );
    }

    return (
      <div>
        <ul className="space-y-3 sm:space-y-4">
          {cars.map((car) => (
            <li
              key={car.id}
              className="p-3 sm:p-4 border rounded-md shadow-sm dark:bg-slate-700 bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4"
            >
              <div>
                <h2 className="text-lg sm:text-xl font-semibold break-words">
                  {car.car_name}
                </h2>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 break-words">
                  {car.car_type} - {car.car_series}
                </p>
              </div>
              <Link
                href={`/protected/cars/edit-car/${car.id}`}
                className="block w-full sm:w-auto"
              >
                <button className="w-full sm:w-auto px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                  Edit
                </button>
              </Link>
            </li>
          ))}
        </ul>

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={() => {}} // This will be handled by the parent component
        />
      </div>
    );
  }
);

CarsList.displayName = "CarsList";

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
      <div className="flex flex-col sm:flex-row sm:justify-between gap-4 items-start sm:items-center">
        <Link href="/protected/cars/add-car" aria-label="Add new car">
          <button
            className="w-full sm:w-auto px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            aria-label="Add new car"
          >
            Add New Car
          </button>
        </Link>

        <SearchSection
          searchTerm={currentSearch}
          onSearchChange={handleSearch}
        />
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
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-8">
      <h1 className="text-xl sm:text-3xl font-bold">Cars</h1>

      {/* Wrap the component that uses useSearchParams in Suspense */}
      <Suspense fallback={<div>Loading search parameters...</div>}>
        <SearchParamsContent />
      </Suspense>
    </div>
  );
}
