-- Add parent-child relationship support
ALTER TABLE assets
ADD COLUMN IF NOT EXISTS parent_asset_id UUID REFERENCES assets(id) ON DELETE SET NULL;

-- Add location tracking fields
ALTER TABLE assets
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS location_details TEXT;

-- Create index for efficient parent-child queries
CREATE INDEX IF NOT EXISTS idx_assets_parent_asset_id ON assets(parent_asset_id);

-- Update RLS policies to account for the new fields
DROP POLICY IF EXISTS "Users can view their organization's assets" ON assets;
CREATE POLICY "Users can view their organization's assets" 
ON assets FOR SELECT 
USING (
  organization_id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can insert assets in their organization" ON assets;
CREATE POLICY "Users can insert assets in their organization" 
ON assets FOR INSERT 
WITH CHECK (
  organization_id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can update assets in their organization" ON assets;
CREATE POLICY "Users can update assets in their organization" 
ON assets FOR UPDATE 
USING (
  organization_id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid()
  )
); 