# Customizable Calculation Formulas

This document explains the customizable calculation formulas feature in the Logistiq system.

## Overview

The calculation formulas feature allows administrators to define custom calculations for form fields based on asset type. This is especially useful for inventory forms where specific calculations need to be performed based on asset-specific properties.

For example, in the paint inventory system, different paint types require different calculation formulas for determining total gallons, price calculations, or usage metrics.

## Key Components

### 1. Database Structure

- **Asset Types Table:** Includes a `calculation_formulas` JSONB column that stores formulas specific to each asset type
- **Database Functions:**
  - `get_asset_with_formulas_by_barcode`: Retrieves asset data including calculation formulas
  - `apply_asset_calculation_formulas`: Applies formulas to form data

### 2. UI Components

- **AssetCalculationManager:** Component for defining and managing formulas
- **Form Pre-population:** Enhanced to apply formulas during form load

## Formula Types

The system supports several types of calculation formulas:

1. **Basic Value:** Simple static value assignment
2. **Multiplication:** Multiplies a base value by a configurable multiplier
3. **Addition:** Adds a value to a base value
4. **Subtraction:** Subtracts a value from a base value
5. **Division:** Divides a base value by a divisor
6. **Custom Formula:** Allows for more complex calculations using JavaScript expressions

## Implementation Flow

1. **Administrator Setup:**
   - Admin configures asset type with forms (intake and inventory)
   - Admin defines calculation formulas for specific fields in those forms
   - Formulas are saved in the asset type's `calculation_formulas` field

2. **QR Code Scanning:**
   - When a QR code is scanned, the system retrieves asset data with formulas
   - Asset and formula data are passed to the form submission page

3. **Form Rendering:**
   - When the form loads, calculation formulas are applied to pre-fill calculated fields
   - The form displays with both manually entered and calculated values

4. **Form Submission:**
   - When the form is submitted, both user-entered and calculated values are saved

## Example Use Cases

### Paint Inventory System

For a paint called "B18" that needs custom calculations:

1. **Formula Definition:**
   - Field: `total_gallons`
   - Formula Type: Multiplication
   - Base Value: 42 (standard drum size)
   - Multiplier: 1.2 (specific to B18 paint)

2. **Result:**
   - When the inventory form is filled for B18 paint, the `total_gallons` field will automatically show 50.4 (42 × 1.2)

### Usage Calculation

1. **Formula Definition:**
   - Field: `usage_since_last_check`
   - Formula Type: Custom
   - Formula: `previous_inventory - current_inventory`

2. **Result:**
   - The form will automatically calculate usage based on the difference between previous and current inventory values

## Adding New Formulas

1. Navigate to the Asset Type Detail page
2. Scroll to the "Calculation Formulas" section
3. Select the tab for either "Intake Form Formulas" or "Inventory Form Formulas"
4. Click "Add Formula"
5. Configure the formula:
   - Enter a description
   - Select the target field from the dropdown
   - Choose the formula type
   - Enter the necessary values
6. Click "Save Formulas"

## Technical Implementation

The formulas are stored in a JSONB object with the following structure:

```json
{
  "field_name": "{\"type\":\"multiply\",\"description\":\"Calculate total gallons\",\"baseValue\":42,\"multiplier\":1.2}",
  "another_field": "{\"type\":\"add\",\"description\":\"Add standard buffer\",\"baseValue\":100,\"addend\":10}"
}
```

This structure allows for flexibility in formula types while maintaining a consistent interface for both storage and application.

## Decimal Precision Handling (June 2025 Update)

### Overview

The system now fully supports decimal values in calculations, particularly important for liquid inventory measurements (e.g., gallons, liters).

### Implementation Details

1. **Form Input:**
   - Forms accept decimal values (e.g., 44.20 gallons)
   - Calculations preserve full decimal precision during processing

2. **Database Storage:**
   - Inventory quantity columns store integer values (database constraint)
   - System automatically rounds decimal values for storage (e.g., 44.20 → 44)
   - Exact decimal values preserved in multiple locations:
     - Asset metadata: `exact_quantity_gallons`
     - Inventory history: `response_data.exact_quantity`
     - History notes: "Exact quantity: 44.20 gallons"

3. **Display and Reporting:**
   - UI shows rounded integer values in inventory cards
   - Forms and reports can access exact decimal values from metadata
   - Historical precision maintained for audit trails

### Example Workflow

1. **User enters:** 44.20 gallons in form
2. **System stores:**
   - `inventory_items.quantity`: 44 (rounded)
   - `assets.metadata.exact_quantity_gallons`: 44.20
   - `inventory_history.response_data`: { "total_gallons": 44.20, "exact_quantity": 44.20 }
3. **Display shows:** "44 units" with exact value available for detailed views

### Best Practices

- Always use decimal-aware calculations for liquid measurements
- Reference `exact_quantity_gallons` from metadata for precise reporting
- Include units in field labels to clarify measurement type
- Consider displaying both rounded and exact values in critical reports

### Future Enhancements

- Database schema migration to support decimal columns when possible
- UI enhancement to display "44 units (44.20 gallons)" format
- Configurable rounding rules per asset type 