# Row Level Security (RLS) Audit Report

**Generated:** December 18, 2024  
**Project:** omni (kxcubbibhofdvporfarj)  
**Purpose:** Baseline documentation of current RLS configuration before making changes

## Executive Summary

**CRITICAL FINDING:** Most tables have RLS policies defined but RLS is NOT ENABLED. This means the security policies exist but are not being enforced.

### Tables with RLS ENABLED (6 tables):
- `assets` ✅
- `form_submissions` ✅ 
- `forms` ✅
- `inventory_history` ✅
- `inventory_items` ✅
- `profiles` ✅

### Tables with RLS DISABLED but policies defined (33 tables):
All other tables have comprehensive policies but RLS is turned OFF.

---

## Detailed RLS Policy Breakdown

### 1. asset_formula_mappings
**RLS Status:** ❌ DISABLED  
**Policies:**
- `Allow mobile anonymous access to asset_formula_mappings` (ALL, public)
- `Organization admins can delete formula mappings` (DELETE, public)
- `Organization admins can update formula mappings` (UPDATE, public)
- `Organization members can create formula mappings` (INSERT, public)
- `Users can view formula mappings for their organizations` (SELECT, public)

### 2. asset_formulas
**RLS Status:** ❌ DISABLED  
**Policies:**
- `Users can view their organization asset formulas` (SELECT, public)
- `Users with proper roles can manage asset formulas` (ALL, public)

### 3. asset_type_forms
**RLS Status:** ❌ DISABLED  
**Policies:**
- `Allow anonymous mobile QR access to asset_type_forms` (SELECT, anon)
- `Allow anonymous read access to asset_type_forms for mobile QR` (SELECT, anon)
- `Allow mobile anonymous access to asset_type_forms` (ALL, public)
- `org_asset_type_forms_policy` (ALL, public)

### 4. asset_types
**RLS Status:** ❌ DISABLED  
**Policies:**
- `Allow anonymous mobile QR access to asset_types` (SELECT, anon)
- `Allow mobile anonymous access to asset_types` (ALL, public)
- `Users can create asset types for their organization` (INSERT, public)
- `Users can update asset types for their organization` (UPDATE, public)
- `Users can view asset types for their organization` (SELECT, public)
- `Users can view their organization asset types` (SELECT, public)
- `Users with admin or manager role can manage asset types` (ALL, public)

### 5. assets ✅
**RLS Status:** ✅ ENABLED  
**Policies:**
- `Allow anonymous mobile QR access to assets` (SELECT, anon)
- `Allow authenticated users to insert assets in their org` (INSERT, authenticated)
- `Allow authenticated users to select assets in their org` (SELECT, authenticated)
- `Allow authenticated users to update assets in their org` (UPDATE, authenticated)
- `Users can delete assets in their organization` (DELETE, public)

### 6. background_jobs
**RLS Status:** ❌ DISABLED  
**Policies:**
- `Users can create jobs in their organization` (INSERT, public)
- `Users can view jobs from their organization` (SELECT, public)

### 7. form_categories
**RLS Status:** ❌ DISABLED  
**Policies:**
- `Allow anonymous mobile QR access to form_categories` (SELECT, anon)
- `Organization admins can manage categories` (ALL, public)
- `Users can view categories in their organizations` (SELECT, public)

### 8. form_category_mappings
**RLS Status:** ❌ DISABLED  
**Policies:**
- `Allow anonymous mobile QR access to form_category_mappings` (SELECT, anon)
- `Allow anonymous read access to form_category_mappings for mobil` (SELECT, anon)
- `Allow mobile anonymous access to form_category_mappings` (ALL, public)
- `Organization admins can manage form category mappings` (ALL, public)
- `Users can view form category mappings in their organizations` (SELECT, public)

### 9. form_field_dependencies
**RLS Status:** ❌ DISABLED  
**Policies:**
- `Allow anonymous mobile QR access to form_field_dependencies` (SELECT, anon)
- `Allow anonymous read access to form_field_dependencies for mobi` (SELECT, anon)
- `Allow mobile anonymous access to form_field_dependencies` (ALL, public)
- `Organization admins can manage field dependencies` (ALL, public)
- `Users can view field dependencies in their organizations` (SELECT, public)

### 10. form_responses
**RLS Status:** ❌ DISABLED  
**Policies:**
- `Allow anonymous insert to form_responses for mobile QR` (INSERT, anon)
- `Allow anonymous mobile QR form responses` (ALL, anon)
- `Users can view their organization form responses` (SELECT, public)
- `Users with proper roles can manage form responses` (ALL, public)

### 11. form_schedules
**RLS Status:** ❌ DISABLED  
**Policies:**
- `Users can manage form schedules in their organization` (ALL, public)
- `Users can view form schedules in their organization` (SELECT, public)

### 12. form_submissions ✅
**RLS Status:** ✅ ENABLED  
**Policies:**
- `Allow anonymous insert to form_submissions for mobile QR` (INSERT, anon)
- `Allow anonymous mobile QR form submissions` (INSERT, anon)
- `Allow anonymous mobile QR read access to form_submissions` (SELECT, anon)
- `Allow anonymous update to form_submissions for mobile QR` (UPDATE, anon)
- `Allow authenticated users to insert form submissions in their o` (INSERT, authenticated)
- `Allow authenticated users to update form submissions in their o` (UPDATE, authenticated)
- `Users can view form submissions in their organization` (SELECT, public)

### 13. form_validation_rules
**RLS Status:** ❌ DISABLED  
**Policies:**
- `Allow anonymous mobile QR access to form_validation_rules` (SELECT, anon)
- `Allow anonymous read access to form_validation_rules for mobile` (SELECT, anon)
- `Allow mobile anonymous access to form_validation_rules` (ALL, public)
- `Organization admins can manage validation rules` (ALL, public)
- `Users can view validation rules in their organizations` (SELECT, public)

### 14. forms ✅
**RLS Status:** ✅ ENABLED  
**Policies:**
- `Allow anonymous mobile QR access to forms` (SELECT, anon)
- `Allow mobile anonymous access to forms` (ALL, public)
- `Users with proper roles can manage forms` (ALL, public)

### 15. formula_templates
**RLS Status:** ❌ DISABLED  
**Policies:**
- `Allow anonymous mobile QR access to formula_templates` (SELECT, anon)
- `Allow anonymous read access to formula_templates for mobile QR` (SELECT, anon)
- `Users can create templates for their organization` (INSERT, public)
- `Users can update their organization's templates` (UPDATE, public)
- `Users can view their org templates and public templates` (SELECT, public)

### 16. formula_usage_analytics
**RLS Status:** ❌ DISABLED  
**Policies:**
- `Allow anonymous mobile QR access to formula_usage_analytics` (SELECT, anon)
- `Users can insert formula usage for their organization` (INSERT, public)
- `Users can view formula usage for their organization` (SELECT, public)

### 17. inventory_corrections
**RLS Status:** ❌ DISABLED  
**Policies:**
- `Users can create corrections in their organization` (INSERT, public)
- `Users can view corrections in their organization` (SELECT, public)

### 18. inventory_history ✅
**RLS Status:** ✅ ENABLED  
**Policies:**
- `Allow anonymous insert to inventory_history for mobile QR` (INSERT, anon)
- `Allow anonymous mobile QR inventory history` (INSERT, anon)
- `Allow authenticated users to select inventory history in their` (SELECT, authenticated)
- `Users can insert inventory history for their organization` (INSERT, public)

### 19. inventory_items ✅
**RLS Status:** ✅ ENABLED  
**Policies:**
- `Allow anonymous mobile QR access to inventory_items` (SELECT, anon)
- `Allow anonymous mobile QR inventory creation` (INSERT, anon)
- `Allow anonymous mobile QR inventory updates` (UPDATE, anon)
- `Allow anonymous update to inventory_items for mobile QR` (UPDATE, anon)
- `Users can delete inventory items in their organization` (DELETE, public)
- `Users with proper roles can manage inventory items` (ALL, public)

### 20. inventory_price_history
**RLS Status:** ❌ DISABLED  
**Policies:**
- `Allow anonymous mobile QR access to inventory_price_history` (SELECT, anon)
- `Allow organization admins to insert inventory price history` (INSERT, public)
- `Allow organization members to read inventory price history` (SELECT, public)

### 21. inventory_transactions
**RLS Status:** ❌ DISABLED  
**Policies:**
- `System can insert transaction logs` (INSERT, public)
- `Users can view transaction logs for their org inventory` (SELECT, public)

### 22. locations
**RLS Status:** ❌ DISABLED  
**Policies:**
- `Users can view their organization locations` (SELECT, public)
- `Users with proper roles can manage locations` (ALL, public)

### 23. mapped_fields
**RLS Status:** ❌ DISABLED  
**Policies:**
- `Allow anonymous mobile QR access to mapped_fields` (SELECT, anon)
- `Allow anonymous read access to mapped_fields for mobile QR` (SELECT, anon)
- `Organization admins and owners can create mapped fields` (INSERT, public)
- `Organization admins and owners can delete mapped fields` (DELETE, public)
- `Organization admins and owners can update mapped fields` (UPDATE, public)
- `Organization members can view mapped fields` (SELECT, public)

### 24. mobile_debug_logs
**RLS Status:** ❌ DISABLED  
**Policies:**
- `Allow anonymous mobile debug log insertion` (INSERT, anon)
- `Allow authenticated mobile debug log reading` (SELECT, public)
- `Allow mobile anonymous access to mobile_debug_logs` (ALL, public)

### 25. organization_invitations
**RLS Status:** ❌ DISABLED  
**Policies:**
- `Org admins can delete invitations for their org` (DELETE, public)
- `Org admins can insert invitations for their org` (INSERT, public)
- `Org admins can select invitations for their org` (SELECT, public)
- `Users can select their own pending invitations` (SELECT, public)

### 26. organization_members
**RLS Status:** ❌ DISABLED  
**Policies:**
- `Admins can manage organization members` (ALL, authenticated)
- `Allow anonymous mobile QR access to organization_members` (SELECT, anon)
- `Authenticated users can view all members` (SELECT, public)
- `Platform operators can delete members` (DELETE, public)
- `Platform operators can insert members` (INSERT, public)
- `Super admins can manage all org members` (ALL, authenticated)
- `Users can update own membership` (UPDATE, public)
- `Users can view their own memberships` (SELECT, authenticated)

### 27. organizations
**RLS Status:** ❌ DISABLED  
**Policies:**
- `Allow anonymous mobile QR access to organizations` (SELECT, anon)
- `Enable delete for organization owners` (DELETE, public)
- `Enable insert for authenticated users` (INSERT, public)
- `Enable read access for authenticated users` (SELECT, public)
- `Enable update for organization members` (UPDATE, public)
- `Super admins can manage all organizations` (ALL, public)
- `Users can create organizations` (INSERT, authenticated)
- `Users can view their organizations` (SELECT, authenticated)
- `Users with admin role can manage organizations` (ALL, authenticated)

### 28. platform_operators
**RLS Status:** ❌ DISABLED  
**Policies:**
- `Allow users to check their platform operator status` (SELECT, public)

### 29. profiles ✅
**RLS Status:** ✅ ENABLED  
**Policies:**
- `Allow anonymous PIN lookup for mobile QR` (SELECT, anon)
- `Allow mobile anonymous access to profiles` (ALL, public)
- `Users can select their own profile` (SELECT, public)

### 30. qr_scan_sessions
**RLS Status:** ❌ DISABLED  
**Policies:**
- `Users can create own sessions` (INSERT, public)
- `Users can update own sessions` (UPDATE, public)
- `Users can view own sessions` (SELECT, public)

### 31. report_cache
**RLS Status:** ❌ DISABLED  
**Policies:**
- `Users can access cache for their organization` (ALL, public)

### 32. report_runs
**RLS Status:** ❌ DISABLED  
**Policies:**
- `Users can insert report runs for their organization` (INSERT, public)
- `Users can view report runs for their organization` (SELECT, public)

### 33. reports
**RLS Status:** ❌ DISABLED  
**Policies:**
- `Users can view their organization reports` (SELECT, public)
- `Users with proper roles can manage reports` (ALL, public)

### 34. slow_query_log
**RLS Status:** ❌ DISABLED  
**Policies:**
- `Users can view slow queries for their organization` (SELECT, public)

### 35. system_logs
**RLS Status:** ❌ DISABLED  
**Policies:**
- `Authenticated users can create logs` (INSERT, public)

### 36. system_roles
**RLS Status:** ❌ DISABLED  
**Policies:**
- `Allow read access to system_roles for authenticated users` (SELECT, public)

### 37. user_creation_requests
**RLS Status:** ❌ DISABLED  
**Policies:**
- `Admins can manage user creation requests` (ALL, public)

### 38. user_password_requirements
**RLS Status:** ❌ DISABLED  
**Policies:**
- `Users can update their own password requirements` (UPDATE, public)
- `Users can view their own password requirements` (SELECT, public)

### 39. users
**RLS Status:** ❌ DISABLED  
**Policies:**
- `Allow anonymous mobile QR access to users` (SELECT, anon)
- `Authenticated users can select from public users` (SELECT, public)
- `Users can update their own data.` (UPDATE, public)
- `Users can view their own user data.` (SELECT, public)

---

## Storage Bucket Policies

### storage.objects
**Policies:**
- `Anyone can view avatars` (SELECT, public) - buckets: avatars, org-avatars
- `Authenticated users can upload avatars` (INSERT, public)
- `Organization members can delete own files` (DELETE, authenticated) - bucket: form-uploads
- `Organization members can read files` (SELECT, authenticated) - bucket: form-uploads
- `Organization members can update own files` (UPDATE, authenticated) - bucket: form-uploads
- `Organization members can upload files` (INSERT, authenticated)
- `Users can delete their own avatars` (DELETE, public) - buckets: avatars, org-avatars
- `Users can update and delete their own avatars` (UPDATE, public) - buckets: avatars, org-avatars

---

## Key Security Functions Used

The policies reference these important security functions:
- `get_current_organization_id()` - Gets current user's organization
- `is_org_admin(organization_id)` - Checks if user is org admin
- `is_org_member(organization_id)` - Checks if user is org member
- `is_system_admin()` - Checks if user is system admin
- `is_current_user_org_admin(organization_id)` - Checks if current user is org admin
- `auth.uid()` - Gets current user ID
- `auth.role()` - Gets current user role

---

## Mobile Workflow - Path Forward

Our recent efforts to fix the mobile inventory submission revealed critical issues with both the RLS policies and the application's architecture. The following is a summary of our findings and a recommended action plan.

### 1. The Core Problem: RLS & Anonymous Users

The root cause of the mobile inventory failure was a combination of:
- **Overly Permissive RLS**: The `anon` role had broad `INSERT` and `UPDATE` permissions on critical tables, creating a major security vulnerability.
- **Authentication Mismatch**: The application was trying to treat anonymous, PIN-authenticated users the same as fully authenticated users, which caused database operations to fail.

### 2. The Solution: Lightweight Edge Function & PostgreSQL RPC

The most secure and reliable way to handle this is to move all database logic into a secure PostgreSQL function and use a lightweight Edge Function to handle requests.

**Edge Function (`simple-mobile-submit`):**
- **No heavy dependencies**: Bypasses the need for `supabase-js` and avoids cold start issues.
- **Minimal logic**: Simply validates the request and calls the RPC function.

**PostgreSQL RPC Function (`handle_mobile_submission`):**
- **Secure**: Runs with `SECURITY DEFINER` to allow for elevated permissions in a controlled environment.
- **Transactional**: All database operations (PIN verification, form submission, inventory update) are handled within a single, atomic transaction.
- **Centralized Logic**: Keeps all database logic in one place, making it easier to manage and secure.

### 3. Action Plan

1.  **Deploy the RPC Function:** The `supabase/migrations/20250828_mobile_submission_rpc.sql` file contains the `handle_mobile_submission` function. This needs to be deployed to your Supabase instance.
2.  **Deploy the Edge Function:** The `supabase/functions/simple-mobile-submit` directory contains the lightweight Edge Function. This needs to be deployed.
3.  **Update the Frontend:** The frontend needs to be updated to call the new `simple-mobile-submit` Edge Function. The `mobileInventoryService.ts` should be updated to handle this.
4.  **Fix Firebase Deployment Issues:**
    - **Add a Build Stamp**: Add a visible build timestamp or Git commit hash to the UI. This will allow us to instantly verify which version of the code is live.
    - **Review `firebase.json`**: Ensure that caching headers are set correctly. HTML files should have `no-cache` headers, while versioned assets (like our `index-[hash].js` files) can have long-lived caches.

---

## CRITICAL ACTION REQUIRED

**The main security issue is that 33 out of 39 tables have RLS policies defined but RLS is not enabled.** 

To fix this, each table needs:
```sql
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
```

This baseline document preserves the current working state before any changes are made.
