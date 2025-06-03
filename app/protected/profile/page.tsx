bestTimes?.forEach((time) => {
  const trackConfig = time.track_configs[0];
  const key = `${trackConfig.tracks[0].track_name}-${trackConfig.config_name}`;
  if (!uniqueBestTimes.has(key)) {
    uniqueBestTimes.set(key, {
      trackName: trackConfig.tracks[0].track_name,
      configName: trackConfig.config_name,
      lapTime: time.lap_record,
      carName: time.cars[0].car_name,
    });
  }
});
