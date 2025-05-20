-- 20240722_inventory_workflow_enhancements.sql
-- Enhances the inventory workflow with proper form references and data storage

-- Make sure we have the necessary extensions
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Ensure asset_types has reference fields for intake and inventory forms
DO $$
BEGIN
    -- Check if intake_form_id column exists, and add it if not
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'asset_types' AND column_name = 'intake_form_id'
    ) THEN
        ALTER TABLE asset_types ADD COLUMN intake_form_id UUID REFERENCES forms(id);
    END IF;

    -- Check if inventory_form_id column exists, and add it if not
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'asset_types' AND column_name = 'inventory_form_id'
    ) THEN
        ALTER TABLE asset_types ADD COLUMN inventory_form_id UUID REFERENCES forms(id);
    END IF;
END
$$;

-- Ensure inventory_history has response_data column (JSONB type)
DO $$
BEGIN
    -- Check if response_data column exists, and add it if not
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'inventory_history' AND column_name = 'response_data'
    ) THEN
        ALTER TABLE inventory_history ADD COLUMN response_data JSONB;
    END IF;

    -- Check if event_type column exists, and add it if not
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'inventory_history' AND column_name = 'event_type'
    ) THEN
        ALTER TABLE inventory_history ADD COLUMN event_type TEXT;
        
        -- Set the initial event_type values based on check_type
        UPDATE inventory_history 
        SET event_type = CASE 
            WHEN check_type = 'initial' THEN 'intake'
            WHEN check_type = 'periodic' THEN 'check'
            ELSE check_type
        END;
    END IF;
END
$$;

-- Ensure 1-to-1 relationship between assets and inventory_items
DO $$
BEGIN
    -- Check if the constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_inventory_per_asset'
    ) THEN
        -- Add a unique constraint to asset_id in inventory_items
        ALTER TABLE inventory_items ADD CONSTRAINT unique_inventory_per_asset UNIQUE (asset_id);
    END IF;
END
$$;

-- Create database functions to support the workflow

-- Function to create a new asset with initial inventory
CREATE OR REPLACE FUNCTION create_asset_with_inventory(
    p_asset_data JSONB,
    p_intake_form_data JSONB,
    p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_asset_id UUID;
    v_inventory_id UUID;
    v_history_id UUID;
    v_result JSONB;
BEGIN
    -- Insert the asset record
    INSERT INTO assets (
        name, 
        description, 
        asset_type_id,
        organization_id,
        status,
        metadata,
        created_by,
        created_at
    )
    VALUES (
        p_asset_data->>'name',
        p_asset_data->>'description',
        (p_asset_data->>'asset_type_id')::UUID,
        (p_asset_data->>'organization_id')::UUID,
        COALESCE(p_asset_data->>'status', 'active'),
        p_asset_data->'metadata',
        p_user_id,
        NOW()
    )
    RETURNING id INTO v_asset_id;
    
    -- Insert the inventory item
    INSERT INTO inventory_items (
        name,
        description,
        asset_id,
        asset_type_id,
        organization_id,
        quantity,
        location,
        status,
        created_by,
        created_at
    )
    VALUES (
        p_asset_data->>'name',
        p_asset_data->>'description',
        v_asset_id,
        (p_asset_data->>'asset_type_id')::UUID,
        (p_asset_data->>'organization_id')::UUID,
        COALESCE((p_intake_form_data->>'quantity')::NUMERIC, 0),
        p_intake_form_data->>'location',
        COALESCE(p_intake_form_data->>'status', 'active'),
        p_user_id,
        NOW()
    )
    RETURNING id INTO v_inventory_id;
    
    -- Insert the initial history record with form data
    INSERT INTO inventory_history (
        inventory_item_id,
        organization_id,
        quantity,
        location,
        check_type,
        event_type,
        notes,
        status,
        check_date,
        month_year,
        response_data,
        created_by,
        created_at
    )
    VALUES (
        v_inventory_id,
        (p_asset_data->>'organization_id')::UUID,
        COALESCE((p_intake_form_data->>'quantity')::NUMERIC, 0),
        p_intake_form_data->>'location',
        'initial',
        'intake',
        COALESCE(p_intake_form_data->>'notes', 'Initial intake'),
        COALESCE(p_intake_form_data->>'status', 'active'),
        NOW(),
        TO_CHAR(NOW(), 'YYYY-MM'),
        p_intake_form_data,
        p_user_id,
        NOW()
    )
    RETURNING id INTO v_history_id;
    
    -- Build the result object
    SELECT jsonb_build_object(
        'asset_id', v_asset_id,
        'inventory_id', v_inventory_id,
        'history_id', v_history_id
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Function to create a periodic inventory check with form data
CREATE OR REPLACE FUNCTION create_periodic_inventory_check(
    p_inventory_item_id UUID,
    p_check_data JSONB,
    p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_history_id UUID;
    v_organization_id UUID;
    v_result JSONB;
BEGIN
    -- Get the organization_id for this inventory item
    SELECT organization_id INTO v_organization_id
    FROM inventory_items
    WHERE id = p_inventory_item_id;
    
    -- Insert the history record with form data
    INSERT INTO inventory_history (
        inventory_item_id,
        organization_id,
        quantity,
        location,
        check_type,
        event_type,
        notes,
        status,
        check_date,
        month_year,
        response_data,
        created_by,
        created_at
    )
    VALUES (
        p_inventory_item_id,
        v_organization_id,
        COALESCE((p_check_data->>'quantity')::NUMERIC, 0),
        p_check_data->>'location',
        'periodic',
        'check',
        COALESCE(p_check_data->>'notes', 'Periodic check'),
        COALESCE(p_check_data->>'status', 'active'),
        NOW(),
        TO_CHAR(NOW(), 'YYYY-MM'),
        p_check_data,
        p_user_id,
        NOW()
    )
    RETURNING id INTO v_history_id;
    
    -- Update the inventory item with the latest quantity
    UPDATE inventory_items
    SET 
        quantity = COALESCE((p_check_data->>'quantity')::NUMERIC, quantity),
        updated_at = NOW()
    WHERE id = p_inventory_item_id;
    
    -- Build the result object
    SELECT jsonb_build_object(
        'history_id', v_history_id
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Add security policies if using RLS
ALTER TABLE inventory_history ENABLE ROW LEVEL SECURITY;

-- Organizations can only see their own inventory history
CREATE POLICY inventory_history_org_policy ON inventory_history
FOR ALL USING (organization_id IN (
    SELECT id FROM organizations
    WHERE id IN (
        SELECT organization_id FROM user_organizations
        WHERE user_id = auth.uid()
    )
)); 