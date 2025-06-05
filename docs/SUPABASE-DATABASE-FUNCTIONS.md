# Supabase Database Functions Reference

This document provides a comprehensive reference for all PostgreSQL functions available in the BarcodEx Supabase database.

## Table of Contents

1. [Organization Management Functions](#organization-management-functions)
2. [Invitation Functions](#invitation-functions)
3. [Security Functions](#security-functions)
4. [Reporting Functions](#reporting-functions)
5. [Asset Management Functions](#asset-management-functions)
6. [Form Processing Functions](#form-processing-functions)
7. [Utility Functions](#utility-functions)

## Organization Management Functions

### `delete_organization(org_id uuid)`

Safely deletes an organization and all its associated data in a transaction.

**Parameters:**
- `org_id`: UUID of the organization to delete

**Returns:** Boolean indicating success

**Behavior:**
- Will not delete the Mothership organization
- Deletes all related data in the correct order to maintain referential integrity
- Wrapped in a transaction for safety

**Example:**
```sql
SELECT delete_organization('123e4567-e89b-12d3-a456-426614174000');
```

**Deleted data includes:**
- Organization invitations
- Asset formulas
- Form responses
- Inventory items
- Asset types
- Forms
- Reports
- Locations
- System logs
- Organization members
- Organization record

## Invitation Functions

### `get_invitation_by_token(token_input text)`

Retrieves invitation details by token.

**Parameters:**
- `token_input`: The invitation token string

**Returns:** Table with invitation details:
- `id`: UUID
- `organization_id`: UUID
- `email`: Text
- `role`: Text
- `invited_by`: UUID
- `expires_at`: Timestamptz
- `accepted_at`: Timestamptz

**Example:**
```sql
SELECT * FROM get_invitation_by_token('abc123xyz789');
```

### `get_organization_invitations(org_id uuid)`

Lists all pending invitations for an organization.

**Parameters:**
- `org_id`: UUID of the organization

**Returns:** Table with:
- `id`: UUID
- `email`: Text
- `role`: Text
- `created_at`: Timestamptz
- `expires_at`: Timestamptz

**Example:**
```sql
SELECT * FROM get_organization_invitations('123e4567-e89b-12d3-a456-426614174000');
```

### `create_invitation(org_id uuid, email_address text, member_role text)`

Creates a new invitation to join an organization.

**Parameters:**
- `org_id`: UUID of the organization
- `email_address`: Email address to invite
- `member_role`: Role to assign (e.g., 'admin', 'member')

**Returns:** UUID of the created invitation

**Behavior:**
- Sets expiration to 30 days from creation
- Generates a random token
- Records the inviting user

**Example:**
```sql
SELECT create_invitation(
  '123e4567-e89b-12d3-a456-426614174000',
  'newuser@example.com',
  'member'
);
```

### `delete_invitation(invitation_id uuid)`

Deletes an existing invitation.

**Parameters:**
- `invitation_id`: UUID of the invitation to delete

**Returns:** Boolean indicating success

**Example:**
```sql
SELECT delete_invitation('123e4567-e89b-12d3-a456-426614174001');
```

### `accept_invitation(invitation_token text)`

Accepts an invitation to join an organization.

**Parameters:**
- `invitation_token`: The invitation token

**Returns:** UUID of the created organization_member record

**Behavior:**
- Validates invitation is not expired and not already accepted
- Marks invitation as accepted
- Creates organization_member record

**Example:**
```sql
SELECT accept_invitation('abc123xyz789');
```

## Security Functions

### `is_org_admin(org_id uuid)`

Checks if the current user is an admin of the specified organization.

**Parameters:**
- `org_id`: UUID of the organization

**Returns:** Boolean

**Example:**
```sql
SELECT is_org_admin('123e4567-e89b-12d3-a456-426614174000');
```

### `is_org_member(org_id uuid)`

Checks if the current user is a member of the specified organization.

**Parameters:**
- `org_id`: UUID of the organization

**Returns:** Boolean

**Example:**
```sql
SELECT is_org_member('123e4567-e89b-12d3-a456-426614174000');
```

### `is_super_admin()`

Checks if the current user is a super admin.

**Returns:** Boolean

**Example:**
```sql
SELECT is_super_admin();
```

### `is_system_admin()`

Checks if the current user is a system admin.

**Returns:** Boolean

**Example:**
```sql
SELECT is_system_admin();
```

### `get_user_id_by_email(email_input text)`

Gets a user's ID by their email address.

**Parameters:**
- `email_input`: Email address to look up

**Returns:** UUID of the user

**Example:**
```sql
SELECT get_user_id_by_email('user@example.com');
```

### `get_system_admins()`

Lists all system administrators.

**Returns:** Table with user information

**Example:**
```sql
SELECT * FROM get_system_admins();
```

## Reporting Functions

### `get_table_counts()`

Returns counts of records in key tables as a JSONB object.

**Returns:** JSONB object with table counts

**Example:**
```sql
SELECT get_table_counts();
-- Returns:
-- {
--   "forms": 10,
--   "profiles": 25,
--   "asset_types": 4,
--   "system_roles": 2,
--   "organizations": 3,
--   "inventory_items": 150,
--   "organization_members": 30
-- }
```

### `get_asset_count_fast()`

Optimized function for counting assets with optional filters.

**Returns:** Integer count of assets

**Performance:** Uses materialized views for faster execution

**Example:**
```sql
SELECT get_asset_count_fast();
```

### `get_inventory_value_fast()`

Fast calculation of total inventory value.

**Returns:** Numeric value representing total inventory value

**Performance:** Uses materialized views and optimized queries

**Example:**
```sql
SELECT get_inventory_value_fast();
```

### `get_report_performance_stats()`

Provides analytics on report execution performance.

**Returns:** Table with performance metrics

**Example:**
```sql
SELECT * FROM get_report_performance_stats();
```

### `run_reporting_maintenance()`

Runs comprehensive maintenance routine for reporting infrastructure.

**Behavior:**
- Refreshes materialized views
- Cleans up old cache entries
- Updates statistics

**Example:**
```sql
SELECT run_reporting_maintenance();
```

### `refresh_reporting_views()`

Refreshes all materialized views used for reporting.

**Example:**
```sql
SELECT refresh_reporting_views();
```

## Asset Management Functions

### `generate_asset_barcode(p_asset_id uuid, p_barcode_type text)`

Generates a unique barcode for an asset based on its type settings.

**Parameters:**
- `p_asset_id`: UUID of the asset
- `p_barcode_type`: Type of barcode ('qr', 'code128', 'code39')

**Returns:** Text string representing the barcode value

**Example:**
```sql
SELECT generate_asset_barcode(
  '123e4567-e89b-12d3-a456-426614174000',
  'qr'
);
```

### `scan_asset_barcode(barcode text)`

Retrieves asset information by scanning a barcode.

**Parameters:**
- `barcode`: The barcode string to look up

**Returns:** Asset record with all details

**Example:**
```sql
SELECT * FROM scan_asset_barcode('ASSET-123456-ABCDEF');
```

### `get_pending_forms_for_asset(p_asset_id uuid, p_user_id uuid)`

Finds forms that are due for a specific asset.

**Parameters:**
- `p_asset_id`: UUID of the asset
- `p_user_id`: UUID of the user checking

**Returns:** Table with pending forms and due dates

**Example:**
```sql
SELECT * FROM get_pending_forms_for_asset(
  '123e4567-e89b-12d3-a456-426614174000',
  '123e4567-e89b-12d3-a456-426614174001'
);
```

## Form Processing Functions

### `process_form_submission(...)`

Creates a form submission with automatic formula calculation.

**Parameters:**
- `p_form_id`: UUID of the form
- `p_asset_id`: UUID of the asset (optional)
- `p_asset_type_id`: UUID of the asset type (optional)
- `p_submission_data`: JSONB data from form
- `p_organization_id`: UUID of the organization
- `p_submitted_by`: UUID of the submitting user

**Returns:** UUID of the created submission

**Behavior:**
- Automatically calculates formula fields
- Stores both input data and calculation results
- Creates audit trail

**Example:**
```sql
SELECT process_form_submission(
  '123e4567-e89b-12d3-a456-426614174000',  -- form_id
  '123e4567-e89b-12d3-a456-426614174001',  -- asset_id
  '123e4567-e89b-12d3-a456-426614174002',  -- asset_type_id
  '{"field1": "value1", "field2": 123}'::jsonb,  -- submission_data
  '123e4567-e89b-12d3-a456-426614174003',  -- organization_id
  '123e4567-e89b-12d3-a456-426614174004'   -- submitted_by
);
```

### `calculate_form_formulas(p_submission_data jsonb, p_form_schema jsonb)`

Calculates dynamic formula fields based on form input.

**Parameters:**
- `p_submission_data`: JSONB containing form input data
- `p_form_schema`: JSONB containing form structure with formulas

**Returns:** JSONB with calculated values

**Supported Operations:**
- Basic arithmetic: +, -, *, /
- Field references: {fieldname}
- Nested calculations

**Example:**
```sql
SELECT calculate_form_formulas(
  '{"length": 10, "width": 5}'::jsonb,
  '{"fields": [{"id": "area", "type": "formula", "formula": "{length} * {width}"}]}'::jsonb
);
-- Returns: {"area": 50}
```

## Utility Functions

### Database Triggers

#### `sync_event_type_with_check_type`

Automatically maps check_type to appropriate event_type in inventory_history.

**Mappings:**
- `initial` → `intake`
- `audit` → `audit`
- `adjustment` → `adjustment`
- `transfer` → `transfer`

#### `create_inventory_on_asset_creation`

Automatically creates an inventory_items record when a new asset is created.

**Behavior:**
- Creates 1:1 relationship between assets and inventory
- Sets initial quantity to 1
- Copies relevant fields from asset

## Function Usage Best Practices

1. **Error Handling**: Always check for errors when calling functions
   ```typescript
   const { data, error } = await supabase.rpc('function_name', params);
   if (error) console.error('Error:', error);
   ```

2. **Permissions**: Most functions use SECURITY DEFINER, so they run with elevated privileges
   - Still respect RLS policies
   - Validate inputs to prevent security issues

3. **Performance**: Use the optimized functions (e.g., `get_asset_count_fast`) for better performance

4. **Transactions**: Many functions use transactions internally for data consistency

5. **Naming Convention**: Functions use snake_case following PostgreSQL conventions

## Maintenance and Monitoring

Regular maintenance tasks:
1. Run `refresh_reporting_views()` daily
2. Monitor `slow_query_log` for performance issues
3. Run `run_reporting_maintenance()` weekly
4. Check function execution times in `report_runs` table

## Adding New Functions

When adding new database functions:
1. Add to `/supabase/migrations/` with proper version numbering
2. Document in this file
3. Add TypeScript types if needed
4. Test with different user roles
5. Consider performance implications