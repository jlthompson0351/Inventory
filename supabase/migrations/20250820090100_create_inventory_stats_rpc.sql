-- Create get_inventory_stats RPC function to match frontend expectations
-- This function provides the exact stats structure expected by the frontend

CREATE OR REPLACE FUNCTION get_inventory_stats(org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  total_assets_count INTEGER;
  assets_with_inventory_count INTEGER;
  low_stock_count INTEGER;
  out_of_stock_count INTEGER;
  total_items_sum INTEGER;
  inventory_percentage INTEGER;
BEGIN
  -- Check if user is member of the organization
  IF NOT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id
    AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied: User is not a member of this organization';
  END IF;

  -- Get total assets count
  SELECT COUNT(*) INTO total_assets_count
  FROM assets
  WHERE organization_id = org_id
    AND is_deleted = false;

  -- Get assets with inventory count and total items
  SELECT
    COUNT(DISTINCT a.id),
    COALESCE(SUM(ii.quantity), 0)
  INTO assets_with_inventory_count, total_items_sum
  FROM assets a
  LEFT JOIN inventory_items ii ON a.id = ii.asset_id AND ii.is_deleted = false
  WHERE a.organization_id = org_id
    AND a.is_deleted = false
    AND ii.id IS NOT NULL;

  -- Get low stock count (≤ 10 units)
  SELECT COUNT(*) INTO low_stock_count
  FROM inventory_items
  WHERE organization_id = org_id
    AND is_deleted = false
    AND quantity <= 10
    AND quantity > 0;

  -- Get out of stock count (= 0 units)
  SELECT COUNT(*) INTO out_of_stock_count
  FROM inventory_items
  WHERE organization_id = org_id
    AND is_deleted = false
    AND quantity = 0;

  -- Calculate inventory percentage
  inventory_percentage := CASE
    WHEN total_assets_count > 0 THEN
      ROUND((assets_with_inventory_count::NUMERIC / total_assets_count::NUMERIC) * 100)::INTEGER
    ELSE 0
  END;

  -- Build result object
  result := jsonb_build_object(
    'totalAssets', total_assets_count,
    'assetsWithInventory', assets_with_inventory_count,
    'lowStockItems', low_stock_count,
    'outOfStockItems', out_of_stock_count,
    'totalItems', total_items_sum,
    'inventoryPercentage', inventory_percentage
  );

  RETURN result;
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION get_inventory_stats(UUID) IS 'Returns inventory statistics for organization dashboard - matches frontend expectations exactly';

