-- Migration: Add batch user query functions for better performance
-- This fixes N+1 query problems by allowing batch lookups

-- Function to get multiple user emails in a single query
CREATE OR REPLACE FUNCTION get_user_emails_batch(user_ids UUID[])
RETURNS TABLE(user_id UUID, email TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id as user_id,
    au.email::TEXT as email
  FROM auth.users au
  WHERE au.id = ANY(user_ids);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_emails_batch(UUID[]) TO authenticated; 