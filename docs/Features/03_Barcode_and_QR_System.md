# 05.03 Barcode & QR System (Updated August 2025)

This document provides a detailed overview of the barcode and QR code system in the BarcodEx application.

---

## 🏗️ **Core Concepts**

-   **Asset-Tied Barcodes**: Each asset can have a unique barcode or QR code.
-   **Asset-Type Configuration**: Barcode generation is enabled and configured at the asset type level, allowing for different settings (e.g., prefixes) for different categories of assets.

---

## 🔑 **Key Features**

-   **Automatic Generation**: Barcodes are automatically generated for new assets if enabled on the asset type.
-   **Scanning**: The application includes a camera-based scanner for both barcodes and QR codes.
-   **Bulk Printing**: A dedicated "QR Code Print Manager" allows for the bulk printing of QR code labels for multiple assets.
-   **Mobile Workflow Integration**: The barcode system is a key part of the mobile QR workflow for field operations.

---

## 📂 **Code Implementation**

-   **Frontend Service**: `barcodeService.ts` (`src/services/barcodeService.ts`)
-   **Key UI Components**:
    -   `BarcodeScanner.tsx` (`src/components/inventory/BarcodeScanner.tsx`): The camera-based scanner.
    -   `BarcodeDisplay.tsx` (`src/components/inventory/BarcodeDisplay.tsx`): Renders a barcode or QR code.
    -   `QRCodePrintManager.tsx` (`src/pages/QRCodePrintManager.tsx`): The bulk printing tool.
-   **Backend Logic**:
    -   `generate_asset_barcode(asset_id)`: A Supabase RPC for generating a unique barcode.

---

## 🚀 **Deployment & Usage Notes**

-   **HTTPS Required**: The barcode scanner requires a secure (HTTPS) connection to access the device's camera. This is handled automatically by Firebase Hosting.
-   **Mobile First**: The scanning functionality is primarily designed for use on mobile devices.

For more details on the mobile-specific aspects of this system, refer to `05_Features/04_Mobile_QR_Workflow.md`.

















