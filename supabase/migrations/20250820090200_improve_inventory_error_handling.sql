-- Improve error handling consistency across inventory functions
-- Add better error messages and validation

-- Enhanced version of get_asset_with_inventory_status with better error handling
CREATE OR REPLACE FUNCTION get_asset_with_inventory_status(p_asset_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  asset_record RECORD;
BEGIN
  -- Check if user has access to this asset's organization
  IF NOT EXISTS (
    SELECT 1 FROM assets a
    JOIN organization_members om ON a.organization_id = om.organization_id
    WHERE a.id = p_asset_id
    AND om.user_id = auth.uid()
    AND a.is_deleted = false
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Access denied: Asset not found or no permission to access'
    );
  END IF;

  -- Get asset with inventory status
  SELECT
    a.id as asset_id,
    a.name as asset_name,
    a.description as asset_description,
    a.status as asset_status,
    COALESCE(
      CASE
        WHEN a.metadata IS NOT NULL AND a.metadata ? 'location'
        THEN a.metadata->>'location'
        ELSE NULL
      END,
      'Location TBD'
    ) as asset_location,
    a.asset_type_id,
    at.name as asset_type_name,
    (i.id IS NOT NULL) as has_inventory,
    i.id as inventory_item_id,
    COALESCE(i.quantity, 0) as current_quantity,
    COALESCE(i.updated_at, a.created_at) as last_check_date,
    COALESCE(i.status, a.status, 'active') as inventory_status,
    a.organization_id
  INTO asset_record
  FROM assets a
  LEFT JOIN asset_types at ON a.asset_type_id = at.id
  LEFT JOIN inventory_items i ON a.id = i.asset_id AND i.is_deleted = false
  WHERE a.id = p_asset_id
    AND a.is_deleted = false;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Asset not found or has been deleted'
    );
  END IF;

  -- Return successful result
  result := jsonb_build_object(
    'success', true,
    'data', row_to_json(asset_record)
  );

  RETURN result;
END;
$$;

-- Enhanced version of get_organization_assets_with_inventory with better error handling
CREATE OR REPLACE FUNCTION get_organization_assets_with_inventory(p_organization_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Check if user is member of the organization
  IF NOT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = p_organization_id
    AND user_id = auth.uid()
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Access denied: User is not a member of this organization'
    );
  END IF;

  -- Check if organization exists and is not deleted
  IF NOT EXISTS (
    SELECT 1 FROM organizations
    WHERE id = p_organization_id
    AND (is_deleted = false OR is_deleted IS NULL)
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Organization not found or has been deleted'
    );
  END IF;

  -- Get assets with inventory data
  SELECT jsonb_build_object(
    'success', true,
    'data', jsonb_agg(
      jsonb_build_object(
        'asset_id', a.id,
        'asset_name', a.name,
        'asset_description', a.description,
        'asset_status', a.status,
        'asset_location', COALESCE(
          CASE
            WHEN a.metadata IS NOT NULL AND a.metadata ? 'location'
            THEN a.metadata->>'location'
            ELSE NULL
          END,
          'Location TBD'
        ),
        'asset_type_id', a.asset_type_id,
        'asset_type_name', at.name,
        'asset_type_color', COALESCE(at.color, '#6E56CF'),
        'has_inventory', (i.id IS NOT NULL),
        'inventory_item_id', i.id,
        'current_quantity', COALESCE(i.quantity, 0),
        'last_check_date', COALESCE(i.updated_at, a.created_at),
        'inventory_status', COALESCE(i.status, a.status, 'active'),
        'created_at', a.created_at
      )
    )
  ) INTO result
  FROM assets a
  LEFT JOIN asset_types at ON a.asset_type_id = at.id
  LEFT JOIN inventory_items i ON a.id = i.asset_id AND i.is_deleted = false
  WHERE a.organization_id = p_organization_id
    AND a.is_deleted = false
  ORDER BY a.created_at DESC;

  -- Handle case where no assets exist
  IF result IS NULL OR result->'data' IS NULL THEN
    result := jsonb_build_object(
      'success', true,
      'data', '[]'::jsonb
    );
  END IF;

  RETURN result;
END;
$$;

-- Add comments for documentation
COMMENT ON FUNCTION get_asset_with_inventory_status(UUID) IS 'Enhanced version with better error handling and consistent response format';
COMMENT ON FUNCTION get_organization_assets_with_inventory(UUID) IS 'Enhanced version with better error handling and consistent response format';

