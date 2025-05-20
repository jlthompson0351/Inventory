# Welcome to BarcodEx Inventory Management System

## About BarcodEx

BarcodEx is a modern inventory management system designed to help businesses track and manage assets efficiently. It features a robust organization management system, user roles, and barcode scanning capabilities.

## Key Features

- **Organization Management**: Multi-organization support with hierarchical access controls
- **Asset Type and Form Management**: Define asset categories, link them to various forms (intake, inventory, custom) for different purposes, and manage these relationships.
- **Asset Tracking**: Track individual assets with detailed properties, history, and linked forms.
- **User Management**: Role-based access control (coming soon)
- **Form Builder**: Create custom forms with dynamic calculations
- **Form Scheduling**: Schedule recurring form submissions for assets
- **Barcode System**: Generate, display, print, and scan barcodes for assets
- **Admin Tools**: Diagnostic tools and system monitoring for admins
- **Price Tracking**: Track cost history of assets for financial reporting
- **Asset Relationships**: Model complex equipment with parent-child relationships

## Asset Management

The system now includes comprehensive asset management:

- **Asset Types**: Define categories of assets with specific properties. Asset types can be soft-deleted (marked with `deleted_at`).
- **Individual Assets**: Track specific assets with detailed properties and history.
- **Form Integration & Linking**:
    - **`asset_type_forms` Table**: A dedicated many-to-many join table now manages the relationship between asset types and forms.
    - **Purpose-Driven Linking**: Forms can be linked to an asset type for specific purposes (e.g., 'intake', 'inventory', 'adjustment', 'transfer') or custom user-defined purposes.
    - **Centralized Management**: Links can be managed from the Asset Type editor modal and the Forms page.
    - **Intake Form Workflow**: When a new asset is created:
        - The system identifies the 'intake' form linked to the selected asset type via `asset_type_forms`.
        - The `form_data` (JSON schema) for this intake form is fetched and used to render a `DynamicForm`.
        - Data submitted through this intake form is passed to the `createAssetAndInitialInventory` service function, which:
            - Reads `inventory_action` properties (e.g., 'add', 'subtract', 'set') defined on fields within the intake form's schema.
            - Calculates the initial inventory quantity based on these actions and submitted values.
            - Stores the full submission in `inventory_history.response_data`.
- **Dynamic Formulas**: Support for calculated fields in forms based on user input.
- **Inventory Actions in Forms**: Numeric fields in forms can be assigned an `inventory_action` ('add', 'subtract', 'set') via the Form Builder. This action is processed during form submission (e.g., asset intake) to automatically adjust the `inventory_items.quantity`.
- **Dynamic Formulas**: Support for calculated fields in forms based on user input (can work in conjunction with inventory actions).
- **Scheduled Forms**: Automatically schedule recurring forms for asset maintenance
- **Form Submissions**: Store and analyze form data with calculated results
- **Parent-Child Relationships**: Create hierarchical asset structures for complex equipment
- **Price History**: Track cost changes over time for accurate financial reporting

## Organization Management

The system includes comprehensive organization management features:

- **General Settings**: Update organization name, description, and avatar
- **Admin Settings**: Configure organization-specific settings
- **Debug Panels**: Advanced diagnostic tools for system administrators
- **Multi-organization Support**: Users can belong to multiple organizations

For detailed documentation on organization components, see [Organization Components Documentation](./src/components/organization/README.md).

## Tech Stack

This project is built with modern web technologies:

- **Frontend**: React, TypeScript, Vite
- **UI Components**: shadcn-ui, Tailwind CSS
- **Backend**: Supabase (Authentication, Database, Storage)
- **State Management**: React hooks and context

For detailed documentation on Supabase integration, see [Supabase Integration Documentation](./src/integrations/supabase/README.md).

## Recent Improvements

### Intelligent Form Purpose Detection & UI Improvements (June 2025)

- **Smart Purpose Detection**: Automatically suggests the appropriate form purpose (intake, inventory, adjustment, transfer) based on the form name when linking forms to asset types.
  - Forms containing words like "intake," "add," or "create" are suggested as intake forms
  - Forms containing words like "inventory," "check," or "list" are suggested as inventory forms
  - Forms containing words like "adjust," "update," or "modify" are suggested as adjustment forms
  - Forms containing words like "transfer," "move," or "relocate" are suggested as transfer forms
- **Enhanced Dropdown UI**: Improved the form linking dropdown to show all available forms with visual indicators (checkmarks) for already linked forms.
- **Form Name Display**: Added clear display of form names in the mapped forms section for better visibility.
- **Optimized Layout**: Reorganized the mapped forms section with better spacing and alignment of action buttons.
- **Improved Visual Indicators**: Enhanced the asset type table view with color-coded icons that clearly indicate when forms are linked to an asset type. Form icons now appear in primary color when linked and muted gray when not linked.

### Robust Asset Type & Form Linking (May 2025 - Current Sprint)

- **`asset_type_forms` Table**: Introduced a many-to-many join table to robustly link forms to asset types for various purposes (intake, inventory, adjustment, transfer, and custom). This replaces the previous direct `intake_form_id` and `inventory_form_id` columns on `asset_types`.
- **Purpose-Driven Architecture**: Forms are now explicitly linked with a `purpose` to an asset type.
- **Enhanced UI for Linking**:
    - Asset Type Editor: Now features a "Mapped Forms" section to view, link, unlink, or create forms for standard and custom purposes.
    - Forms Page: Form cards now display badges indicating which asset types they are linked to, along with the asset type's color.
    - Smart Form Purpose Detection: The system now intelligently suggests the appropriate purpose (intake, inventory, adjustment, transfer) based on keywords in the form name.
    - Visual Form Status: The dropdown for linking forms shows checkmarks for already linked forms and prevents double-linking.
- **Streamlined Intake Process**:
    - When creating a new asset, the system automatically fetches the linked 'intake' form based on the selected asset type and its `asset_type_forms` mapping.
    - The `form_data` (JSON schema) is now correctly fetched by the `get_forms_for_asset_type` Supabase RPC and used to render the `DynamicForm` for intake.
    - Submitted intake data is processed by the `createAssetAndInitialInventory` service, which now interprets `inventory_action` properties ('add', 'subtract', 'set') defined on numeric fields within the intake form schema to calculate the initial quantity for the `inventory_items` record. The full submission is stored in `inventory_history.response_data`.
- **Soft Deletes for Asset Types**: Asset types now use a `deleted_at` column for soft deletion, ensuring they are filtered from active views but can be recovered or audited.
- **Backend Service & Function Updates**: All relevant backend services (`assetTypeService`, `formService`, `formSubmissionService`, `mappedFieldService`) and Supabase RPC functions (`get_forms_for_asset_type`, `get_asset_types_for_form`, `link_asset_type_form`, `unlink_asset_type_form`) have been updated to use the new `asset_type_forms` logic and ensure organization-awareness.
- **View Updates**: The `mapped_fields_reporting` view has been updated to correctly join through `asset_type_forms` for accurate reporting.

### Financial Tracking Implementation (June 2025)

- Added cost and unit type fields to asset creation process
- Created `inventory_price_history` table to track price changes over time
- Connected assets to inventory items for comprehensive financial tracking
- Added organization-specific price history for cross-organization reporting
- Enhanced asset cards with price information display

### QR Code Integration (May 2025)

- Integrated QR code generation based on asset type settings
- Added QR code display in asset detail pages with download capability
- Fixed issues with barcode string conversion to visual QR codes
- Enhanced asset lookup via QR code scanning
- Added automated barcode generation during asset creation

### Asset Relationship Enhancement (May 2025)

- Fixed `parent_asset_id` relationship in database schema
- Added explanatory text for parent-child asset relationships
- Created visual display of asset hierarchies in the UI
- Enhanced asset cards to show relationship information
- Added relationship filtering in asset lists

### UI Enhancements (May 2025)

- Redesigned Assets page with type and status filtering
- Improved grid and table views with more functional information display
- Created modern card layouts with clear status indicators
- Added filter badges to show active filters
- Enhanced asset detail pages with more comprehensive information

### Barcode System Implementation (April 29th, 2025)

- Implemented a complete barcode generation, rendering, scanning, and management system.
- Created dedicated components for toggling barcode settings, generating new codes, rendering existing codes, previewing/printing codes, and scanning codes via camera.
- Added a `BarcodeService` for utility functions.
- Updated database functions to correctly retrieve barcode settings.
- Added comprehensive documentation and a demo page (`/barcode-tools`).

### Asset and Form Integration (June 2025 - *Planned*)

1. **Individual Asset Tracking**
   - New `assets` table for tracking individual assets
   - Detailed asset properties including serial numbers and metadata
   - Link assets to asset types for consistent categorization

2. **Form Submission System**
   - Track form submissions for assets and asset types
   - Store both raw form data and calculated results
   - Support for linking submissions to individual assets

3. **Dynamic Calculations**
   - Formula field support in forms
   - Automatic calculation based on form inputs
   - Store calculated results for reporting and analysis

4. **Form Scheduling System**
   - Schedule forms for regular asset checks
   - Support for daily, weekly, monthly, or yearly schedules
   - Find pending forms due for specific assets

5. **Comprehensive Documentation**
   - Detailed data model documentation
   - Implementation guides for asset/form integration
   - Examples and best practices

### Asset Type Management (April 2025)

1. **Simplified UI**
   - Removed icon functionality for cleaner interface
   - Enhanced color-based visual categorization
   - Streamlined asset type creation and editing forms

2. **Performance Improvements**
   - Fixed loading state issues to prevent infinite spinners
   - Added connection verification with Supabase
   - Implemented safety timeouts for loading states
   - Enhanced error handling with descriptive messages

3. **Cross-Organization Features**
   - Improved mothership view for system administrators
   - Enhanced asset type cloning between organizations
   - Better filtering and sorting in multi-organization views

### Organization Management Improvements

1. **Improved Error Handling**
   - Added comprehensive error handling with descriptive messages
   - Implemented toast notifications for better user feedback
   - Enhanced error logging for debugging

2. **Enhanced Loading States**
   - Added skeleton UI components for loading states
   - Improved loading indicators for asynchronous operations
   - Better user feedback during data fetching and updates

3. **Better Diagnostics**
   - Enhanced diagnostic tools for system administrators
   - Added detailed system information display
   - Improved database diagnostics with table counts

4. **UI Enhancements**
   - More visually appealing placeholder components
   - Added estimated release dates for upcoming features
   - Better visual hierarchy and layout for admin panels

## Database Documentation

For detailed information about the database structure and relationships, see:

- [Database Model Documentation](./supabase/docs/data-model.md)
- [Asset and Form Integration Guide](./supabase/docs/assets-and-forms.md)

## Upcoming Features

### Dynamic Reporting System (Planned)

The next major feature will be a dynamic, multi-subject reporting system:

1. **Flexible Data Source Selection**: Choose from assets, inventory items, form submissions, and more
2. **Custom Column Selection**: Select specific columns from related tables
3. **Filter Builder**: Apply relevant filters to refine report data
4. **Preview and Export**: Preview results and export to CSV (and later PDF)
5. **Advanced Sorting**: Custom row ordering for enhanced reporting capabilities

For detailed information about the upcoming reporting system, see:
- [Reporting System Plan](./docs/REPORTING-PLAN.md)

## Development Setup

To run this project locally:

```bash
# Install dependencies
npm install

# Start the development server
vite
# OR
npm run dev
```

The application will be available at http://localhost:8080 (or another port if 8080 is in use). When using Vite, the development server will automatically select an available port if the default is in use.

## Troubleshooting

### Connection Issues

If you experience connection issues with Supabase:
1. Check the browser console for error messages
2. Verify your network connection
3. Ensure your Supabase project is running and accessible
4. Check that your authentication tokens are valid

### UI Loading Issues

If you encounter perpetual loading indicators:
1. Check browser console for error messages
2. Refresh the page to reset loading states
3. Verify Supabase connection in the network tab
4. Check for any 400 or 500 errors in API responses

# Barcodex Inventory System Documentation

## Barcode Functionality

### Overview

The Barcodex Inventory System now includes robust barcode generation and scanning capabilities to simplify asset tracking. Each asset can have a unique barcode or QR code that is automatically generated based on settings defined at the asset type level.

### Barcode Configuration

#### Asset Type Barcode Settings

Barcode configuration is managed at the **Asset Type** level, providing consistent barcode generation for all assets of a specific type:

1. **Enable/Disable Barcodes** - Choose whether assets of this type should automatically receive barcodes
2. **Barcode Type** - Select from:
   - QR Code (default)
   - Code128 Barcode
   - Code39 Barcode
3. **Barcode Prefix** - Add an optional prefix (e.g., "PAINT-") to make barcode values more recognizable

These settings can be configured when:
- Creating a new asset type
- Editing an existing asset type
- Via the Asset Type Detail page

#### Auto-Generation Logic

When a new asset is created:
1. The system checks if the asset's type has barcode generation enabled
2. If enabled, it automatically generates a unique barcode using:
   - The selected barcode format
   - The configured prefix (if any)
   - A unique identifier derived from the asset's ID
3. The barcode is stored with the asset record

### Scanning and Lookup

The system provides several ways to use barcodes:

1. **Asset Scanner** - The dedicated scanner page allows quick lookup of assets by scanning their barcode
2. **Inventory Forms** - Forms can be associated with assets by scanning their barcode
3. **Mobile Scanning** - The responsive design supports mobile devices for on-the-go scanning

### Technical Implementation

#### Key Components

1. **BarcodeToggle Component** (`src/components/inventory/BarcodeToggle.tsx`)
   - UI component for configuring barcode settings
   - Used in both asset type creation and editing flows

2. **BarcodeDisplay Component** (`src/components/inventory/BarcodeDisplay.tsx`)
   - Renders barcodes/QR codes for assets
   - Provides regeneration and printing functions

3. **BarcodeScanner Component** (`src/components/inventory/BarcodeScanner.tsx`)
   - Camera-based scanning interface
   - Converts scanned codes to asset lookups

4. **AssetBarcodeDisplay Component** (`src/components/inventory/AssetBarcodeDisplay.tsx`)
   - Specialized component for displaying asset barcodes
   - Handles downloading and printing QR codes

#### Services

1. **generateAssetBarcode** (`src/services/inventoryService.ts`)
   - Generates unique barcodes based on asset information and type settings
   - Called automatically during asset creation

2. **BarcodeService** (`src/services/barcodeService.ts`)
   - Provides utility functions for generating and parsing barcodes
   - Handles converting QR codes to downloadable formats

### Form Builder Changes

The Form Builder has been simplified by removing the barcode field type option. Barcodes are now managed at the asset type level rather than as individual form fields.

### Asset Creation Process

When creating a new asset:
1. Select an asset type with barcode generation enabled
2. Complete the asset information including cost and unit type
3. On submission, the system automatically generates a barcode
4. The barcode is permanently associated with the asset
5. Initial price history is recorded for future reporting

### Usage Examples

#### Scenario 1: Setting up barcode generation for an asset type

1. Navigate to Asset Types
2. Create or edit an asset type
3. Enable the "Auto-generate barcodes for all assets of this type" option
4. Select the preferred barcode format and optional prefix
5. Save the asset type

#### Scenario 2: Scanning an asset barcode

1. Navigate to the Scan page
2. Allow camera access when prompted
3. Point the camera at a barcode or QR code
4. The system will identify the asset and display its details
5. Options to view the asset or perform inventory actions will be available

### Best Practices

1. **Consistent Prefixes** - Use meaningful prefixes that help identify asset categories (e.g., "PAINT-", "TOOL-")
2. **QR vs. Barcode** - Choose QR codes for more data capacity and better mobile scanning; linear barcodes for compatibility with legacy scanners
3. **Printing** - Use the print function to create physical labels for assets
4. **Scanning Environment** - Ensure adequate lighting for reliable scanning
5. **Testing** - Verify your barcode settings by creating test assets before full deployment
6. **Asset Relationships** - Use parent-child relationships for complex equipment with multiple components
7. **Price Tracking** - Record detailed notes when updating asset prices

# Soft Delete Pattern for Robust Data Management

## Why Soft Deletes?
- Prevents accidental data loss
- Enables recovery (Trash/Restore) - *Future UI enhancement*
- Supports audit trails and compliance

## How to Implement
1. **Add a `deleted_at` column** (timestamp, nullable) to any table you want to support soft deletes (e.g., `assets`, `inventory_items`, `asset_types`).
2. **Update all queries** (both backend RPCs/views and frontend services) to filter by `deleted_at IS NULL` to only show active records.
3. **Use helper functions** for soft deletes (e.g., `deleteAssetType` in `assetTypeService.ts` now performs a soft delete). Hard delete functions can be provided for admin purposes if necessary.
4. **Plan for Trash/Restore UI** so users can recover deleted items (future enhancement).
5. **Consider audit logging** for all delete actions for compliance and debugging.

## Checklist for Future Tables
- [X] `asset_types` now uses soft deletes.
- [ ] Add `deleted_at` column to other relevant tables.

## Example: Soft Delete Asset
```ts
await softDeleteAsset(assetId); // Sets deleted_at to now
```

## Example: Query Only Active Assets
```ts
const { data } = await supabase
  .from('assets')
  .select('*')
  .is('deleted_at', null);
```

---

**For more, see `src/services/assetService.ts` and related UI code.** 