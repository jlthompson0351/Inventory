-- Migration file to enhance QR code workflow with form associations
-- 20240620000000_qr_code_workflow_forms.sql

-- Ensure form ID columns exist on asset_types table for QR code workflow
ALTER TABLE public.asset_types 
  ADD COLUMN IF NOT EXISTS intake_form_id UUID REFERENCES public.forms(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS inventory_form_id UUID REFERENCES public.forms(id) ON DELETE SET NULL;

-- Create function to get form details after scanning a barcode
CREATE OR REPLACE FUNCTION public.get_asset_forms_by_barcode(
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
    'barcode', ii.barcode
  )
  INTO v_result
  FROM public.inventory_items ii
  JOIN public.asset_types at ON ii.asset_type_id = at.id
  WHERE ii.barcode = p_barcode;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 