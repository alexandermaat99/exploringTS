-- Create function to get user's favorite car
CREATE OR REPLACE FUNCTION get_favorite_car(user_id_param UUID)
RETURNS TABLE (
    car_name TEXT,
    count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.car_name,
        COUNT(*) as count
    FROM track_times tt
    JOIN cars c ON c.id = tt.car_id
    WHERE tt.user_id = user_id_param
    GROUP BY c.id, c.car_name
    ORDER BY count DESC
    LIMIT 1;
END;
$$; 