-- Migration to enable pg_trgm extension for similarity functions
-- 20240622000000_enable_pg_trgm.sql

-- Enable the pg_trgm extension if it doesn't exist
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Update the getRecommendedFormsForAssetType function to use similarity with proper fallback
CREATE OR REPLACE FUNCTION public.get_recommended_forms_for_asset_type(
  p_asset_type_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_asset_type RECORD;
  v_forms JSONB;
BEGIN
  -- Get the asset type details
  SELECT name, description INTO v_asset_type
  FROM public.asset_types
  WHERE id = p_asset_type_id;
  
  -- If the asset type doesn't exist, return empty array
  IF NOT FOUND THEN
    RETURN '[]'::JSONB;
  END IF;
  
  -- Check if pg_trgm extension is available
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm'
  ) THEN
    -- Use similarity function if extension is available
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'form_id', f.id,
        'form_name', f.name,
        'form_description', f.description,
        'form_type', CASE
          WHEN f.name ILIKE '%intake%' OR f.name ILIKE '%new%' THEN 'intake'
          WHEN f.name ILIKE '%inventory%' OR f.name ILIKE '%check%' THEN 'inventory'
          ELSE 'general'
        END,
        'similarity_score', 
          (similarity(f.name, v_asset_type.name) + 
           similarity(COALESCE(f.description, ''), COALESCE(v_asset_type.description, ''))) / 2
      )
    ), '[]'::JSONB) INTO v_forms
    FROM public.forms f
    WHERE f.organization_id = (
      SELECT organization_id FROM public.asset_types WHERE id = p_asset_type_id
    )
    ORDER BY 
      (similarity(f.name, v_asset_type.name) + 
       similarity(COALESCE(f.description, ''), COALESCE(v_asset_type.description, ''))) DESC
    LIMIT 10;
  ELSE
    -- Fallback if pg_trgm is not available - simple text matching
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'form_id', f.id,
        'form_name', f.name,
        'form_description', f.description,
        'form_type', CASE
          WHEN f.name ILIKE '%intake%' OR f.name ILIKE '%new%' THEN 'intake'
          WHEN f.name ILIKE '%inventory%' OR f.name ILIKE '%check%' THEN 'inventory'
          ELSE 'general'
        END,
        'similarity_score', 1.0  -- Default score when similarity isn't available
      )
    ), '[]'::JSONB) INTO v_forms
    FROM public.forms f
    WHERE f.organization_id = (
      SELECT organization_id FROM public.asset_types WHERE id = p_asset_type_id
    )
    AND (
      f.name ILIKE '%' || v_asset_type.name || '%' OR
      COALESCE(f.description, '') ILIKE '%' || COALESCE(v_asset_type.description, '') || '%'
    )
    LIMIT 10;
  END IF;
  
  RETURN v_forms;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 