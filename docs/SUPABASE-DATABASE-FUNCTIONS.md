# Supabase Database Functions (Updated August 2025)

**Status**: ✅ **Comprehensive & Accurate**

This document provides a complete reference for all custom database functions (RPCs), triggers, and views in the BarcodEx Supabase backend.

---

## 🚀 **Core Functions**

### **Authentication & Authorization**
| Function Name | Return Type | Description |
|---|---|---|
| `accept_invitation` | uuid | Accepts an organization invitation. |
| `add_user_to_organization` | json | Adds a user to an organization. |
| `add_user_to_organization_as_platform_admin` | boolean | Adds a user to an organization as a platform admin. |
| `admin_create_user` | json | Creates a new user as an admin. |
| `authenticate_mobile_pin` | record | Authenticates a user's mobile PIN. |
| `check_password_change_required` | boolean | Checks if the current user is required to change their password. |
| `check_platform_operator_status` | boolean | Checks if the current user is a platform operator. |
| `create_invitation` | uuid | Creates an organization invitation. |
| `create_organization_with_admin` | uuid | Creates a new organization and assigns an admin. |
| `create_user_for_platform_operator` | json | Creates a new user as a platform operator. |
| `delete_user_completely` | boolean | Permanently deletes a user and all associated data. |
| `get_current_organization_id` | uuid | Gets the organization ID for the current user. |
| `get_current_user_platform_status` | record | Gets the platform status for the current user. |
| `get_invitation_by_token` | record | Retrieves an invitation by its token. |
| `get_user_id_by_email` | uuid | Gets a user's ID by their email address. |
| `get_user_organization` | uuid | Gets the organization for a user. |
| `get_user_profile_with_org` | json | Gets a user's profile with their organization details. |
| `is_current_user_org_admin` | boolean | Checks if the current user is an admin of their organization. |
| `is_member_of_organization` | boolean | Checks if a user is a member of an organization. |
| `is_org_admin` | boolean | Checks if a user is an admin of a specific organization. |
| `is_super_admin` | boolean | Checks if the current user is a super admin. |
| `is_system_admin` | boolean | Checks if the current user is a system admin. |
| `verify_quick_access_pin` | record | Verifies a user's quick access PIN. |

### **Asset & Inventory Management**
| Function Name | Return Type | Description |
|---|---|---|
| `apply_asset_calculation_formulas` | jsonb | Applies calculation formulas to an asset. |
| `auto_generate_asset_barcode` | trigger | A trigger function that automatically generates a barcode for a new asset. |
| `check_asset_current_month_inventory` | record | Checks the current month's inventory for an asset. |
| `check_asset_type_dependencies` | record | Checks the dependencies for an asset type before deletion. |
| `check_duplicate_assets` | record | Checks for duplicate assets. |
| `create_asset_with_inventory` | jsonb | Creates a new asset and its initial inventory item. |
| `create_inventory_adjustment` | jsonb | Creates a new inventory adjustment. |
| `create_periodic_inventory_check` | jsonb | Creates a periodic inventory check. |
| `delete_inventory_item` | boolean | Deletes an inventory item. |
| `generate_asset_barcode` | text | Generates a barcode for an asset. |
| `generate_asset_qr_data` | jsonb | Generates the data for an asset's QR code. |
| `get_asset_by_barcode` | jsonb | Retrieves an asset by its barcode. |
| `get_asset_count_by_type` | integer | Gets the count of assets for a given type. |
| `get_asset_inventory_history` | record | Retrieves the inventory history for an asset. |
| `get_asset_inventory_report` | record | Generates an inventory report for an asset. |
| `get_asset_type_stats` | record | Gets statistics for an asset type. |
| `get_asset_with_formulas_by_barcode` | json | Retrieves an asset and its formulas by barcode. |
| `get_latest_inventory_check` | record | Gets the latest inventory check for an asset. |
| `insert_inventory_history_record` | json | Inserts a new record into the inventory history. |
| `insert_inventory_history_simple` | json | A simplified function to insert an inventory history record. |
| `recalculate_inventory_after_edit` | jsonb | Recalculates inventory after an edit. |
| `reconcile_inventory` | jsonb | Reconciles inventory for an asset. |
| `safe_delete_asset_type` | record | Safely deletes an asset type, checking for dependencies. |
| `scan_asset_barcode` | jsonb | Scans an asset barcode and returns the asset data. |
| `update_inventory_atomic` | jsonb | Atomically updates an inventory item. |
| `validate_asset_type_operation` | record | Validates an operation on an asset type. |
| `verify_inventory_balance` | jsonb | Verifies the inventory balance for an item. |

### **Forms & Submissions**
| Function Name | Return Type | Description |
|---|---|---|
| `calculate_form_formulas` | jsonb | Calculates the formula fields in a form submission. |
| `clone_form` | uuid | Clones an existing form. |
| `create_default_forms_for_asset_type` | record | Creates default forms for a new asset type. |
| `create_form_template` | uuid | Creates a new form template. |
| `extract_form_field_values` | record | Extracts field values from a form submission. |
| `find_recommended_forms_for_asset_type` | record | Finds recommended forms for an asset type. |
| `get_asset_forms_with_history` | record | Gets the forms for an asset, along with their submission history. |
| `get_asset_pending_forms` | record | Gets the pending forms for an asset. |
| `get_forms_for_asset_type` | record | Retrieves the forms associated with an asset type. |
| `get_latest_submission_for_asset` | record | Gets the latest form submission for an asset. |
| `get_mappable_fields` | jsonb | Gets the mappable fields for a form. |
| `get_mappable_fields_with_form_names` | json | Gets mappable fields with their form names. |
| `get_submission_count_in_range` | record | Gets the number of form submissions in a date range. |
| `link_asset_type_form` | void | Links a form to an asset type. |
| `process_form_submission` | uuid | Processes a new form submission. |
| `register_mapped_field` | uuid | Registers a new mappable field. |
| `submit_qr_form` | record | Submits a form via a QR code scan. |
| `unlink_asset_type_form` | void | Unlinks a form from an asset type. |
| `unregister_mapped_field` | boolean | Unregisters a mappable field. |
| `update_asset_type_conversion_fields` | record | Updates the conversion fields for an asset type. |

### **Reporting & Analytics**
| Function Name | Return Type | Description |
|---|---|---|
| `analyze_report_performance` | record | Analyzes the performance of reports. |
| `get_aggregated_inventory_values` | jsonb | Gets aggregated inventory values for reporting. |
| `get_dashboard_stats` | record | Gets the statistics for the main dashboard. |
| `get_inventory_performance_stats` | json | Gets performance statistics for the inventory system. |
| `get_inventory_value_fast` | numeric | A fast function to get the total inventory value. |
| `get_monthly_inventory_report` | jsonb | Generates a monthly inventory report. |
| `get_organization_health` | json | Gets the health status of an organization. |
| `get_report_performance_stats` | record | Gets performance statistics for the reporting system. |
| `get_reporting_table_stats` | record | Gets statistics for the reporting tables. |
| `get_slow_reports` | record | Identifies slow-running reports. |
| `get_system_health_stats` | json | Gets the overall health statistics for the system. |
| `get_table_counts` | jsonb | Gets the row counts for major tables. |
| `log_slow_query` | void | Logs a slow-running query. |

---

## 🔄 **Triggers & Automation**

| Trigger Name | Table | Event | Function | Description |
|---|---|---|---|---|
| `trg_auto_generate_asset_barcode` | `assets` | INSERT | `auto_generate_asset_barcode` | Automatically generates a barcode when a new asset is created. |
| `trg_copy_conversion_fields` | `assets` | INSERT | `copy_conversion_fields_to_asset` | Copies conversion fields from the asset type to the new asset. |
| `trg_create_price_history` | `inventory_items` | UPDATE | `create_price_history_entry` | Creates a price history record when the price of an item changes. |
| `trg_handle_new_user` | `auth.users` | INSERT | `handle_new_user` | Handles new user creation, setting up their profile and organization. |
| `trg_handle_password_req` | `auth.users` | INSERT | `handle_new_user_password_requirement` | Sets the password change requirement for a new user. |
| `trg_set_updated_at` | (multiple) | UPDATE | `update_updated_at_column` | Automatically updates the `updated_at` timestamp on row update. |

---

## 📈 **Materialized Views**

| View Name | Description |
|---|---|
| `mv_asset_summary` | A summary of assets by type and organization, used to speed up the dashboard. |
| `mv_monthly_submission_activity` | A summary of monthly form submission activity. |