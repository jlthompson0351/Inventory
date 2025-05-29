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
  - Each user belongs to exactly one organization
- **Recent Fix**: RLS policies updated to prevent infinite recursion in authentication

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
- **Recent Enhancement**: Automatic inventory creation upon asset creation

### Inventory Items
- **Table**: `inventory_items`
- **Description**: Tracks quantities and current state for assets (one per asset)
- **Key Fields**:
  - `id`: UUID Primary Key
  - `name`: Item name
  - `quantity`: Current quantity
  - `asset_type_id`: Reference to asset type
  - `asset_id`: Reference to physical asset (enforced 1:1 relationship)
  - `organization_id`: Owner organization
  - `sku`: Stock Keeping Unit
  - `barcode`: Barcode for scanning
  - `current_price`: Current value of the item
  - `currency`: Currency of the price (default: USD)
  - `location`: Current location
  - `condition`: Current condition status
  - `notes`: Additional notes
  - `metadata`: Additional properties
- **Recent Changes**: Enhanced with automatic creation workflow and 1:1 asset relationship

### Inventory History
- **Table**: `inventory_history`
- **Description**: Complete audit trail of all inventory events and changes
- **Key Fields**:
  - `id`: UUID Primary Key
  - `inventory_item_id`: Reference to inventory item
  - `organization_id`: Organization this record belongs to
  - `quantity`: Quantity at time of event
  - `location`: Location at time of event
  - `condition`: Condition at time of event
  - `notes`: Event notes
  - `check_type`: Type of check ('initial', 'audit', 'adjustment', 'transfer')
  - `event_type`: Categorization of event ('intake', 'check', 'adjustment', etc.)
  - `response_data`: JSONB containing complete form submission data
  - `created_by`: User who created this record
  - `updated_by`: User who last updated this record
  - `created_at`: Timestamp of creation
  - `updated_at`: Timestamp of last update
- **Recent Enhancement**: Fixed trigger mapping from `periodic→check` to `periodic→audit` to comply with constraints

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
- **Recent Enhancement**: Improved fallback handling for asset types without forms

### Asset Type Forms
- **Table**: `asset_type_forms`
- **Description**: Links forms to asset types by purpose
- **Key Fields**:
  - `id`: UUID Primary Key
  - `asset_type_id`: Reference to asset type
  - `form_id`: Reference to form
  - `purpose`: Form purpose ('intake', 'inventory', 'custom')
  - `organization_id`: Organization context
- **Enhancement**: Enables smart form loading based on asset type and purpose

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

## Database Triggers and Functions

### Inventory Management Triggers
- **sync_event_type_with_check_type**: Automatically maps check_type to appropriate event_type
  - Recent Fix: Updated mapping from `periodic→check` to `periodic→audit`
  - Ensures data consistency and constraint compliance

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

### Enhanced Security Features
- **Recent Update**: Fixed organization_members RLS policies to prevent infinite recursion
- **Organization Isolation**: All tables implement organization-scoped access
- **User Permissions**: Role-based access within organizations
- **Data Protection**: Complete isolation between organizations

### RLS Policy Structure
- All tables filter by organization membership
- Users can only access data from their organization
- Admin users have elevated permissions within their organization context
- System admins can access diagnostic functions across organizations

## Data Flow and Workflows

### Asset Creation Workflow
1. **Asset Creation**: User creates asset with asset type selection
2. **Automatic Inventory**: System creates corresponding inventory_items record
3. **Initial History**: Creates inventory_history record with check_type='initial'
4. **Form Integration**: Loads appropriate intake forms based on asset type

### Inventory Management Workflow
1. **View Assets**: AssetList shows all assets with inventory indicators
2. **Smart Navigation**: Buttons adapt based on inventory existence
3. **History Tracking**: All changes create new inventory_history records
4. **Form-Based Updates**: Dynamic forms capture complete data

### Form Submission Workflow
1. **Form Loading**: Dynamic forms loaded based on asset type and purpose
2. **Data Capture**: Complete form responses stored in response_data
3. **Inventory Updates**: Inventory actions processed automatically
4. **History Creation**: New history records with full audit trail

## Recent Enhancements (December 2024)

### Authentication Fixes
- ✅ Fixed organization_members RLS infinite recursion
- ✅ Enhanced user authentication flow
- ✅ Improved organization access controls

### Inventory System Improvements
- ✅ One-to-one asset-inventory relationship enforcement
- ✅ Automatic inventory creation on asset creation
- ✅ Enhanced history tracking with complete form data
- ✅ Fixed trigger mappings for event types

### UI/UX Enhancements
- ✅ Smart button functionality in AssetList
- ✅ Inventory indicators and status warnings
- ✅ Loading states and mobile responsiveness
- ✅ Form fallbacks for asset types without configured forms

### Performance Optimizations
- ✅ Optimized queries with proper joins
- ✅ Enhanced indexing for inventory operations
- ✅ Materialized views for reporting
- ✅ Efficient data access patterns

## System Status: Production Ready

The database model is fully implemented, tested, and optimized for production use. All recent enhancements have been applied, edge cases are handled, and the system provides enterprise-grade inventory management capabilities with complete audit trails and organization isolation. 