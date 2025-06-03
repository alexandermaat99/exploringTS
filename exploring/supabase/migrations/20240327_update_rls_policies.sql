-- Drop existing policies
DROP POLICY IF EXISTS "Read users in same league" ON user_profiles;
DROP POLICY IF EXISTS "Read own league" ON leagues;

-- Policy to allow users to read their own profile
CREATE POLICY "Read own profile"
ON user_profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid() OR
  league_id IN (
    SELECT league_id 
    FROM user_profiles 
    WHERE id = auth.uid()
  )
);

-- Policy to allow users to update their own profile
CREATE POLICY "Update own profile"
ON user_profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Policy to allow users to read leagues
CREATE POLICY "Read leagues"
ON leagues
FOR SELECT
TO authenticated
USING (true);

-- Grant necessary permissions
GRANT SELECT ON leagues TO authenticated;
GRANT SELECT, UPDATE ON user_profiles TO authenticated; 