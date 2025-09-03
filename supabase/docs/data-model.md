# Barcodex Database Model Documentation

## Current Database Status (Live Schema)
**Total Tables**: 35 tables
**Database Functions**: 180+ custom functions
**RLS Policies**: Comprehensive organization-based access control
**Last Updated**: January 2025

## Performance Infrastructure

### Performance Tables
- **report_cache**: Intelligent caching for frequently accessed reports (cache_key, organization_id, cached_data, expires_at)
- **slow_query_log**: Tracks queries exceeding performance thresholds (query_text, execution_time_ms, table_names)
- **report_runs**: Enhanced execution tracking (cache_hit, query_complexity, bytes_processed, execution_time_ms)

### Advanced Indexes
- Multi-column composite indexes for common query patterns
- GIN indexes for JSON/JSONB fields and text search  
- Partial indexes for active/non-deleted records (is_deleted = false conditions)

### Performance Functions
- **refresh_reporting_views()**: Refresh materialized views
- **get_asset_count_fast()**: Optimized asset counting with filters
- **get_inventory_value_fast()**: Fast inventory value calculations
- **get_report_performance_stats()**: Analytics on report execution
- **run_reporting_maintenance()**: Comprehensive maintenance routine
- **analyze_report_performance()**: Report performance analysis
- **cleanup_expired_data()**: Automated cleanup of expired data

## Core Entities

### Organizations
- **Table**: `organizations`
- **Description**: Single organization per deployment. Users cannot switch between organizations.
- **Key Fields**:
  - `id`: UUID Primary Key
  - `name`: Organization name
  - `avatar_url`: Optional logo/avatar URL
  - `description`: Detailed description of the organization  
  - `created_at`: Creation timestamp
  - `updated_at`: Last modification timestamp
  - `deleted_at`: Soft deletion timestamp
  - `is_deleted`: Soft deletion flag (default: false)
- **RLS**: Organization-based access with admin/owner controls

### Users and Members
- **Tables**: `auth.users` (Supabase Auth), `profiles`, `organization_members`, `users`
- **Description**: User accounts and their organization membership
- **Key Tables**:
  - `profiles`: User profile data (full_name, avatar_url, quick_access_pin for mobile QR)
  - `organization_members`: Links users to organizations with roles (admin, manager, editor, member)
  - `users`: Public user data synchronized from auth.users
- **Relationships**: Each user belongs to exactly one organization
- **Mobile QR**: Profiles support 4-digit PIN for mobile QR authentication
- **Platform Operators**: Special table for platform-wide admin privileges

## Inventory Management

### Asset Types
- **Table**: `asset_types`
- **Description**: Categories of assets (e.g., Vehicles, Equipment, Tools) with rich configuration options
- **Key Fields**:
  - `id`: UUID Primary Key
  - `organization_id`: Organization this type belongs to
  - `name`: Type name
  - `description`: Detailed description
  - `color`: Display color (default: '#6E56CF')
  - `icon`: Display icon (default: 'package')
  - `intake_form_id`: Optional form for intake process
  - `inventory_form_id`: Optional form for inventory checks
  - `mapping_form_id`: Optional form for field mapping
  - `enable_barcodes`: Whether to generate barcodes for assets of this type
  - `barcode_type`: Type of barcode to generate ('qr', 'code128', 'code39')
  - `barcode_prefix`: Optional prefix for generated barcodes
  - `measurement_units`: JSONB field for unit definitions
  - `default_conversion_settings`: JSONB field for conversion configurations
  - `calculation_formulas`: JSONB field for calculation definitions  
  - `conversion_fields`: JSONB field for conversion field mappings (with validation)
  - `user_id`: User who created the asset type
  - `created_by`: User who created the asset type
  - Standard soft-delete fields (`deleted_at`, `is_deleted`)
- **RLS**: Organization-based access with role-based permissions

### Assets
- **Table**: `assets`
- **Description**: Individual trackable assets with complete barcode/QR code support
- **Key Fields**:
  - `id`: UUID Primary Key
  - `name`: Asset name
  - `description`: Asset description
  - `asset_type_id`: Reference to asset type
  - `organization_id`: Organization this asset belongs to
  - `status`: Current status (default: 'active')
  - `acquisition_date`: When acquired
  - `serial_number`: Unique identifier
  - `metadata`: JSONB field for additional flexible properties
  - `parent_asset_id`: Reference to parent asset (for component relationships)
  - `barcode`: Unique barcode/QR code value for scanning
  - `barcode_type`: Type of barcode (default: 'qr')
  - `created_by`: User who created the asset
  - `created_at`, `updated_at`: Standard timestamps
  - Standard soft-delete fields (`deleted_at`, `is_deleted`)
- **Features**: 
  - Automatic inventory creation upon asset creation
  - Parent-child relationships for complex equipment
  - Comprehensive barcode/QR code generation and tracking
- **RLS**: Organization-based access with anonymous mobile QR support

### Inventory Items
- **Table**: `inventory_items`
- **Description**: Tracks quantities and current state for assets with comprehensive pricing support
- **Key Fields**:
  - `id`: UUID Primary Key
  - `name`: Item name
  - `description`: Item description
  - `quantity`: Current quantity (constraint: quantity >= 0)
  - `asset_type_id`: Reference to asset type
  - `asset_id`: Reference to physical asset (enforced 1:1 relationship)
  - `organization_id`: Owner organization
  - `sku`: Stock Keeping Unit
  - `barcode`: Barcode for scanning
  - `current_price`: Current value (numeric, default: 0)
  - `currency`: Currency of the price (default: 'USD')
  - `location`: Current location
  - `status`: Item status (default: 'active')
  - `profile_image_url`: Optional image URL
  - `metadata`: JSONB field for additional properties
  - `created_by`: User who created the item
  - `category`: Item category
  - `version`: Version number (default: 1)
  - Standard timestamps and soft-delete fields
- **Features**: 
  - Automatic creation when assets are created
  - Complete price and currency tracking
  - Version control support
  - Integration with inventory history system
- **RLS**: Organization-based access with mobile QR support

### Inventory History
- **Table**: `inventory_history`
- **Description**: Complete audit trail of all inventory events and changes with advanced validation
- **Key Fields**:
  - `id`: UUID Primary Key
  - `inventory_item_id`: Reference to inventory item
  - `organization_id`: Organization this record belongs to
  - `quantity`: Quantity at time of event (integer, default: 0)
  - `location`: Location at time of event
  - `condition`: Condition at time of event  
  - `notes`: Event notes
  - `status`: Status of the inventory item
  - `check_type`: Type of check performed
  - `check_date`: Date of the inventory check (default: now())
  - `event_type`: Type of event (intake, addition, audit, adjustment, removal, transfer, disposal, deleted, check)
  - `movement_type`: Enum for movement types (intake, consumption, adjustment_up, adjustment_down, damage, theft, return, transfer_in, transfer_out, expired, audit)
  - `response_data`: JSONB containing complete form submission data
  - `related_entity_id`: ID of related entity
  - `related_entity_type`: Type of the related entity
  - `adjustment_reason`: Reason for inventory adjustment
  - `previous_quantity`: Quantity before the change (numeric)
  - `validation_status`: Validation status (pending, validated, flagged, corrected)
  - `validation_notes`: Notes related to validation
  - `validated_by`: User who validated the record
  - `validated_at`: Timestamp of validation
  - `edit_history`: JSONB array of edit history (default: [])
  - `calculation_metadata`: JSONB for calculation metadata (default: {})
  - `month_year`: Month and year for reporting
  - `created_by`: User who created this record
  - `created_at`, `updated_at`: Standard timestamps
  - Standard soft-delete fields
- **Features**:
  - Complete audit trail with validation workflow
  - Rich movement type categorization
  - Edit history tracking for corrections
  - Calculation metadata for complex operations
- **RLS**: Organization-based access with mobile QR support

### Inventory Price History
- **Table**: `inventory_price_history`
- **Description**: Comprehensive price tracking for inventory items over time
- **Key Fields**:
  - `id`: UUID Primary Key
  - `inventory_item_id`: Reference to inventory item
  - `organization_id`: Organization this record belongs to
  - `price`: Price amount (numeric, default: 0)
  - `currency`: Currency code (default: 'USD')
  - `unit_type`: Unit for the price (default: 'each') - each, gallon, box, pallet, etc.
  - `effective_date`: When this price became effective (default: now())
  - `notes`: Optional notes about the price change
  - `submission_id`: Optional link to form submission that triggered the price change
  - `created_by`: User who recorded this price
  - `created_at`: Creation timestamp
  - Standard soft-delete fields
- **Features**:
  - Complete price history with currency support
  - Integration with form submissions
  - Flexible unit type definitions
- **RLS**: Organization-based access with mobile QR support

### Additional Inventory Tables

#### Inventory Transactions
- **Table**: `inventory_transactions`
- **Description**: Logs all inventory quantity changes with session tracking
- **Key Fields**: transaction_type, quantity_before, quantity_after, change_amount, user_id, session_id, ip_address, success, error_message

#### Inventory Corrections  
- **Table**: `inventory_corrections`
- **Description**: Tracks corrections to inventory history records
- **Key Fields**: original_history_id, correction_reason, original/corrected quantities/prices, approval workflow fields

## Forms System

### Forms
- **Table**: `forms`
- **Description**: Comprehensive form templates with formula support and versioning
- **Key Fields**:
  - `id`: UUID Primary Key
  - `name`: Form name
  - `description`: Form description
  - `form_data`: JSONB field containing complete form structure
  - `organization_id`: Organization this form belongs to
  - `status`: draft, published, or archived (with constraint validation)
  - `version`: Form version number (default: 1)
  - `is_template`: Whether this form is a reusable template
  - `asset_types`: Array of asset type names this form applies to
  - `purpose`: Form purpose (default: 'generic')
  - `form_type`: Type of form - intake, inventory, or mapping (default: 'intake')
  - `formula_validation_cache`: JSONB cache for formula validation (default: {})
  - Standard timestamps and soft-delete fields
- **Features**:
  - Advanced form builder with conditional logic
  - Formula field support with caching
  - Version control and template system
  - Asset type targeting
- **RLS**: Organization-based access with role permissions

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

## Additional System Tables

### Formula and Calculation System
- **formula_templates**: Reusable formula templates with categories and public/private visibility
- **formula_usage_analytics**: Tracks formula performance, complexity, and usage patterns  
- **asset_formulas**: Asset-specific formula definitions linking source/target fields
- **asset_formula_mappings**: Maps calculation formulas to asset types with aggregation support
- **mapped_fields**: Links form fields to inventory actions with field metadata
- **mapped_asset_data_definitions**: Defines mappable data fields from various sources (inventory_items, assets, form_submissions)

### System Administration
- **system_logs**: Application-wide logging (info, warning, error, success) with organization context
- **background_jobs**: Asynchronous job processing with status tracking and progress monitoring
- **user_password_requirements**: Tracks users who must change passwords on next login
- **user_creation_requests**: Admin-initiated user creation workflow with temp passwords
- **platform_operators**: Users with platform-wide administrative privileges
- **system_roles**: System role definitions (admin, manager, editor, member)
- **asset_type_conversion_history**: Tracks changes to asset type conversion field configurations

### Mobile & QR Code System  
- **qr_scan_sessions**: Mobile QR scanning sessions with token-based authentication
- **mobile_debug_logs**: Debug logging specifically for mobile QR workflow troubleshooting

### Locations
- **locations**: Hierarchical location management with parent-child relationships

### Organization Management
- **organization_invitations**: Email-based user invitations with token-based acceptance workflow

### Reporting & Analytics
- **reports**: Report definitions with configuration, favorites, templates, and categories
- **report_runs**: Execution logs for reports with performance metrics and caching info
- **report_cache**: Intelligent caching system for frequently accessed reports with expiration
- **slow_query_log**: Performance monitoring for queries exceeding thresholds

## Database Triggers and Functions

### Core Database Functions (180+ total)

#### Authentication & User Management
- **admin_create_user()**: Secure user creation with organization assignment
- **authenticate_mobile_pin()**: Mobile QR PIN-based authentication  
- **get_user_profile_with_org_robust()**: Complete user profile with organization data
- **is_org_admin()**, **is_org_member()**: Role-based access control functions
- **handle_new_user()**: Trigger for new user setup

#### Inventory Management
- **create_asset_with_inventory()**: Creates asset with automatic inventory item
- **process_mobile_inventory_submission()**: Mobile QR inventory form processing
- **insert_inventory_history_record()**: Comprehensive history record creation
- **create_inventory_adjustment()**: Inventory quantity adjustments with audit trail
- **update_inventory_atomic()**: Thread-safe inventory updates
- **verify_inventory_balance()**: Inventory reconciliation and validation

#### Form Processing & Calculations  
- **calculate_form_formulas()**: Dynamic formula field calculations
- **process_form_submission()**: Complete form submission workflow
- **handle_mobile_submission()**: Mobile-optimized form submissions
- **apply_asset_calculation_formulas()**: Asset-specific calculations

#### Barcode & QR Code System
- **generate_asset_barcode()**: Unique barcode generation for assets
- **generate_unique_barcode()**: Collision-free barcode generation
- **get_asset_by_barcode()**: Asset lookup by barcode/QR code  
- **scan_asset_barcode()**: Complete barcode scanning workflow

#### Reporting & Analytics
- **get_dashboard_stats()**: Organization dashboard metrics
- **get_asset_count_fast()**: High-performance asset counting
- **get_inventory_value_fast()**: Fast inventory value calculations
- **analyze_report_performance()**: Report performance analysis
- **run_reporting_maintenance()**: Automated maintenance routines

#### System Administration
- **create_organization_with_admin()**: Complete organization setup
- **bulk_create_users_for_organization()**: Batch user creation
- **get_system_health_stats()**: System health monitoring
- **cleanup_expired_data()**: Automated cleanup tasks

### Key Triggers
- **sync_event_type_with_check_type**: Automatically maps check_type to event_type
- **handle_updated_at**: Updates timestamp fields automatically  
- **auto_generate_asset_barcode**: Generates barcodes for new assets
- **log_inventory_transaction**: Logs all inventory changes
- **track_inventory_history_edit**: Tracks edits to history records

## Row-Level Security (RLS)

### Current RLS Status (January 2025)
- **Total RLS Policies**: 140+ policies across 35 tables
- **Organization Isolation**: Complete multi-tenant data isolation
- **Mobile QR Support**: Anonymous access policies for mobile workflow
- **Role-Based Access**: Granular permissions (admin, manager, editor, member)

### RLS Policy Categories
1. **Organization-based Policies**: Filter all data by user's organization membership
2. **Role-based Policies**: Admin/manager elevated permissions for management operations  
3. **Anonymous Mobile Policies**: Special policies allowing anonymous QR code scanning
4. **Platform Operator Policies**: System-wide administrative access for platform operators
5. **Self-Service Policies**: Users can manage their own profiles and settings

### Security Architecture
- **Complete Organization Isolation**: No cross-organization data access possible
- **Mobile QR Security**: Token-based authentication with session management  
- **Admin Escalation**: Org admins can manage users and data within their organization
- **Platform Operations**: Special platform_operators table for system administration
- **Audit Trail**: All policies log access attempts through system_logs

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

## System Status: Production Ready ✅

### Database Metrics (January 2025)
- **Tables**: 35 core business tables + auth tables
- **Functions**: 180+ PostgreSQL functions for business logic
- **RLS Policies**: 140+ comprehensive security policies
- **Performance**: Optimized with indexes, caching, and materialized views
- **Mobile Support**: Complete QR code workflow with offline capabilities
- **Multi-tenancy**: Full organization isolation with role-based access

### Recent System Enhancements
- ✅ **Advanced Formula System**: Complete calculation engine with templates and analytics
- ✅ **Mobile QR Workflow**: Anonymous access with PIN authentication and session management
- ✅ **Comprehensive Audit Trail**: Full history tracking with validation and correction workflows
- ✅ **Reporting Infrastructure**: Caching, performance monitoring, and analytics
- ✅ **Background Job System**: Asynchronous processing with progress tracking
- ✅ **Platform Administration**: System-wide admin tools and user management

### Production Features
- **Enterprise-grade Security**: Complete RLS implementation with organization isolation
- **High Performance**: Optimized queries, intelligent caching, and performance monitoring
- **Mobile-first Design**: QR code scanning, offline support, and responsive interfaces
- **Complete Audit Trail**: Every change tracked with user attribution and timestamps
- **Advanced Analytics**: Formula usage tracking, performance metrics, and reporting
- **System Health Monitoring**: Automated cleanup, slow query detection, and health checks

The database architecture is production-ready and battle-tested, providing a robust foundation for enterprise inventory management with comprehensive mobile support and advanced analytics capabilities. 