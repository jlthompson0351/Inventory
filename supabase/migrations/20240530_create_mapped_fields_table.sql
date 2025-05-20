-- Create mapped_fields table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.mapped_fields (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
    field_id TEXT NOT NULL,
    field_label TEXT NOT NULL,
    field_type TEXT NOT NULL,
    description TEXT,
    aggregatable BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(form_id, field_id)
);

-- Add RLS policies
ALTER TABLE public.mapped_fields ENABLE ROW LEVEL SECURITY;

-- Policy for select: users can select mapped fields from their organizations
CREATE POLICY mapped_fields_select_policy
    ON public.mapped_fields FOR SELECT
    USING (
        (organization_id IN (
            SELECT organization_id FROM public.organization_members
            WHERE user_id = auth.uid()
        ))
    );

-- Policy for insert: users can insert mapped fields into their organizations
CREATE POLICY mapped_fields_insert_policy
    ON public.mapped_fields FOR INSERT
    WITH CHECK (
        (organization_id IN (
            SELECT organization_id FROM public.organization_members
            WHERE user_id = auth.uid() AND (role = 'admin' OR role = 'owner')
        ))
    );

-- Policy for update: users can update mapped fields in their organizations
CREATE POLICY mapped_fields_update_policy
    ON public.mapped_fields FOR UPDATE
    USING (
        (organization_id IN (
            SELECT organization_id FROM public.organization_members
            WHERE user_id = auth.uid() AND (role = 'admin' OR role = 'owner')
        ))
    )
    WITH CHECK (
        (organization_id IN (
            SELECT organization_id FROM public.organization_members
            WHERE user_id = auth.uid() AND (role = 'admin' OR role = 'owner')
        ))
    );

-- Policy for delete: users can delete mapped fields in their organizations
CREATE POLICY mapped_fields_delete_policy
    ON public.mapped_fields FOR DELETE
    USING (
        (organization_id IN (
            SELECT organization_id FROM public.organization_members
            WHERE user_id = auth.uid() AND (role = 'admin' OR role = 'owner')
        ))
    );

-- Create functions for managing mapped fields

-- Register a mapped field
CREATE OR REPLACE FUNCTION public.register_mapped_field(
  p_organization_id UUID,
  p_form_id UUID, 
  p_field_id TEXT, 
  p_field_label TEXT,
  p_field_type TEXT,
  p_description TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_mapped_field_id UUID;
BEGIN
  -- Insert or update the mapped field
  INSERT INTO public.mapped_fields (
    organization_id,
    form_id,
    field_id,
    field_label,
    field_type,
    description
  ) VALUES (
    p_organization_id,
    p_form_id,
    p_field_id,
    p_field_label,
    p_field_type,
    p_description
  )
  ON CONFLICT (form_id, field_id) 
  DO UPDATE SET
    field_label = p_field_label,
    field_type = p_field_type,
    description = p_description,
    updated_at = now()
  RETURNING id INTO v_mapped_field_id;
  
  RETURN v_mapped_field_id;
END;
$$;

-- Unregister a mapped field
CREATE OR REPLACE FUNCTION public.unregister_mapped_field(
  p_form_id UUID, 
  p_field_id TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  DELETE FROM public.mapped_fields
  WHERE form_id = p_form_id AND field_id = p_field_id
  RETURNING 1 INTO v_count;
  
  RETURN v_count IS NOT NULL;
END;
$$;

-- Get all mappable fields for an organization
CREATE OR REPLACE FUNCTION public.get_mappable_fields(p_organization_id UUID)
RETURNS SETOF public.mapped_fields
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.mapped_fields
  WHERE organization_id = p_organization_id
  ORDER BY field_label;
END;
$$;

-- Get all mappable fields for a specific form
CREATE OR REPLACE FUNCTION public.get_form_mappable_fields(p_form_id UUID)
RETURNS SETOF public.mapped_fields
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.mapped_fields
  WHERE form_id = p_form_id
  ORDER BY field_label;
END;
$$;

-- Set proper permissions on functions
REVOKE ALL ON FUNCTION public.register_mapped_field(UUID, UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_mapped_field(UUID, UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.unregister_mapped_field(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.unregister_mapped_field(UUID, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.get_mappable_fields(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_mappable_fields(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.get_form_mappable_fields(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_form_mappable_fields(UUID) TO authenticated; 