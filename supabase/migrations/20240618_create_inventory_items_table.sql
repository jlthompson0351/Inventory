-- Create inventory_items table
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  sku TEXT,
  barcode TEXT,
  quantity INTEGER DEFAULT 0,
  location TEXT,
  category TEXT,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

-- Create policy for users to see inventory items in their organization
CREATE POLICY "Users can view inventory items in their organization"
  ON public.inventory_items
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_organizations
      WHERE user_id = auth.uid()
    )
  );

-- Create policy for users to insert inventory items in their organization
CREATE POLICY "Users can insert inventory items in their organization"
  ON public.inventory_items
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.user_organizations
      WHERE user_id = auth.uid()
    )
  );

-- Create policy for users to update inventory items in their organization
CREATE POLICY "Users can update inventory items in their organization"
  ON public.inventory_items
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_organizations
      WHERE user_id = auth.uid()
    )
  );

-- Create policy for users to delete inventory items in their organization
CREATE POLICY "Users can delete inventory items in their organization"
  ON public.inventory_items
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_organizations
      WHERE user_id = auth.uid()
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

-- Create trigger to update the updated_at timestamp
CREATE TRIGGER set_inventory_items_updated_at
BEFORE UPDATE ON public.inventory_items
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at(); 