-- Create forms table
CREATE TABLE IF NOT EXISTS public.forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  schema JSONB,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'draft',
  version INTEGER DEFAULT 1,
  is_template BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create form_categories table
CREATE TABLE IF NOT EXISTS public.form_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create form_category_mappings table
CREATE TABLE IF NOT EXISTS public.form_category_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES public.forms(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.form_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create form_validation_rules table
CREATE TABLE IF NOT EXISTS public.form_validation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES public.forms(id) ON DELETE CASCADE,
  field_id TEXT NOT NULL,
  rule_type TEXT NOT NULL,
  rule_value TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create form_field_dependencies table
CREATE TABLE IF NOT EXISTS public.form_field_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES public.forms(id) ON DELETE CASCADE,
  dependent_field_id TEXT NOT NULL,
  controlling_field_id TEXT NOT NULL,
  condition TEXT NOT NULL,
  value TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_category_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_validation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_field_dependencies ENABLE ROW LEVEL SECURITY;

-- Create policies for forms
CREATE POLICY "Users can view forms in their organization"
  ON public.forms
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_organizations
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert forms in their organization"
  ON public.forms
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.user_organizations
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update forms in their organization"
  ON public.forms
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_organizations
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete forms in their organization"
  ON public.forms
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_organizations
      WHERE user_id = auth.uid()
    )
  );

-- Create similar policies for form_categories
CREATE POLICY "Users can view form categories in their organization"
  ON public.form_categories
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_organizations
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert form categories in their organization"
  ON public.form_categories
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.user_organizations
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update form categories in their organization"
  ON public.form_categories
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_organizations
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete form categories in their organization"
  ON public.form_categories
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_organizations
      WHERE user_id = auth.uid()
    )
  );

-- Create policies for form_category_mappings
CREATE POLICY "Users can view form category mappings"
  ON public.form_category_mappings
  FOR SELECT
  USING (
    form_id IN (
      SELECT id FROM public.forms
      WHERE organization_id IN (
        SELECT organization_id FROM public.user_organizations
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage form category mappings"
  ON public.form_category_mappings
  FOR ALL
  USING (
    form_id IN (
      SELECT id FROM public.forms
      WHERE organization_id IN (
        SELECT organization_id FROM public.user_organizations
        WHERE user_id = auth.uid()
      )
    )
  );

-- Create policies for form_validation_rules
CREATE POLICY "Users can view form validation rules"
  ON public.form_validation_rules
  FOR SELECT
  USING (
    form_id IN (
      SELECT id FROM public.forms
      WHERE organization_id IN (
        SELECT organization_id FROM public.user_organizations
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage form validation rules"
  ON public.form_validation_rules
  FOR ALL
  USING (
    form_id IN (
      SELECT id FROM public.forms
      WHERE organization_id IN (
        SELECT organization_id FROM public.user_organizations
        WHERE user_id = auth.uid()
      )
    )
  );

-- Create policies for form_field_dependencies
CREATE POLICY "Users can view form field dependencies"
  ON public.form_field_dependencies
  FOR SELECT
  USING (
    form_id IN (
      SELECT id FROM public.forms
      WHERE organization_id IN (
        SELECT organization_id FROM public.user_organizations
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage form field dependencies"
  ON public.form_field_dependencies
  FOR ALL
  USING (
    form_id IN (
      SELECT id FROM public.forms
      WHERE organization_id IN (
        SELECT organization_id FROM public.user_organizations
        WHERE user_id = auth.uid()
      )
    )
  );

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to update the updated_at timestamp
CREATE TRIGGER set_forms_updated_at
BEFORE UPDATE ON public.forms
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_form_categories_updated_at
BEFORE UPDATE ON public.form_categories
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_form_validation_rules_updated_at
BEFORE UPDATE ON public.form_validation_rules
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_form_field_dependencies_updated_at
BEFORE UPDATE ON public.form_field_dependencies
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at(); 