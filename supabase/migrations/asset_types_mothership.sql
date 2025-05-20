-- Create function to get asset types with counts for an organization
CREATE OR REPLACE FUNCTION public.get_asset_types_with_counts(org_id UUID)
RETURNS TABLE(
  id UUID,
  name TEXT,
  description TEXT,
  organization_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  color TEXT,
  icon TEXT,
  deleted_at TIMESTAMPTZ,
  item_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY 
  SELECT 
    at.id,
    at.name,
    at.description,
    at.organization_id,
    at.created_at,
    at.updated_at,
    at.color,
    at.icon,
    at.deleted_at,
    COUNT(ii.id)::BIGINT as item_count
  FROM 
    public.asset_types at
  LEFT JOIN 
    public.inventory_items ii ON at.id = ii.asset_type_id
  WHERE 
    at.organization_id = org_id
    AND at.deleted_at IS NULL
  GROUP BY 
    at.id
  ORDER BY 
    at.name;
END;
$$;

-- Create function to get mothership asset types (all asset types across organizations)
CREATE OR REPLACE FUNCTION public.get_mothership_asset_types(admin_user_id UUID)
RETURNS TABLE(
  id UUID,
  name TEXT,
  description TEXT,
  organization_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  color TEXT,
  icon TEXT,
  deleted_at TIMESTAMPTZ,
  item_count BIGINT,
  organization_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the user is a system admin
  IF NOT EXISTS (
    SELECT 1 FROM public.system_roles 
    WHERE user_id = admin_user_id AND role = 'ADMIN'
  ) THEN
    RAISE EXCEPTION 'Access denied: User is not a system administrator';
  END IF;

  RETURN QUERY 
  SELECT 
    at.id,
    at.name,
    at.description,
    at.organization_id,
    at.created_at,
    at.updated_at,
    at.color,
    at.icon,
    at.deleted_at,
    COUNT(ii.id)::BIGINT as item_count,
    o.name as organization_name
  FROM 
    public.asset_types at
  JOIN 
    public.organizations o ON at.organization_id = o.id
  LEFT JOIN 
    public.inventory_items ii ON at.id = ii.asset_type_id
  WHERE 
    at.deleted_at IS NULL
  GROUP BY 
    at.id, o.name
  ORDER BY 
    o.name, at.name;
END;
$$;

-- Function to clone an asset type from one organization to another
CREATE OR REPLACE FUNCTION public.clone_asset_type(
  source_asset_type_id UUID,
  target_organization_id UUID,
  user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_asset_type_id UUID;
  source_asset_type public.asset_types;
BEGIN
  -- Check if user has access to target organization
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members 
    WHERE user_id = user_id 
    AND organization_id = target_organization_id
  ) THEN
    RAISE EXCEPTION 'Access denied: User not a member of target organization';
  END IF;
  
  -- Get source asset type
  SELECT * INTO source_asset_type
  FROM public.asset_types
  WHERE id = source_asset_type_id;
  
  IF source_asset_type IS NULL THEN
    RAISE EXCEPTION 'Source asset type not found';
  END IF;
  
  -- Create new asset type in target organization
  INSERT INTO public.asset_types (
    name,
    description,
    organization_id,
    color,
    icon,
    created_at,
    updated_at
  ) VALUES (
    source_asset_type.name,
    source_asset_type.description,
    target_organization_id,
    source_asset_type.color,
    source_asset_type.icon,
    NOW(),
    NOW()
  ) RETURNING id INTO new_asset_type_id;
  
  RETURN new_asset_type_id;
END;
$$; 