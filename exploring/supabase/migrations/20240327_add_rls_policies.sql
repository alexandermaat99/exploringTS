-- Enable RLS on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to read all user profiles in their league
CREATE POLICY "Read users in same league"
ON user_profiles
FOR SELECT
TO authenticated
USING (
  league_id IN (
    SELECT league_id 
    FROM user_profiles 
    WHERE id = auth.uid()
  )
);

-- Enable RLS on leagues
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to read their league
CREATE POLICY "Read own league"
ON leagues
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT league_id 
    FROM user_profiles 
    WHERE id = auth.uid()
  )
); 