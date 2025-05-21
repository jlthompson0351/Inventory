-- Migration script to remove multi-organization support
-- This script simplifies the data model to support only a single organization per user

-- 1. First, identify the "primary" organization for each user to keep
CREATE TEMPORARY TABLE primary_orgs AS
SELECT DISTINCT ON (user_id) 
  user_id, 
  organization_id
FROM organization_members
ORDER BY user_id, is_primary DESC, created_at ASC;

-- 2. Drop organization hierarchy support
ALTER TABLE organizations DROP COLUMN IF EXISTS parent_id;
ALTER TABLE organizations DROP COLUMN IF EXISTS hierarchy_level;

-- 3. Remove hierarchy functions
DROP FUNCTION IF EXISTS get_organization_hierarchy;
DROP FUNCTION IF EXISTS get_organization_ancestors;
DROP FUNCTION IF EXISTS get_organization_children;
DROP FUNCTION IF EXISTS update_organization_hierarchy_level;
DROP TRIGGER IF EXISTS org_hierarchy_level_trigger ON organizations;
DROP FUNCTION IF EXISTS prevent_circular_org_hierarchy CASCADE;
DROP TRIGGER IF EXISTS enforce_org_hierarchy_integrity ON organizations;

-- 4. Simplify organization members to ensure each user belongs to only one organization
-- This deletes all non-primary organization memberships
DELETE FROM organization_members
WHERE (user_id, organization_id) NOT IN (SELECT user_id, organization_id FROM primary_orgs);

-- 5. Remove is_primary flag from organization_members (no longer needed)
ALTER TABLE organization_members DROP COLUMN IF EXISTS is_primary;

-- 6. Create a simple view to make querying easier
CREATE OR REPLACE VIEW user_organization AS
SELECT user_id, organization_id FROM organization_members;

-- 7. Update or replace RPC functions to remove multi-organization logic
-- Clone asset type function (simplified to work with single organization)
CREATE OR REPLACE FUNCTION clone_asset_type(
  source_asset_type_id UUID,
  target_organization_id UUID,
  user_id UUID
) RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE
  new_asset_type_id UUID;
  source_asset_type RECORD;
BEGIN
  -- Check if user has access to target organization
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = $3
    AND organization_id = target_organization_id
  ) THEN
    RAISE EXCEPTION 'Access denied: User not a member of target organization';
  END IF;
  
  -- Get source asset type
  SELECT * INTO source_asset_type 
  FROM public.asset_types 
  WHERE id = source_asset_type_id;
  
  -- Create new asset type
  INSERT INTO public.asset_types (
    name,
    description,
    organization_id,
    color,
    barcode_prefix,
    enable_barcodes,
    barcode_type
  ) VALUES (
    source_asset_type.name,
    source_asset_type.description,
    target_organization_id,
    source_asset_type.color,
    source_asset_type.barcode_prefix,
    source_asset_type.enable_barcodes,
    source_asset_type.barcode_type
  ) RETURNING id INTO new_asset_type_id;
  
  RETURN new_asset_type_id;
END;
$$;

-- 8. Update organization selection stored procedures
CREATE OR REPLACE FUNCTION get_user_organization(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
  org_id UUID;
BEGIN
  SELECT organization_id INTO org_id
  FROM organization_members
  WHERE user_id = p_user_id
  LIMIT 1;
  
  RETURN org_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- 9. Create simplified function to get current user's organization
CREATE OR REPLACE FUNCTION get_current_organization_id()
RETURNS UUID AS $$
BEGIN
  RETURN get_user_organization(auth.uid());
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER; 