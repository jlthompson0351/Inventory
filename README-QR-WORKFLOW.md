# QR Code Inventory Workflow Implementation

This document describes the implementation of the QR code-only inventory workflow for Barcodex.

## Overview

The workflow allows users to:
1. Add assets to inventory
2. Generate QR codes for these assets
3. Attach QR codes to physical assets
4. Scan the QR codes during monthly inventory checks

When scanning a QR code, users are presented with two options:
- **Intake**: Add items to stock
- **Monthly Inventory**: Take stock of existing inventory

Both options automatically navigate to pre-populated forms.

## Database Changes

A migration file `20240620000000_qr_code_workflow_forms.sql` was created with the following changes:

1. Added form ID columns to asset_types table:
   - `intake_form_id`: Reference to the form used for intake operations
   - `inventory_form_id`: Reference to the form used for monthly inventory checks

2. Created a new database function:
   - `get_asset_forms_by_barcode`: Returns asset data along with associated form IDs for the QR code workflow

## Service Updates

The `inventoryService.ts` was enhanced with a new function:

```typescript
export async function getAssetFormsByBarcode(
  supabase: ReturnType<typeof createClient<Database>>,
  barcode: string
): Promise<any> {
  // Calls the database function and returns form data
}
```

## Component Updates

### BarcodeScanner.tsx

The main scanner page was updated to:
1. Use QR-specific terminology throughout
2. Call `getAssetFormsByBarcode` when a QR code is scanned
3. Display two action buttons when an asset is found:
   - Intake (Add to Stock)
   - Monthly Inventory (Take Stock)
4. Navigate to the appropriate form with pre-populated data

### SubmitForm.tsx

A new form submission page was created that:
1. Accepts prefilled data via React Router's location state
2. Retrieves asset context from QR code scanning (asset ID, name, etc.)
3. Shows an indicator when data is pre-populated from a QR code
4. Handles form submission with the appropriate context
5. Navigates to the relevant page after submission

## Routes

A new route was added to support the form submission flow:
```typescript
<Route path="/forms/submit/:id" element={<SubmitForm />} />
```

## Usage

1. **Asset Type Setup**:
   - In the Admin UI, asset types need to have form IDs configured:
   - Set `intake_form_id` to a form for adding stock
   - Set `inventory_form_id` to a form for monthly inventory checks

2. **Workflow**:
   - Navigate to the QR Scanner page
   - Scan a QR code or enter manually
   - When an asset is found, select either "Intake" or "Monthly Inventory"
   - Complete the pre-populated form
   - Submit to update inventory records

## Technical Notes

- The workflow uses `jsQR` library for QR code detection
- Form pre-population passes data via React Router's location state
- Database form references ensure that the correct forms are used for each asset type 

## Error Handling and Fallbacks

The QR code scanner implementation includes robust error handling for environments where camera access might be limited:

1. **Camera API Detection**:
   - Checks for `navigator.mediaDevices.getUserMedia` support
   - Shows appropriate messages when camera isn't available
   - Automatically disables camera button in unsupported environments

2. **Manual Entry**:
   - All QR code features can be accessed via manual code entry
   - Prominent input box allows users to type QR codes directly

3. **Simulation Mode**:
   - In environments without camera access (like some desktop browsers), a "Simulate QR Scan" button appears
   - This allows testing of the workflow without an actual camera
   - Useful for demonstrations and development testing

4. **User Guidance**:
   - Clear error messages explain camera issues
   - Visual indicators direct users to alternative input methods
   - Toast notifications provide feedback at each step

These fallbacks ensure the QR code workflow remains functional across all devices and environments, with or without camera access. 