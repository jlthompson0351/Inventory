CREATE OR REPLACE FUNCTION public.get_table_counts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  counts jsonb;
BEGIN
  WITH table_counts AS (
    SELECT 'organizations' as table_name, count(*) as record_count FROM organizations
    UNION ALL
    SELECT 'organization_members' as table_name, count(*) as record_count FROM organization_members
    UNION ALL
    SELECT 'inventory_items' as table_name, count(*) as record_count FROM inventory_items
    UNION ALL
    SELECT 'asset_types' as table_name, count(*) as record_count FROM asset_types
    UNION ALL
    SELECT 'forms' as table_name, count(*) as record_count FROM forms
    UNION ALL
    SELECT 'profiles' as table_name, count(*) as record_count FROM profiles
    UNION ALL
    SELECT 'system_roles' as table_name, count(*) as record_count FROM system_roles
  )
  SELECT jsonb_object_agg(table_name, record_count) INTO counts FROM table_counts;
  
  RETURN counts;
END;
$$; 