# QR Code Inventory Workflow Implementation

This document describes the comprehensive QR code workflow implementation for Barcodex, including both traditional scanning and mobile QR workflows.

## Overview

The system supports two main QR code workflows:

### 1. Traditional QR Workflow (Desktop/Camera-based)
- Scan QR codes using device camera or manual entry
- Access inventory forms directly through authenticated session
- Immediate form navigation with pre-populated data

### 2. Mobile QR Workflow (PIN Authentication)
- Scan QR codes with any smartphone camera
- PIN-based authentication (no app installation required)
- Multiple workflow options (intake, inventory, continue existing)

## QR Code Types and URLs

The system generates different QR code formats depending on the use case:

### Traditional QR Codes
- **Format**: `{baseUrl}/qr/{encodedData}`
- **Data**: Base64-encoded JSON containing `{ assetId, barcode }`
- **Handler**: `QRScanHandler.tsx` component
- **Authentication**: Requires existing user session

### Mobile QR Codes  
- **Format**: `{baseUrl}/mobile/asset/{assetId}`
- **Direct Asset Link**: Links directly to asset workflow
- **Handler**: `MobileAssetWorkflow.tsx` component
- **Authentication**: PIN-based (4-digit quick access PIN)

## Database Schema

### Asset Types Configuration
Asset types can have associated forms for QR workflows:

```sql
-- Form ID columns in asset_types table
ALTER TABLE public.asset_types 
  ADD COLUMN intake_form_id UUID REFERENCES public.forms(id),
  ADD COLUMN inventory_form_id UUID REFERENCES public.forms(id);
```

### Database Functions

#### get_asset_forms_by_barcode
```sql
-- Returns asset and form data for QR code scanning
CREATE OR REPLACE FUNCTION public.get_asset_forms_by_barcode(p_barcode TEXT)
RETURNS JSON
```

**Note**: The original function queries `inventory_items` table but current implementation primarily uses the `assets` table directly with joins to `asset_types` for form references.

## Components and Pages

### QR Code Generation Components

#### 1. MobileQRCodeDisplay.tsx
- **Location**: `src/components/asset/MobileQRCodeDisplay.tsx`
- **Purpose**: Generates mobile QR codes for PIN-based workflow
- **Features**: QR regeneration, download, logging
- **URL Format**: `{baseUrl}/mobile/asset/{assetId}`

#### 2. AssetBarcodeDisplay.tsx
- **Location**: `src/components/inventory/AssetBarcodeDisplay.tsx`
- **Purpose**: Displays both QR codes and traditional barcodes
- **Features**: Multiple format support, download functionality

#### 3. BarcodeDisplay.tsx
- **Location**: `src/components/inventory/BarcodeDisplay.tsx`
- **Purpose**: Generic barcode/QR code display component
- **Features**: QR and barcode rendering with QRCodeCanvas

### QR Code Scanning Components

#### 1. BarcodeScanner (Component)
- **Location**: `src/components/inventory/BarcodeScanner.tsx`
- **Purpose**: Reusable camera-based scanning component
- **Dependencies**: `jsqr` library for QR detection
- **Features**: Real-time scanning, manual fallback, camera controls

#### 2. BarcodeScanner (Page)
- **Location**: `src/pages/BarcodeScanner.tsx`
- **Purpose**: Full-page scanner with inventory lookup
- **Features**: Camera scanning, manual entry, form navigation
- **Workflow**: Scan → Find asset → Show form options (Intake/Inventory)

#### 3. QRScanHandler
- **Location**: `src/pages/QRScanHandler.tsx`
- **Purpose**: Processes QR codes from URL parameters
- **Route**: `/qr/:code`
- **Features**: Decodes QR data, asset lookup, form redirection

#### 4. MobileAssetWorkflow
- **Location**: `src/pages/MobileAssetWorkflow.tsx`
- **Purpose**: Mobile PIN-based QR workflow
- **Route**: `/mobile/asset/:assetId`
- **Features**: PIN authentication, workflow options, form navigation

### Form Submission

#### SubmitForm.tsx
- **Location**: `src/pages/SubmitForm.tsx`
- **Route**: `/forms/submit/:id`
- **Features**:
  - Pre-population from QR scan data
  - Existing submission detection and editing
  - Asset calculation formulas
  - Mobile QR workflow support
  - Inventory updates for monthly checks

## Services

### QR Service
- **Location**: `src/services/qrService.ts`
- **Functions**:
  - `generateMobileAssetQR()`: Creates mobile QR codes
  - Asset data fetching and URL generation

### Inventory Service
- **Location**: `src/services/inventoryService.ts`
- **Functions**:
  - `getAssetFormsByBarcode()`: Fetches asset and form data
  - `getAssetWithFormulasByBarcode()`: Gets asset with calculation formulas

### Barcode Service
- **Location**: `src/services/barcodeService.ts`
- **Functions**: QR code and barcode generation utilities

## Routing Configuration

```typescript
// src/App.tsx
<Route path="/qr/:code" element={<QRScanHandler />} />
<Route path="/mobile/asset/:assetId" element={<MobileAssetWorkflow />} />
<Route path="/forms/submit/:id" element={<SubmitForm />} />
```

## Workflow Examples

### Traditional QR Workflow
1. **Asset Setup**: Configure `intake_form_id` and `inventory_form_id` in asset types
2. **QR Generation**: System generates QR codes with encoded asset data
3. **Scanning**: User scans QR code with camera or enters manually
4. **Processing**: `QRScanHandler` or `BarcodeScanner` processes the code
5. **Form Selection**: User selects "Intake" or "Monthly Inventory"
6. **Form Submission**: Navigate to `SubmitForm` with pre-populated data

### Mobile QR Workflow
1. **PIN Setup**: User configures 4-digit PIN in profile settings
2. **QR Generation**: `MobileQRCodeDisplay` creates mobile-optimized QR codes
3. **Mobile Scan**: Any smartphone camera scans QR code
4. **PIN Auth**: User enters PIN for authentication
5. **Workflow Options**: Choose from available actions (intake, inventory, continue)
6. **Form Completion**: Complete forms in mobile-optimized interface

## Form Pre-population

The system supports sophisticated form pre-population:

### Data Sources
- **Asset Metadata**: Basic asset information
- **Conversion Fields**: From asset type configuration
- **Existing Submissions**: For editing monthly inventory
- **Calculation Formulas**: Asset-specific formula calculations

### Pre-fill Logic
```typescript
// SubmitForm.tsx handles multiple data sources
const finalMergedData = {
  ...initialData,        // Form defaults
  ...prefillData,        // QR scan data
  ...assetMetadata,      // Asset information
  ...existingData        // Previous submissions (if editing)
};
```

## Error Handling and Fallbacks

### Camera Access Issues
- **Detection**: Checks for `navigator.mediaDevices.getUserMedia` support
- **Fallback**: Manual entry input field
- **Simulation**: Test scan button for development/demos
- **Guidance**: Clear error messages and alternative options

### Authentication Fallback
- **Traditional**: Requires existing user session
- **Mobile**: PIN-based authentication with session creation
- **Error States**: Clear messaging for invalid PINs or missing assets

### Asset Not Found
- **Traditional**: Option to create new inventory item
- **Mobile**: Clear error messaging with navigation options
- **Validation**: Multiple lookup methods (asset ID, barcode)

## Technical Dependencies

### Libraries
- **jsqr**: QR code detection from camera stream
- **qrcode**: QR code generation 
- **qrcode-react**: React QR code components
- **react-barcodes**: Linear barcode generation

### Browser Requirements
- **Camera API**: Required for scanning functionality
- **HTTPS**: Needed for camera access in production
- **Modern Browsers**: Support for MediaDevices API

## Security Considerations

### PIN Authentication
- 4-digit PIN stored securely in user profiles
- Session tokens with expiration (2 hours for mobile)
- Organization context validation

### QR Code Data
- Asset IDs in URLs (public but requires authentication)
- Base64 encoding for traditional QR codes
- No sensitive data embedded in QR codes

## Performance Optimizations

### QR Code Caching
- Asset cache clearing after inventory updates
- QR code regeneration logging
- Optimized image formats for mobile

### Form Loading
- Lazy loading of form data
- Efficient database queries with joins
- Minimal data transfer for mobile workflows

## Future Enhancements

### Potential Improvements
- Bulk QR code generation
- Advanced barcode formats
- Offline capability for mobile workflow
- Enhanced error recovery
- Multi-language QR code support 