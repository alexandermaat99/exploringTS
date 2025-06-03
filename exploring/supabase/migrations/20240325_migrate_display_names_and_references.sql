-- First, migrate display names from auth.users to user_profiles
UPDATE user_profiles up
SET display_name = u.raw_user_meta_data->>'display_name'
FROM auth.users u
WHERE up.id = u.id
AND u.raw_user_meta_data->>'display_name' IS NOT NULL;

-- Add foreign key to track_times table (first remove existing if any)
ALTER TABLE track_times
DROP CONSTRAINT IF EXISTS track_times_user_id_fkey;

-- Add new foreign key constraint referencing user_profiles
ALTER TABLE track_times
ADD CONSTRAINT track_times_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES user_profiles(id)
ON DELETE SET NULL;

-- Create an index on user_id in track_times for better join performance
CREATE INDEX IF NOT EXISTS idx_track_times_user_id ON track_times(user_id); 