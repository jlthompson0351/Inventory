-- Platform Admin Enhancements Migration
-- This migration adds functionality for platform admins to fully manage organizations and users

-- 1. Create a function to get all organizations for platform admins
CREATE OR REPLACE FUNCTION get_all_organizations_for_platform_admin()
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  avatar_url TEXT,
  member_count BIGINT,
  admin_count BIGINT
) AS $$
BEGIN
  -- Check if caller is a platform operator
  IF NOT EXISTS (
    SELECT 1 FROM platform_operators 
    WHERE user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Only platform operators can view all organizations';
  END IF;

  RETURN QUERY
  SELECT 
    o.id,
    o.name,
    o.description,
    o.created_at,
    o.avatar_url,
    COALESCE(member_counts.member_count, 0) as member_count,
    COALESCE(admin_counts.admin_count, 0) as admin_count
  FROM organizations o
  LEFT JOIN (
    SELECT organization_id, COUNT(*) as member_count
    FROM organization_members
    GROUP BY organization_id
  ) member_counts ON o.id = member_counts.organization_id
  LEFT JOIN (
    SELECT organization_id, COUNT(*) as admin_count
    FROM organization_members
    WHERE role IN ('admin', 'owner')
    GROUP BY organization_id
  ) admin_counts ON o.id = admin_counts.organization_id
  ORDER BY o.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Enhanced organization creation that can assign a specific user as admin
CREATE OR REPLACE FUNCTION create_organization_with_admin(
  org_name TEXT,
  org_description TEXT DEFAULT NULL,
  admin_email TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_org_id UUID;
  admin_user_id UUID;
BEGIN
  -- Check if caller is a platform operator
  IF NOT EXISTS (
    SELECT 1 FROM platform_operators 
    WHERE user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Only platform operators can create organizations';
  END IF;

  -- Create the organization
  INSERT INTO organizations (name, description)
  VALUES (org_name, org_description)
  RETURNING id INTO new_org_id;
  
  -- If admin_email is provided, try to find and assign that user
  IF admin_email IS NOT NULL THEN
    -- Look for existing user with that email
    SELECT au.id INTO admin_user_id
    FROM auth.users au
    WHERE au.email = admin_email
    LIMIT 1;
    
    IF admin_user_id IS NOT NULL THEN
      -- Check if user is already in another organization (single-org constraint)
      IF EXISTS (
        SELECT 1 FROM organization_members 
        WHERE user_id = admin_user_id
      ) THEN
        RAISE EXCEPTION 'User % is already a member of another organization', admin_email;
      END IF;
      
      -- Add user as admin
      INSERT INTO organization_members (user_id, organization_id, role)
      VALUES (admin_user_id, new_org_id, 'admin');
    ELSE
      -- Create an invitation for the email
      INSERT INTO organization_invitations (
        email,
        role,
        organization_id,
        invited_by,
        expires_at
      ) VALUES (
        admin_email,
        'admin',
        new_org_id,
        auth.uid(),
        NOW() + INTERVAL '30 days'
      );
    END IF;
  END IF;
  
  RETURN new_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Function to get organization members for platform admin
CREATE OR REPLACE FUNCTION get_organization_members_for_platform_admin(org_id UUID)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  role TEXT,
  joined_at TIMESTAMP WITH TIME ZONE,
  avatar_url TEXT
) AS $$
BEGIN
  -- Check if caller is a platform operator
  IF NOT EXISTS (
    SELECT 1 FROM platform_operators 
    WHERE user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Only platform operators can view organization members';
  END IF;

  RETURN QUERY
  SELECT 
    om.user_id,
    au.email,
    p.full_name,
    om.role,
    om.created_at as joined_at,
    p.avatar_url
  FROM organization_members om
  JOIN auth.users au ON om.user_id = au.id
  LEFT JOIN profiles p ON om.user_id = p.id
  WHERE om.organization_id = org_id
  ORDER BY om.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Function to add user to organization (for platform admin)
CREATE OR REPLACE FUNCTION add_user_to_organization_as_platform_admin(
  org_id UUID,
  user_email TEXT,
  user_role TEXT DEFAULT 'member'
)
RETURNS BOOLEAN AS $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Check if caller is a platform operator
  IF NOT EXISTS (
    SELECT 1 FROM platform_operators 
    WHERE user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Only platform operators can add users to organizations';
  END IF;

  -- Validate role
  IF user_role NOT IN ('member', 'admin', 'owner') THEN
    RAISE EXCEPTION 'Invalid role: %', user_role;
  END IF;

  -- Find user by email
  SELECT au.id INTO target_user_id
  FROM auth.users au
  WHERE au.email = user_email
  LIMIT 1;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;
  
  -- Check if user is already in another organization
  IF EXISTS (
    SELECT 1 FROM organization_members 
    WHERE user_id = target_user_id
  ) THEN
    RAISE EXCEPTION 'User is already a member of another organization';
  END IF;
  
  -- Add user to organization
  INSERT INTO organization_members (user_id, organization_id, role)
  VALUES (target_user_id, org_id, user_role);
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Function to remove user from organization (for platform admin)
CREATE OR REPLACE FUNCTION remove_user_from_organization_as_platform_admin(
  org_id UUID,
  target_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if caller is a platform operator
  IF NOT EXISTS (
    SELECT 1 FROM platform_operators 
    WHERE user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Only platform operators can remove users from organizations';
  END IF;

  -- Remove user from organization
  DELETE FROM organization_members 
  WHERE user_id = target_user_id AND organization_id = org_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Function to set platform admin context to a specific organization
CREATE OR REPLACE FUNCTION set_platform_admin_context(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if caller is a platform operator
  IF NOT EXISTS (
    SELECT 1 FROM platform_operators 
    WHERE user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Only platform operators can set organization context';
  END IF;

  -- For now, this is a placeholder function
  -- In a full implementation, you might store the context in a session table
  -- or use other mechanisms to track which org the platform admin is managing
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Function to get organization invitations for platform admin
CREATE OR REPLACE FUNCTION get_organization_invitations_for_platform_admin(org_id UUID)
RETURNS TABLE (
  id UUID,
  email TEXT,
  role TEXT,
  invited_by UUID,
  inviter_name TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  -- Check if caller is a platform operator
  IF NOT EXISTS (
    SELECT 1 FROM platform_operators 
    WHERE user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Only platform operators can view organization invitations';
  END IF;

  RETURN QUERY
  SELECT 
    oi.id,
    oi.email,
    oi.role,
    oi.invited_by,
    p.full_name as inviter_name,
    oi.expires_at,
    oi.created_at
  FROM organization_invitations oi
  LEFT JOIN profiles p ON oi.invited_by = p.id
  WHERE oi.organization_id = org_id
  AND oi.expires_at > NOW()
  ORDER BY oi.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create platform_operators table if it doesn't exist
CREATE TABLE IF NOT EXISTS platform_operators (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on platform_operators
ALTER TABLE platform_operators ENABLE ROW LEVEL SECURITY;

-- Only platform operators can view platform operators
CREATE POLICY "Platform operators can view platform operators" ON platform_operators
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM platform_operators po 
      WHERE po.user_id = auth.uid()
    )
  );

-- 9. Add helpful comments
COMMENT ON FUNCTION get_all_organizations_for_platform_admin() IS 'Platform operators can view all organizations with member counts';
COMMENT ON FUNCTION create_organization_with_admin(TEXT, TEXT, TEXT) IS 'Platform operators can create organizations and optionally assign an admin';
COMMENT ON FUNCTION add_user_to_organization_as_platform_admin(UUID, TEXT, TEXT) IS 'Platform operators can add users to any organization';
COMMENT ON FUNCTION remove_user_from_organization_as_platform_admin(UUID, UUID) IS 'Platform operators can remove users from any organization'; 