# Inventory Workflow Implementation Plan

**Goal:** Refactor and implement the inventory management workflow to correctly utilize dynamic forms for both initial asset intake and periodic inventory checks, ensuring detailed data capture, auditable history, and correct use of form-based data including mappings and formulas.

**Core Principles:**
*   **One Asset, One Master Inventory Record:** Each physical `Asset` will have one corresponding primary `inventory_items` record. This relationship is unique.
*   **Asset Types Drive Forms via `asset_type_forms`**: The `asset_types` table, through the `asset_type_forms` join table, links to specific dynamic forms for various `purpose`s (e.g., 'intake', 'inventory', 'custom'). The selected `Asset Type` and the desired `purpose` dictate which forms are used.
*   **Comprehensive History with Full Form Data:** All inventory events (initial intake and subsequent periodic checks, adjustments, etc.) will result in new `inventory_history` records. Each history record will store the complete `response_data` (JSONB) from the specific form submission used for that event, preserving all fields, mappings, and user inputs.
*   **User-Friendly Workflow:** The UI will guide users through selecting assets (where necessary) and filling out the correct, dynamically loaded forms for the task at hand (intake vs. periodic check).
*   **Integrity of Form Logic:** Calculations, validations, and field dependencies defined within the forms must be respected throughout the process.

---

## Phase 1: Asset Type Configuration (Linking Forms via `asset_type_forms`)

*   [X] **Step 1.1: Review & Enhance Asset Type Management UI (e.g., `src/pages/AssetTypes.tsx`, `src/pages/AssetTypeDetail.tsx`)**
    *   **Objective:** Ensure a clear and robust UI for administrators to link various forms (for 'intake', 'inventory', 'adjustment', 'transfer', and custom purposes) to each `Asset Type` via the `asset_type_forms` table.
    *   **Tasks:**
        *   [X] UI elements (e.g., in Asset Type editor modal) allow users to select existing forms or create new ones and link them with a specific `purpose` to the asset type.
        *   [X] When an asset type is saved/updated, these links are correctly persisted in the `asset_type_forms` table.
        *   [X] `assetTypeService.ts` functions (`addAssetTypeFormLink`, `removeAssetTypeFormLink`, `getAssetTypeForms`, `getFormAssetTypeLinks`) correctly interact with the `asset_type_forms` table and related Supabase RPCs.
    *   **Key Files/Services:**
        *   `src/pages/AssetTypes.tsx`
        *   `src/pages/AssetTypeDetail.tsx` (if it handles detailed editing of these links)
        *   `src/services/assetTypeService.ts`
        *   `src/services/formService.ts` (for fetching available forms)
        *   Supabase RPCs: `link_asset_type_form`, `unlink_asset_type_form`, `get_forms_for_asset_type`, `get_asset_types_for_form`.

---

## Phase 2: Asset Creation & Automatic Initial Inventory Intake

*   [X] **Step 2.1: Modify Asset Creation Workflow (e.g., `src/pages/NewAsset.tsx`)**
    *   **Objective:** When a new `Asset` is created:
        1.  The user must select an `Asset Type`.
        2.  The system must present the "Intake Form" (form linked with `purpose = 'intake'`) associated with that `Asset Type` via `asset_type_forms`.
        3.  Upon submission, the `Asset` is created, an `inventory_items` record is automatically created, AND an initial `inventory_history` record (type "intake") is created with the full intake form data.
    *   **Tasks:**
        *   [X] On `Asset Type` selection within the new asset creation UI:
            *   Fetch the linked forms for the selected asset type using `getAssetTypeForms(assetTypeId, organizationId)`.
            *   Identify the form with `purpose === 'intake'`.
            *   Fetch/use its `form_data` (JSON schema).
            *   Dynamically render this "Intake Form" (e.g., using `DynamicForm.tsx`).
        *   [X] On successful submission of this "Intake Form":
            *   **Action 1: Create the `assets` record.**
            *   **Action 2: Automatically create the associated `inventory_items` record.**
                *   [X] Uses `createAssetAndInitialInventory` service function.
                *   [X] `inventory_items` record linked to `assets.id` and `asset_types.id`.
                *   [X] Initial `quantity` based on the intake form data.
            *   **Action 3: Automatically create an initial `inventory_history` record.**
                *   [X] Linked to new `inventory_items.id`.
                *   [X] `event_type` (or `check_type`) set to "intake".
                *   [X] Stores `quantity` from the intake form.
                *   [X] Stores the **complete JSON `response_data`** from the submitted Intake Form.
    *   **Key Files/Services:**
        *   `src/pages/NewAsset.tsx`
        *   `src/services/inventoryService.ts` (`createAssetAndInitialInventory`)
        *   `src/services/assetTypeService.ts` (`getAssetTypeForms`)
        *   `src/components/forms/DynamicForm.tsx`

---

## Phase 3: Periodic Inventory Checks (e.g., Monthly Recording)

*   [ ] **Step 3.1: Design and Implement UI for Initiating Periodic Inventory Checks**
    *   **Objective:** Provide a clear and intuitive way for users to start a periodic inventory check for an *existing* asset/inventory item.
    *   **Tasks:**
        *   [ ] **On Asset/Inventory Item Detail Page (e.g., `src/pages/InventoryItemDetail.tsx` or new `AssetInventoryLedgerPage.tsx`):
            *   Add a button like "Record Monthly Check" or "Perform Inventory Check."
        *   [ ] **From General Inventory List (e.g., `src/pages/Inventory.tsx`):
            *   Define how users will select an asset for a check. This might involve:
                *   Clicking an action on an item in the list.
                *   A general "Start New Inventory Check" button that then opens a modal to search/select an existing asset.
            *   The system should ideally indicate if a check for the current period already exists for a selected asset, offering to view/edit that instead of creating a new one blindly.
    *   **Key Files/Services:**
        *   `src/pages/InventoryItemDetail.tsx` (or new `AssetInventoryLedgerPage.tsx`)
        *   `src/pages/Inventory.tsx`

*   [ ] **Step 3.2: Logic for Loading and Displaying the Correct "Periodic Inventory Form"**
    *   **Objective:** When a periodic check is initiated, the system must dynamically load and render the specific "Inventory Form" (form linked with `purpose = 'inventory'`) that is associated with the `Asset Type` of the selected asset/inventory item via `asset_type_forms`.
    *   **Tasks:**
        *   [ ] Once an asset/inventory item is selected for a check:
            *   Retrieve the `inventory_items` record.
            *   Use its `asset_type_id` to fetch the linked forms using `getAssetTypeForms(assetTypeId, organizationId)`.
            *   Identify the form with `purpose === 'inventory'`.
            *   Fetch/use its `form_data` (JSON schema).
            *   Dynamically render this "Inventory Form."
    *   **Key Files/Services:**
        *   Page/component for periodic checks.
        *   `src/components/inventory/DynamicInventoryForm.tsx` (or similar for rendering)
        *   `src/services/assetTypeService.ts` (`getAssetTypeForms`)
        *   `src/services/inventoryService.ts`

*   [ ] **Step 3.3: Logic for Saving the Periodic Inventory Check Data**
    *   **Objective:** Upon submission of the filled-out "Periodic Inventory Form," create a *new* `inventory_history` record.
    *   **Tasks:**
        *   [ ] On successful submission of the "Periodic Inventory Form":
            *   Call an appropriate service function (e.g., `recordNewInventoryCheck`).
            *   This service function must:
                1.  Create a **new `inventory_history` record** with:
                    *   Link to the *existing* `inventory_items.id`.
                    *   `event_type` (or `check_type`) set to "check" or similar.
                    *   `quantity` and other direct data points (location, notes, status) taken from the submitted Inventory Form.
                    *   The **complete JSON `response_data`** from this specific Inventory Form submission.
                2.  **Update the main `inventory_items` record:**
                    *   The `quantity` field on the parent `inventory_items` record should be updated to reflect this latest check.
                    *   Update `inventory_items.updated_at`.
    *   **Key Files/Services:**
        *   `src/services/inventoryService.ts`

---

## Phase 4: Enhanced Data Display and History Viewing

*   [ ] **Step 4.1: Improve Inventory History Display (e.g., `src/components/inventory/InventoryHistoryViewer.tsx`)**
    *   **Objective:** Ensure the inventory history view is comprehensive and clearly shows data captured via forms, including a way to see the full form submission.
    *   **Tasks:**
        *   [ ] Modify the history viewer to parse and display key fields from the `response_data` JSON for each history entry, not just basic fields like quantity/date.
        *   [ ] Implement a feature to view the full, raw `response_data` (e.g., in a formatted JSON viewer within a modal or an expandable section) for complete auditability.
    *   **Key Files/Services:**
        *   `src/components/inventory/InventoryHistoryViewer.tsx`

*   [ ] **Step 4.2: Review and Update Main Inventory Item Display (e.g., `src/pages/InventoryItemDetail.tsx`)**
    *   **Objective:** Ensure the main display for an `inventory_item` correctly reflects its current state based on the new workflow and history.
    *   **Tasks:**
        *   [ ] Confirm that the primary `quantity`, `location`, `status`, etc., displayed for an `inventory_item` accurately reflects the latest relevant information, which would typically come from its most recent `inventory_history` record (or the `inventory_items` fields if they are being updated by each check).
        *   [ ] If the `inventory_items` record itself stores a summarized version of form data in its `metadata` field, ensure this is updated appropriately, though the `inventory_history.response_data` is the source of truth for individual checks.
    *   **Key Files/Services:**
        *   `src/pages/InventoryItemDetail.tsx`
        *   Components used in `src/pages/Inventory.tsx` for list views.

---

## Phase 5: Backend, Database, and Service Layer Refinements

*   [X] **Step 5.1: Thorough Review of Database Schema and Constraints**
    *   **Objective:** Verify that the database schema (tables, columns, relationships, constraints) fully supports and enforces the new workflow.
    *   **Tasks:**
        *   [X] `asset_type_forms` table exists and correctly links `asset_types` and `forms` with a `purpose`.
        *   [X] `forms` table has `form_data` (JSONB) to store the schema.
        *   [X] `asset_types` table has `deleted_at` for soft deletes.
        *   [X] Supabase RPC `get_forms_for_asset_type` returns `form_data`.
        *   [X] `inventory_history.response_data` is JSONB.
    *   **Key Files/Services:**
        *   All Supabase migration files in `supabase/migrations/`.

*   [X] **Step 5.2: Refactor and Clarify Service Functions in `src/services/inventoryService.ts` and `src/services/assetTypeService.ts`**
    *   **Objective:** Ensure service functions align with the new `asset_type_forms` workflow.
    *   **Tasks:**
        *   [X] **`createAssetAndInitialInventory`:** Confirmed to use intake form data for `inventory_history.response_data`.
        *   [X] **`assetTypeService.ts` functions:** Updated to use RPCs for `asset_type_forms`.
        *   [ ] **`recordNewInventoryCheck` (New or Refactored):** This function is needed for periodic checks. It must *only* create a new `inventory_history` record and update the parent `inventory_items` record.
    *   **Key Files/Services:**
        *   `src/services/inventoryService.ts`
        *   `src/services/assetTypeService.ts`

---

## Phase 6: Testing and Validation

*   [ ] **Step 6.1: Comprehensive End-to-End Testing**
    *   **Objective:** Test all aspects of the new inventory workflow.
    *   **Tasks:**
        *   [ ] Test Asset Type creation and linking of both Intake and Inventory forms.
        *   [ ] Test Asset creation:
            *   Verify correct Intake Form is loaded.
            *   Verify `asset`, `inventory_item`, and initial `inventory_history` (with full `response_data`) records are created correctly.
        *   [ ] Test Periodic Inventory Checks:
            *   Verify correct Inventory Form is loaded for the asset's type.
            *   Verify a new `inventory_history` record is created with full `response_data`.
            *   Verify `inventory_items` record is updated appropriately (e.g., quantity).
        *   [ ] Test history viewing, including the ability to see full `response_data`.
        *   [ ] Test all form validations, calculations, and field dependencies.
        *   [ ] Test edge cases (e.g., asset type with no forms linked, trying to perform check on non-existent asset).

---

## Phase 3A: Redefined Inventory Page Workflow & Historical Editing

**Overall Goal:** Transform the main "Inventory Page" into a central hub for viewing the current status of all inventoried assets and provide a clear path to a detailed historical ledger for each asset, including the ability to perform new checks and edit past records.

*   **Step 3A.1: Redesign the Main Inventory Page (`src/pages/Inventory.tsx`) - The "Asset Inventory Summary List"**
    *   **Objective:** Display a high-level overview of all assets under inventory management, focusing on current status and providing a clear entry point to detailed historical ledgers.
    *   **Tasks:**
        *   [ ] The page will list all `inventory_items` (representing inventoried assets).
        *   [ ] **Display per Asset:**
            *   Asset Name (linked to its "Detailed Inventory Ledger Page").
            *   Asset Type.
            *   **Current Live Quantity:** Sourced from `inventory_items.quantity` (this field should always be updated by the *latest* `inventory_history` record for that asset).
            *   **Date of Last Inventory Event:** The date of the most recent `inventory_history` record (intake, check, or adjustment).
        *   [ ] **Primary Action per Asset Row:** Clicking the row navigates the user to the "Detailed Inventory Ledger Page" for that asset.
        *   [ ] **"Add New Asset to Inventory" Button (Optional but Recommended):**
            *   Purpose: For onboarding an asset that exists in the `assets` table but does *not yet* have an `inventory_item` record.
            *   Action: This button initiates the "Initial Intake" process for the selected asset (navigates to a view where the intake form is presented, and upon submission, creates the `inventory_item` and its first `inventory_history` record of type 'intake').
        *   [ ] **Remove or Refactor Existing "Add Item" Button Logic:** The current complex modal flow leading to `AddInventoryPage.tsx` for *periodic checks* should be removed from this page. The primary way to perform a new periodic check will be from the "Detailed Inventory Ledger Page."

*   **Step 3A.2: Implement the "Detailed Inventory Ledger Page" (e.g., New `AssetInventoryLedgerPage.tsx` or Evolve `src/pages/InventoryItemDetail.tsx`)**
    *   **Objective:** Provide a single, comprehensive page for all actions and historical data related to a specific asset's inventory.
    *   **Tasks:**
        *   [ ] **Display Key Asset Information:** Show master details of the asset and its linked `inventory_item`.
        *   [ ] **Section: Current Status Snapshot:**
            *   Display the current calculated quantity (from `inventory_items.quantity`).
            *   Display current location, status, etc. (from `inventory_items`).
        *   [ ] **Section: Perform New Inventory Check:**
            *   A clear button: "Perform New Check for [Current Month/Date]".
            *   Loads the dynamic inventory form (from `asset_types.inventory_form_id`).
            *   On submit, calls a service function `recordNewInventoryCheck(inventory_item_id, formData)` which:
                *   Creates a *new* `inventory_history` record (`event_type: 'check'`) with full `response_data`.
                *   Updates the parent `inventory_items.quantity` and `inventory_items.location` (if applicable) to reflect this latest check.
        *   [ ] **Section: Complete Inventory History:**
            *   Utilize and enhance `src/components/inventory/InventoryHistoryViewer.tsx`.
            *   List all `inventory_history` records chronologically (intake, checks, adjustments).
            *   **Add an "Edit" button next to each historical record.**

*   **Step 3A.3: Implement Editing of Historical Inventory Records**
    *   **Objective:** Allow users to select a specific past inventory event from the ledger and modify its data, with changes correctly reflected.
    *   **Tasks:**
        *   [ ] When "Edit" is clicked on a historical record (from `InventoryHistoryViewer` on the "Detailed Inventory Ledger Page"):
            *   Open a modal or navigate to a form pre-filled with all data from that *specific historical `inventory_history` record* (including its `response_data`).
        *   [ ] On save of these edits, call a new service function `updateHistoricalInventoryCheck(history_id, updatedFormData)`.
        *   [ ] The `updateHistoricalInventoryCheck` service function must:
            1.  Update the specified `inventory_history` record in the database with the new `quantity` and `response_data`.
            2.  **Crucially, re-calculate and update the master `inventory_items.quantity` and `inventory_items.location` by looking at the data from the *chronologically latest `inventory_history` record* for that `inventory_item_id`.**
            3.  Ensure `updated_at` and potentially `updated_by` fields are set on the `inventory_history` record.

*   **Step 3A.4: Service Layer Adjustments (`src/services/inventoryService.ts`)**
    *   **Objective:** Ensure backend services support the new ledger and editing functionalities.
    *   **Tasks:**
        *   [ ] Implement `recordNewInventoryCheck(inventory_item_id, formData)` as described above.
        *   [ ] Implement `updateHistoricalInventoryCheck(history_id, updatedFormData)` as described above.
        *   [ ] Review and adapt `createMonthlyInventoryCheck` – its core logic is likely what `recordNewInventoryCheck` will be.
        *   [ ] Ensure `createAssetAndInitialInventory` remains robust for the "Add New Asset to Inventory" flow.
        *   [ ] The `AddInventoryPage.tsx` component needs to be refactored. Its current logic for creating a *new check* (which mistakenly calls `createInventoryItem`) should be moved to the new "Perform New Check" section on the `AssetInventoryLedgerPage`. If `AddInventoryPage.tsx` is kept, its role must be redefined for a different purpose (e.g., only the initial intake part of the "Add New Asset to Inventory" flow if not handled directly in `NewAsset.tsx`).

*   **Step 3A.5: Database Considerations for Editing History**
    *   **Objective:** Ensure the database can support a clear audit trail if historical records are edited.
    *   **Tasks:**
        *   [ ] Confirm `inventory_history` table has `created_at`, `updated_at`, `created_by`, and `updated_by` (or similar) columns to track when a historical record was first made and when it was last modified, and by whom.
        *   [ ] While direct editing is requested, for more stringent auditing in the future, consider an "adjustment" `event_type` in `inventory_history` as an alternative to directly overwriting past records. (For now, proceed with direct edit capability as requested). 