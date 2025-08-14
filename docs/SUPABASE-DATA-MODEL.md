# Supabase Data Model (Updated August 2025)

This document provides a detailed breakdown of the Supabase PostgreSQL schema for the BarcodEx inventory management system. It covers all major tables, relationships, and is intended to be the single source of truth for the database schema.

---

## 🏗️ **Core Architecture**

### **Multi-Tenancy**
-   **Organization-Scoped**: Every table containing business data has an `organization_id` column to ensure data isolation.
-   **RLS-Enforced**: Row-Level Security policies are applied to every table to automatically filter data based on the user's organization. See `SUPABASE-SECURITY.md` for a full breakdown of RLS policies.

### **Performance Infrastructure**
-   **Indexes**: Key foreign key columns, text search fields, and frequently queried columns are indexed for performance.
-   **Database Functions (RPCs)**: Complex business logic is encapsulated in PostgreSQL functions for performance and reusability.

---

## 🗄️ **Table Schema**

### `assets`
| Column Name | Data Type | Description |
|---|---|---|
| id | uuid | Primary key for the asset. |
| name | text | The name of the asset. |
| description | text | A description of the asset. |
| asset_type_id | uuid | Foreign key to the `asset_types` table. |
| organization_id | uuid | Foreign key to the `organizations` table. |
| status | text | The current status of the asset (e.g., 'active'). |
| acquisition_date | timestamp with time zone | The date the asset was acquired. |
| serial_number | text | The serial number of the asset. |
| metadata | jsonb | Additional metadata for the asset. |
| created_by | uuid | Foreign key to the `auth.users` table. |
| created_at | timestamp with time zone | The timestamp when the asset was created. |
| updated_at | timestamp with time zone | The timestamp when the asset was last updated. |
| barcode | text | The barcode value for the asset. |
| barcode_type | text | The type of barcode (e.g., 'qr'). |
| parent_asset_id | uuid | Foreign key to another asset, for parent-child relationships. |
| deleted_at | timestamp with time zone | The timestamp when the asset was soft-deleted. |
| is_deleted | boolean | A flag indicating if the asset is soft-deleted. |

### `inventory_history`
| Column Name | Data Type | Description |
|---|---|---|
| id | uuid | Primary key for the history record. |
| inventory_item_id | uuid | Foreign key to the `inventory_items` table. |
| organization_id | uuid | Foreign key to the `organizations` table. |
| check_type | text | The type of inventory check. |
| quantity | integer | The quantity recorded during the check. |
| condition | text | The condition of the inventory item. |
| check_date | timestamp with time zone | The date of the inventory check. |
| notes | text | Any notes associated with the check. |
| status | text | The status of the inventory item at the time of the check. |
| location | text | The location of the inventory item. |
| created_by | uuid | Foreign key to the `auth.users` table. |
| created_at | timestamp with time zone | The timestamp when the history record was created. |
| month_year | text | The month and year of the history record. |
| event_type | text | The type of event that triggered the history record. |
| response_data | jsonb | The form response data associated with the event. |
| movement_type | USER-DEFINED | The type of inventory movement. |
| related_entity_id | uuid | The ID of a related entity. |
| related_entity_type | text | The type of the related entity. |
| adjustment_reason | text | The reason for an inventory adjustment. |
| previous_quantity | numeric | The quantity before the change. |
| deleted_at | timestamp with time zone | The timestamp when the history record was soft-deleted. |
| is_deleted | boolean | A flag indicating if the history record is soft-deleted. |
| validation_status | text | The validation status of the history record. |
| validation_notes | text | Notes related to the validation. |
| validated_by | uuid | Foreign key to the `auth.users` table. |
| validated_at | timestamp with time zone | The timestamp when the record was validated. |
| edit_history | jsonb | A history of edits to this record. |
| calculation_metadata | jsonb | Metadata related to calculations. |
| updated_at | timestamp with time zone | The timestamp when the history record was last updated. |

### `profiles`
| Column Name | Data Type | Description |
|---|---|---|
| id | uuid | Primary key for the profile, foreign key to `auth.users`. |
| full_name | text | The full name of the user. |
| avatar_url | text | The URL for the user's avatar. |
| created_at | timestamp with time zone | The timestamp when the profile was created. |
| updated_at | timestamp with time zone | The timestamp when the profile was last updated. |
| quick_access_pin | character varying | The 4-digit PIN for mobile access. |
| deleted_at | timestamp with time zone | The timestamp when the profile was soft-deleted. |
| is_deleted | boolean | A flag indicating if the profile is soft-deleted. | 