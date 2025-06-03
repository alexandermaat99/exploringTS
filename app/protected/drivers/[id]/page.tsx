interface DatabaseTrackTime {
  lap_record: number;
  cars: { car_name: string }[];
  track_configs: {
    config_name: string;
    tracks: { track_name: string }[];
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
    .select(
      `
      cars:cars!car_id(
        car_name
      )
    `
    )
    .eq("user_id", userId);

  // Process best times to get unique track/config combinations
  const uniqueBestTimes = new Map();
  bestTimes?.forEach((time) => {
    try {
      const trackConfig = time?.track_configs?.[0];
      const car = time?.cars?.[0];
      const track = trackConfig?.tracks?.[0];
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
