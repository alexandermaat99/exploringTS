import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface TrackTime {
  lap_record: number;
  cars: {
    car_name: string;
  };
  track_configs: {
    config_name: string;
    tracks: {
      track_name: string;
    };
  };
}

interface CarUsage {
  cars: {
    car_name: string;
  }[];
}

interface UserStats {
  totalRecords: number;
  bestTimes: {
    trackName: string;
    configName: string;
    lapTime: number;
    carName: string;
  }[];
  favoriteCar?: {
    carName: string;
    useCount: number;
  };
}

async function getUserStats(userId: string): Promise<UserStats> {
  const supabase = await createClient();

  // Get total number of records
  const { count: totalRecords } = await supabase
    .from("track_times")
    .select("*", { count: "exact" })
    .eq("user_id", userId);

  // Get best times for each track configuration
  const { data: bestTimes } = await supabase
    .from("track_times")
    .select(
      `
      lap_record,
      cars!car_id(car_name),
      track_configs!config_id(
        config_name,
        tracks!track_id(track_name)
      )
    `
    )
    .eq("user_id", userId)
    .order("lap_record", { ascending: true });

  // Get favorite car by counting car usage
  const { data: carUsage } = await supabase
    .from("track_times")
    .select("cars:cars!car_id(car_name)")
    .eq("user_id", userId);

  // Count car usage
  const carCounts = new Map<string, number>();
  carUsage?.forEach((record: CarUsage) => {
    const carName = record.cars[0]?.car_name;
    if (carName) {
      carCounts.set(carName, (carCounts.get(carName) || 0) + 1);
    }
  });

  // Find the most used car
  let favoriteCar: { carName: string; useCount: number } | undefined;
  if (carCounts.size > 0) {
    let maxUseCount = 0;
    let mostUsedCar = "";
    carCounts.forEach((count, car) => {
      if (count > maxUseCount) {
        maxUseCount = count;
        mostUsedCar = car;
      }
    });
    favoriteCar = {
      carName: mostUsedCar,
      useCount: maxUseCount,
    };
  }

  // Process best times to get unique track/config combinations
  const uniqueBestTimes = new Map<
    string,
    {
      trackName: string;
      configName: string;
      lapTime: number;
      carName: string;
    }
  >();

  bestTimes?.forEach((time: TrackTime) => {
    const trackConfig = time.track_configs;
    const key = `${trackConfig.tracks.track_name}-${trackConfig.config_name}`;
    if (!uniqueBestTimes.has(key)) {
      uniqueBestTimes.set(key, {
        trackName: trackConfig.tracks.track_name,
        configName: trackConfig.config_name,
        lapTime: time.lap_record,
        carName: time.cars.car_name,
      });
    }
  });

  return {
    totalRecords: totalRecords || 0,
    bestTimes: Array.from(uniqueBestTimes.values()),
    favoriteCar,
  };
}

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function DriverProfilePage({ params }: PageProps) {
  const supabase = await createClient();
  const { id } = await params;

  // Get current user to verify they're in the same league
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // Get current user's league
  const { data: currentUserProfile } = await supabase
    .from("user_profiles")
    .select("league_id")
    .eq("id", user.id)
    .single();

  // Get driver's profile
  const { data: driverProfile } = await supabase
    .from("user_profiles")
    .select("*, leagues!league_id(*)")
    .eq("id", id)
    .single();

  // Get driver's email
  const { data: driverAuth } = await supabase
    .from("auth_users")
    .select("email")
    .eq("id", id)
    .single();

  // If driver not found or not in same league, return 404
  if (
    !driverProfile ||
    driverProfile.league_id !== currentUserProfile?.league_id
  ) {
    return notFound();
  }

  // Get driver stats
  const stats = await getUserStats(id);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-8">
      <Link
        href="/protected/league"
        className="inline-flex items-center text-blue-500 hover:text-blue-600 text-sm sm:text-base"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to League
      </Link>

      <div className="bg-white dark:bg-slate-700 rounded-lg shadow p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-bold mb-4">Driver Profile</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Display Name
            </label>
            <p className="text-base sm:text-lg font-semibold break-words">
              {driverProfile.display_name || "Unnamed Driver"}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <p className="text-base sm:text-lg break-all">
              {driverAuth?.email}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              League
            </label>
            <p className="text-base sm:text-lg break-words">
              {driverProfile.leagues?.name || "No League"}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-700 rounded-lg shadow p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-bold mb-4">Driver Stats</h2>

        <div className="grid grid-cols-1 gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Overview</h3>
            <div className="space-y-2">
              <p className="text-sm sm:text-base">
                Total Records: {stats.totalRecords}
              </p>
              {stats.favoriteCar && (
                <p className="text-sm sm:text-base">
                  Favorite Car: {stats.favoriteCar.carName} (used{" "}
                  {stats.favoriteCar.useCount} times)
                </p>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Best Times</h3>
            <div className="space-y-3 sm:space-y-4">
              {stats.bestTimes.map((time) => (
                <div
                  key={`${time.trackName}-${time.configName}`}
                  className="border-b border-gray-200 dark:border-gray-600 pb-3 sm:pb-4"
                >
                  <p className="font-medium text-sm sm:text-base break-words">
                    {time.trackName} - {time.configName}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {secondsToTimeString(time.lapTime)} with {time.carName}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Utility function to format lap time
function secondsToTimeString(totalSeconds: number | null): string {
  if (totalSeconds === null) return "00:00.000";

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const milliseconds = Math.round(
    (totalSeconds - Math.floor(totalSeconds)) * 1000
  );

  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}.${milliseconds.toString().padStart(3, "0")}`;
}
