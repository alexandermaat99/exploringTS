-- Fix database structure issues
-- 1. Update track_times to reference user_profiles instead of auth.users
-- 2. Remove redundant auth.users references

-- First, verify all track_times users exist in user_profiles
INSERT INTO user_profiles (id)
SELECT DISTINCT user_id 
FROM track_times 
WHERE user_id NOT IN (SELECT id FROM user_profiles);

-- Add foreign key constraint from track_times to user_profiles
-- (First drop any existing constraint if it exists)
ALTER TABLE track_times 
DROP CONSTRAINT IF EXISTS track_times_user_id_fkey;

-- Add the correct foreign key constraint
ALTER TABLE track_times
ADD CONSTRAINT fk_track_times_user_profiles
FOREIGN KEY (user_id) 
REFERENCES user_profiles(id)
ON DELETE CASCADE;

-- Add comment to clarify the structure
COMMENT ON TABLE track_times IS 'Track times are linked to user_profiles, not directly to auth.users';
COMMENT ON COLUMN track_times.user_id IS 'References user_profiles.id which in turn references auth.users.id'; 