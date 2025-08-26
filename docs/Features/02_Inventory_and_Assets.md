# 05.02 Inventory & Assets (Updated August 2025)

This document provides a detailed overview of the inventory and asset management system in the BarcodEx application.

---

## 🏗️ **Core Concepts**

-   **Assets**: The physical items that are being tracked (e.g., a specific laptop or vehicle).
-   **Asset Types**: The categories that assets belong to (e.g., "Laptops", "Vehicles"). Asset types define custom fields and barcode settings.
-   **Inventory Items**: A one-to-one record associated with each asset that tracks its current state (e.g., quantity, location, status).
-   **Inventory History**: A complete audit log of all changes to an inventory item with full data integrity and validation.

---

## 🔑 **Key Features**

-   **Asset-Centric Design**: Every asset has exactly one inventory record, ensuring data consistency and preventing orphaned inventory data.
-   **Dynamic Forms Integration**: Inventory checks use dynamic forms configured at the asset type level with form actions and calculations.
-   **Real-time Statistics**: Dashboard shows live metrics including total assets, inventory coverage percentage, low stock alerts (≤10 units), and out-of-stock items.
-   **Enhanced Security**: Row-level security policies ensure users only access inventory data from their organizations.
-   **Complete Audit Trail**: Every inventory change is logged with timestamp, user, form data, and validation status.
-   **Performance Optimized**: Database indexes optimized for common queries including low stock filtering and asset searches.
-   **Error Resilience**: Enhanced error handling with structured JSON responses and comprehensive validation.

---

## 📂 **Code Implementation**

-   **Frontend Services**:
    -   `assetInventoryService.ts` (`src/services/assetInventoryService.ts`) - Main service for inventory operations
    -   Enhanced with JSONB response handling and backward compatibility
-   **Key UI Components**:
    -   `AssetInventoryList.tsx` (`src/components/inventory/AssetInventoryList.tsx`): Displays assets with inventory status and actions
    -   Grid layout with stock level indicators and contextual action buttons
-   **Key Pages**:
    -   `Inventory.tsx` (`src/pages/Inventory.tsx`) - Main inventory management page with statistics dashboard
    -   `AssetDetail.tsx` (`src/pages/AssetDetail.tsx`) - Individual asset details with inventory management
    -   `AssetInventoryDetail.tsx` (`src/pages/AssetInventoryDetail.tsx`) - Detailed inventory management for specific assets

---

## 🗄️ **Database Model**

-   **`assets`**: Core asset data with organization relationships and metadata storage
-   **`asset_types`**: Asset categorization with color coding, form references, and settings
-   **`inventory_items`**: Current inventory state with 1:1 relationship to assets
-   **`inventory_history`**: Complete audit trail with form data, validation status, and edit tracking

---

## 🔧 **Database Functions**

### **Core RPC Functions:**
-   **`get_asset_with_inventory_status(asset_id)`**: Get single asset with inventory data and enhanced error handling
-   **`get_organization_assets_with_inventory(org_id)`**: Get all organization assets with inventory status
-   **`get_inventory_stats(org_id)`**: Comprehensive inventory statistics with consistent thresholds
-   **`insert_inventory_history_simple(...)`**: Insert inventory history records with automatic event type mapping

### **Statistics Functions:**
-   **`get_inventory_performance_stats(org_id)`**: Performance metrics with consistent low stock threshold (≤10 units)
-   **`get_dashboard_stats(org_id)`**: General dashboard statistics including inventory counts

### **Key Features:**
-   **Consistent Thresholds**: All functions use ≤10 units for low stock calculations
-   **Enhanced Error Handling**: Structured JSONB responses with success/error status
-   **Performance Indexes**: Optimized for low stock queries and asset filtering
-   **Security**: Organization-based access control with proper RLS policies

---

## 📊 **Statistics Dashboard**

The inventory page provides real-time metrics:
-   **Total Assets**: Count of all organization assets
-   **Assets With Inventory**: Number of assets with active inventory tracking
-   **Low Stock Items**: Items with quantity ≤10 units (amber warning)
-   **Out of Stock Items**: Items with quantity = 0 units (red alert)
-   **Inventory Coverage**: Percentage of assets with inventory tracking

---

## 🔄 **Data Flow**

1. **Asset Creation** → Automatic inventory record creation
2. **Inventory Check** → Form submission with calculations and validation
3. **History Recording** → Complete audit trail with form data
4. **Statistics Update** → Real-time dashboard metrics
5. **Alert Generation** → Low stock and out-of-stock notifications

For complete technical specifications, refer to `docs/SUPABASE-DATABASE-FUNCTIONS.md` and the auto-generated types in `src/types/database.types.ts`.


