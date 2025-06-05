# Supabase Migrations Guide

This guide documents all database migrations for the BarcodEx system and provides instructions for managing database schema changes.

## Migration Files Overview

### Core System Tables

#### `20240618_create_inventory_items_table.sql`
**Added**: June 2024
- Creates the `inventory_items` table for tracking stock items
- Foundation for inventory management system

#### `20240620_create_forms_tables.sql`
**Added**: June 2024
- Creates the base form system tables:
  - `forms`: Form templates storage
  - `form_categories`: Form categorization
  - `form_category_mappings`: Form-category relationships
  - `form_validation_rules`: Field validation rules
  - `form_field_dependencies`: Conditional form logic

### Asset Management

#### `create_assets_and_form_tables.sql`
**Added**: June 2025
- Adds support for tracking individual physical assets
- Creates tables:
  - `assets`: Individual physical assets (distinct from inventory items)
  - `form_submissions`: Submitted forms with calculation results
  - `form_schedules`: Recurring form scheduling for assets
- Features:
  - Foreign key relationships to asset types, organizations, and forms
  - Dynamic formula calculations in form submissions
  - Scheduling system for recurring checks and maintenance

### Functions and Procedures

#### `add_calculate_form_formulas_function.sql`
**Added**: June 2025
- Adds calculation support functions:
  - `calculate_form_formulas`: Processes formula fields based on input
  - `process_form_submission`: Full form submission flow with calculations
- Features:
  - Secure formula evaluation
  - Multiple input field support
  - Error handling for calculations

#### `add_form_scheduling_functions.sql`
**Added**: June 2025
- Adds scheduling-related functions:
  - `get_pending_forms_for_asset`: Finds due forms for assets
- Features:
  - Multiple schedule types (daily, weekly, monthly, yearly)
  - Duplicate submission prevention
  - Row-level security integration

#### `asset_types_mothership.sql`
**Added**: April 2025
- Adds system-wide asset type management:
  - `get_asset_types_with_counts`: Asset types with inventory counts
  - `get_mothership_asset_types`: System admin view of all asset types
  - `clone_asset_type`: Copy asset types between organizations

## Migration Management

### Applying Migrations

#### Using Supabase CLI

1. **Apply all pending migrations:**
   ```bash
   supabase db push
   ```

2. **Reset and reapply all migrations:**
   ```bash
   supabase db reset
   ```

3. **Create a new migration:**
   ```bash
   supabase migration new migration_name
   ```

#### Using Supabase Dashboard

1. Navigate to SQL Editor in your Supabase project
2. Open migration files in order (by date prefix)
3. Execute each migration script
4. Verify successful execution

### Migration Best Practices

1. **Naming Convention**
   - Use date prefix: `YYYYMMDD_description.sql`
   - Be descriptive: `20240625_add_barcode_support.sql`

2. **Testing Protocol**
   - Test in development environment first
   - Run on staging before production
   - Verify data integrity after migration

3. **Backup Strategy**
   - Always backup before migrations
   - Use Supabase's point-in-time recovery
   - Export critical data separately

4. **Documentation**
   - Update this guide with new migrations
   - Document breaking changes
   - Include rollback procedures

5. **Dependencies**
   - List migration dependencies
   - Apply in correct order
   - Handle foreign key constraints

## Common Migration Tasks

### Adding a New Table

```sql
-- Example: Adding a new audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Add indexes
CREATE INDEX idx_audit_logs_organization ON public.audit_logs(organization_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
```

### Adding a Column

```sql
-- Example: Adding a barcode column to assets
ALTER TABLE public.assets 
ADD COLUMN IF NOT EXISTS barcode TEXT UNIQUE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_assets_barcode ON public.assets(barcode);
```

### Creating a Function

```sql
-- Example: Function to generate unique barcodes
CREATE OR REPLACE FUNCTION generate_unique_barcode()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  new_barcode TEXT;
BEGIN
  LOOP
    new_barcode := 'BC-' || to_char(now(), 'YYYYMMDD') || '-' || 
                   substring(gen_random_uuid()::text, 1, 8);
    
    -- Check if barcode exists
    IF NOT EXISTS (SELECT 1 FROM assets WHERE barcode = new_barcode) THEN
      RETURN new_barcode;
    END IF;
  END LOOP;
END;
$$;
```

### Adding RLS Policies

```sql
-- Example: RLS policy for organization members
CREATE POLICY "Users can view their organization's data"
ON public.your_table
FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id 
    FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);
```

## Rollback Procedures

### Manual Rollback

For each migration, create a corresponding rollback script:

```sql
-- Rollback for creating a table
DROP TABLE IF EXISTS public.table_name CASCADE;

-- Rollback for adding a column
ALTER TABLE public.table_name DROP COLUMN IF EXISTS column_name;

-- Rollback for creating a function
DROP FUNCTION IF EXISTS function_name(parameters);
```

### Using Backups

1. Identify the backup point before migration
2. Use Supabase dashboard to restore
3. Or use CLI: `supabase db restore --backup-id <id>`

## Troubleshooting

### Common Issues

1. **Foreign Key Violations**
   - Check data integrity before migration
   - Use CASCADE options carefully
   - Consider deferred constraints

2. **Permission Errors**
   - Ensure proper grants are included
   - Check RLS policies
   - Verify function security settings

3. **Performance Impact**
   - Add indexes in separate transactions
   - Use CONCURRENTLY for large tables
   - Monitor query performance

### Debug Commands

```sql
-- Check migration status
SELECT * FROM supabase_migrations ORDER BY executed_at DESC;

-- View table structure
\d table_name

-- Check indexes
\di table_name

-- View RLS policies
SELECT * FROM pg_policies WHERE tablename = 'your_table';
```

## Migration Checklist

- [ ] Backup database
- [ ] Test in development
- [ ] Review migration script
- [ ] Check for dependencies
- [ ] Apply migration
- [ ] Verify data integrity
- [ ] Test application functionality
- [ ] Update documentation
- [ ] Commit migration file
- [ ] Tag release if needed