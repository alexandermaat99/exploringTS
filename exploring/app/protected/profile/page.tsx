import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { signOutAction } from "@/app/actions";
import { Button } from "@/components/ui/button";

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

  // Get favorite car using a count of car usage
  const { data: carUsage } = await supabase.rpc("get_favorite_car", {
    user_id_param: userId,
  });

  // Process best times to get unique track/config combinations
  const uniqueBestTimes = new Map();
  bestTimes?.forEach((time) => {
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
    favoriteCar: carUsage?.[0]
      ? {
          carName: carUsage[0].car_name,
          useCount: carUsage[0].count,
        }
      : undefined,
  };
}

export default async function ProfilePage() {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // Get user profile
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("*, leagues!league_id(*)")
    .eq("id", user.id)
    .single();

  // Get user stats
  const stats = await getUserStats(user.id);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="bg-white dark:bg-slate-700 rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Profile Information</h2>
          <form action={signOutAction}>
            <Button type="submit" variant="destructive">
              Sign Out
            </Button>
          </form>
        </div>
        <form action={updateProfile} className="space-y-4">
          <input type="hidden" name="user_id" value={user.id} />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Display Name
            </label>
            <input
              type="text"
              name="display_name"
              defaultValue={profile?.display_name || ""}
              className="w-full p-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              defaultValue={user.email}
              className="w-full p-2 border border-gray-300 rounded-md bg-gray-100"
              disabled
            />
            <p className="text-sm text-gray-500 mt-1">
              Email cannot be changed
            </p>
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Update Profile
          </button>
        </form>
      </div>

      <div className="bg-white dark:bg-slate-700 rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">Your Stats</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Overview</h3>
            <p>Total Records: {stats.totalRecords}</p>
            {stats.favoriteCar && (
              <p>
                Favorite Car: {stats.favoriteCar.carName} (used{" "}
                {stats.favoriteCar.useCount} times)
              </p>
            )}
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Best Times</h3>
            <div className="space-y-2">
              {stats.bestTimes.map((time, index) => (
                <div
                  key={`${time.trackName}-${time.configName}`}
                  className="border-b border-gray-200 dark:border-gray-600 pb-2"
                >
                  <p className="font-medium">
                    {time.trackName} - {time.configName}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
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

async function updateProfile(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const userId = formData.get("user_id") as string;
  const displayName = formData.get("display_name") as string;

  // Update profile
  const { error } = await supabase
    .from("user_profiles")
    .update({ display_name: displayName })
    .eq("id", userId);

  if (error) {
    console.error("Error updating profile:", error);
    throw new Error(error.message);
  }

  // Redirect back to profile page
  redirect("/protected/profile");
}
