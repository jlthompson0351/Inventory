-- Complete the transition to single organization support
-- This migration removes all remaining multi-organization features

-- 1. Remove mothership column and related functionality
ALTER TABLE organizations DROP COLUMN IF EXISTS is_mothership;

-- 2. Drop mothership-related functions
DROP FUNCTION IF EXISTS get_mothership_asset_types CASCADE;
DROP FUNCTION IF EXISTS clone_asset_type CASCADE;

-- 3. Drop any remaining multi-org views
DROP VIEW IF EXISTS user_organizations CASCADE;

-- 4. Drop any remaining multi-org functions
DROP FUNCTION IF EXISTS get_user_organizations CASCADE;

-- 5. Add constraint to ensure one organization per user
-- First, check if constraint already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'one_org_per_user'
    ) THEN
        ALTER TABLE organization_members 
        ADD CONSTRAINT one_org_per_user UNIQUE (user_id);
    END IF;
END $$;

-- 6. Update the delete_organization function to prevent deletion
CREATE OR REPLACE FUNCTION delete_organization(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RAISE EXCEPTION 'Organizations cannot be deleted in single-org mode';
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Simplify organization creation for platform admins
CREATE OR REPLACE FUNCTION create_organization_for_platform_admin(
  org_name TEXT,
  org_description TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_org_id UUID;
BEGIN
  -- Check if caller is a platform operator
  IF NOT EXISTS (
    SELECT 1 FROM platform_operators 
    WHERE user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Only platform operators can create organizations';
  END IF;

  -- Simply create the organization
  INSERT INTO organizations (name, description)
  VALUES (org_name, org_description)
  RETURNING id INTO new_org_id;
  
  RETURN new_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Update RLS policies to ensure they work with single org model
-- For organization_members table
DROP POLICY IF EXISTS "Users can view their organization members" ON organization_members;
CREATE POLICY "Users can view their organization members" ON organization_members
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- 9. Create a function to ensure new users get an organization
CREATE OR REPLACE FUNCTION ensure_user_has_organization()
RETURNS TRIGGER AS $$
DECLARE
  default_org_id UUID;
BEGIN
  -- Check if user already has an organization
  IF EXISTS (
    SELECT 1 FROM organization_members 
    WHERE user_id = NEW.id
  ) THEN
    RETURN NEW;
  END IF;

  -- Get or create a default organization
  SELECT id INTO default_org_id
  FROM organizations
  LIMIT 1;

  IF default_org_id IS NULL THEN
    -- Create a default organization if none exists
    INSERT INTO organizations (name, description)
    VALUES ('Default Organization', 'Automatically created organization')
    RETURNING id INTO default_org_id;
  END IF;

  -- Add user to the organization
  INSERT INTO organization_members (user_id, organization_id, role)
  VALUES (NEW.id, default_org_id, 'member');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Create trigger to ensure new users get assigned to an organization
DROP TRIGGER IF EXISTS ensure_user_organization ON auth.users;
CREATE TRIGGER ensure_user_organization
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION ensure_user_has_organization();

-- 11. Clean up any orphaned data
-- Remove organization invitations for non-existent organizations
DELETE FROM organization_invitations
WHERE organization_id NOT IN (
  SELECT id FROM organizations
);

-- 12. Add comment to tables explaining single-org model
COMMENT ON TABLE organizations IS 'Single organization per deployment. Users cannot switch between organizations.';
COMMENT ON TABLE organization_members IS 'Maps users to their single organization with role-based permissions.';
COMMENT ON CONSTRAINT one_org_per_user ON organization_members IS 'Ensures each user belongs to exactly one organization.';

-- 13. Log migration completion
INSERT INTO system_logs (type, message, organization_id, actor_id)
SELECT 
  'migration',
  'Completed migration to single-organization model',
  o.id,
  auth.uid()
FROM organizations o
LIMIT 1; 