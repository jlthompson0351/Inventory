# Supabase Overview (Updated August 2025)

This document provides a high-level overview of the Supabase backend for the BarcodEx inventory management system. It is the central starting point for understanding your database, authentication, and API architecture.

---

## 🎯 **Core Supabase Services Used**

-   **PostgreSQL Database**: The relational database for all application data.
-   **Authentication**: Manages user sign-up, login, and session management.
-   **Storage**: Used for file uploads, primarily user and organization avatars.
-   **Edge Functions**: Serverless functions for custom backend logic (e.g., admin user creation).
-   **Row-Level Security (RLS)**: Enforces data access policies at the database level, ensuring organization-based data isolation.

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
-   **[Data Model & Schema](./SUPABASE-DATA-MODEL.md)**: Detailed documentation of all tables, columns, and relationships.
-   **[Database Functions](./SUPABASE-DATABASE-FUNCTIONS.md)**: Reference for all custom PostgreSQL functions (RPCs).
-   **[Security & RLS Policies](./SUPABASE-SECURITY.md)**: A complete breakdown of all Row-Level Security policies.
-   **[Migrations Guide](./SUPABASE-MIGRATIONS-GUIDE.md)**: Instructions for applying and managing database schema changes.

---

## 🚀 **Common Development Tasks**

### **Querying Data**
```typescript
// Fetch assets for the current user's organization (RLS handles filtering)
const { data, error } = await supabase.from('assets').select('*');
```

### **Calling Database Functions (RPC)**
```typescript
// Example: Get dashboard statistics
const { data, error } = await supabase.rpc('get_dashboard_stats');
```

### **User Authentication**
```typescript
// Sign in a user
const { data, error } = await supabase.auth.signInWithPassword({ email, password });

// Get the current user session
const { data: { session } } = await supabase.auth.getSession();
```

### **File Uploads**
```typescript
// Upload an organization avatar
const { data, error } = await supabase.storage
  .from('organization-avatars')
  .upload(`public/${filePath}`, file);
```