# Reporting Schema (`src/reporting-schema.json`)

**Status**: ✅ **Comprehensive & Accurate**

This document explains the structure and purpose of the `reporting-schema.json` file, which is the brain behind the new guided report builder.

---

## 🎯 **Purpose**

The `reporting-schema.json` file is a central configuration that defines all the reportable data in the system. It translates complex database structures into business-friendly concepts, enabling non-technical users to build powerful reports without needing to understand the underlying database schema.

### **Key Responsibilities:**
-   **Business-Friendly Labels**: Provides user-friendly names for tables (entities) and columns (fields).
-   **Data Discovery**: Organizes data into logical categories and provides "Quick Report" templates.
-   **Relationships**: Defines how different data sources (tables) are related, enabling automatic joins.
-   **UI Generation**: The frontend reads this schema to dynamically build the entire report builder UI, including categories, data sources, and field selectors.
-   **Query Generation**: The backend uses this schema to safely construct and execute SQL queries based on user selections.

---

## 🏗️ **Schema Structure**

### **`version`**
The version of the schema.

### **`categories`**
Defines the high-level categories that users see in the first step of the custom report wizard.
-   **`label`**: The business-friendly name (e.g., "Assets & Equipment").
-   **`description`**: A short explanation of the category.
-   **`icon`**: An emoji used in the UI.
-   **`color`**: A color used for styling.

### **`quickReports`**
A list of pre-configured report templates that appear on the first step of the wizard.
-   **`id`**: A unique identifier.
-   **`label`**: The name of the quick report.
-   **`entities`**: An array of data sources to use.
-   **`defaultFields`**: An array of columns to include by default.

### **`entities`**
This is the core of the schema, where each reportable data source (usually a database table) is defined.
-   **`displayName`**: The technical name of the entity.
-   **`businessLabel`**: The user-friendly name shown in the UI.
-   **`description`**: A short explanation.
-   **`table`**: The actual database table name.
-   **`primaryFields`**: A list of the most important fields, used for smart suggestions.
-   **`fieldCategories`**: Organizes the fields into logical groups for the UI.
-   **`fields`**: An array defining each reportable column for this entity.
    -   **`id`**: The unique identifier, in the format `table.column`.
    -   **`label`**: The technical name of the field.
    -   **`businessLabel`**: The user-friendly name of the field.
    -   **`column`**: The actual database column name.
    -   **`type`**: The data type (e.g., `text`, `number`, `date`).
    -   **`category`**: The `fieldCategory` this field belongs to.
    -   **`requiresJoin`**: If this field comes from a related table, this specifies the join required.
-   **`joins`**: Defines how this entity relates to other entities.

---

## 🤝 **How It All Works Together**

1.  The `NewReportBuilder` component loads the `reporting-schema.json` via the `reportingSchemaService`.
2.  It uses the `categories` and `quickReports` to build the first step of the wizard.
3.  When a user selects a category, it uses the `entities` to show a list of available data sources.
4.  When the user selects data sources, it uses the `fields` and `fieldCategories` to display a categorized list of available columns.
5.  The final report configuration (selected sources and columns) is sent to the `execute_report_query` Supabase function.
6.  The Supabase function uses the schema to validate the selections and dynamically build a safe and efficient SQL query.

This schema-driven approach ensures that the UI is always in sync with the backend, and makes it easy to add new reportable data in the future by simply updating this JSON file.
