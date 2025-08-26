# Database Migration Documentation

This directory contains SQL migration files for the Logistiq application database.

## Migration Files

### `create_assets_and_form_tables.sql`

**Added**: June 2025

This migration adds support for tracking individual assets and form submissions with dynamic calculations. It introduces the following tables:

- `assets`: For tracking individual physical assets (distinct from inventory items)
- `form_submissions`: For storing submitted forms with calculation results
- `form_schedules`: For scheduling recurring forms for assets

#### Key Features

- Proper foreign key relationships to asset types, organizations, and forms
- Support for dynamic formula calculations in form submissions
- Scheduling system for recurring asset checks and maintenance

### `add_calculate_form_formulas_function.sql`

**Added**: June 2025

This migration adds support functions for form calculations:

- `calculate_form_formulas`: Processes and calculates formula fields based on form input
- `process_form_submission`: Handles the full form submission flow including calculations

#### Key Features

- Secure evaluation of form formulas
- Support for multiple input fields in a single formula
- Error handling for calculation issues

### `add_form_scheduling_functions.sql`

**Added**: June 2025

This migration adds functions related to form scheduling:

- `get_pending_forms_for_asset`: Finds forms that are due for a specific asset

#### Key Features

- Support for different schedule types (daily, weekly, monthly, yearly)
- Checks for previous submissions to avoid duplication
- Row-level security integration

### `20240620_create_forms_tables.sql`

**Added**: June 2024

This migration creates the base form system tables:

- `forms`: For storing form templates
- `form_categories`: For categorizing forms
- `form_category_mappings`: For linking forms to categories
- `form_validation_rules`: For form field validation
- `form_field_dependencies`: For conditional form logic

### `20240618_create_inventory_items_table.sql`

**Added**: June 2024

This migration creates the inventory_items table for tracking stock items with 1:1 relationship to assets.

### `20250820090000_fix_inventory_low_stock_threshold.sql`

**Added**: August 2025

This migration fixes the low stock threshold inconsistency between frontend and backend:

- **Fixed**: `get_inventory_performance_stats()` function to use ≤10 units (was <10)
- **Added**: Performance index `idx_inventory_items_low_stock` for optimized low stock queries
- **Standardized**: Consistent threshold across all inventory functions

### `20250820090100_create_inventory_stats_rpc.sql`

**Added**: August 2025

This migration creates the comprehensive inventory statistics RPC function:

- **NEW**: `get_inventory_stats()` function matching frontend expectations exactly
- **Features**: Organization-based filtering, consistent thresholds, comprehensive metrics
- **Returns**: Total assets, assets with inventory, low stock items, out of stock items, inventory coverage percentage

### `20250820090200_improve_inventory_error_handling.sql`

**Added**: August 2025

This migration enhances error handling across inventory functions:

- **Enhanced**: `get_asset_with_inventory_status()` with structured JSONB responses
- **Enhanced**: `get_organization_assets_with_inventory()` with validation and error handling
- **Improved**: Consistent response format with success/error status
- **Added**: Comprehensive access control and organization validation

### `asset_types_mothership.sql`

**Added**: April 2025

This migration adds support for the "mothership" view of asset types across organizations:

- `get_asset_types_with_counts`: Gets asset types with inventory item counts
- `get_mothership_asset_types`: For system administrators to view all asset types
- `clone_asset_type`: For copying asset types between organizations

## Migration Best Practices

1. **Testing**: Always test migrations in a development environment before applying to production
2. **Backups**: Take a database backup before applying migrations
3. **Versioning**: Use date prefixes (YYYYMMDD) for migration files to maintain order
4. **Documentation**: Keep this README updated with new migrations
5. **Dependencies**: List any dependencies between migrations

## Applying Migrations

Migrations are applied automatically during Supabase deployment. To apply migrations manually:

```bash
supabase db push
```

To reset and reapply all migrations:

```bash
supabase db reset
``` 