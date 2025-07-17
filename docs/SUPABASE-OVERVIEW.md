# Supabase Documentation Overview

This document serves as the central hub for all Supabase-related documentation in the BarcodEx inventory management system.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture Overview](#architecture-overview)
3. [Documentation Guide](#documentation-guide)
4. [Configuration](#configuration)
5. [Common Tasks](#common-tasks)

## Quick Start

BarcodEx uses Supabase as its backend service, providing:
- **PostgreSQL Database**: Robust relational database with advanced features
- **Authentication**: Secure user authentication and authorization
- **Row-Level Security (RLS)**: Organization-based data isolation
- **Real-time Subscriptions**: Live data updates (if needed)
- **Storage**: File storage capabilities

### Connection Details

```typescript
// Production configuration (with secure anon key fallbacks)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://kxcubbibhofdvporfarj.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
// Note: Anon keys are safe for client-side use and protected by RLS policies
```

## Architecture Overview

### Database Structure
- **Multi-tenant Architecture**: Organization-based data isolation
- **Row-Level Security**: Automatic filtering based on user's organization
- **Materialized Views**: Performance optimization for reporting
- **Database Functions**: Complex operations encapsulated as PostgreSQL functions

### Key Components
1. **Organizations**: Root tenant structure
2. **Users & Members**: Authentication and authorization
3. **Assets & Inventory**: Core business entities
4. **Forms System**: Dynamic data collection
5. **Reporting**: Analytics and insights

## Documentation Guide

### Core Documentation Files

1. **[SUPABASE-INTEGRATION.md](./SUPABASE-INTEGRATION.md)**
   - Database functions and RPC calls
   - Client setup and initialization
   - Code examples and usage patterns
   - Security considerations

2. **[SUPABASE-SCHEMA-GUIDE.md](./SUPABASE-SCHEMA-GUIDE.md)**
   - Developer-focused schema guide
   - Best practices for database interactions
   - Common patterns and anti-patterns
   - JSON field handling

3. **[SUPABASE-DATA-MODEL.md](./SUPABASE-DATA-MODEL.md)**
   - Complete database schema documentation
   - Table relationships and constraints
   - Performance infrastructure (indexes, views)
   - Recent enhancements and migrations

4. **[SUPABASE-ASSETS-FORMS.md](./SUPABASE-ASSETS-FORMS.md)**
   - Asset management integration
   - Form system integration
   - Price tracking and history
   - Parent-child relationships

## Configuration

### Environment Variables

```bash
# Required Supabase configuration
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key

# Optional configurations
VITE_SUPABASE_SERVICE_KEY=your_service_key  # For admin operations
```

### TypeScript Types

Generate TypeScript types from your Supabase schema:

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.types.ts
```

## Common Tasks

### 1. Database Queries

```typescript
import { supabase } from "@/integrations/supabase/client";

// Basic query with RLS
const { data, error } = await supabase
  .from('assets')
  .select('*')
  .eq('organization_id', orgId);
```

### 2. RPC Function Calls

```typescript
// Get table counts
const { data, error } = await supabase.rpc('get_table_counts');

// Delete organization (with cascade)
const { data, error } = await supabase.rpc('delete_organization', {
  org_id: organizationId
});
```

### 3. Authentication

```typescript
// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
});

// Get current user
const { data: { user } } = await supabase.auth.getUser();
```

### 4. File Storage

```typescript
// Upload file
const { data, error } = await supabase.storage
  .from('avatars')
  .upload(`public/${file.name}`, file);

// Get public URL
const { data } = supabase.storage
  .from('avatars')
  .getPublicUrl('public/avatar1.png');
```

## Database Functions Reference

### Organization Management
- `delete_organization(org_id)`: Safely delete organization and all related data
- `get_organization_invitations(org_id)`: List pending invitations
- `create_invitation(org_id, email, role)`: Create new invitation
- `accept_invitation(token)`: Accept organization invitation

### Security Functions
- `is_org_admin(org_id)`: Check if user is organization admin
- `is_org_member(org_id)`: Check if user is organization member
- `is_super_admin()`: Check if user is super admin
- `is_system_admin()`: Check if user is system admin

### Reporting Functions
- `get_table_counts()`: Get counts of all major tables
- `get_asset_count_fast()`: Optimized asset counting
- `get_inventory_value_fast()`: Fast inventory value calculation
- `run_reporting_maintenance()`: Maintenance routine for performance

### Asset Management
- `generate_asset_barcode(asset_id, barcode_type)`: Generate unique barcode
- `scan_asset_barcode(barcode)`: Retrieve asset by barcode
- `get_pending_forms_for_asset(asset_id, user_id)`: Find due forms

### Form Processing
- `process_form_submission(...)`: Create form submission with calculations
- `calculate_form_formulas(submission_data, form_schema)`: Calculate formula fields

## Migrations

Database migrations are stored in `/supabase/migrations/`. To apply migrations:

1. Using Supabase CLI:
   ```bash
   supabase db push
   ```

2. Using Supabase Dashboard:
   - Navigate to SQL Editor
   - Run migration files in order

## Performance Considerations

1. **Materialized Views**: Refresh regularly for accurate reporting
2. **Indexes**: Monitor slow queries and add indexes as needed
3. **RLS Policies**: Keep policies simple for better performance
4. **Connection Pooling**: Use Supabase connection pooler for high traffic

## Troubleshooting

### Common Issues

1. **RLS Errors**: Ensure user is properly authenticated and belongs to organization
2. **Type Mismatches**: Regenerate TypeScript types after schema changes
3. **Performance Issues**: Check slow query log and optimize queries
4. **Connection Issues**: Verify environment variables and network connectivity

### Debug Queries

```sql
-- Check user's organizations
SELECT * FROM organization_members WHERE user_id = auth.uid();

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'your_table';

-- View slow queries
SELECT * FROM slow_query_log ORDER BY created_at DESC LIMIT 10;
```

## Security Best Practices

1. **Never expose service keys** in client-side code
2. **Use RLS** for all tables containing user data
3. **Validate input** before database operations
4. **Use prepared statements** (Supabase client handles this)
5. **Regular backups** through Supabase dashboard

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Database Model Diagram](./SUPABASE-DATA-MODEL.md#core-entities)
- [Migration History](../supabase/migrations/)