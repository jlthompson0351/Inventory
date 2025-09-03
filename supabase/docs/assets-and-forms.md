# Asset Management and Form Integration (Updated January 2025)

This document explains how assets, asset types, and forms work together in the Barcodex system, including the latest enhancements for mobile QR workflows, advanced calculations, and comprehensive audit trails.

## Key Concepts

### Asset Types vs Assets

- **Asset Types**: Categories or classes of assets with rich configuration options (e.g., "Forklift", "Computer", "Vehicle")
- **Assets**: Individual instances of an asset type with complete barcode/QR support (e.g., "Forklift #123", "John's Laptop", "Delivery Van #7")
- **New**: Asset types now support conversion fields, calculation formulas, and measurement units

### Asset Relationships

Assets can have parent-child relationships, allowing you to model complex equipment with components:

- **Parent Assets**: Higher-level assets that may contain other assets as components
- **Child Assets**: Components or parts that belong to a parent asset
- **Relationship Chain**: Multiple levels of parent-child relationships can be established

### Advanced Price Tracking

The system provides comprehensive financial tracking for assets:

- **Initial Cost**: Recorded when creating a new asset
- **Price History**: All price changes tracked in `inventory_price_history` table with submission links
- **Unit Types**: Flexible unit definitions (each, box, pallet, gallon, etc.)  
- **Multi-Currency**: Full currency support with conversion capabilities
- **Price Validation**: Links to form submissions that triggered price changes
- **Audit Trail**: Complete pricing history with user attribution and timestamps

### Advanced Form Integration

Forms are deeply integrated with assets through multiple sophisticated mechanisms:

1. **Multi-Form Assignment**: Asset types can have multiple forms for different purposes
   - `intake_form_id`: Used when creating new assets of this type
   - `inventory_form_id`: Used for regular inventory checks  
   - `mapping_form_id`: Used for field mapping and data collection

2. **Asset Type Forms**: Enhanced linking system via `asset_type_forms` table
   - Links forms to asset types with specific purposes
   - Supports multiple forms per asset type
   - Organization-scoped with RLS protection

3. **Scheduled Forms**: Comprehensive scheduling via `form_schedules` system
   - Flexible repeat patterns (daily, weekly, monthly, yearly)
   - Targeted at specific asset types with date ranges
   - Integration with pending forms workflow

4. **Mobile QR Forms**: Optimized for mobile QR code scanning
   - Anonymous access with PIN authentication
   - Offline capability with background sync
   - Mobile-specific form processing and validation

5. **Formula-Enhanced Forms**: Dynamic calculation capabilities
   - Real-time field calculations during form entry
   - Formula templates for reusable calculations
   - Performance analytics and optimization

## Implementation Guide

### Creating Asset Types with Advanced Configuration

```sql
-- Example: Creating a comprehensive asset type with all features
INSERT INTO asset_types (
  name, 
  description, 
  organization_id,
  intake_form_id,        -- Form used when adding new assets
  inventory_form_id,     -- Form used for inventory checks
  mapping_form_id,       -- Form used for field mapping
  enable_barcodes,       -- Enable barcode generation
  barcode_type,          -- Type of barcode (qr, code128, code39)
  barcode_prefix,        -- Prefix for generated barcodes
  color,                 -- Display color
  icon,                  -- Display icon
  measurement_units,     -- JSONB for unit definitions
  calculation_formulas,  -- JSONB for calculation formulas
  conversion_fields,     -- JSONB for conversion field mappings
  created_by
) VALUES (
  'Company Vehicle', 
  'Cars, trucks and vans with comprehensive tracking',
  '123e4567-e89b-12d3-a456-426614174000',
  '123e4567-e89b-12d3-a456-426614174001',  -- Vehicle intake form
  '123e4567-e89b-12d3-a456-426614174002',  -- Vehicle inspection form  
  '123e4567-e89b-12d3-a456-426614174003',  -- Vehicle mapping form
  true,                  -- Enable barcodes
  'qr',                  -- QR code type
  'VEH-',                -- Barcode prefix
  '#FF6B35',             -- Orange color
  'truck',               -- Truck icon
  '{"distance": "miles", "fuel": "gallons", "weight": "pounds"}',  -- Units
  '{"fuel_efficiency": "{distance_driven} / {fuel_consumed}"}',    -- Formulas
  '[{"field": "odometer", "type": "number", "required": true}]',   -- Conversions
  '123e4567-e89b-12d3-a456-426614174007'   -- Created by user
);
```

### Creating Individual Assets (Recommended: Use Function)

```sql
-- RECOMMENDED: Use the create_asset_with_inventory function for automatic setup
SELECT create_asset_with_inventory(
  p_name := 'Delivery Van #7',
  p_description := '2020 Ford Transit delivery van with GPS tracking',
  p_asset_type_id := '123e4567-e89b-12d3-a456-426614174003',
  p_organization_id := '123e4567-e89b-12d3-a456-426614174000', 
  p_serial_number := 'VIN12345678901234',
  p_metadata := '{"year": 2020, "make": "Ford", "model": "Transit", "gps_enabled": true}',
  p_acquisition_date := '2023-01-15',
  p_created_by := '123e4567-e89b-12d3-a456-426614174007'
);

-- This function automatically:
-- 1. Creates the asset record
-- 2. Generates a unique barcode/QR code
-- 3. Creates corresponding inventory_items record  
-- 4. Creates initial inventory_history record
-- 5. Handles all audit trail setup

-- Creating a component/child asset (also use function)
SELECT create_asset_with_inventory(
  p_name := 'Van #7 Battery',
  p_description := 'AGM battery installed 2023-05-15, 2-year warranty',
  p_asset_type_id := '123e4567-e89b-12d3-a456-426614174004',  -- Battery asset type
  p_organization_id := '123e4567-e89b-12d3-a456-426614174000',
  p_serial_number := 'BAT98765432',
  p_parent_asset_id := '123e4567-e89b-12d3-a456-426614174005',  -- Parent van
  p_metadata := '{"warranty_expires": "2025-05-15", "voltage": 12, "capacity_ah": 75}',
  p_created_by := '123e4567-e89b-12d3-a456-426614174007'
);
```

### Advanced Price History Management

```sql
-- Example: Recording comprehensive price information
INSERT INTO inventory_price_history (
  organization_id,
  inventory_item_id,
  price,
  currency,
  unit_type,
  effective_date,
  notes,
  created_by,
  submission_id  -- NEW: Link to form submission that triggered this
) VALUES (
  '123e4567-e89b-12d3-a456-426614174000',  -- Organization ID
  '123e4567-e89b-12d3-a456-426614174006',  -- Inventory item ID
  35000.00,  -- Price
  'USD',     -- Currency
  'each',    -- Unit type (each, gallon, box, pallet, etc.)
  NOW(),     -- Effective date
  'Initial purchase price with 3-year warranty',
  '123e4567-e89b-12d3-a456-426614174007',   -- User ID
  '123e4567-e89b-12d3-a456-426614174008'    -- Form submission ID that triggered this
);

-- Price changes are also automatically captured by triggers when:
-- 1. Form submissions include price fields
-- 2. Inventory adjustments affect asset values
-- 3. Periodic revaluations are performed
```

### Scheduling Forms for Assets

```sql
-- Example: Schedule a monthly maintenance check
INSERT INTO form_schedules (
  form_id,
  asset_type_id,
  organization_id,
  repeat_type,
  repeat_interval,
  start_date
) VALUES (
  '123e4567-e89b-12d3-a456-426614174004',  -- Maintenance form ID
  '123e4567-e89b-12d3-a456-426614174003',  -- Asset type ID (vehicles)
  '123e4567-e89b-12d3-a456-426614174000',  -- Organization ID
  'monthly',
  1,  -- Every 1 month
  NOW()  -- Start immediately
);
```

### Advanced Form Processing with Mobile Support

```sql
-- Standard form submission with comprehensive features
SELECT process_form_submission(
  p_form_id := '123e4567-e89b-12d3-a456-426614174004',
  p_asset_id := '123e4567-e89b-12d3-a456-426614174005',
  p_asset_type_id := '123e4567-e89b-12d3-a456-426614174003',
  p_submission_data := '{
    "odometer": 12500, 
    "fuel_level": 75,
    "tire_pressure_fl": 32, 
    "tire_pressure_fr": 33,
    "condition": "good",
    "maintenance_needed": false,
    "estimated_fuel_efficiency": "calculated_field"
  }',
  p_organization_id := '123e4567-e89b-12d3-a456-426614174000',
  p_submitted_by := '123e4567-e89b-12d3-a456-426614174006'
);

-- Mobile QR form submission (optimized for mobile workflow)
SELECT handle_mobile_submission(
  p_asset_barcode := 'VEH-123456-ABCDEF',
  p_form_data := '{
    "inspector_pin": "1234",
    "inspection_date": "2025-01-15",
    "odometer": 12750,
    "fuel_level": 80,
    "overall_condition": "excellent"
  }',
  p_session_token := 'mobile_session_token_here'
);
```

### Finding Pending Forms for an Asset

```sql
-- Example: Find pending forms for a specific asset
SELECT * FROM get_pending_forms_for_asset(
  '123e4567-e89b-12d3-a456-426614174005',  -- Asset ID
  '123e4567-e89b-12d3-a456-426614174006'   -- User ID checking
);
```

## Dynamic Form Formulas

Forms can include formula fields that are automatically calculated based on input values.

### Formula Definition in Form Schema

```json
{
  "fields": [
    {
      "id": "length",
      "label": "Length (ft)",
      "type": "number"
    },
    {
      "id": "width",
      "label": "Width (ft)",
      "type": "number"
    },
    {
      "id": "area",
      "label": "Area (sq ft)",
      "type": "formula",
      "formula": "{length} * {width}",
      "inputFields": ["length", "width"]
    }
  ]
}
```

When a form with formulas is submitted, the `calculate_form_formulas` function processes the calculations and stores both the input data and calculation results.

## Best Practices (Updated 2025)

### Asset Type Design
1. **Rich Configuration**: Leverage all asset type features (conversion fields, formulas, units)
2. **Form Strategy**: Plan intake, inventory, and mapping forms before creating asset types  
3. **Barcode Planning**: Use consistent prefixes and types across similar asset categories
4. **Color & Icon Consistency**: Use organizational color schemes and intuitive icons

### Mobile QR Workflow Optimization
1. **PIN Security**: Use unique 4-digit PINs for each mobile user
2. **Offline Support**: Design forms to work without constant connectivity
3. **Session Management**: Implement proper session timeouts for security
4. **Error Handling**: Plan for network failures and data sync issues

### Advanced Formula Implementation
1. **Template Reuse**: Create formula templates for common calculations
2. **Performance**: Monitor formula complexity and execution time
3. **Validation**: Test formulas with edge cases (zero values, missing data)
4. **Documentation**: Document formula logic for maintenance

### Inventory History & Audit Trail
1. **Comprehensive Logging**: Use response_data field for complete form submission context
2. **Validation Workflow**: Implement validation_status workflow for data quality
3. **Edit Tracking**: Leverage edit_history for correction audit trail
4. **Movement Types**: Use appropriate movement_type enum values for categorization

### Security & Performance
1. **RLS Compliance**: Always use organization-scoped queries
2. **Function Usage**: Prefer database functions for complex operations
3. **Batch Operations**: Use bulk functions for multiple asset creation
4. **Monitoring**: Monitor slow_query_log for performance issues

### Data Quality Management
1. **Consistent Units**: Use measurement_units definitions consistently
2. **Price Validation**: Link price changes to form submissions when possible  
3. **Asset Relationships**: Validate parent-child relationships before creation
4. **Metadata Standards**: Use consistent JSON structure in metadata fields

## Troubleshooting (Updated 2025)

### Common Issues & Solutions

#### Form Submission Problems
- **Missing Calculation Results**: Check `formula_validation_cache` on the form record
- **Mobile Submission Failures**: Verify PIN authentication and session validity
- **Formula Errors**: Use `formula_usage_analytics` table to debug formula execution
- **Missing Response Data**: Ensure complete form data is captured in `submission_data`

#### Asset & Inventory Issues  
- **Missing Inventory Items**: Assets created directly need inventory items - use `create_asset_with_inventory()`
- **Barcode Conflicts**: Use `generate_unique_barcode()` function to avoid duplicates
- **Price History Gaps**: Check if `capture_inventory_price_on_completion` trigger is active
- **Parent-Child Validation**: Verify parent and child assets are in same organization

#### Mobile QR Workflow Issues
- **PIN Authentication Failures**: Check `user_password_requirements` and PIN format validation
- **Session Timeouts**: Use `qr_scan_sessions` table to manage session lifecycle
- **Offline Sync Problems**: Check `mobile_debug_logs` for detailed error information
- **Anonymous Access Denied**: Verify RLS policies allow anonymous access for QR endpoints

#### Performance Issues
- **Slow Form Loading**: Check `report_cache` and consider form optimization
- **Formula Execution Timeouts**: Monitor `formula_usage_analytics` for performance metrics  
- **Large Dataset Queries**: Use `get_asset_count_fast()` and other optimized functions
- **Mobile Loading Issues**: Check network connectivity and consider data pagination

#### Data Quality Issues
- **Validation Status Problems**: Use inventory history `validation_status` workflow
- **Edit History Missing**: Ensure `track_inventory_history_edit` trigger is functioning
- **Conversion Field Errors**: Check `asset_type_conversion_history` for configuration changes
- **Formula Template Issues**: Verify template definitions in `formula_templates` table

### Debugging Tools
- **System Health**: Use `get_system_health_stats()` function
- **Performance Analysis**: Check `slow_query_log` and `report_runs` tables
- **Mobile Debugging**: Review `mobile_debug_logs` for mobile-specific issues
- **Organization Health**: Use `get_organization_health()` for org-specific metrics 