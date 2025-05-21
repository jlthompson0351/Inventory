-- Migration script to remove multi-organization support and simplify to single organization model
-- Apply this script to simplify database structure for single organization per user

-- 1. First, identify the "primary" organization for each user to keep
CREATE TEMPORARY TABLE primary_orgs AS
SELECT DISTINCT ON (user_id) 
  user_id, 
  organization_id
FROM organization_members
ORDER BY user_id, is_primary DESC, created_at ASC;

-- 2. Remove non-primary memberships to ensure each user belongs to only one organization
DELETE FROM organization_members
WHERE (user_id, organization_id) NOT IN (SELECT user_id, organization_id FROM primary_orgs);

-- 3. Update organization invitations to only allow inviting to the inviter's organization
CREATE OR REPLACE FUNCTION create_invitation(
  email_address TEXT,
  member_role TEXT DEFAULT 'member'
)
RETURNS UUID AS $$
DECLARE
  invitation_id UUID;
  user_org_id UUID;
BEGIN
  -- Get the current user's organization
  SELECT organization_id INTO user_org_id
  FROM organization_members
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  IF user_org_id IS NULL THEN
    RAISE EXCEPTION 'User has no organization';
  END IF;
  
  -- Create the invitation
  INSERT INTO organization_invitations (
    email,
    role,
    organization_id,
    invited_by,
    expires_at
  ) VALUES (
    email_address,
    member_role,
    user_org_id,
    auth.uid(),
    NOW() + INTERVAL '7 days'
  ) RETURNING id INTO invitation_id;
  
  RETURN invitation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Simplify RPC functions to get user organization
CREATE OR REPLACE FUNCTION get_user_organization()
RETURNS UUID AS $$
DECLARE
  org_id UUID;
BEGIN
  SELECT organization_id INTO org_id
  FROM organization_members
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  RETURN org_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 5. Remove hierarchy-related columns from organizations table
ALTER TABLE organizations DROP COLUMN IF EXISTS parent_id;
ALTER TABLE organizations DROP COLUMN IF EXISTS hierarchy_level;

-- 6. Remove is_primary column from organization_members as it's no longer needed
ALTER TABLE organization_members DROP COLUMN IF EXISTS is_primary;

-- 7. Create simplified view for user organization lookups
CREATE OR REPLACE VIEW user_organization AS
SELECT user_id, organization_id FROM organization_members;

-- 8. Drop organization hierarchy functions
DROP FUNCTION IF EXISTS get_organization_hierarchy CASCADE;
DROP FUNCTION IF EXISTS get_organization_ancestors CASCADE;
DROP FUNCTION IF EXISTS get_organization_children CASCADE;
DROP FUNCTION IF EXISTS update_organization_hierarchy_level CASCADE;
DROP TRIGGER IF EXISTS org_hierarchy_level_trigger ON organizations CASCADE;
DROP FUNCTION IF EXISTS prevent_circular_org_hierarchy CASCADE;
DROP TRIGGER IF EXISTS enforce_org_hierarchy_integrity ON organizations CASCADE;

-- 9. Update RPC function for organization invitations
CREATE OR REPLACE FUNCTION get_organization_invitations()
RETURNS SETOF organization_invitations AS $$
DECLARE
  user_org_id UUID;
BEGIN
  -- Get the current user's organization
  SELECT organization_id INTO user_org_id
  FROM organization_members
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  IF user_org_id IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT *
  FROM organization_invitations
  WHERE organization_id = user_org_id
  AND expires_at > NOW()
  ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER; 