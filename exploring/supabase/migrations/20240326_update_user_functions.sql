-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_user_display_name(user_id UUID);
DROP FUNCTION IF EXISTS get_user_email(user_id UUID);

-- Create new get_user_display_name function that uses user_profiles table
CREATE OR REPLACE FUNCTION get_user_display_name(user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN (
        SELECT display_name
        FROM user_profiles
        WHERE id = user_id
    );
END;
$$;

-- Create new get_user_email function that uses auth.users table
-- We keep this one using auth.users since that's where emails are stored
CREATE OR REPLACE FUNCTION get_user_email(user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN (
        SELECT email
        FROM auth.users
        WHERE id = user_id
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_display_name(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_email(UUID) TO authenticated; 