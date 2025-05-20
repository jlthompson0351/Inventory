-- Create inventory_history table for tracking inventory checks over time
CREATE TABLE IF NOT EXISTS public.inventory_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  check_type TEXT NOT NULL, -- 'initial', 'periodic', etc.
  quantity INTEGER DEFAULT 0,
  condition TEXT,
  check_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notes TEXT,
  status TEXT,
  location TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS inventory_history_inventory_item_id_idx ON public.inventory_history(inventory_item_id);
CREATE INDEX IF NOT EXISTS inventory_history_organization_id_idx ON public.inventory_history(organization_id);
CREATE INDEX IF NOT EXISTS inventory_history_check_date_idx ON public.inventory_history(check_date);

-- Add RLS policies
ALTER TABLE public.inventory_history ENABLE ROW LEVEL SECURITY;

-- Create policy for users to see inventory history in their organization
CREATE POLICY "Users can view inventory history in their organization"
  ON public.inventory_history
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_organizations
      WHERE user_id = auth.uid()
    )
  );

-- Create policy for users to insert inventory history in their organization
CREATE POLICY "Users can insert inventory history in their organization"
  ON public.inventory_history
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.user_organizations
      WHERE user_id = auth.uid()
    )
  );

-- Add asset_id column to inventory_items if it doesn't exist 
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='inventory_items' AND column_name='asset_id') THEN
    ALTER TABLE public.inventory_items ADD COLUMN asset_id UUID REFERENCES public.assets(id);
    
    -- Add index for the new column
    CREATE INDEX inventory_items_asset_id_idx ON public.inventory_items(asset_id);
  END IF;
END $$;

-- Add asset_type_id column to inventory_items if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='inventory_items' AND column_name='asset_type_id') THEN
    ALTER TABLE public.inventory_items ADD COLUMN asset_type_id UUID REFERENCES public.asset_types(id);
    
    -- Add index for the new column
    CREATE INDEX inventory_items_asset_type_id_idx ON public.inventory_items(asset_type_id);
  END IF;
END $$;

-- Add metadata column to inventory_items if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='inventory_items' AND column_name='metadata') THEN
    ALTER TABLE public.inventory_items ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$; 