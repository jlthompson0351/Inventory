# Asset Management and Form Integration

This document explains how assets, asset types, and forms work together in the Barcodex system.

## Key Concepts

### Asset Types vs Assets

- **Asset Types**: Categories or classes of assets (e.g., "Forklift", "Computer", "Vehicle")
- **Assets**: Individual instances of an asset type (e.g., "Forklift #123", "John's Laptop", "Delivery Van #7")

### Asset Relationships

Assets can have parent-child relationships, allowing you to model complex equipment with components:

- **Parent Assets**: Higher-level assets that may contain other assets as components
- **Child Assets**: Components or parts that belong to a parent asset
- **Relationship Chain**: Multiple levels of parent-child relationships can be established

### Price Tracking

The system tracks financial information for assets:

- **Initial Cost**: Recorded when creating a new asset
- **Price History**: All price changes are tracked in the `inventory_price_history` table
- **Unit Type**: Track costs per unit (each, box, pallet, etc.)
- **Currency Support**: Default is USD, but other currencies are supported

### Form Integration

Forms can be integrated with assets in several ways:

1. **Direct assignment**: An asset type can have default forms
   - `intake_form_id`: Used when creating new assets of this type
   - `inventory_form_id`: Used for regular inventory checks

2. **Scheduled forms**: Regular checks via the `form_schedules` system
   - Daily/weekly/monthly/yearly schedules
   - Targeted at specific asset types

3. **Ad-hoc forms**: Forms filled out on demand, not on a schedule

## Implementation Guide

### Creating Asset Types with Forms

```sql
-- Example: Creating an asset type with default forms
INSERT INTO asset_types (
  name, 
  description, 
  organization_id,
  intake_form_id,  -- Form used when adding new assets
  inventory_form_id  -- Form used for inventory checks
) VALUES (
  'Company Vehicle', 
  'Cars, trucks and vans used by the company',
  '123e4567-e89b-12d3-a456-426614174000',
  '123e4567-e89b-12d3-a456-426614174001',  -- ID of vehicle intake form
  '123e4567-e89b-12d3-a456-426614174002'   -- ID of vehicle check form
);
```

### Creating Individual Assets

```sql
-- Example: Creating an asset with price tracking and parent relationship
INSERT INTO assets (
  name,
  description,
  asset_type_id,
  organization_id,
  serial_number,
  status,
  parent_asset_id,  -- Set the parent asset if this is a component
  barcode           -- Barcode/QR code for scanning
) VALUES (
  'Delivery Van #7',
  '2020 Ford Transit delivery van',
  '123e4567-e89b-12d3-a456-426614174003',  -- Asset type ID
  '123e4567-e89b-12d3-a456-426614174000',  -- Organization ID
  'VIN12345678901234',
  'active',
  NULL,  -- No parent asset (this is a top-level asset)
  'VAN-123456-ABCDEF'  -- QR code value
);

-- Creating a component/child asset
INSERT INTO assets (
  name,
  description,
  asset_type_id,
  organization_id,
  serial_number,
  status,
  parent_asset_id  -- Set the parent asset if this is a component
) VALUES (
  'Van #7 Battery',
  'Replacement battery installed on 2023-05-15',
  '123e4567-e89b-12d3-a456-426614174004',  -- Battery asset type ID
  '123e4567-e89b-12d3-a456-426614174000',  -- Organization ID
  'BAT98765432',
  'active',
  '123e4567-e89b-12d3-a456-426614174005'   -- Parent asset ID (the van)
);
```

### Recording Price History

```sql
-- Example: Recording initial price for a new asset
INSERT INTO inventory_price_history (
  organization_id,
  inventory_item_id,
  price,
  currency,
  unit_type,
  effective_date,
  notes,
  created_by
) VALUES (
  '123e4567-e89b-12d3-a456-426614174000',  -- Organization ID
  '123e4567-e89b-12d3-a456-426614174006',  -- Inventory item ID
  35000.00,  -- Price
  'USD',     -- Currency
  'each',    -- Unit type
  NOW(),     -- Effective date
  'Initial purchase price',
  '123e4567-e89b-12d3-a456-426614174007'   -- User ID
);
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

### Submitting Forms with Calculations

```sql
-- Example: Submit a form with calculations (using the helper function)
SELECT process_form_submission(
  '123e4567-e89b-12d3-a456-426614174004',  -- Form ID
  '123e4567-e89b-12d3-a456-426614174005',  -- Asset ID
  '123e4567-e89b-12d3-a456-426614174003',  -- Asset type ID
  '{"odometer": 12500, "fuel_level": 75, "tire_pressure_fl": 32, "tire_pressure_fr": 33, "tire_pressure_rl": 32, "tire_pressure_rr": 32}',  -- Form data
  '123e4567-e89b-12d3-a456-426614174000',  -- Organization ID
  '123e4567-e89b-12d3-a456-426614174006'   -- User ID
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

## Best Practices

1. **Asset Type Design**: Group similar assets with similar form needs
2. **Form Reuse**: Create form templates that can be reused across asset types
3. **Scheduling Strategy**: 
   - Use appropriate intervals (don't over-check)
   - Consider asset usage patterns when scheduling
4. **Formula Design**:
   - Keep formulas simple when possible
   - Use clear field IDs that reflect their purpose
   - Handle edge cases (division by zero, missing inputs)
5. **Asset Relationships**:
   - Use parent-child relationships to model complex equipment
   - Keep relationship hierarchies reasonably shallow (2-3 levels)
   - Use consistent naming conventions for related assets
6. **Price Tracking**:
   - Record detailed notes with each price change
   - Use the appropriate unit type for each asset
   - Include original purchase receipts in asset metadata when possible

## Troubleshooting

- **Missing Form Data**: Check if the form was properly submitted with `submission_data`
- **Formula Calculation Errors**: Check the formula expression for syntax errors
- **Scheduling Issues**: Verify the asset type ID matches what's in the form schedule
- **Missing Price History**: Price history is stored separately from the asset record; query the `inventory_price_history` table
- **Relationship Problems**: Ensure parent and child assets belong to the same organization 