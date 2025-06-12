-- Migration: Add function to get user emails for organization members
-- This function allows us to safely access auth.users email data for organization members

-- Drop function if it exists
DROP FUNCTION IF EXISTS get_organization_members_with_emails(UUID);

-- Create function to get organization members with emails
CREATE OR REPLACE FUNCTION get_organization_members_with_emails(org_id UUID)
RETURNS TABLE (
  member_id UUID,
  user_id UUID,
  role TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    om.id as member_id,
    om.user_id,
    om.role,
    om.created_at,
    au.email,
    p.full_name,
    p.avatar_url
  FROM organization_members om
  JOIN auth.users au ON om.user_id = au.id
  LEFT JOIN profiles p ON om.user_id = p.id
  WHERE om.organization_id = org_id
  AND (p.is_deleted IS NULL OR p.is_deleted = false)
  ORDER BY om.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_organization_members_with_emails(UUID) TO authenticated;

-- Add RLS policy for the function
-- Users can only access member data for their own organization
CREATE POLICY "Users can get members for their organization" 
ON organization_members FOR SELECT 
TO authenticated 
USING (
  organization_id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid()
  )
);

-- Log the migration
INSERT INTO system_logs (type, message, details)
VALUES (
  'migration',
  'Added get_organization_members_with_emails function',
  jsonb_build_object(
    'function', 'get_organization_members_with_emails',
    'purpose', 'safely_access_user_emails_for_organization_members'
  )
); 