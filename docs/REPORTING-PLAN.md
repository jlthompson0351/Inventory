# Dynamic Reporting System Plan

This document outlines the plan to implement a flexible, multi-subject reporting system similar to the MaintainX export functionality.

## Overall Goal

Create a dynamic, multi-subject reporting engine where users can select a primary data source (e.g., Assets, Inventory Items, Form Submissions), apply relevant filters, choose specific columns from related tables, preview the results, and export the data (initially CSV, potentially PDF later), with an optional advanced sorting feature for custom row ordering.

## Phase 1: Backend & Data Foundation

1.  **Define Reportable Subjects & Schema:**
    *   Identify primary data sources (e.g., `inventory_items`, `assets`, `asset_types`, `form_submissions`).
    *   For each subject, explicitly define:
        *   Primary table.
        *   Related tables and join conditions.
        *   Curated list of all reportable columns (from primary and related tables) with user-friendly names and data types.
    *   Store this schema definition (e.g., in `reportService.ts` or a separate config file).

2.  **Enhance `reportService.ts`:**
    *   Modify `ReportConfig` type: Add `subject` (e.g., `'inventory_items'`) and store selected column/filter definitions.
    *   Modify `Report` type: Reflect updated `ReportConfig`.
    *   Refactor `executeReport` (or create `generateReportData`):
        *   Accept the full `ReportConfig` as input.
        *   **Dynamic Query Building:** Based on `subject`, dynamically construct the Supabase query (`FROM`, `SELECT` with joins based on `selectedColumns`, enhanced `WHERE` based on filters/types, `ORDER BY` based on sorts).
        *   *(Nice-to-have - Row Reordering)*: Implement custom row ordering logic in `ORDER BY` if specified in config.
        *   Return the raw data array.
    *   Update CRUD Functions (`createReport`, `updateReport`): Save the enhanced `ReportConfig` including the `subject`.

## Phase 2: UI Overhaul (`ReportBuilder.tsx`)

1.  **Subject Selection:**
    *   Add a top-level component (Tabs/Segmented Control) for selecting the report `subject`.
    *   Dynamically update subsequent options based on the selected subject.

2.  **Dynamic Filter Component:**
    *   Create/modify filter UI (possibly triggered by a button).
    *   Dynamically populate "Field" dropdown based on the subject's available columns.
    *   Show relevant "Operator" options based on the selected field's data type.
    *   Adapt "Value" input based on data type (text, number, date, select).

3.  **Dynamic Column Selector:**
    *   Replace static checklist with a dynamic component.
    *   Display *all* available columns for the selected subject + relations (from schema definition).
    *   Use categorized/searchable multi-column checklist for usability.
    *   Update state based on user selections.

4.  **Sorting Component:**
    *   Update sorting UI to use dynamic fields based on the subject.
    *   *(Nice-to-have - Row Reordering)*: Add UI for defining custom order for specific fields (e.g., drag-and-drop list or text input).

5.  **Preview Tab:**
    *   Trigger `executeReport` (with limit) on config changes.
    *   Render preview data in a table using dynamically selected columns.

6.  **Layout & State:**
    *   Restructure page layout (subject selection, config sections, preview, actions).
    *   Update component state to manage dynamic options.

## Phase 3: Integration & Functionality

1.  **Connect UI to Service:**
    *   Wire "Save Report" button to call `createReport`/`updateReport` with the full configuration state.
    *   Wire "Export CSV" button to:
        *   Call `executeReport` for the *full* dataset based on the current config.
        *   Use CSV generation logic to format/download based on *dynamic* columns.
2.  **Refine `Reports.tsx`:**
    *   Update report list card to summarize new config (e.g., show `subject`).
    *   Ensure `runReport`/`downloadCsv` functions use the enhanced service and handle dynamic columns.
3.  **(Future) PDF Export:** Integrate `jspdf`/`jspdf-autotable` or similar.
4.  **(Future) Scheduling:** Defer this feature (requires significant backend infrastructure).

## Phase 4: Testing & Documentation

1.  **Testing:** Write unit and integration tests for service functions and UI components. Test end-to-end flow.
2.  **Documentation:** Update `BARCODEX-README.md` and potentially create `REPORTING-GUIDE.md`.

This plan sets the stage for building the enhanced reporting system tomorrow. 