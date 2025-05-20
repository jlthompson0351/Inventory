-- Add parent_id column to organizations table
ALTER TABLE organizations ADD COLUMN parent_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- Add index for faster querying of parent-child relationships
CREATE INDEX idx_organizations_parent_id ON organizations(parent_id);

-- Create a function to prevent circular references in the organization hierarchy
CREATE OR REPLACE FUNCTION prevent_circular_org_hierarchy()
RETURNS TRIGGER AS $$
DECLARE
    ancestor_id UUID;
BEGIN
    -- If parent_id is NULL, no circular reference is possible
    IF NEW.parent_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Self-reference is not allowed
    IF NEW.id = NEW.parent_id THEN
        RAISE EXCEPTION 'Organization cannot be its own parent';
    END IF;
    
    -- Check if any ancestors would create a circular reference
    ancestor_id := NEW.parent_id;
    WHILE ancestor_id IS NOT NULL LOOP
        -- If we find the current org as an ancestor, it's a circular reference
        IF ancestor_id = NEW.id THEN
            RAISE EXCEPTION 'Circular reference detected in organization hierarchy';
        END IF;
        
        -- Move up to the next ancestor
        SELECT parent_id INTO ancestor_id
        FROM organizations
        WHERE id = ancestor_id;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce hierarchy integrity
CREATE TRIGGER enforce_org_hierarchy_integrity
BEFORE INSERT OR UPDATE ON organizations
FOR EACH ROW
EXECUTE FUNCTION prevent_circular_org_hierarchy(); 