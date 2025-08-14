# Supabase Security: RLS Policies (Updated August 2025)

**Status**: 🚨 **CRITICAL SECURITY VULNERABILITIES IDENTIFIED**

This document provides a complete and accurate overview of the Row-Level Security (RLS) policies implemented in the BarcodEx Supabase backend. It is intended to be the single source of truth for all data access rules.

---

## 🚨 **CRITICAL ALERT: Insecure Anonymous Access**

As of the latest review, several tables contain RLS policies that grant excessive permissions to anonymous users. These policies create **critical security vulnerabilities** that could lead to unauthorized data access, modification, and deletion across all organizations.

**This is not a theoretical risk. The current policies actively expose your data.**

---

## 🔒 **RLS Policy Breakdown by Table**

### `assets`

| Policy Name                                    | Permissive | Roles      | Command | Qualifier                                           | With Check                                        | **Analysis**                                                                                                        |
| ---------------------------------------------- | ---------- | ---------- | ------- | --------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Allow anonymous mobile QR access to assets** | PERMISSIVE | `{anon}`   | SELECT  | `true`                                              | `null`                                            | 🚨 **CRITICAL**: Allows anonymous users to **read any asset in any organization**.                                    |
| **Allow anonymous update to assets for mobile QR** | PERMISSIVE | `{anon}`   | UPDATE  | `true`                                              | `true`                                            | 🚨 **CRITICAL**: Allows anonymous users to **update any asset in any organization**.                                  |
| Users can delete assets in their organization  | PERMISSIVE | `{public}` | DELETE  | `(organization_id = get_current_organization_id())` | `null`                                            | ✅ **Secure**: Correctly scoped to the user's organization.                                                         |
| Users can insert assets in their organization  | PERMISSIVE | `{public}` | INSERT  | `null`                                              | `(organization_id = get_current_organization_id())` | ✅ **Secure**: Correctly scoped to the user's organization.                                                         |
| Users can update assets in their organization  | PERMISSIVE | `{public}` | UPDATE  | `(organization_id = get_current_organization_id())` | `(organization_id = get_current_organization_id())` | ✅ **Secure**: Correctly scoped to the user's organization.                                                         |
| Users can view assets in their organization    | PERMISSIVE | `{public}` | SELECT  | `(organization_id = get_current_organization_id())` | `null`                                            | ✅ **Secure**: Correctly scoped to the user's organization.                                                         |

### `inventory_history`

| Policy Name                                              | Permissive | Roles      | Command | With Check                                                                                               | **Analysis**                                                                                                           |
| -------------------------------------------------------- | ---------- | ---------- | ------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Allow anonymous insert to inventory_history for mobile QR** | PERMISSIVE | `{anon}`   | INSERT  | `true`                                                                                                   | 🚨 **CRITICAL**: Allows anonymous users to **insert arbitrary records** into the inventory history for any organization. |
| Users can manage inventory history in their organization | PERMISSIVE | `{public}` | ALL     | `(organization_id IN ( SELECT organization_members.organization_id FROM organization_members WHERE (organization_members.user_id = auth.uid())))` | ✅ **Secure**: Correctly scoped to the user's organization.                                                            |

### `profiles`

| Policy Name                               | Permissive | Roles      | Command | Qualifier                                              | **Analysis**                                                                                                                                      |
| ----------------------------------------- | ---------- | ---------- | ------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Allow anonymous PIN lookup for mobile QR** | PERMISSIVE | `{anon}`   | SELECT  | `((quick_access_pin IS NOT NULL) AND (is_deleted = false))` | ⚠️ **RISK**: Allows for the enumeration of users who have a `quick_access_pin` enabled, which could be a security risk. This should be removed. |
| Users can select their own profile        | PERMISSIVE | `{public}` | SELECT  | `(auth.uid() = id)`                                    | ✅ **Secure**: Users can only access their own profile.                                                                                           |
| Users can update their own profile        | PERMISSIVE | `{public}` | UPDATE  | `(auth.uid() = id)`                                    | ✅ **Secure**: Users can only update their own profile.                                                                                           |

---

##  remediation Plan

The insecure RLS policies for anonymous users must be **removed and replaced immediately**. The mobile QR workflow needs to be redesigned to use a secure authentication method, such as a short-lived session token obtained through a secure RPC call.

Refer to `docs/MOBILE-QR-PIN-WORKFLOW.md` for a detailed remediation plan.
