interface LapTime {
  id: number;
  lap_record: number;
  user_id: string;
  car_id: number;
  config_id: number;
  Cars: { car_name: string }[];
}

interface LapTimeRecord {
  id: number;
  lap_record: number | null;
  user_id: string | null;
  car_id: number;
  car_name?: string;
  user_display_name?: string | null;
  user_email?: string | null;
}

// Update the car_name extraction in the processedTimes map
car_name: time.Cars?.length > 0 ? time.Cars[0].car_name : undefined, 