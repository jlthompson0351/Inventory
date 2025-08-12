# Barcode Component Guide (Updated August 2025)

This guide provides an overview of the key React components that power the barcode and QR code functionality in the BarcodEx inventory management system.

---

## 🎨 **Core UI Components**

### **`BarcodeDisplay`**
-   **Location**: `src/components/inventory/BarcodeDisplay.tsx`
-   **Purpose**: A versatile component that renders a barcode or QR code for a given value. It is used throughout the application to visually display barcodes.
-   **Key Props**:
    -   `value` (string): The data to be encoded in the barcode.
    -   `type` ('qr' | 'code128', etc.): The type of barcode to render.

### **`BarcodeScanner`**
-   **Location**: `src/components/inventory/BarcodeScanner.tsx`
-   **Purpose**: Activates the user's camera to scan for barcodes and QR codes.
-   **Key Props**:
    -   `onScan` (function): A callback function that is triggered when a barcode is successfully scanned.
    -   `onClose` (function): A callback to close the scanner interface.
-   **Note**: This component requires an **HTTPS** connection to access the camera.

### **`BarcodeToggle`**
-   **Location**: `src/components/inventory/BarcodeToggle.tsx`
-   **Purpose**: A UI control used in the **Asset Type** settings to enable or disable barcode generation and to set a `barcode_prefix`.
-   **Key Props**:
    -   `enabled` (boolean): Whether barcode generation is active.
    -   `prefix` (string): The prefix for new barcodes.
    -   `onChange` (function): A callback that provides the updated settings.

---

## ⚙️ **Workflow & Management Components**

### **`BarcodeGenerator`**
-   **Location**: `src/components/inventory/BarcodeGenerator.tsx`
-   **Purpose**: Provides a UI to manually generate a new, unique barcode for an asset, typically used if an asset was created before barcodes were enabled for its type.
-   **Key Props**:
    -   `assetId` (string): The ID of the asset to generate a barcode for.
    -   `onGenerate` (function): A callback that receives the newly generated barcode value.

### **`AssetBarcodeDisplay`**
-   **Location**: `src/components/inventory/AssetBarcodeDisplay.tsx`
-   **Purpose**: A higher-level component that fetches and displays the barcode for a given asset ID. It often wraps `BarcodeDisplay` and includes additional context or actions related to the asset.
-   **Key Props**:
    -   `assetId` (string): The ID of the asset whose barcode should be displayed.

### **`QRCodePrintManager`**
-   **Location**: `src/pages/QRCodePrintManager.tsx`
-   **Purpose**: A full-page tool for bulk printing of QR codes.
-   **Features**:
    -   Asset browser with search and filtering.
    -   Bulk selection of assets.
    -   Configuration of QR code size and paper size.
    -   Generates a print-ready HTML sheet with neatly arranged QR codes.

---

## 📲 **Mobile Workflow Components**

### **`MobileAssetWorkflow`**
-   **Location**: `src/pages/MobileAssetWorkflow.tsx`
-   **Purpose**: The primary component for the mobile QR workflow. It handles the initial anonymous asset view, the PIN authentication prompt, and the display of available actions for the authenticated user.

---

## ⚙️ **Backend Service**

### **`barcodeService.ts`**
-   **Location**: `src/services/barcodeService.ts`
-   **Purpose**: A collection of frontend utility functions for interacting with the barcode system.
-   **Key Functions**:
    -   `generateAssetBarcode(assetId)`: Calls the Supabase RPC to generate a new barcode.
    -   `findAssetByBarcode(barcode)`: Searches for an asset by its barcode value.

---

This guide provides a high-level overview of the main components. For detailed prop types and usage examples, please refer to the JSDoc comments within each component's source file. 