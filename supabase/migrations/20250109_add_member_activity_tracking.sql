-- Get organization members with activity data
CREATE OR REPLACE FUNCTION get_organization_members_with_activity(org_id UUID)
RETURNS TABLE (
  member_id UUID,
  user_id UUID,
  role TEXT,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  joined_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  recent_activity_count BIGINT,
  session_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is member of the organization
  IF NOT is_member_of_organization(org_id) THEN
    RAISE EXCEPTION 'Access denied: User is not a member of this organization';
  END IF;

  RETURN QUERY
  SELECT 
    om.id as member_id,
    om.user_id,
    om.role,
    COALESCE(au.email, u.email) as email,
    COALESCE(au.raw_user_meta_data->>'full_name', u.full_name) as full_name,
    u.avatar_url,
    om.joined_at,
    au.last_sign_in_at,
    au.created_at,
    COALESCE(activity_counts.recent_count, 0) as recent_activity_count,
    COALESCE(session_counts.session_count, 0) as session_count
  FROM organization_members om
  LEFT JOIN users u ON u.id = om.user_id
  LEFT JOIN auth.users au ON au.id = om.user_id
  -- Count recent activities from system_logs (last 30 days)
  LEFT JOIN (
    SELECT 
      actor_id,
      COUNT(*) as recent_count
    FROM system_logs 
    WHERE created_at >= NOW() - INTERVAL '30 days'
    AND organization_id = org_id
    GROUP BY actor_id
  ) activity_counts ON activity_counts.actor_id = om.user_id
  -- Count recent sessions (last 7 days)
  LEFT JOIN (
    SELECT 
      user_id,
      COUNT(*) as session_count
    FROM auth.sessions 
    WHERE updated_at >= NOW() - INTERVAL '7 days'
    GROUP BY user_id
  ) session_counts ON session_counts.user_id = om.user_id
  WHERE om.organization_id = org_id
  ORDER BY om.joined_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_organization_members_with_activity(UUID) TO authenticated; 