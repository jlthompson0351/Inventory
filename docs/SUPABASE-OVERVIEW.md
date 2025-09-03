# Supabase Overview (Updated January 2025)

This document provides a high-level overview of the Supabase backend for the BarcodEx inventory management system. It is the central starting point for understanding your database, authentication, and API architecture.

---

## 🎯 **Core Supabase Services Used**

-   **PostgreSQL Database**: The relational database with 35+ tables and 180+ custom functions
-   **Authentication**: Comprehensive user management with PIN-based mobile QR authentication  
-   **Storage**: File uploads for user/organization avatars and asset profile images
-   **Edge Functions**: Fully deployed serverless functions for secure admin operations with service role permissions
-   **Row-Level Security (RLS)**: 140+ policies enforcing organization-based data isolation with mobile QR support

---

## 🔑 **Project Configuration**

### **Connection Details**
-   **Project URL**: `https://kxcubbibhofdvporfarj.supabase.co`
-   **Client Initialization**:
    ```typescript
    // src/integrations/supabase/client.ts
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://kxcubbibhofdvporfarj.supabase.co';
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your_anon_key'; // Replace with your actual anon key

    export const supabase = createClient(supabaseUrl, supabaseAnonKey);
    ```

### **TypeScript Integration**
-   **Auto-generated Types**: Database types are generated from your schema to provide strong type safety in the frontend.
-   **Generation Command**:
    ```bash
    npx supabase gen types typescript --project-id kxcubbibhofdvporfarj > src/types/database.types.ts
    ```

---

## 🏗️ **Architecture Overview**

### **Key Architectural Documents**
-   **[Data Model & Schema](../supabase/docs/data-model.md)**: Complete live schema documentation (35 tables, 180+ functions)
-   **[Assets & Forms Integration](../supabase/docs/assets-and-forms.md)**: Asset management with mobile QR workflow
-   **[Security & RLS Policies](./SUPABASE-SECURITY.md)**: Complete breakdown of 140+ Row-Level Security policies
-   **[Database Functions](./SUPABASE-DATABASE-FUNCTIONS.md)**: Reference for all custom PostgreSQL functions (RPCs)
-   **[Migrations Guide](./SUPABASE-MIGRATIONS-GUIDE.md)**: Schema change management and deployment
-   **[Edge Functions Guide](../MASTERKEY-EDGE-FUNCTIONS.md)**: Admin operations and service role functions
-   **[Edge Functions Audit](../EDGE_FUNCTIONS_AUDIT.md)**: Production deployment verification

---

## 🚀 **Common Development Tasks**

### **Asset Management**
```typescript
// Create asset with automatic inventory setup (recommended)
const { data, error } = await supabase.rpc('create_asset_with_inventory', {
  p_name: 'Delivery Van #7',
  p_description: '2020 Ford Transit delivery van',
  p_asset_type_id: 'asset-type-uuid',
  p_organization_id: 'org-uuid',
  p_serial_number: 'VIN12345678901234',
  p_created_by: 'user-uuid'
});

// Get assets with inventory status (RLS handles filtering)
const { data, error } = await supabase
  .from('assets')
  .select(`
    *,
    asset_type:asset_types(*),
    inventory_items(*)
  `);
```

### **Mobile QR Workflow**
```typescript
// Authenticate mobile user with PIN
const { data, error } = await supabase.rpc('authenticate_mobile_pin', {
  p_pin: '1234'
});

// Handle mobile form submission
const { data, error } = await supabase.rpc('handle_mobile_submission', {
  p_asset_barcode: 'VEH-123456-ABCDEF',
  p_form_data: formData,
  p_session_token: sessionToken
});
```

### **Advanced Database Functions**
```typescript
// Get comprehensive dashboard statistics
const { data, error } = await supabase.rpc('get_dashboard_stats');

// Get pending forms for an asset
const { data, error } = await supabase.rpc('get_pending_forms_for_asset', {
  p_asset_id: 'asset-uuid',
  p_user_id: 'user-uuid'
});

// Fast performance queries
const { data: assetCount } = await supabase.rpc('get_asset_count_fast', {
  p_organization_id: 'org-uuid'
});

const { data: inventoryValue } = await supabase.rpc('get_inventory_value_fast', {
  p_organization_id: 'org-uuid'
});
```

### **Form Processing with Calculations**
```typescript
// Submit form with automatic formula calculations
const { data, error } = await supabase.rpc('process_form_submission', {
  p_form_id: 'form-uuid',
  p_asset_id: 'asset-uuid',
  p_asset_type_id: 'asset-type-uuid',
  p_submission_data: formData,
  p_organization_id: 'org-uuid',
  p_submitted_by: 'user-uuid'
});
```

### **User Authentication & Management**
```typescript
// Standard user sign-in
const { data, error } = await supabase.auth.signInWithPassword({ 
  email, 
  password 
});

// Get user profile with organization
const { data, error } = await supabase.rpc('get_user_profile_with_org_robust');

// Admin user creation via Edge Function
const { data, error } = await supabase.functions.invoke('admin-create-user', {
  body: {
    email: 'user@example.com',
    password: 'tempPassword',
    fullName: 'John Doe',
    role: 'member',
    organizationId: 'org-uuid'
  }
});
```

### **Reporting & Analytics**
```typescript
// Get system performance stats
const { data, error } = await supabase.rpc('get_system_health_stats');

// Analyze report performance
const { data, error } = await supabase.rpc('analyze_report_performance');

// Get organization health metrics
const { data, error } = await supabase.rpc('get_organization_health', {
  p_organization_id: 'org-uuid'
});
```