import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface DatabaseTrackTime {
  lap_record: number;
  cars: { car_name: string }[];
  track_configs: {
    config_name: string;
    tracks: { track_name: string }[];
  }[];
}

interface CarUsageResponse {
  car_name: string;
  count: number;
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
  console.log("=== getUserStats CALLED ===", userId);
  const supabase = await createClient();

  try {
    // Get total number of records
    const { count: totalRecords } = await supabase
      .from("track_times")
      .select("*", { count: "exact" })
      .eq("user_id", userId);

    // Get best times for each track configuration with error handling
    let bestTimes: DatabaseTrackTime[] | null = null;
    try {
      const { data: bestTimesData, error } = await supabase
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

      if (!error && bestTimesData) {
        bestTimes = bestTimesData;
      }

      console.log("BestTimes raw data:", JSON.stringify(bestTimes, null, 2));
    } catch (error) {
      console.error("Error fetching best times:", error);
    }

    // Get favorite car by counting car usage with error handling
    let carUsage: CarUsageResponse[] | null = null;
    try {
      const { data: carUsageData, error } = (await supabase.rpc(
        "get_favorite_car",
        {
          user_id_param: userId,
        }
      )) as { data: CarUsageResponse[] | null; error: any };

      if (!error && carUsageData) {
        carUsage = carUsageData;
      }
    } catch (error) {
      console.error("Error fetching favorite car:", error);
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

    bestTimes?.forEach((time) => {
      try {
        // Handle both array and object cases for cars and track_configs
        const trackConfig = Array.isArray(time?.track_configs)
          ? time.track_configs[0]
          : time.track_configs;
        const car = Array.isArray(time?.cars) ? time.cars[0] : time.cars;
        const track = Array.isArray(trackConfig?.tracks)
          ? trackConfig.tracks[0]
          : trackConfig?.tracks;
        if (
          track?.track_name &&
          trackConfig?.config_name &&
          car?.car_name &&
          time?.lap_record
        ) {
          const key = `${track.track_name}-${trackConfig.config_name}`;
          if (!uniqueBestTimes.has(key)) {
            uniqueBestTimes.set(key, {
              trackName: track.track_name,
              configName: trackConfig.config_name,
              lapTime: time.lap_record,
              carName: car.car_name,
            });
          }
        }
      } catch (error) {
        console.error("Error processing time entry:", error);
      }
    });

    console.log("BestTimes processed:", Array.from(uniqueBestTimes.values()));

    return {
      totalRecords: totalRecords || 0,
      bestTimes: Array.from(uniqueBestTimes.values()),
      favoriteCar: carUsage?.[0]?.car_name
        ? {
            carName: carUsage[0].car_name,
            useCount: carUsage[0].count,
          }
        : undefined,
    };
  } catch (error) {
    console.error("Error in getUserStats:", error);
    // Return safe defaults if anything fails
    return {
      totalRecords: 0,
      bestTimes: [],
      favoriteCar: undefined,
    };
  }
}

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function DriverProfilePage({ params }: PageProps) {
  console.log("=== DriverProfilePage CALLED ===");

  try {
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
                      {time.trackName || "No Track"} -{" "}
                      {time.configName || "No Config"}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {secondsToTimeString(time.lapTime)} with{" "}
                      {time.carName || "No Car"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error in DriverProfilePage:", error);
    return (
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <Link
          href="/protected/league"
          className="inline-flex items-center text-blue-500 hover:text-blue-600 text-sm sm:text-base"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to League
        </Link>

        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mt-4">
          <h3 className="text-red-800 dark:text-red-200 font-semibold">
            Error Loading Profile
          </h3>
          <p className="text-red-600 dark:text-red-300 mt-2">
            Sorry, there was an error loading this driver's profile. Please try
            again later.
          </p>
        </div>
      </div>
    );
  }
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
