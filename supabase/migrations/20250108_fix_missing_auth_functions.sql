-- Fix Missing Auth Functions Migration
-- This migration adds all the missing RPC functions that the application code expects

-- 1. Create function to get current user's organization ID
CREATE OR REPLACE FUNCTION get_current_organization_id()
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

-- 2. Create function to get user organization by user ID
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
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 3. Create the comprehensive user profile function that auth was trying to call
CREATE OR REPLACE FUNCTION get_user_profile_with_org()
RETURNS JSON AS $$
DECLARE
  result JSON;
  user_profile JSON;
  user_org JSON;
  user_membership JSON;
  is_platform_op BOOLEAN;
BEGIN
  -- Get user profile
  SELECT row_to_json(p) INTO user_profile
  FROM (
    SELECT full_name, avatar_url
    FROM profiles 
    WHERE id = auth.uid()
  ) p;

  -- Get user organization
  SELECT row_to_json(o) INTO user_org
  FROM (
    SELECT o.*
    FROM organizations o
    JOIN organization_members om ON o.id = om.organization_id
    WHERE om.user_id = auth.uid()
    LIMIT 1
  ) o;

  -- Get user membership info
  SELECT row_to_json(m) INTO user_membership
  FROM (
    SELECT id, organization_id, role
    FROM organization_members
    WHERE user_id = auth.uid()
    LIMIT 1
  ) m;

  -- Check if user is platform operator
  SELECT EXISTS(
    SELECT 1 FROM platform_operators 
    WHERE user_id = auth.uid()
  ) INTO is_platform_op;

  -- Build result JSON
  SELECT json_build_object(
    'profile', user_profile,
    'organization', user_org,
    'membership', user_membership,
    'is_platform_operator', is_platform_op
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 4. Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_current_organization_id() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_organization(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_profile_with_org() TO authenticated;

-- 5. Add helpful comments
COMMENT ON FUNCTION get_current_organization_id() IS 'Returns the organization ID for the currently authenticated user';
COMMENT ON FUNCTION get_user_organization(UUID) IS 'Returns the organization ID for a specific user';
COMMENT ON FUNCTION get_user_profile_with_org() IS 'Returns comprehensive user data including profile, organization, membership, and platform operator status in a single call';

-- 6. Log the migration
INSERT INTO system_logs (type, message, details)
VALUES (
  'migration',
  'Added missing authentication functions',
  jsonb_build_object(
    'functions_added', ARRAY[
      'get_current_organization_id',
      'get_user_organization', 
      'get_user_profile_with_org'
    ],
    'purpose', 'fix_authentication_timeout_issues'
  )
); 