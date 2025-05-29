# Complete Single Organization Migration Plan

## Overview
This document provides a step-by-step plan to complete the transition from multi-organization to single-organization support in the BarCodeX system.

## Current State Analysis

### Completed Changes
1. ✅ Removed `is_primary` column from `organization_members` (done in 20240900 migration)
2. ✅ Removed organization hierarchy columns (`parent_id`, `hierarchy_level`)
3. ✅ Removed organization switching UI components
4. ✅ Simplified auth to use `get_current_organization_id()` function
5. ✅ Created `user_organization` view for simplified lookups

### Remaining Issues
1. ❌ `is_mothership` column still exists in organizations table
2. ❌ Mothership-related functions and views still exist
3. ❌ Some RLS policies may still reference multi-org concepts
4. ❌ Asset type cloning between organizations still enabled
5. ❌ System admin features assume multiple organizations

## Migration Steps

### Step 1: Database Schema Changes

Create a new migration file: `20241231_complete_single_org_migration.sql`

```sql
-- Complete the transition to single organization support

-- 1. Remove mothership column and related functionality
ALTER TABLE organizations DROP COLUMN IF EXISTS is_mothership;

-- 2. Drop mothership-related functions
DROP FUNCTION IF EXISTS get_mothership_asset_types CASCADE;
DROP FUNCTION IF EXISTS clone_asset_type CASCADE;

-- 3. Simplify organization creation - remove multi-org checks
CREATE OR REPLACE FUNCTION create_organization_for_platform_admin(
  org_name TEXT,
  org_description TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_org_id UUID;
BEGIN
  -- Simply create the organization without multi-org checks
  INSERT INTO organizations (name, description)
  VALUES (org_name, org_description)
  RETURNING id INTO new_org_id;
  
  RETURN new_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Update RLS policies to remove any remaining multi-org logic
-- This would need to be done for each table that has RLS policies

-- 5. Drop unused views and functions
DROP VIEW IF EXISTS user_organizations CASCADE;
DROP FUNCTION IF EXISTS get_user_organizations CASCADE;

-- 6. Add constraint to ensure one organization per user
ALTER TABLE organization_members 
ADD CONSTRAINT one_org_per_user UNIQUE (user_id);

-- 7. Remove ability to delete organizations (since each user needs one)
CREATE OR REPLACE FUNCTION delete_organization(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RAISE EXCEPTION 'Organizations cannot be deleted in single-org mode';
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Step 2: Backend Code Changes

#### 2.1 Remove Mothership References

**Files to modify:**
- `/src/components/system-admin/SetupMothership.tsx` - Delete this file
- `/src/scripts/setupMothership.tsx` - Delete this file
- `/supabase/migrations/asset_types_mothership.sql` - Archive or delete

#### 2.2 Simplify Asset Type Management

**In `/src/pages/AssetTypes.tsx`:**
- Remove the "Mothership" view tab
- Remove any logic that shows asset types from other organizations
- Simplify to only show current organization's asset types

#### 2.3 Update System Admin Features

**In system admin components:**
- Remove organization listing/management features
- Focus on single organization configuration
- Remove cross-organization reporting

### Step 3: Frontend Code Changes

#### 3.1 Remove Multi-Org UI Elements

**Components to update:**
- Remove any organization selection dropdowns
- Remove organization switching logic
- Update navigation to remove org-switching options

#### 3.2 Simplify Authentication Flow

**In `/src/hooks/useAuth.tsx`:**
- Remove any logic that handles multiple organizations
- Simplify to always use the single organization
- Remove organization selection during signup

#### 3.3 Update User Profile

**In user profile components:**
- Remove organization membership management
- Remove ability to join/leave organizations
- Simplify to show single organization info

### Step 4: Update Business Logic

#### 4.1 Invitation System

**Update invitation flow:**
- Remove organization selection from invitations
- Always invite to the inviter's organization
- Simplify invitation acceptance

#### 4.2 Permissions System

**Simplify role checks:**
- Remove organization-specific role checks
- Make roles global within the single organization
- Update authorization logic

### Step 5: Data Migration

#### 5.1 Verify Data Integrity

```sql
-- Check that each user belongs to exactly one organization
SELECT user_id, COUNT(*) as org_count
FROM organization_members
GROUP BY user_id
HAVING COUNT(*) > 1;

-- If any users belong to multiple orgs, the 20240900 migration should have handled this
```

#### 5.2 Clean Up Orphaned Data

```sql
-- Remove any orphaned organization invitations
DELETE FROM organization_invitations
WHERE organization_id NOT IN (
  SELECT DISTINCT organization_id 
  FROM organization_members
);

-- Remove any orphaned data from other tables
-- (Add similar cleanup for other tables as needed)
```

### Step 6: Testing Plan

1. **Authentication Tests:**
   - Verify users can only see their single organization
   - Test that new users are properly assigned to an organization
   - Ensure invitation system works correctly

2. **Permission Tests:**
   - Verify role-based access control works
   - Test admin functions within single org context
   - Ensure no cross-org data leakage

3. **UI Tests:**
   - Confirm no multi-org UI elements remain
   - Test all workflows in single-org context
   - Verify no broken links to removed features

### Step 7: Documentation Updates

1. Update API documentation to reflect single-org model
2. Update user guides to remove multi-org references
3. Update developer documentation
4. Create migration guide for existing deployments

## Implementation Order

1. **Phase 1 - Backend Changes (Week 1)**
   - Create and run database migration
   - Update backend services
   - Remove mothership-related code

2. **Phase 2 - Frontend Changes (Week 2)**
   - Update UI components
   - Simplify authentication flow
   - Remove multi-org UI elements

3. **Phase 3 - Testing & Cleanup (Week 3)**
   - Comprehensive testing
   - Fix any issues discovered
   - Final cleanup of unused code

4. **Phase 4 - Documentation (Week 4)**
   - Update all documentation
   - Create deployment guide
   - Training materials if needed

## Rollback Plan

In case issues arise:

1. Keep backup of database before migration
2. Tag current code version before changes
3. Maintain feature flag to toggle between single/multi org modes
4. Have rollback migration script ready

## Success Criteria

- [ ] Each user belongs to exactly one organization
- [ ] No UI elements for organization switching remain
- [ ] All mothership functionality removed
- [ ] Simplified permission system working correctly
- [ ] All tests passing
- [ ] Documentation updated
- [ ] No references to multi-org in codebase (except historical migrations) 