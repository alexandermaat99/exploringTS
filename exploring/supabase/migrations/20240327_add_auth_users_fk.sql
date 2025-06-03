-- Add foreign key relationship between user_profiles and auth.users
ALTER TABLE user_profiles
ADD CONSTRAINT fk_auth_users
FOREIGN KEY (id)
REFERENCES auth.users(id)
ON DELETE CASCADE; 