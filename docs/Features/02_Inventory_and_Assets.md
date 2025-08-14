# 05.02 Inventory & Assets (Updated August 2025)

This document provides a detailed overview of the inventory and asset management system in the BarcodEx application.

---

## 🏗️ **Core Concepts**

-   **Assets**: The physical items that are being tracked (e.g., a specific laptop or vehicle).
-   **Asset Types**: The categories that assets belong to (e.g., "Laptops", "Vehicles"). Asset types define custom fields and barcode settings.
-   **Inventory Items**: A one-to-one record associated with each asset that tracks its current state (e.g., quantity, location).
-   **Inventory History**: A complete audit log of all changes to an inventory item.

---

## 🔑 **Key Features**

-   **Automatic Inventory Creation**: When a new asset is created, a corresponding inventory item and history record are automatically generated.
-   **Dynamic Forms**: Data for inventory checks is collected through dynamic forms that are configured at the asset type level.
-   **Real-time Status**: The UI displays real-time inventory levels, freshness indicators, and low-stock warnings.
-   **Complete Audit Trail**: Every change to an inventory item is logged with a timestamp, the user who made the change, and the full data from the submitted form.

---

## 📂 **Code Implementation**

-   **Frontend Services**:
    -   `assetService.ts` (`src/services/assetService.ts`)
    -   `inventoryService.ts` (`src/services/inventoryService.ts`)
-   **Key UI Components**:
    -   `AssetList.tsx` (`src/components/inventory/AssetList.tsx`): The main view for browsing assets and their inventory status.
    -   `AssetCard.tsx` (`src/components/inventory/AssetCard.tsx`): Displays a single asset with its inventory indicators.
    -   `InventoryHistoryViewer.tsx` (`src/components/inventory/InventoryHistoryViewer.tsx`): Displays the audit trail for an inventory item.
-   **Key Pages**:
    -   `Assets.tsx` (`src/pages/Assets.tsx`)
    -   `Inventory.tsx` (`src/pages/Inventory.tsx`)
    -   `AssetDetail.tsx` (`src/pages/AssetDetail.tsx`)

---

## 🗄️ **Database Model**

-   **`assets`**: The core table for asset data.
-   **`asset_types`**: Defines the categories and settings for assets.
-   **`inventory_items`**: Tracks the current state of each asset.
-   **`inventory_history`**: The audit log of all changes.

For a complete schema, refer to `03_Supabase_Backend.md` and the auto-generated types in `src/types/database.types.ts`.


