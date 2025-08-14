-- Create reporting metadata tables to drive the schema-driven report engine.
-- Version: 1

BEGIN;

-- 1. Reporting Entities
CREATE TABLE public.reporting_entities (
    entity_id TEXT PRIMARY KEY,
    table_name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    primary_key TEXT NOT NULL
);

COMMENT ON TABLE public.reporting_entities IS 'Defines the primary entities that can be reported on.';
COMMENT ON COLUMN public.reporting_entities.entity_id IS 'Unique identifier for the entity (e.g., "assets").';
COMMENT ON COLUMN public.reporting_entities.table_name IS 'The actual name of the Supabase table (e.g., "assets").';
COMMENT ON COLUMN public.reporting_entities.display_name IS 'User-friendly name for the UI (e.g., "Assets").';
COMMENT ON COLUMN public.reporting_entities.primary_key IS 'The primary key column for this entity.';

-- 2. Reporting Fields
CREATE TABLE public.reporting_fields (
    field_id TEXT PRIMARY KEY,
    entity_id TEXT NOT NULL REFERENCES public.reporting_entities(entity_id) ON DELETE CASCADE,
    sql_expr TEXT NOT NULL,
    requires_join TEXT NULL,
    field_type TEXT NOT NULL,
    sortable BOOLEAN DEFAULT false,
    aggregatable BOOLEAN DEFAULT false,
    display_name TEXT NOT NULL
);

COMMENT ON TABLE public.reporting_fields IS 'Defines the individual fields available for reporting for each entity.';
COMMENT ON COLUMN public.reporting_fields.field_id IS 'Unique field identifier (e.g., "assets.name").';
COMMENT ON COLUMN public.reporting_fields.entity_id IS 'The parent entity this field belongs to.';
COMMENT ON COLUMN public.reporting_fields.sql_expr IS 'The safe SQL expression for this field (e.g., "assets.name").';
COMMENT ON COLUMN public.reporting_fields.requires_join IS 'If the field requires a join, this specifies the target entity_id.';
COMMENT ON COLUMN public.reporting_fields.field_type IS 'Data type for UI hints (text, number, date, etc.).';
COMMENT ON COLUMN public.reporting_fields.sortable IS 'Whether this field can be used for sorting.';
COMMENT ON COLUMN public.reporting_fields.aggregatable IS 'Whether this field can be aggregated (SUM, AVG, etc.).';
COMMENT ON COLUMN public.reporting_fields.display_name IS 'User-friendly name for the UI (e.g., "Asset Name").';

-- 3. Reporting Joins
CREATE TABLE public.reporting_joins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id TEXT NOT NULL REFERENCES public.reporting_entities(entity_id) ON DELETE CASCADE,
    join_to TEXT NOT NULL REFERENCES public.reporting_entities(entity_id) ON DELETE CASCADE,
    join_type TEXT NOT NULL DEFAULT 'left',
    join_on TEXT NOT NULL
);

COMMENT ON TABLE public.reporting_joins IS 'Defines the allowlisted, safe joins between reporting entities.';
COMMENT ON COLUMN public.reporting_joins.entity_id IS 'The source entity for the join.';
COMMENT ON COLUMN public.reporting_joins.join_to IS 'The target entity for the join.';
COMMENT ON COLUMN public.reporting_joins.join_type IS 'The type of SQL join (e.g., "left").';
COMMENT ON COLUMN public.reporting_joins.join_on IS 'The SQL ON condition for the join.';

-- Indexes for performance
CREATE INDEX idx_reporting_fields_entity_id ON public.reporting_fields(entity_id);
CREATE INDEX idx_reporting_joins_entity_id ON public.reporting_joins(entity_id);

-- Populate the tables from the JSON schema v1.1.0

-- Entities
INSERT INTO public.reporting_entities (entity_id, table_name, display_name, primary_key) VALUES
('assets', 'assets', 'Assets', 'id'),
('asset_types', 'asset_types', 'Asset Types', 'id'),
('inventory_items', 'inventory_items', 'Inventory Items', 'id'),
('inventory_history', 'inventory_history', 'Inventory History', 'id'),
('form_submissions', 'form_submissions', 'Form Submissions', 'id'),
('forms', 'forms', 'Forms', 'id'); -- Added forms entity for joins

-- Fields for 'assets'
INSERT INTO public.reporting_fields (field_id, entity_id, sql_expr, requires_join, field_type, sortable, aggregatable, display_name) VALUES
('assets.id', 'assets', 'assets.id', NULL, 'uuid', true, false, 'Asset ID'),
('assets.name', 'assets', 'assets.name', NULL, 'text', true, false, 'Asset Name'),
('assets.description', 'assets', 'assets.description', NULL, 'text', false, false, 'Description'),
('assets.status', 'assets', 'assets.status', NULL, 'text', true, false, 'Status'),
('assets.serial_number', 'assets', 'assets.serial_number', NULL, 'text', true, false, 'Serial Number'),
('assets.barcode', 'assets', 'assets.barcode', NULL, 'text', false, false, 'Barcode'),
('assets.barcode_type', 'assets', 'assets.barcode_type', NULL, 'text', false, false, 'Barcode Type'),
('assets.asset_type_id', 'assets', 'assets.asset_type_id', NULL, 'uuid', true, false, 'Asset Type ID'),
('assets.organization_id', 'assets', 'assets.organization_id', NULL, 'uuid', false, false, 'Organization ID'),
('assets.acquisition_date', 'assets', 'assets.acquisition_date', NULL, 'date', true, false, 'Acquisition Date'),
('assets.created_at', 'assets', 'assets.created_at', NULL, 'datetime', true, false, 'Created At'),
('assets.updated_at', 'assets', 'assets.updated_at', NULL, 'datetime', true, false, 'Updated At'),
('asset_types.name', 'assets', 'asset_types.name', 'asset_types', 'text', true, false, 'Asset Type Name');

-- Fields for 'asset_types'
INSERT INTO public.reporting_fields (field_id, entity_id, sql_expr, requires_join, field_type, sortable, aggregatable, display_name) VALUES
('asset_types.id', 'asset_types', 'asset_types.id', NULL, 'uuid', true, false, 'Asset Type ID'),
('asset_types.name', 'asset_types', 'asset_types.name', NULL, 'text', true, false, 'Type Name'),
('asset_types.description', 'asset_types', 'asset_types.description', NULL, 'text', false, false, 'Description'),
('asset_types.color', 'asset_types', 'asset_types.color', NULL, 'text', false, false, 'Color'),
('asset_types.enable_barcodes', 'asset_types', 'asset_types.enable_barcodes', NULL, 'boolean', true, false, 'Barcodes Enabled'),
('asset_types.created_at', 'asset_types', 'asset_types.created_at', NULL, 'datetime', true, false, 'Created At');

-- Fields for 'inventory_items'
INSERT INTO public.reporting_fields (field_id, entity_id, sql_expr, requires_join, field_type, sortable, aggregatable, display_name) VALUES
('inventory_items.id', 'inventory_items', 'inventory_items.id', NULL, 'uuid', true, false, 'Inventory ID'),
('inventory_items.name', 'inventory_items', 'inventory_items.name', NULL, 'text', true, false, 'Item Name'),
('inventory_items.sku', 'inventory_items', 'inventory_items.sku', NULL, 'text', true, false, 'SKU'),
('inventory_items.quantity', 'inventory_items', 'inventory_items.quantity', NULL, 'number', true, true, 'Quantity'),
('inventory_items.current_price', 'inventory_items', 'inventory_items.current_price', NULL, 'number', true, true, 'Current Price'),
('inventory_items.currency', 'inventory_items', 'inventory_items.currency', NULL, 'text', false, false, 'Currency'),
('inventory_items.category', 'inventory_items', 'inventory_items.category', NULL, 'text', true, false, 'Category'),
('inventory_items.location', 'inventory_items', 'inventory_items.location', NULL, 'text', true, false, 'Location'),
('inventory_items.asset_id', 'inventory_items', 'inventory_items.asset_id', NULL, 'uuid', true, false, 'Asset ID'),
('inventory_items.asset_type_id', 'inventory_items', 'inventory_items.asset_type_id', NULL, 'uuid', true, false, 'Asset Type ID'),
('inventory_items.created_at', 'inventory_items', 'inventory_items.created_at', NULL, 'datetime', true, false, 'Created At'),
('inventory_items.updated_at', 'inventory_items', 'inventory_items.updated_at', NULL, 'datetime', true, false, 'Updated At');

-- Fields for 'inventory_history'
INSERT INTO public.reporting_fields (field_id, entity_id, sql_expr, requires_join, field_type, sortable, aggregatable, display_name) VALUES
('inventory_history.id', 'inventory_history', 'inventory_history.id', NULL, 'uuid', true, false, 'History ID'),
('inventory_history.inventory_item_id', 'inventory_history', 'inventory_history.inventory_item_id', NULL, 'uuid', true, false, 'Inventory Item ID'),
('inventory_history.event_type', 'inventory_history', 'inventory_history.event_type', NULL, 'text', true, false, 'Event Type'),
('inventory_history.check_type', 'inventory_history', 'inventory_history.check_type', NULL, 'text', false, false, 'Check Type'),
('inventory_history.quantity', 'inventory_history', 'inventory_history.quantity', NULL, 'number', true, true, 'Quantity'),
('inventory_history.location', 'inventory_history', 'inventory_history.location', NULL, 'text', false, false, 'Location'),
('inventory_history.status', 'inventory_history', 'inventory_history.status', NULL, 'text', false, false, 'Status'),
('inventory_history.notes', 'inventory_history', 'inventory_history.notes', NULL, 'text', false, false, 'Notes'),
('inventory_history.check_date', 'inventory_history', 'inventory_history.check_date', NULL, 'datetime', true, false, 'Check Date'),
('inventory_history.month_year', 'inventory_history', 'inventory_history.month_year', NULL, 'text', true, false, 'Month/Year'),
('inventory_history.previous_quantity', 'inventory_history', 'inventory_history.previous_quantity', NULL, 'number', true, true, 'Previous Quantity'),
('inventory_history.created_by', 'inventory_history', 'inventory_history.created_by', NULL, 'uuid', false, false, 'Created By'),
('inventory_history.created_at', 'inventory_history', 'inventory_history.created_at', NULL, 'datetime', true, false, 'Created At');

-- Fields for 'form_submissions'
INSERT INTO public.reporting_fields (field_id, entity_id, sql_expr, requires_join, field_type, sortable, aggregatable, display_name) VALUES
('form_submissions.id', 'form_submissions', 'form_submissions.id', NULL, 'uuid', true, false, 'Submission ID'),
('form_submissions.form_id', 'form_submissions', 'form_submissions.form_id', NULL, 'uuid', true, false, 'Form ID'),
('forms.name', 'form_submissions', 'forms.name', 'forms', 'text', true, false, 'Form Name'),
('form_submissions.asset_id', 'form_submissions', 'form_submissions.asset_id', NULL, 'uuid', true, false, 'Asset ID'),
('form_submissions.asset_type_id', 'form_submissions', 'form_submissions.asset_type_id', NULL, 'uuid', true, false, 'Asset Type ID'),
('form_submissions.status', 'form_submissions', 'form_submissions.status', NULL, 'text', true, false, 'Status'),
('form_submissions.submitted_by', 'form_submissions', 'form_submissions.submitted_by', NULL, 'uuid', true, false, 'Submitted By'),
('form_submissions.submission_data', 'form_submissions', 'form_submissions.submission_data', NULL, 'json', false, false, 'Submission Data'),
('form_submissions.created_at', 'form_submissions', 'form_submissions.created_at', NULL, 'datetime', true, false, 'Submitted At');

-- Joins
INSERT INTO public.reporting_joins (entity_id, join_to, join_type, join_on) VALUES
('assets', 'asset_types', 'left', 'assets.asset_type_id = asset_types.id'),
('assets', 'inventory_items', 'left', 'assets.id = inventory_items.asset_id'),
('asset_types', 'assets', 'left', 'asset_types.id = assets.asset_type_id'),
('asset_types', 'inventory_items', 'left', 'asset_types.id = inventory_items.asset_type_id'),
('inventory_items', 'assets', 'left', 'inventory_items.asset_id = assets.id'),
('inventory_items', 'asset_types', 'left', 'inventory_items.asset_type_id = asset_types.id'),
('inventory_history', 'inventory_items', 'left', 'inventory_history.inventory_item_id = inventory_items.id'),
('form_submissions', 'assets', 'left', 'form_submissions.asset_id = assets.id'),
('form_submissions', 'forms', 'left', 'form_submissions.form_id = forms.id');

COMMIT;

