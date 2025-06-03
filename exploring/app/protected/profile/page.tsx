import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { signOutAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { cache } from "react";

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

// OPTIMIZED: Cached user stats function with efficient queries
const getUserStats = cache(async (userId: string): Promise<UserStats> => {
  const supabase = await createClient();

  try {
    // OPTIMIZED: Single query with joins to get all track times with related data
    const { data: trackTimesData, error: timesError } = await supabase
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

    if (timesError) {
      console.error("Error fetching track times:", timesError);
      return { totalRecords: 0, bestTimes: [] };
    }

    const totalRecords = trackTimesData?.length || 0;

    // Process best times efficiently
    const uniqueBestTimes = new Map<
      string,
      {
        trackName: string;
        configName: string;
        lapTime: number;
        carName: string;
      }
    >();

    trackTimesData?.forEach((time) => {
      const trackConfig = Array.isArray(time.track_configs)
        ? time.track_configs[0]
        : time.track_configs;
      const car = Array.isArray(time.cars) ? time.cars[0] : time.cars;
      const track = Array.isArray(trackConfig?.tracks)
        ? trackConfig.tracks[0]
        : trackConfig?.tracks;

      if (trackConfig && car && track) {
        const key = `${track.track_name}-${trackConfig.config_name}`;

        if (
          !uniqueBestTimes.has(key) ||
          time.lap_record < uniqueBestTimes.get(key)!.lapTime
        ) {
          uniqueBestTimes.set(key, {
            trackName: track.track_name,
            configName: trackConfig.config_name,
            lapTime: time.lap_record,
            carName: car.car_name,
          });
        }
      }
    });

    // OPTIMIZED: Single RPC call for favorite car
    let favoriteCar: { carName: string; useCount: number } | undefined;
    try {
      const { data: carUsage } = await supabase.rpc("get_favorite_car", {
        user_id_param: userId,
      });

      if (carUsage?.[0]) {
        favoriteCar = {
          carName: carUsage[0].car_name,
          useCount: carUsage[0].count,
        };
      }
    } catch (error) {
      console.error("Error fetching favorite car:", error);
    }

    return {
      totalRecords,
      bestTimes: Array.from(uniqueBestTimes.values()).slice(0, 10), // Limit to top 10
      favoriteCar,
    };
  } catch (error) {
    console.error("Error in getUserStats:", error);
    return { totalRecords: 0, bestTimes: [] };
  }
});

// OPTIMIZED: Cached user profile function
const getUserProfile = cache(async (userId: string) => {
  const supabase = await createClient();

  // Single query to get user profile with league info
  const { data: userProfile } = await supabase
    .from("user_profiles")
    .select("*, leagues!league_id(*)")
    .eq("id", userId)
    .single();

  return userProfile;
});

function formatLapTime(lapTime: number): string {
  const minutes = Math.floor(lapTime / 60);
  const seconds = (lapTime % 60).toFixed(3);
  return `${minutes}:${seconds.padStart(6, "0")}`;
}

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // OPTIMIZED: Parallel data fetching
  const [userProfile, userStats] = await Promise.all([
    getUserProfile(user.id),
    getUserStats(user.id),
  ]);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-8">
      <div className="bg-white dark:bg-slate-700 rounded-lg shadow p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-bold mb-4">
          Profile Information
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <p className="text-base sm:text-lg break-all">{user.email}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Display Name
            </label>
            <p className="text-base sm:text-lg break-words">
              {userProfile?.display_name || "Not set"}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              League
            </label>
            <p className="text-base sm:text-lg break-words">
              {userProfile?.leagues?.name || "No League"}
            </p>
          </div>

          {userStats.favoriteCar && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Favorite Car
              </label>
              <p className="text-base sm:text-lg break-words">
                {userStats.favoriteCar.carName} (
                {userStats.favoriteCar.useCount} times used)
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-700 rounded-lg shadow p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-bold mb-4">
          Track Record Statistics
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 sm:p-4 rounded-md">
            <h3 className="font-semibold text-blue-800 dark:text-blue-200">
              Total Records
            </h3>
            <p className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
              {userStats.totalRecords}
            </p>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 p-3 sm:p-4 rounded-md">
            <h3 className="font-semibold text-green-800 dark:text-green-200">
              Best Times Set
            </h3>
            <p className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">
              {userStats.bestTimes.length}
            </p>
          </div>
        </div>
      </div>

      {userStats.bestTimes.length > 0 && (
        <div className="bg-white dark:bg-slate-700 rounded-lg shadow p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-bold mb-4">
            Best Times by Track
          </h2>
          <div className="space-y-3 sm:space-y-4">
            {userStats.bestTimes.map((time, index) => (
              <div
                key={index}
                className="border-b border-gray-200 dark:border-gray-600 pb-3 sm:pb-4 last:border-b-0"
              >
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <div>
                    <h3 className="font-semibold text-base sm:text-lg">
                      {time.trackName} - {time.configName}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Car: {time.carName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg sm:text-xl font-bold text-blue-600 dark:text-blue-400">
                      {formatLapTime(time.lapTime)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <form action={signOutAction}>
          <Button type="submit" variant={"outline"}>
            Sign out
          </Button>
        </form>
      </div>
    </div>
  );
}
