# Tomorrow's Plan

## What We Did Today

- **Inventory Workflow Refactor:**
  - Refactored the Inventory page to be a summary of all inventoried assets, showing current status and last inventory date.
  - Removed the ability to add new inventory_items for periodic checks; now only onboarding (intake) is allowed for assets without inventory_items.
  - Updated AddInventoryPage and AddItemSelectionModal to enforce this logic.
  - Refactored the service layer to ensure only one inventory_items per asset, and to separate intake from periodic checks.
  - Updated InventoryItemDetail and InventoryHistoryViewer to allow performing and editing periodic checks (inventory_history records), not creating new inventory_items.
  - Added backend migration to enforce unique inventory_items per asset and to support audit/history features.

- **Form Builder Enhancements:**
  - Added field descriptions/help text in the builder.
  - Added field-level validation controls: required, min/max (for numbers), regex (for text).
  - Added inventory action field warnings (e.g., only one 'Set Inventory' field per form).
  - Fixed linter errors related to inventory action selector.

- **Backend Logic:**
  - Updated inventory service to support inventory_action logic in form schemas (add, subtract, set).
  - Ensured inventory quantity is updated according to form field actions.
  - Inserted mock data for 'Test Paint Asset' to allow UI testing of the new workflow.

## Inventory Page Vision & Requirements (from chat)

- **Inventory Page as Central Hub:**
  - The Inventory Page is the main place to see all assets under inventory management.
  - The first layer shows a summary: each asset, its current quantity, and the date of the last inventory check.
  - Only assets with an initial intake (inventory_items) appear here.
  - No periodic checks create new inventory_items; all checks are history records for the same item.

- **Two-Layer Navigation:**
  - Clicking an asset opens a detailed ledger/history for that asset.
  - The ledger shows every inventory check ever done (intake + periodic), listed by month/date.
  - Each record can be viewed and edited (with full form data, including calculated/formula fields).
  - Users can track changes month-to-month and edit past records as needed.

- **Editing & Tracking:**
  - Editing a historical record updates the parent inventory_items state and recalculates as needed.
  - All changes are auditable and tracked.

- **User Experience:**
  - The workflow is clear: onboarding (intake) is separate from periodic checks.
  - No confusion between creating new inventory_items and recording checks.
  - The UI should make it obvious how to view, add, and edit inventory records for each asset.

## Dynamic Forms System: Vision & Requirements

- **Field Types & Flexibility:**
  - Supports text, number, textarea, select, checkbox, radio, switch, formula, file, and current_inventory fields.
  - Fields can be mapped for use in formulas and reporting.

- **Formulas & Mapping:**
  - Formula fields can reference other fields (including mapped fields) for calculations.
  - Mapped fields allow cross-form data usage and advanced logic.

- **Inventory Action Logic:**
  - Each field can have an inventory_action: add, subtract, set, or none.
  - Only one field per form should be set to 'Set Inventory'.
  - Multiple add/subtract fields are allowed but should be intentional (warnings provided).
  - When a form is submitted, inventory quantity is updated according to these actions.

- **Validation:**
  - Each field can have required, min/max (for numbers), and regex (for text) validation rules.
  - Validation is enforced in the UI and (to be implemented) in the backend.

- **Descriptions & Tooltips:**
  - Each field can have a description/help text, shown in the form UI.

- **Versioning:**
  - Forms should have a version property, incremented on changes (to be implemented).
  - Old submissions are tied to the version of the form used at the time.

- **Test Submission Mode:**
  - The builder will have a "Test Form" button to simulate submissions and preview JSON/inventory effects (to be implemented).

- **Reporting & Analytics:**
  - Consider denormalizing key fields for easier reporting in the future.

- **Backend Enforcement:**
  - Backend will enforce validation and inventory logic to prevent bad data (to be implemented).

- **User Experience:**
  - The form builder is designed to be flexible but safe, with warnings and validation to prevent mistakes.
  - All form logic is tightly integrated with inventory management for accurate, auditable tracking.

## What We Still Need To Do / Skipped

- **Test Submission Mode:**
  - Add a "Test Form" button in the builder to simulate a submission and preview the resulting JSON and inventory effect.

- **Form Versioning:**
  - Add a version property to form schemas and increment on changes.

- **Field Mapping Preview:**
  - Show a live preview of mapped fields and their usage in formulas in the builder.

- **Backend Validation/Enforcement:**
  - Enforce new validation rules and inventory logic on the backend (required, min/max, regex, inventory_action constraints).

- **UI Polish:**
  - Render field descriptions/help text in the dynamic form UI.
  - Improve error and feedback messages for validation failures.

- **Reporting/Analytics:**
  - Consider denormalizing key form fields for easier reporting (future).

- **General:**
  - Review and test all new features for edge cases and usability.
  - Document new features and workflows for the team.

---

## Edge Cases, Next Steps & Considerations

- **Edge Case Testing:**
  - Test what happens if a form is changed after submissions (versioning, data migration).
  - Test invalid data submissions and ensure validation catches them (both UI and backend).
  - Test editing/deleting historical inventory records and how it affects parent asset state.

- **Migration/Upgrade Plan:**
  - If there is existing data, plan for migrating old inventory and form records to the new structure.
  - Ensure no data is lost and all historical records are preserved.

- **Access Control & Permissions:**
  - Define who can edit forms, perform inventory, or edit history (e.g., admin vs. regular user).
  - Implement or review permissions as needed.

- **Performance/Scalability:**
  - Monitor performance as data grows (especially with JSONB fields).
  - Plan for denormalization or indexing if reporting/querying becomes slow.

- **Documentation & Training:**
  - Update user documentation to reflect new workflows and features.
  - Plan for team training or onboarding for the new system.

- **API/Integration:**
  - Review any external integrations (e.g., barcode scanners, reporting tools) and update as needed.
  - Ensure APIs are documented and support new workflows.

---

**Bring this up tomorrow to continue where we left off!**

# Asset Type Forms Builder

## Overview
A comprehensive, organization-driven, robust plan for the dynamic form builder and asset management system, with special attention to:
- Dynamic forms (with formulas, mapping, and inventory actions)
- Organization context everywhere
- Asset type–centric form management
- Field mapping across all forms for an asset type (so any field can be linked/mapped to inventory or other properties)
- Extensibility and robustness

---

## 1. Data Model & Schema

### Entities
- **Organization**
- **AssetType** (linked to Organization)
- **Form** (linked to AssetType & Organization, has a "purpose")
- **FormField** (fields for each form, with mapping/inventory logic)
- **Asset** (instance of AssetType, linked to Organization)
- **FormSubmission** (records of form submissions, linked to Asset, Form, Organization)
- **InventoryItem** (tracks current inventory for each Asset)
- **InventoryHistory** (tracks all inventory-affecting events for each Asset)

### Key Schema Fields
- Every entity has `organization_id`
- `Form` has `asset_type_id`, `purpose`, `schema` (JSON for fields, formulas, mappings)
- `FormField` (within schema) has:
  - `field_key` (unique per asset type)
  - `label`
  - `type`
  - `inventory_action` (add, subtract, set, none)
  - `mapping` (optional, for formulas or cross-form logic)
  - `formula` (optional, for calculated fields)
  - `description`, `validation`, etc.

---

## 2. Asset Type & Form Management UI

- **Asset Types Page**
  - List asset types for the current org
  - For each asset type, manage all forms (add, edit, delete, set purpose)
  - For each form, manage fields (add, edit, set mapping/inventory action/formula)
  - Show all fields ever created for this asset type (across all forms)
  - Allow mapping/linking of any field to inventory or other asset properties

- **Forms Page**
  - List all forms for the current org
  - Show form name, purpose, asset type, and mapped fields
  - Allow filtering/searching by asset type, purpose, or mapped field

---

## 3. Dynamic Form Builder Enhancements

- **Field Mapping**
  - Every field created for an asset type is globally unique (per asset type)
  - When adding a field to a form, you can:
    - Create a new field (new `field_key`)
    - Reuse an existing field (from any other form for this asset type)
  - All fields for an asset type are available for mapping, formulas, and reporting

- **Inventory Action**
  - Any field can be mapped to inventory logic (`add`, `subtract`, `set`, `none`)
  - Only one field per form can be `set` (for intake or physical count)
  - Multiple fields can be `add`/`subtract` (for adjustments, usage, etc.)

- **Formulas**
  - Formula fields can reference any mapped field for the asset type
  - Formula editor provides autocomplete for all available fields

- **Validation**
  - Each field supports required, min/max, regex, etc.
  - Validation enforced in UI and backend

---

## 4. Form Submission & Inventory Logic

- **Submission**
  - User selects asset (or asset is pre-selected)
  - User fills out form (fields, formulas auto-calculate)
  - Submission includes asset_id, form_id, organization_id, and all field values

- **Backend Processing**
  - Lookup form schema by form_id
  - For each field with `inventory_action`, update the asset's inventory accordingly
  - Record submission in `FormSubmission`
  - Record inventory change in `InventoryHistory`
  - All actions are organization-scoped

---

## 5. Reporting & Analytics

- All field values (across all forms for an asset type) are available for reporting
- Inventory history and current state are always up-to-date and auditable
- Support for denormalized reporting fields if needed for performance

---

## 6. Organization Context

- All queries, mutations, and UI views are filtered by the current organization
- No cross-org data leakage
- All asset types, forms, fields, assets, and submissions are organization-specific

---

## 7. Extensibility & Robustness

- Easy to add new form purposes (e.g., transfer, disposal, maintenance)
- Easy to add new fields or reuse existing ones for any asset type
- All field mappings and formulas are asset type-scoped, so no collisions
- All inventory logic is schema-driven and auditable

---

## 📝 Summary Table

| Feature                        | How It Works / Where Handled                |
|--------------------------------|---------------------------------------------|
| Org context everywhere         | All entities have `organization_id`         |
| Asset type–centric forms       | Forms linked to asset type & org            |
| Multiple forms per asset type  | Each with a "purpose" (intake, adjust, etc.)|
| Field mapping & reuse          | Fields are global per asset type, reusable  |
| Inventory logic                | Any field can be mapped to inventory action |
| Formulas                       | Can reference any mapped field              |
| Validation                     | UI + backend, per field                     |
| Reporting                      | All fields available, denormalized if needed|
| Extensible                     | Add new forms, fields, logic easily         |

---

## ✅ Next Steps

1. Update your data models (backend/database) to support this structure.
2. Update the asset type and form builder UI to support field mapping/reuse and inventory actions.
3. Update the forms section to show all forms, their asset type, and mapped fields.
4. Ensure all backend logic is organization-aware and schema-driven.
5. Test with multiple organizations, asset types, and forms to ensure robustness. 