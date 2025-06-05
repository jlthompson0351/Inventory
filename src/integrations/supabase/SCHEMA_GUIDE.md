# Supabase Schema Guide for Developers

This guide helps developers understand the Logistiq database schema and how to properly interact with it.

## Core Tables and Relationships

### Organizations and Members

- **organizations**: Root table for tenant data isolation
- **organization_members**: Many-to-many relationship between users and organizations
- **profiles**: Extended user profile data
- **organization_invitations**: Pending invitations to join organizations

### Asset Management

- **asset_types**: Categories/templates for assets (e.g., "Delivery Truck", "Laptop")
- **assets**: Individual instances of assets (e.g., "Truck #123", "Laptop ABC456")
- **inventory_items**: Consumable/bulk items tracked by quantity (differs from assets)

### Form System

- **forms**: Form definitions with structure in `form_data` JSON field
- **form_submissions**: Completed form submissions
- **form_schedules**: Schedules for recurring forms
- **form_categories**: Categories for organizing forms
- **form_validation_rules**: Rules for validating form inputs
- **form_field_dependencies**: Dependencies between form fields (show/hide logic)

## Important Design Notes

### Schema vs. form_data

The database schema uses `form_data` to store the form structure as a JSONB field. Some older code might reference a field called `schema` instead, which doesn't exist in the database. Always use `form_data` in new code and handle compatibility in existing code.

```typescript
// Correct way to handle form data
function handleForm(form) {
  // Ensure form_data is available
  const formData = form.form_data || form.schema || { fields: [] };
  
  // Use formData for rendering/processing
}
```

### Row-Level Security (RLS)

All tables have row-level security enabled to ensure users can only access data in organizations they belong to. The `organization_id` field is key to this security model.

When querying the database, you don't need to manually filter by organization as RLS handles this, but it's good practice to include the filter for clarity:

```typescript
// Good practice - explicit about which organization's data we're fetching
const { data, error } = await supabase
  .from('forms')
  .select('*')
  .eq('organization_id', organizationId);
```

### Asset Types vs. Assets

- **Asset Types** are templates/categories
- **Assets** are individual instances

Asset types can have associated forms:
- `intake_form_id`: Used when creating new assets of this type
- `inventory_form_id`: Used for regular inventory checks

### Form Data Structure

The `form_data` field in the `forms` table stores the form structure as a JSON object:

```json
{
  "fields": [
    {
      "id": "field_123",
      "label": "Serial Number",
      "type": "text",
      "required": true,
      "placeholder": "Enter serial number"
    },
    {
      "id": "field_456",
      "label": "Condition",
      "type": "select",
      "options": [
        {"label": "New", "value": "new"},
        {"label": "Used", "value": "used"},
        {"label": "Damaged", "value": "damaged"}
      ]
    }
  ]
}
```

## Common Patterns and Best Practices

### Fetching Related Data

When fetching forms, you might need form validation rules or dependencies:

```typescript
// Get a form with all its related data
const getFormWithRelations = async (formId) => {
  const { data: form } = await supabase
    .from('forms')
    .select('*')
    .eq('id', formId)
    .single();
    
  const { data: validationRules } = await supabase
    .from('form_validation_rules')
    .select('*')
    .eq('form_id', formId);
    
  const { data: fieldDependencies } = await supabase
    .from('form_field_dependencies')
    .select('*')
    .eq('form_id', formId);
    
  return { form, validationRules, fieldDependencies };
};
```

### Working with JSON Fields

Several tables use JSON/JSONB fields for flexible data storage:

- `forms.form_data`: Form structure
- `form_submissions.submission_data`: Form input data
- `form_submissions.calculation_results`: Calculated values
- `assets.metadata`: Flexible asset properties

When querying or updating these fields, use Postgres JSONB operators:

```typescript
// Find forms with a specific field
const { data } = await supabase
  .from('forms')
  .select('*')
  .contains('form_data', { 
    fields: [{ id: 'serial_number' }] 
  });
```

### Asset Type Forms

Asset types can reference two form types:
- `intake_form_id`: For initial asset creation
- `inventory_form_id`: For regular inventory checks

Always maintain these references when managing forms:

```typescript
// Update asset type when changing form status
const archiveForm = async (formId) => {
  // First update the form status
  await supabase
    .from('forms')
    .update({ status: 'archived' })
    .eq('id', formId);
    
  // Then remove any references from asset types
  await supabase
    .from('asset_types')
    .update({ intake_form_id: null })
    .eq('intake_form_id', formId);
    
  await supabase
    .from('asset_types')
    .update({ inventory_form_id: null })
    .eq('inventory_form_id', formId);
};
```

## Database Functions

The database includes several useful PostgreSQL functions for common operations:

- `get_table_counts()`: Return counts of records in key tables
- `delete_organization(org_id)`: Safely delete an organization and related data
- `get_pending_forms_for_asset(asset_id, user_id)`: Get forms due for an asset
- `process_form_submission(...)`: Create a form submission with calculated fields
- `calculate_form_formulas(submission_data, form_schema)`: Calculate formula fields

See the full README for detailed documentation on all available functions. 