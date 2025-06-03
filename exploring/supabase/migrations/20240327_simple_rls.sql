-- Drop existing policies
DROP POLICY IF EXISTS "Read users in same league" ON user_profiles;
DROP POLICY IF EXISTS "Read own league" ON leagues;
DROP POLICY IF EXISTS "Read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Read leagues" ON leagues;

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;

-- Create simple policies that allow all authenticated users to read
CREATE POLICY "Allow read for authenticated users"
ON user_profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow read leagues for authenticated users"
ON leagues FOR SELECT
TO authenticated
USING (true);

-- Allow users to update their own profile
CREATE POLICY "Allow users to update own profile"
ON user_profiles FOR UPDATE
TO authenticated
USING (id = auth.uid());

-- Grant permissions
GRANT SELECT ON leagues TO authenticated;
GRANT SELECT, UPDATE ON user_profiles TO authenticated; 