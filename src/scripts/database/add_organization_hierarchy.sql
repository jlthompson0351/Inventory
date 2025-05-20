-- Add parent_id column to organizations table to support hierarchical structure
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.organizations (id) NULL;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS hierarchy_level INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS description TEXT NULL;

-- Update types in the database
DO $$BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type 
    WHERE typname = '_organization_hierarchy'
  ) THEN
    CREATE TYPE public.organization_hierarchy AS (
      id UUID,
      name TEXT,
      parent_id UUID,
      hierarchy_level INTEGER,
      avatar_url TEXT,
      description TEXT
    );
  END IF;
END$$;

-- Create function to get organization hierarchy
CREATE OR REPLACE FUNCTION get_organization_hierarchy(root_id UUID)
RETURNS SETOF organization_hierarchy
LANGUAGE SQL
STABLE
AS $$
  WITH RECURSIVE org_tree AS (
    -- Base case: the root organization
    SELECT 
      id, 
      name, 
      parent_id, 
      hierarchy_level, 
      avatar_url,
      description
    FROM 
      organizations
    WHERE 
      id = root_id
    
    UNION ALL
    
    -- Recursive case: all organizations with parent matching the current level
    SELECT 
      o.id, 
      o.name, 
      o.parent_id, 
      o.hierarchy_level, 
      o.avatar_url,
      o.description
    FROM 
      organizations o
    JOIN 
      org_tree ot ON o.parent_id = ot.id
  )
  SELECT * FROM org_tree ORDER BY hierarchy_level, name;
$$;

-- Function to get ancestors of an organization
CREATE OR REPLACE FUNCTION get_organization_ancestors(org_id UUID)
RETURNS SETOF organization_hierarchy
LANGUAGE SQL
STABLE
AS $$
  WITH RECURSIVE ancestors AS (
    -- Base case: the starting organization
    SELECT 
      id, 
      name, 
      parent_id, 
      hierarchy_level, 
      avatar_url,
      description
    FROM 
      organizations
    WHERE 
      id = org_id
    
    UNION ALL
    
    -- Recursive case: the parent of the current organization
    SELECT 
      o.id, 
      o.name, 
      o.parent_id, 
      o.hierarchy_level, 
      o.avatar_url,
      o.description
    FROM 
      organizations o
    JOIN 
      ancestors a ON o.id = a.parent_id
  )
  SELECT * FROM ancestors ORDER BY hierarchy_level;
$$;

-- Function to get children of an organization (direct descendants only)
CREATE OR REPLACE FUNCTION get_organization_children(parent_org_id UUID)
RETURNS SETOF organization_hierarchy
LANGUAGE SQL
STABLE
AS $$
  SELECT 
    id, 
    name, 
    parent_id, 
    hierarchy_level, 
    avatar_url,
    description
  FROM 
    organizations
  WHERE 
    parent_id = parent_org_id
  ORDER BY 
    name;
$$;

-- Trigger function to ensure hierarchy_level is correctly set
CREATE OR REPLACE FUNCTION update_organization_hierarchy_level()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- For new or updated records with a parent
  IF NEW.parent_id IS NOT NULL THEN
    -- Set hierarchy_level one higher than parent
    SELECT hierarchy_level + 1 INTO NEW.hierarchy_level
    FROM organizations
    WHERE id = NEW.parent_id;
  ELSE
    -- Root organizations are level 0
    NEW.hierarchy_level := 0;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically update hierarchy_level
DROP TRIGGER IF EXISTS org_hierarchy_level_trigger ON organizations;
CREATE TRIGGER org_hierarchy_level_trigger
BEFORE INSERT OR UPDATE OF parent_id ON organizations
FOR EACH ROW EXECUTE FUNCTION update_organization_hierarchy_level();

-- Comment on columns
COMMENT ON COLUMN organizations.parent_id IS 'Reference to the parent organization in the hierarchy';
COMMENT ON COLUMN organizations.hierarchy_level IS 'Level in the organizational hierarchy (0 for root organizations)';
COMMENT ON COLUMN organizations.description IS 'Detailed description of the organization'; 