# Customizable Calculation Formulas

> ⚠️ **Outdated Document**: This document describes a previous version of the calculation engine. The information below has been updated for accuracy, but the authoritative documentation can be found in `docs/Features/05_Forms_and_Form_Builder.md` and `docs/SUPABASE-DATABASE-FUNCTIONS.md`.

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

2.  **QR Code Scanning & Form Submission:**
    - When a form is submitted, the raw user input and the form's schema are sent to the backend services.

3.  **Backend Processing:**
    - The backend service (e.g., `assetInventoryService.ts`) calls the `calculate_form_formulas` PostgreSQL function.
    - The database function evaluates all formulas using the raw input and any necessary asset metadata, returning the final, calculated values.

4.  **Data Storage:**
    - The backend service takes the authoritative results from the database function.
    - It then uses these calculated values to process inventory actions (`add`, `subtract`, `set`).
    - The final inventory quantity and the full `response_data` (containing both raw inputs and calculated results) are saved to the `inventory_history` table.

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

The authoritative calculation engine is the `calculate_form_formulas` PostgreSQL function. This function takes the form schema and submission data and returns a JSON object with the calculated values.

The frontend uses `Math.js` via `safeEvaluator.ts` to provide a real-time **preview** of calculations to the user, but these frontend calculations are **not** what is saved to the database.

The `calculation_formulas` JSONB object in the `asset_types` table stores metadata about formulas, but the evaluation logic resides entirely within the database function.

```json
{
  "field_name": "{\"type\":\"multiply\",\"description\":\"Calculate total gallons\",\"baseValue\":42,\"multiplier\":1.2}",
  "another_field": "{\"type\":\"add\",\"description\":\"Add standard buffer\",\"baseValue\":100,\"addend\":10}"
}
```

This structure allows for flexibility in formula types while maintaining a consistent interface for both storage and application.

## Decimal Precision Handling (June 2025 Update)

### Overview

The system now fully supports decimal values in calculations. The authoritative PostgreSQL functions and the frontend `Math.js` evaluator both handle decimal precision correctly.

### Implementation Details

1.  **Form Input & Calculation:**
    - Forms accept and process decimal values with full precision.
    - The database function `calculate_form_formulas` performs calculations using numeric types that preserve decimal accuracy.

2.  **Database Storage:**
    - For compatibility with other systems, the primary `inventory_items.quantity` column may store a rounded integer value.
    - The **exact decimal result** of any calculation is always preserved in the `response_data` JSONB field within the `inventory_history` table, ensuring a complete and accurate audit trail.

3.  **Display and Reporting:**
    - The primary UI may display the rounded integer for simplicity.
    - Detailed views, history, and reports should pull the exact decimal value from the `response_data` field to ensure accurate reporting.

### Example Workflow

1.  **User enters:** `44.20` gallons in a form. The frontend preview shows the calculated result in real-time.
2.  **On submission:** The backend calls the database function, which calculates the final value, preserving the `44.20` precision.
3.  **System stores:**
    - `inventory_items.quantity`: `44` (rounded, for legacy compatibility)
    - `inventory_history.response_data`: `{ "total_gallons": 44.20, ... }` (exact value is preserved)
4.  **Display shows:** "44 units" on the main card, but a detailed view of the history event will show the exact `44.20` value from the `response_data`.

### Best Practices

- For all precise reporting and auditing, **always** use the values stored within the `response_data` field in the `inventory_history` table.
- The primary `quantity` field on `inventory_items` should be considered a quick-reference summary, not the authoritative historical value.

### Future Enhancements

- Database schema migration to support decimal columns when possible
- UI enhancement to display "44 units (44.20 gallons)" format
- Configurable rounding rules per asset type 