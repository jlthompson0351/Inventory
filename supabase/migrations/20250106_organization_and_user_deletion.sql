-- Migration: Organization and User Deletion Functionality
-- This migration adds complete organization and user deletion capabilities

-- Function to get organization deletion preview
CREATE OR REPLACE FUNCTION get_organization_deletion_preview(org_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  member_count INTEGER;
  asset_count INTEGER;
  inventory_count INTEGER;
  form_count INTEGER;
  submission_count INTEGER;
  report_count INTEGER;
BEGIN
  -- Check if organization exists
  IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = org_id) THEN
    RAISE EXCEPTION 'Organization not found';
  END IF;

  -- Get counts of data that will be deleted
  SELECT COUNT(*) INTO member_count 
  FROM organization_members WHERE organization_id = org_id;
  
  SELECT COUNT(*) INTO asset_count 
  FROM assets WHERE organization_id = org_id;
  
  SELECT COUNT(*) INTO inventory_count 
  FROM inventory_items WHERE organization_id = org_id;
  
  SELECT COUNT(*) INTO form_count 
  FROM forms WHERE organization_id = org_id;
  
  SELECT COUNT(*) INTO submission_count 
  FROM form_submissions WHERE organization_id = org_id;
  
  SELECT COUNT(*) INTO report_count 
  FROM reports WHERE organization_id = org_id;

  -- Build result JSON
  result := jsonb_build_object(
    'organization_id', org_id,
    'data_to_delete', jsonb_build_object(
      'members', member_count,
      'assets', asset_count,
      'inventory_items', inventory_count,
      'forms', form_count,
      'form_submissions', submission_count,
      'reports', report_count
    )
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete a user completely from the system
CREATE OR REPLACE FUNCTION delete_user_completely(target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_org_id UUID;
BEGIN
  -- Check if caller is an admin of the organization
  SELECT organization_id INTO user_org_id
  FROM organization_members 
  WHERE user_id = target_user_id;

  -- Verify the caller is an admin of the same organization
  IF NOT EXISTS (
    SELECT 1 FROM organization_members 
    WHERE user_id = auth.uid() 
    AND organization_id = user_org_id 
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only organization admins can delete users';
  END IF;

  -- Delete user from auth.users (this will cascade to related data)
  DELETE FROM auth.users WHERE id = target_user_id;
  
  -- Also clean up any orphaned profile data
  DELETE FROM profiles WHERE id = target_user_id;
  
  -- Log the deletion
  INSERT INTO system_logs (type, message, organization_id, actor_id)
  VALUES (
    'user_deletion',
    'User completely deleted from system',
    user_org_id,
    auth.uid()
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete organization completely
CREATE OR REPLACE FUNCTION delete_organization_completely(org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_count INTEGER;
BEGIN
  -- Check if caller is a platform operator or organization admin
  IF NOT (
    EXISTS (SELECT 1 FROM platform_operators WHERE user_id = auth.uid()) OR
    EXISTS (
      SELECT 1 FROM organization_members 
      WHERE user_id = auth.uid() 
      AND organization_id = org_id 
      AND role = 'admin'
    )
  ) THEN
    RAISE EXCEPTION 'Only platform operators or organization admins can delete organizations';
  END IF;

  -- Check if organization exists
  IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = org_id) THEN
    RAISE EXCEPTION 'Organization not found';
  END IF;

  -- Get user count for logging
  SELECT COUNT(*) INTO user_count 
  FROM organization_members WHERE organization_id = org_id;

  -- Delete all users in the organization (this will cascade to related data)
  DELETE FROM auth.users 
  WHERE id IN (
    SELECT user_id FROM organization_members WHERE organization_id = org_id
  );

  -- Delete all organization-related data (most should cascade, but being explicit)
  DELETE FROM organization_invitations WHERE organization_id = org_id;
  DELETE FROM organization_members WHERE organization_id = org_id;
  DELETE FROM reports WHERE organization_id = org_id;
  DELETE FROM form_submissions WHERE organization_id = org_id;
  DELETE FROM forms WHERE organization_id = org_id;
  DELETE FROM inventory_history WHERE organization_id = org_id;
  DELETE FROM inventory_items WHERE organization_id = org_id;
  DELETE FROM assets WHERE organization_id = org_id;
  DELETE FROM asset_types WHERE organization_id = org_id;
  DELETE FROM system_logs WHERE organization_id = org_id;

  -- Finally delete the organization itself
  DELETE FROM organizations WHERE id = org_id;

  -- Log the deletion (to a different organization or system-wide)
  INSERT INTO system_logs (type, message, organization_id, actor_id)
  VALUES (
    'organization_deletion',
    'Organization completely deleted with ' || user_count || ' users',
    NULL, -- No organization_id since it was deleted
    auth.uid()
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable the original delete_organization function for complete deletion
CREATE OR REPLACE FUNCTION delete_organization(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN delete_organization_completely(org_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_organization_deletion_preview(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_user_completely(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_organization_completely(UUID) TO authenticated; 