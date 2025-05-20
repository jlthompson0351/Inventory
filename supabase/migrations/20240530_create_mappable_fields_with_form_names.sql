-- Create a function to get mappable fields with their associated form names
CREATE OR REPLACE FUNCTION public.get_mappable_fields_with_form_names(p_organization_id uuid)
RETURNS SETOF json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    json_build_object(
      'id', mf.id,
      'organization_id', mf.organization_id,
      'form_id', mf.form_id,
      'field_id', mf.field_id,
      'field_label', mf.field_label,
      'field_type', mf.field_type,
      'form_name', f.name,
      'description', mf.description,
      'created_at', mf.created_at,
      'updated_at', mf.updated_at
    )
  FROM 
    public.mapped_fields mf
  JOIN
    public.forms f ON mf.form_id = f.id
  WHERE 
    mf.organization_id = p_organization_id
  ORDER BY
    f.name, mf.field_label;
END;
$$;

-- Set proper permissions
REVOKE ALL ON FUNCTION public.get_mappable_fields_with_form_names(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_mappable_fields_with_form_names(uuid) TO authenticated; 