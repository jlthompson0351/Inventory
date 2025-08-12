# Mobile QR + PIN Workflow (Updated August 2025)

**Status**: 🚨 **CRITICAL SECURITY VULNERABILITY** - DO NOT USE IN PRODUCTION

This document explains the mobile QR + PIN workflow. This feature is currently **INSECURE** and deviates significantly from safe data handling practices. It was implemented to achieve a fast field workflow, but the current RLS policies expose the system to unauthorized data access and modification.

---

## 🎯 **What It Does (and the Security Risks)**

1.  **Scan a QR Code**: A user scans a QR code, loading `/mobile/asset/:assetId`.
2.  **Instant Asset View**: A mobile-optimized page loads with asset information.
    -   **🚨 VULNERABILITY**: The RLS policy for this step is `(true)`, meaning an anonymous user can view **ANY ASSET IN ANY ORGANIZATION** by simply knowing its ID.
3.  **PIN Authentication**: To perform an action, the user enters their 4-digit PIN.
    -   **⚠️ RISK**: The RLS policy allows anonymous users to query the `profiles` table to check for the existence of users with PINs, enabling potential user enumeration.
4.  **Insecure Actions**: After PIN validation, the user can submit forms.
    -   **🚨 VULNERABILITY**: The RLS policies for updating `assets` and inserting into `inventory_history` are also `(true)` for anonymous users. This means a malicious actor could potentially **UPDATE ANY ASSET** and **INSERT FAKE INVENTORY RECORDS** without being a member of the organization.

---

## 🔒 **Security Model & Mitigations (CURRENTLY INEFFECTIVE)**

The documentation *claimed* the security relied on a layered approach, but the implementation is flawed:

-   **Limited Anonymous Access**: **This is false.** RLS policies permit anonymous `SELECT` and `UPDATE` on the entire `assets` table and `INSERT` on `inventory_history`.
-   **PIN-Gated Write Operations**: While the UI requires a PIN, the backend RLS policies do not enforce this, rendering it a weak client-side deterrent.
-   **Organization Scoping**: **This is false.** There is no organization scoping on anonymous API calls.
-   **Full Audit Trail**: While actions are logged, the permissive policies mean the log could be populated with unauthorized or malicious data.

---

## 🛠️ **Technical Implementation (The Source of the Vulnerability)**

-   **Database**: The `profiles` table has a `quick_access_pin` column.
-   **RLS Policies**: The policies for `anon` users on `assets`, `inventory_history`, and `profiles` are dangerously permissive.

**Example of an Insecure Policy (`assets` table):**
-   `Allow anonymous mobile QR access to assets`: `USING (true)`
-   `Allow anonymous update to assets for mobile QR`: `WITH CHECK (true)`

---

## 🚨 **Immediate Action Required**

The current implementation is not secure. The following RLS policies must be implemented immediately to mitigate these vulnerabilities.

### **Corrected RLS Policies**

**1. For `assets` table:**

```sql
-- Anonymous users can ONLY read specific, non-sensitive columns of an asset.
CREATE POLICY "Allow anonymous mobile QR access to assets"
ON public.assets FOR SELECT
TO anon
USING (true);
-- NOTE: The above policy should be further restricted to specific columns if possible.

-- Users can only update assets within their own organization.
CREATE POLICY "Users can update assets in their own organization"
ON public.assets FOR UPDATE
USING (organization_id = get_current_organization_id())
WITH CHECK (organization_id = get_current_organization_id());
```

**2. For `inventory_history` table:**

```sql
-- Users can only insert inventory history for their own organization.
CREATE POLICY "Users can insert inventory history for their organization"
ON public.inventory_history FOR INSERT
WITH CHECK (organization_id = get_current_organization_id());
```

**3. For `profiles` table:**

```sql
-- Restrict anonymous PIN lookup to prevent user enumeration. This is complex and ideally
-- should be handled by a secure serverless function (`/rpc/verify_pin`).
-- A temporary, more secure RLS policy would be to at least scope it by organization if possible,
-- though this is difficult without an authenticated user.
-- The BEST solution is to remove this policy entirely and use an edge function.
```

---

This feature should be **disabled immediately** in any production or sensitive environment until these security issues are remediated. The convenience of the workflow does not outweigh the risk of unauthorized data access and manipulation.