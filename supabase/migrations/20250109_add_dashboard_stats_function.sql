-- Get dashboard statistics for an organization
CREATE OR REPLACE FUNCTION get_dashboard_stats(org_id UUID)
RETURNS TABLE (
  inventory_count BIGINT,
  form_count BIGINT,
  asset_type_count BIGINT,
  team_member_count BIGINT
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
    (SELECT COUNT(*) FROM inventory_items WHERE organization_id = org_id AND deleted_at IS NULL) as inventory_count,
    (SELECT COUNT(*) FROM forms WHERE organization_id = org_id AND deleted_at IS NULL) as form_count,
    (SELECT COUNT(*) FROM asset_types WHERE organization_id = org_id AND deleted_at IS NULL) as asset_type_count,
    (SELECT COUNT(*) FROM organization_members WHERE organization_id = org_id) as team_member_count;
END;
$$; 