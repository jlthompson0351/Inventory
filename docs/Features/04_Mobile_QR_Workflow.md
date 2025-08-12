# 05.04 Mobile QR Workflow (Updated August 2025)

This document provides a detailed overview of the mobile QR + PIN workflow in the BarcodEx application.

---

## 🏗️ **Core Concept**

This feature is a workflow for users in the field who need to perform inventory checks without a full login.

**🚨 WARNING: As of August 2025, this feature has a CRITICAL SECURITY VULNERABILITY and should NOT be used in production until remediated. The RLS policies are too permissive.**

---

## 🔑 **User Flow**

1.  **Scan QR Code**: A user scans a QR code on an asset, which directs them to `/mobile/asset/:assetId`.
2.  **Anonymous Asset View**: A read-only, mobile-optimized view of the asset's basic information is displayed. No login is required.
3.  **PIN Authentication**: To perform an action, the user must enter their personal 4-digit `quick_access_pin`.
4.  **Secure Actions**: After successful PIN validation, the user can submit forms and update inventory for a temporary session.

---

## 🔒 **Security Model (CURRENTLY INSECURE)**

-   **Limited Anonymous Access**: **This is not correctly implemented.** RLS policies currently allow anonymous users to view and edit data across all organizations.
-   **PIN-Gated Writes**: This is only enforced on the client-side, not on the database level, which is a significant security risk.
-   **Organization Scoping**: **This is not correctly implemented.** Anonymous users are not properly scoped to an organization.
-   **Full Audit Trail**: All actions are logged in the `inventory_history` table.

---

## 📂 **Code Implementation**

-   **Key Page**: `MobileAssetWorkflow.tsx` (`src/pages/MobileAssetWorkflow.tsx`) is the primary component for this entire flow.
-   **Database**: The `profiles` table contains the `quick_access_pin` column.
-   **RLS Policies**: A specific set of RLS policies on the `assets`, `asset_types`, and `profiles` tables enables this workflow.

For a detailed breakdown of the security vulnerabilities and the required fixes, please refer to the `MOBILE-QR-PIN-WORKFLOW.md` document in the main `docs` directory.

