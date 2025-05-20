-- Migration file to add support for customizable calculation formulas per asset type
-- 20240621000000_asset_calculation_formulas.sql

-- Add calculation_formulas column to asset_types table
ALTER TABLE public.asset_types 
  ADD COLUMN IF NOT EXISTS calculation_formulas JSONB DEFAULT '{}'::jsonb;

-- Create function to get asset with calculation formulas by barcode
CREATE OR REPLACE FUNCTION public.get_asset_with_formulas_by_barcode(
  p_barcode TEXT
) RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'asset_id', ii.id,
    'asset_name', ii.name,
    'asset_type_id', ii.asset_type_id,
    'asset_type_name', at.name,
    'intake_form_id', at.intake_form_id,
    'inventory_form_id', at.inventory_form_id,
    'form_data', ii.form_data,
    'barcode', ii.barcode,
    'calculation_formulas', at.calculation_formulas
  )
  INTO v_result
  FROM public.inventory_items ii
  JOIN public.asset_types at ON ii.asset_type_id = at.id
  WHERE ii.barcode = p_barcode;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update function to apply calculation formulas when retrieving form data
CREATE OR REPLACE FUNCTION public.apply_asset_calculation_formulas(
  p_form_data JSONB,
  p_calculation_formulas JSONB
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB := p_form_data;
  v_formula TEXT;
  v_target_field TEXT;
  v_formula_rec RECORD;
BEGIN
  -- Iterate through each formula in the calculation_formulas object
  FOR v_formula_rec IN SELECT * FROM jsonb_each(p_calculation_formulas)
  LOOP
    v_target_field := v_formula_rec.key;
    v_formula := v_formula_rec.value::TEXT;
    
    -- Apply the formula (this is simplified - in real implementation,
    -- you would parse and evaluate the formula expression)
    -- Here we're just demonstrating the concept
    v_result := jsonb_set(v_result, ARRAY[v_target_field], 
                          to_jsonb('Formula applied: ' || v_formula));
  END LOOP;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql; 