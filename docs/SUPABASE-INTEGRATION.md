# Supabase Integration Documentation

This document provides information about the Supabase database integration used in Logistiq, including database functions, schema, and client setup.

## Database Schema

The Logistiq application uses the following main tables:

- **organizations**: Stores organization information (name, avatar, settings)
  - `id`: UUID primary key
  - `name`: Text field for organization name
  - `avatar_url`: Optional URL to organization avatar image
  - `created_at`: Timestamp of creation
  - `updated_at`: Timestamp of last update
  - `is_mothership`: Boolean flag indicating if this is the system's mothership organization
  - `parent_id`: Optional reference to parent organization
  - `hierarchy_level`: Level in the organization hierarchy
  - `description`: Optional description text

- **organization_members**: Tracks user membership in organizations with roles
- **profiles**: User profile information
- **system_roles**: System-wide roles (super_admin, admin)

- **asset_types**: Categories for inventory items and assets
  - `id`: UUID primary key
  - `name`: Asset type name
  - `description`: Description text
  - `color`: Color code for UI
  - `icon`: Icon identifier
  - `organization_id`: Reference to organization
  - `intake_form_id`: Reference to form used for intake
  - `inventory_form_id`: Reference to form used for inventory checks
  - `measurement_units`: Custom measurement units as JSON
  - `default_conversion_settings`: Default conversion settings as JSON

- **assets**: Individual physical assets
  - `id`: UUID primary key
  - `name`: Asset name
  - `description`: Description text
  - `asset_type_id`: Reference to asset type
  - `organization_id`: Reference to organization
  - `status`: Current status
  - `acquisition_date`: When acquired
  - `serial_number`: Unique identifier
  - `metadata`: Additional properties as JSON
  - `created_by`: Reference to user who created

- **inventory_items**: Inventory items tracked by quantity (differs from assets)
  - `id`: UUID primary key
  - `name`: Item name
  - `quantity`: Current quantity
  - `asset_type_id`: Reference to asset type
  - `organization_id`: Reference to organization
  - `sku`: Stock Keeping Unit
  - `barcode`: Barcode for scanning
  - `current_price`: Current price
  - `currency`: Currency code

- **forms**: Form definitions for data collection
  - `id`: UUID primary key
  - `name`: Form name
  - `description`: Form description
  - `form_data`: Form structure as JSON
  - `organization_id`: Reference to organization
  - `status`: Form status (draft, published, archived)
  - `is_template`: Whether form is a template
  - `version`: Version number
  - `asset_types`: Array of asset type IDs this form applies to

> **Important Note**: The database schema has a `form_data` field, but some older code might reference `schema`. Always use `form_data` in new code and handle compatibility in existing code.

- **form_submissions**: User submissions of forms
- **form_schedules**: Schedules for recurring form submissions
- **locations**: Physical locations for inventory items
- **reports**: Saved report configurations
- **form_validation_rules**: Validation rules for form fields
- **form_field_dependencies**: Dependencies between form fields
- **form_categories**: Categories for organizing forms
- **form_category_mappings**: Maps forms to categories
- **organization_invitations**: Pending invitations to join organizations
- **system_logs**: System-wide logging information

## Database Functions

The system uses several PostgreSQL functions for common operations:

### `get_table_counts()`

Returns counts of records in key tables as a JSONB object.

**Usage:**
```sql
SELECT get_table_counts();
```

**Returns:**
```json
{
  "forms": 0,
  "profiles": 1,
  "asset_types": 4, 
  "system_roles": 1,
  "organizations": 3,
  "inventory_items": 0,
  "organization_members": 3
}
```

### `delete_organization(org_id uuid)`

Safely deletes an organization and all its associated data in a transaction.

**Usage:**
```sql
SELECT delete_organization('org-uuid');
```

**Returns:** Boolean indicating success

**Note:** This function will not delete the Mothership organization and will raise an exception if attempted.

**Deleted data includes:**
- Organization invitations
- Asset formulas
- Form responses
- Inventory items
- Asset types
- Forms
- Reports
- Locations
- System logs with the organization ID
- Organization members
- Finally, the organization record itself

### `accept_invitation(invitation_token text)`

Accepts an invitation to join an organization.

**Usage:**
```sql
SELECT accept_invitation('token123');
```

**Returns:** UUID of the created organization_member record

### `create_invitation(org_id uuid, email_address text, member_role text)`

Creates a new invitation to join an organization.

**Usage:**
```sql
SELECT create_invitation('org-uuid', 'user@example.com', 'admin');
```

**Returns:** UUID of the created invitation

### `delete_invitation(invitation_id uuid)`

Deletes an existing invitation.

**Usage:**
```sql
SELECT delete_invitation('invitation-uuid');
```

**Returns:** Boolean indicating success

### `get_invitation_by_token(token_input text)`

Retrieves invitation details by token.

**Usage:**
```sql
SELECT * FROM get_invitation_by_token('token123');
```

### `get_organization_invitations(org_id uuid)`

Lists all invitations for an organization.

**Usage:**
```sql
SELECT * FROM get_organization_invitations('org-uuid');
```

### `get_system_admins()`

Lists all system administrators.

**Usage:**
```sql
SELECT * FROM get_system_admins();
```

### `get_user_id_by_email(email_input text)`

Gets a user's ID by their email address.

**Usage:**
```sql
SELECT * FROM get_user_id_by_email('user@example.com');
```

### Security Functions

- `is_org_admin(org_id uuid)`: Checks if current user is an admin of specific organization
- `is_org_member(org_id uuid)`: Checks if current user is a member of specific organization
- `is_super_admin()`: Checks if current user is a super admin
- `is_system_admin()`: Checks if current user is a system admin

## Using Supabase in the Application

The Supabase client is initialized in `src/integrations/supabase/client.ts` and should be imported as follows:

```typescript
import { supabase } from "@/integrations/supabase/client";
```

### Example: Getting Table Counts

```typescript
const getTableCounts = async () => {
  try {
    const { data, error } = await supabase.rpc('get_table_counts');
    
    if (error) {
      console.error('Error fetching table counts:', error);
      return;
    }
    
    // data contains table counts as a JSON object
    console.log('Table counts:', data);
  } catch (error) {
    console.error('Error:', error);
  }
};
```

### Example: Deleting an Organization

```typescript
const deleteOrganization = async (orgId: string) => {
  try {
    const { data, error } = await supabase.rpc('delete_organization', {
      org_id: orgId
    });
    
    if (error) {
      console.error('Error deleting organization:', error);
      return false;
    }
    
    return data; // true if successful
  } catch (error) {
    console.error('Error:', error);
    return false;
  }
};
```

## Type Definitions

The TypeScript types for the Supabase database schema are defined in `src/integrations/supabase/types.ts`. These types provide strong typing for database operations and ensure type safety when working with database entities. 