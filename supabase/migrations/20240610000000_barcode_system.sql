-- Migration file for barcode functionality implementation
-- 20240610000000_barcode_system.sql

-- Add barcode columns to asset_types table
ALTER TABLE public.asset_types 
  ADD COLUMN IF NOT EXISTS barcode_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS barcode_type TEXT DEFAULT 'qrcode' 
    CHECK (barcode_type IN ('qrcode', 'code128', 'code39')),
  ADD COLUMN IF NOT EXISTS barcode_prefix TEXT DEFAULT '';

-- Add barcode columns to inventory_items table
ALTER TABLE public.inventory_items 
  ADD COLUMN IF NOT EXISTS barcode TEXT,
  ADD COLUMN IF NOT EXISTS barcode_generated_at TIMESTAMPTZ;

-- Create index for efficient barcode lookups
CREATE INDEX IF NOT EXISTS idx_inventory_items_barcode 
  ON public.inventory_items (barcode);

-- Create function to generate barcodes for assets
CREATE OR REPLACE FUNCTION public.generate_asset_barcode(
  p_asset_type_id UUID,
  p_asset_id UUID
) RETURNS TEXT AS $$
DECLARE
  v_barcode TEXT;
  v_prefix TEXT;
  v_org_id UUID;
  v_current_count BIGINT;
BEGIN
  -- Get asset type details
  SELECT barcode_prefix, organization_id
  INTO v_prefix, v_org_id
  FROM asset_types
  WHERE id = p_asset_type_id;
  
  -- Get current count of inventory items for this asset type
  SELECT COUNT(*) + 1
  INTO v_current_count
  FROM inventory_items
  WHERE asset_type_id = p_asset_type_id;
  
  -- Generate barcode using prefix + asset type ID portion + running number
  v_barcode := COALESCE(v_prefix, '')
               || SUBSTRING(p_asset_type_id::text, 1, 8)
               || '-'
               || LPAD(v_current_count::text, 6, '0');
  
  -- Update the inventory item with the barcode
  UPDATE inventory_items
  SET barcode = v_barcode,
      barcode_generated_at = NOW()
  WHERE id = p_asset_id;
  
  RETURN v_barcode;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to find an asset by its barcode
CREATE OR REPLACE FUNCTION public.find_asset_by_barcode(
  p_barcode TEXT,
  p_user_id UUID DEFAULT auth.uid()
) RETURNS JSON AS $$
DECLARE
  v_asset_json JSON;
  v_org_id UUID;
BEGIN
  -- Get the user's current organization
  SELECT current_organization_id
  INTO v_org_id
  FROM users
  WHERE id = p_user_id;
  
  -- Find the asset and return as JSON
  SELECT json_build_object(
    'id', ii.id,
    'name', ii.name,
    'asset_type_id', ii.asset_type_id,
    'asset_type_name', at.name,
    'barcode', ii.barcode,
    'created_at', ii.created_at,
    'updated_at', ii.updated_at,
    'details', ii.form_data
  )
  INTO v_asset_json
  FROM inventory_items ii
  JOIN asset_types at ON ii.asset_type_id = at.id
  WHERE ii.barcode = p_barcode
    AND at.organization_id = v_org_id;
  
  IF v_asset_json IS NULL THEN
    RAISE EXCEPTION 'Asset with barcode % not found', p_barcode;
  END IF;
  
  RETURN v_asset_json;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to bulk generate barcodes for an asset type
CREATE OR REPLACE FUNCTION public.bulk_generate_barcodes(
  p_asset_type_id UUID,
  p_user_id UUID DEFAULT auth.uid()
) RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_asset_id UUID;
  v_org_id UUID;
  v_has_access BOOLEAN;
BEGIN
  -- Check if user has access to this asset type
  SELECT EXISTS (
    SELECT 1 
    FROM asset_types at
    JOIN organization_users ou ON at.organization_id = ou.organization_id
    WHERE at.id = p_asset_type_id 
    AND ou.user_id = p_user_id
  ) INTO v_has_access;
  
  IF NOT v_has_access THEN
    RAISE EXCEPTION 'User does not have access to this asset type';
  END IF;
  
  -- Loop through all inventory items of this type that don't have barcodes
  FOR v_asset_id IN 
    SELECT id 
    FROM inventory_items 
    WHERE asset_type_id = p_asset_type_id
    AND barcode IS NULL
  LOOP
    -- Generate barcode for each item
    PERFORM generate_asset_barcode(p_asset_type_id, v_asset_id);
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add RLS policy for barcode access
CREATE POLICY "Users can view barcodes from their organization" 
ON inventory_items
FOR SELECT
USING (
  asset_type_id IN (
    SELECT id FROM asset_types 
    WHERE organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid()
    )
  )
);

-- Add constraint for unique barcodes
ALTER TABLE public.inventory_items 
  ADD CONSTRAINT unique_barcode UNIQUE (barcode); 