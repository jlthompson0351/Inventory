# Barcode & QR Code Technical Implementation (Updated August 2025)

This document provides a detailed technical overview of the barcode and QR code system in the BarcodEx inventory management application.

---

## 🏗️ **Architecture Overview**

The system is comprised of three main layers:

1.  **Frontend Components**: A suite of React components for generating, displaying, scanning, and printing barcodes.
2.  **Backend Services**: Supabase PostgreSQL tables, functions (RPCs), and Row-Level Security (RLS) policies for data management and security.
3.  **Mobile QR Workflow**: A specialized workflow for mobile devices, allowing for PIN-based authentication and inventory management in the field.

---

## 📱 **Mobile QR Workflow**

This is a critical feature for field operations, allowing users to interact with assets by scanning QR codes.

### **User Flow**
1.  **Scan QR Code**: User scans a QR code on an asset, which links to `/mobile/asset/:assetId`.
2.  **Anonymous Access**: The application loads a mobile-optimized view of the asset's basic information without requiring a full login.
3.  **PIN Authentication**: To perform any action (e.g., inventory check), the user must enter their 4-digit `quick_access_pin`.
4.  **Authorized Actions**: Once authenticated, the user can submit forms and update inventory, with all actions being audited.

### **Technical Implementation**
-   **Routing**: The `/mobile/asset/:assetId` route is publicly accessible.
-   **Authentication**: A temporary, session-based authentication is created upon successful PIN validation. This is separate from the standard Supabase auth.
-   **Security**: RLS policies are specifically designed to allow read-only anonymous access to a limited set of data, while all write operations require a valid PIN.
-   **Key Component**: `src/pages/MobileAssetWorkflow.tsx` orchestrates this entire process.

---

## 🗄️ **Database Schema**

### **`asset_types` Table**
-   `barcode_enabled` (BOOLEAN): Toggles barcode functionality for this asset type.
-   `barcode_prefix` (TEXT): A short prefix (e.g., "TOOL") for generated barcodes.

### **`assets` Table**
-   `barcode` (TEXT): Stores the unique, generated barcode value for the asset.

### **`profiles` Table**
-   `quick_access_pin` (VARCHAR(4)): Stores the user's 4-digit PIN for the mobile workflow.

---

## 🔒 **Security (RLS)**

-   **Anonymous Access**: A set of `SELECT` policies allows anonymous users to read a minimal amount of data required to render the mobile asset view.
-   **PIN-Gated Writes**: All `INSERT`, `UPDATE`, and `DELETE` operations are protected by policies that require a valid, authenticated user session (either standard or PIN-based).
-   **Data Isolation**: All policies are still scoped by `organization_id` to ensure tenants cannot access each other's data.

---

## 💨 **Backend Logic (Database Functions)**

-   **`generate_asset_barcode(asset_id)`**:
    -   Creates a unique barcode for a given asset based on its type's prefix and a unique identifier.
    -   Updates the `assets` table with the new barcode.
-   **`find_asset_by_barcode(barcode)`**:
    -   A security-definer function that allows for looking up an asset by its barcode.
    -   Used by the scanner to identify assets.

---

## ⚛️ **Frontend Components**

### **Core Components**
-   **`BarcodeScanner` (`src/components/inventory/BarcodeScanner.tsx`)**:
    -   Uses the device's camera to scan for barcodes and QR codes.
    -   Requires HTTPS to function.
-   **`BarcodeDisplay` (`src/components/inventory/BarcodeDisplay.tsx`)**:
    -   Renders a barcode or QR code for a given value.
-   **`BarcodeGenerator` (`src/components/inventory/BarcodeGenerator.tsx`)**:
    -   Provides a UI for generating a new barcode for an asset.

### **Workflow Components**
-   **`MobileAssetWorkflow` (`src/pages/MobileAssetWorkflow.tsx`)**: The main page for the mobile QR workflow.
-   **`QRCodePrintManager` (`src/pages/QRCodePrintManager.tsx`)**: A tool for bulk printing of QR codes for multiple assets. 