# Barcodex Database Model Documentation

## Performance Infrastructure

### Materialized Views
- **mv_asset_type_summary**: Pre-computed asset counts and statistics by type
- **mv_inventory_summary**: Aggregated inventory values and quantities
- **mv_form_submission_trends**: Daily submission trends for analytics

### Performance Tables
- **report_cache**: Intelligent caching for frequently accessed reports
- **slow_query_log**: Tracks queries exceeding 1 second for optimization
- **report_runs**: Enhanced with cache_hit, query_complexity, bytes_processed columns

### Advanced Indexes
- Multi-column composite indexes for common query patterns
- GIN indexes for JSON/JSONB fields and text search
- Partial indexes for active/non-deleted records

### Performance Functions
- **refresh_reporting_views()**: Refresh all materialized views
- **get_asset_count_fast()**: Optimized asset counting with filters
- **get_inventory_value_fast()**: Fast inventory value calculations
- **get_report_performance_stats()**: Analytics on report execution
- **run_reporting_maintenance()**: Comprehensive maintenance routine

## Core Entities

### Organizations
- **Table**: `organizations`
- **Description**: Represents companies or departments using the system
- **Key Fields**:
  - `id`: UUID Primary Key
  - `name`: Organization name
  - `avatar_url`: Optional logo 
  - `parent_id`: Optional reference to parent organization
  - `hierarchy_level`: Level in organization hierarchy (0 for root)

### Users and Members
- **Tables**: `auth.users` (Supabase Auth), `profiles`, `organization_members`
- **Description**: User accounts and their organization membership
- **Relationships**:
  - Users can belong to multiple organizations with different roles

## Inventory Management

### Asset Types
- **Table**: `asset_types`
- **Description**: Categories of assets (e.g., Vehicles, Equipment, Tools)
- **Key Fields**:
  - `id`: UUID Primary Key
  - `organization_id`: Organization this type belongs to
  - `name`: Type name
  - `description`: Detailed description
  - `color`: Display color
  - `icon`: Display icon
  - `intake_form_id`: Optional form for intake process
  - `inventory_form_id`: Optional form for inventory checks
  - `enable_barcodes`: Whether to generate barcodes for assets of this type
  - `barcode_type`: Type of barcode to generate ('qr', 'code128', 'code39')
  - `barcode_prefix`: Optional prefix for generated barcodes

### Assets
- **Table**: `assets`
- **Description**: Individual trackable assets (e.g., a specific vehicle, machine, or tool)
- **Key Fields**:
  - `id`: UUID Primary Key
  - `name`: Asset name
  - `asset_type_id`: Reference to asset type
  - `organization_id`: Organization this asset belongs to
  - `status`: Current status (active, maintenance, retired)
  - `acquisition_date`: When acquired
  - `serial_number`: Unique identifier
  - `metadata`: Additional flexible properties
  - `parent_asset_id`: Reference to parent asset (for component relationships)
  - `barcode`: Unique barcode/QR code for scanning
  - `location`: Physical location of the asset
  - `location_details`: Additional location information

### Inventory Items
- **Table**: `inventory_items`
- **Description**: Consumable or bulk items tracked by quantity (differs from assets)
- **Key Fields**:
  - `id`: UUID Primary Key
  - `name`: Item name
  - `quantity`: Current quantity
  - `asset_type_id`: Reference to asset type
  - `organization_id`: Owner organization
  - `sku`: Stock Keeping Unit
  - `barcode`: Barcode for scanning
  - `current_price`: Current value of the item
  - `currency`: Currency of the price (default: USD)
  - `metadata`: Additional properties including linked asset_id

### Inventory Price History
- **Table**: `inventory_price_history`
- **Description**: Tracks price changes for inventory items over time
- **Key Fields**:
  - `id`: UUID Primary Key
  - `inventory_item_id`: Reference to inventory item
  - `organization_id`: Organization this record belongs to
  - `price`: Price amount
  - `currency`: Currency code (e.g., USD, EUR)
  - `unit_type`: Unit for the price (e.g., each, box, pallet)
  - `effective_date`: When this price became effective
  - `notes`: Optional notes about the price change
  - `submission_id`: Optional link to form submission that triggered the price change
  - `created_by`: User who recorded this price

## Forms System

### Forms
- **Table**: `forms`
- **Description**: Form templates for data collection
- **Key Fields**:
  - `id`: UUID Primary Key
  - `name`: Form name
  - `description`: Form description
  - `form_data`: JSONB field containing form structure
  - `organization_id`: Organization this form belongs to
  - `status`: draft, published, or archived
  - `is_template`: Whether this form is a reusable template

### Form Categories
- **Table**: `form_categories`
- **Description**: Categorizes forms
- **Related Tables**:
  - `form_category_mappings`: Links forms to categories

### Form Validation Rules
- **Table**: `form_validation_rules`
- **Description**: Validates form fields
- **Key Fields**:
  - `form_id`: Reference to form
  - `field_id`: Field identifier
  - `rule_type`: Type of validation
  - `rule_value`: Configuration for validation

### Form Field Dependencies
- **Table**: `form_field_dependencies`
- **Description**: Controls conditional display or behavior of form fields
- **Key Fields**:
  - `form_id`: Reference to form
  - `source_field_id`: Field controlling the behavior
  - `target_field_id`: Field being controlled
  - `condition`: Condition type (equals, not_equals, etc.)
  - `action`: Action to take (show, hide, require, disable)

### Form Submissions
- **Table**: `form_submissions`
- **Description**: Submitted form data from users
- **Key Fields**:
  - `id`: UUID Primary Key
  - `form_id`: Reference to form template
  - `asset_id`: Optional reference to asset
  - `asset_type_id`: Optional reference to asset type
  - `submitted_by`: User who submitted
  - `submission_data`: JSONB with form input data
  - `calculation_results`: JSONB with calculated formula results
  - `status`: Submission status

### Form Schedules
- **Table**: `form_schedules`
- **Description**: Schedules for recurring form submissions
- **Key Fields**:
  - `id`: UUID Primary Key
  - `form_id`: Form to be filled
  - `asset_type_id`: Asset type applicable to
  - `repeat_type`: Frequency (daily, weekly, monthly, yearly)
  - `repeat_interval`: Interval for repetition
  - `start_date`: When to start
  - `end_date`: When to end (optional)

## Functions and Procedures

### Form Formula Calculation
- **Function**: `calculate_form_formulas(p_submission_data JSONB, p_form_schema JSONB)`
- **Description**: Calculates dynamic formula fields based on form input
- **Returns**: JSONB with calculated values

### Form Submission Processing
- **Function**: `process_form_submission(...)`
- **Description**: Creates form submission with calculated fields
- **Returns**: UUID of new submission

### Pending Forms Finder
- **Function**: `get_pending_forms_for_asset(p_asset_id UUID, p_user_id UUID)`
- **Description**: Finds forms due for an asset
- **Returns**: Table with pending forms and due dates

### Barcode Generation
- **Function**: `generate_asset_barcode(p_asset_id UUID, p_barcode_type TEXT)`
- **Description**: Generates a unique barcode for an asset based on its type settings
- **Returns**: Text string representing the barcode value

## Row-Level Security (RLS)

All tables implement row-level security based on organization membership. Users can only access data from organizations they belong to.

## Data Flow

1. Organizations have Asset Types
2. Forms can be attached to Asset Types (intake or inventory)
3. Individual Assets belong to an Asset Type 
4. Assets can have parent-child relationships for complex equipment
5. Inventory Items track quantities and pricing information
6. Price changes are recorded in Price History
7. Form Schedules define when forms should be filled for Assets
8. Form Submissions store the completed forms with calculations
9. Barcodes/QR codes facilitate quick lookup of assets via scanning 