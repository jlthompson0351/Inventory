# Feature Documentation: Asset-Specific Mapped Fields

## 1. Overview

This document details the architecture and implementation of the Asset-Specific Mapped Fields system. This feature enhances the Form Builder by allowing live data from an asset (e.g., price, currency) and derived historical data (e.g., last month's total inventory) to be mapped directly into form fields and used in real-time formula calculations.

The primary goal is to create a flexible, metadata-driven system where new asset-related data points can be made available in the Form Builder without requiring frontend or backend code changes.

---

## 2. Core Architecture

The system is composed of three layers: a database layer for definitions, a service layer for logic and data fetching, and a frontend layer for integration.

### A. Database Layer: `mapped_asset_data_definitions`

This new table is the heart of the system. It acts as a registry for all asset-specific data points that can be mapped into forms.

**Location:** `supabase/migrations/<timestamp>_create_mapped_asset_data_definitions.sql`

**Schema:**

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `UUID` | Primary key. |
| `organization_id` | `UUID` | Foreign key to `organizations`. Ensures data is tenant-isolated. |
| `field_name` | `TEXT` | The machine-readable name used in formulas (e.g., `price_per_unit`). **Must be unique per organization.** |
| `field_label` | `TEXT` | The human-readable label shown in the Form Builder UI (e.g., "Price Per Unit"). |
| `field_type` | `TEXT` | The data type (`number`, `currency`, `text`). Used for validation and UI controls. |
| `data_source` | `TEXT` | The source of the data. An `enum` with values: `assets`, `inventory_items`, or `form_submissions`. |
| `source_column` | `TEXT` | The actual column name in the `data_source` table to pull the value from. |
| `default_value` | `TEXT` | A fallback value to use if the live data is `NULL` or unavailable. **Crucial for resilience.** |
| `is_active` | `BOOLEAN` | A flag to enable or disable the field without deleting the definition. |

**Example Rows:**

```sql
-- For live asset price
INSERT INTO mapped_asset_data_definitions (organization_id, field_name, field_label, field_type, data_source, source_column, default_value)
VALUES ('...', 'price_per_unit', 'Price Per Unit', 'currency', 'assets', 'price_per_unit', '0');

-- For last month's total gallons
INSERT INTO mapped_asset_data_definitions (organization_id, field_name, field_label, field_type, data_source, source_column, default_value)
VALUES ('...', 'last_month_total', 'Last Month Total', 'number', 'form_submissions', 'submission_data', '0');
```

---

### B. Service Layer: `mappedAssetDataService.ts`

**Location:** `src/services/mappedAssetDataService.ts`

This new, self-contained service handles all logic related to fetching, caching, and resolving the values for the fields defined in the database.

**Key Functions:**

-   `getAssetDataDefinitions()`: Fetches all active definitions from the database.
-   `getAssetDataValues(assetId, organizationId)`: The main workhorse. For a given asset, it fetches the definitions and then resolves the actual live values from the appropriate `data_source` tables. This is where future hardening (type coercion, `NULL` checks) would occur.
-   `getCachedAssetDataValues()`: A wrapper around `getAssetDataValues` that implements a 5-minute in-memory cache to reduce database calls.
-   `getLastMonthTotal(assetId, organizationId)`: A specialized function to calculate the total gallons from the *last completed calendar month*. It contains precise date logic to prevent current month's data from leaking and gracefully returns `0` if no data exists.

**Caching Strategy:**
The cache has a special feature: **month-boundary invalidation**. It checks if the cached data was created in the current month. If a user loads the form on the 1st of a new month, the cache is automatically invalidated to ensure `last_month_total` is re-calculated, providing fresh data.

---

### C. Frontend Integration

**Key Modified Files:**

-   `src/pages/FormBuilder.tsx`: Now calls `getAllMappedFieldsForAssetType` (which includes our new asset data fields) and passes the unified list of mappable fields down to the formula builder components.
-   `src/components/forms/ExcelFormulaBuilder.tsx` & `VisualFormulaBuilder.tsx`: The UI was repurposed. The dropdown previously labeled "Other Forms" is now labeled "Asset Data" and is populated exclusively with these new fields, providing a clean user experience.
-   `src/components/ui/form-renderer.tsx`: This component saw significant upgrades:
    1.  **Fetches Live Data:** On load, it calls `getCachedAssetDataValues` to get live data for the current asset.
    2.  **Real-Time Calculations:** It merges this live data with other mapped fields and uses the combined result for instant formula evaluation as the user types.
    3.  **Forced Recalculation:** A `forceRecalculation` state was introduced to ensure that once the async asset data arrives, all formula fields are immediately re-evaluated and displayed correctly.
-   `src/pages/SubmitForm.tsx`: Passes the required `assetId` and `organizationId` to the `FormRenderer`.

---

## 3. Key Concepts & Features

### A. Historical Integrity: Data Snapshotting

When a user submits a form, a snapshot of the resolved asset data is saved within the form submission JSON under the key `_captured_asset_data`.

**Why is this critical?** If an asset's price is $3.00 today and a user submits a form, the report should forever show the cost calculated with $3.00. If the price changes to $3.50 tomorrow, running that same report should *not* change the historical result. This snapshot guarantees the integrity of historical records.

### B. Month-over-Month Logic

The `{mapped.last_month_total}` field is a powerful feature for trend analysis. The backend logic is carefully designed to:
-   **Only** look at the previous calendar month.
-   **Strictly** ignore any submissions from the current month.
-   **Gracefully** return `0` if no submissions exist for the previous month, preventing broken formulas.

### C. How to Extend (The Best Part)

The system is now incredibly easy to extend.

**Scenario:** You want to add the asset's "location" as a mappable field. The `location` column exists in the `assets` table.

**Steps:**

1.  **Execute one SQL command:**
    ```sql
    INSERT INTO mapped_asset_data_definitions (
      organization_id,
      field_name,
      field_label,
      field_type,
      data_source,
      source_column,
      default_value
    ) VALUES (
      'your-org-id',
      'asset_location',
      'Asset Location',
      'text',
      'assets',
      'location',
      'N/A'
    );
    ```
2.  **That's it.** The next time a user loads the Form Builder, "Asset Location" will appear in the "Asset Data" dropdown, and they can use `{mapped.asset_location}` in their formulas. No code deployment is needed.
