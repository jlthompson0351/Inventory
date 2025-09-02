# Mobile QR Workflow Troubleshooting Playbook

**Document Purpose:** This document is a comprehensive record of the debugging process used to solve the mobile QR inventory submission failures in September 2025. If this workflow breaks in the future, follow the steps in this playbook to quickly diagnose and resolve the issue.

---

## 1. Executive Summary

- **The Problem:** The mobile QR workflow was failing, preventing users from submitting inventory.
- **Initial Hypothesis (Incorrect):** Supabase Row Level Security (RLS) policies were believed to be the cause.
- **The Real Root Cause:** The `profiles` table in the database was **missing the `organization_id` column**. This meant that while PIN authentication worked, the mobile session had no organization context, causing all subsequent database operations to fail for the user.
- **The Solution:** A database migration was applied to add the `organization_id` column to the `profiles` table and populate it for existing users.
- **Key Tool:** A built-in **Diagnostic Tool** was created at the `/mobile-test/asset/:assetId` route to systematically test every step of the workflow, which was essential in identifying the true root cause.

---

## 2. The Investigation Journey: A Step-by-Step History

### Step 1: Initial Analysis & Incorrect Hypothesis (RLS Policies)

The investigation began with the assumption that the issue was related to Supabase RLS policies. The `RLS_AUDIT.md` document indicated that many policies were defined but not enabled, and the policies for the `anon` role seemed like a likely culprit.

**Conclusion:** This was a **false lead**. While the RLS setup had some unrelated issues (like disabled policies on non-critical tables), the core policies for the mobile workflow were actually correct.

### Step 2: Creating a Diagnostic Test

To prove or disprove the RLS theory, a standalone HTML file (`mobile-workflow-test.html`) was created. This tool was designed to perform the exact same database operations as the mobile application, but in a controlled environment.

- **Initial Failure:** The first version of the test failed with an **"Invalid API key"** error because it was hardcoded with an old key.
- **Success:** After updating the API key, the test **ran successfully**, proving that all database operations (reads, inserts, updates, and RPC calls) worked perfectly for a purely anonymous user.

**Key Takeaway:** The database and RLS policies were **not the problem**. The issue had to be somewhere in the application logic or the context it was providing.

### Step 3: The Critical Insight (The "Aha!" Moment)

The user correctly pointed out a flaw in the testing logic:
> "did you run these test as an ananumis users as when the user uses there pin it takes them to the form but not in the a pp as the user is not farified in the sysytem."

This was the "Aha!" moment. The application workflow was not purely anonymous. It was a hybrid state:
1.  The user authenticates via a PIN.
2.  The application creates a temporary session object in the frontend containing the user's ID and (supposedly) their `organization_id`.
3.  The user remains on the `anon` role in Supabase but passes the `user_id` from the session to the database.

### Step 4: Discovering the Real Root Cause

The diagnostic test was updated to simulate this exact PIN-authenticated workflow. The test immediately failed with a clear error:

```
⚠️ Organization mismatch detected!
Mobile session org: undefined
Asset/Form org: d1c96b17-879d-4aa5-b6d4-ff3aea68aced
```

This proved the `organization_id` was `undefined` in the mobile session. A quick database schema check confirmed why: the `profiles` table **did not have an `organization_id` column.**

### Step 5: The Fix

A simple database migration was the solution.

**The SQL Fix:**
```sql
-- 1. Add the missing column
ALTER TABLE profiles ADD COLUMN organization_id uuid;

-- 2. Add a foreign key to ensure data integrity
ALTER TABLE profiles 
ADD CONSTRAINT profiles_organization_id_fkey 
FOREIGN KEY (organization_id) REFERENCES organizations(id);

-- 3. Populate the column for existing mobile users
UPDATE profiles 
SET organization_id = 'd1c96b17-879d-4aa5-b6d4-ff3aea68aced' -- Example Org ID
WHERE quick_access_pin IS NOT NULL;
```

This instantly solved the problem.

### Step 6: Creating a Permanent Diagnostic Tool

The logic from the successful standalone test file was used to replace the old, non-functional in-app mobile testing page at `src/pages/MobileTestWorkflow.tsx`. This provides a permanent, integrated tool for future debugging.

---

## 3. How to Troubleshoot in the Future

If the mobile QR workflow breaks again, follow these steps:

1.  **DO NOT ASSUME IT IS AN RLS ISSUE.** Our investigation proved the RLS policies are sound. The problem is more likely related to data context or database schema.

2.  **Use the Built-in Diagnostic Tool:**
    *   Navigate to the QR code generation page for any asset.
    *   Click the **"Mobile"** or **"Test"** button. This will open the diagnostic tool at `/mobile-test/asset/[asset-id]`.
    *   Click **"Run Full Diagnostic Test"**.

3.  **Analyze the Results:**
    *   Look for the **first red ❌ error**. This will pinpoint the exact step that is failing.
    *   Pay close attention to the **"PIN Authentication"** step. Check for "Organization mismatch" or "Profile missing organization_id" warnings.
    *   Expand the details (`<details>`) of any failed step to see the raw error messages and data.

4.  **Consult This Document:** Compare the errors you see with the history described here. The root cause is likely similar—a mismatch in data or an incomplete database schema.

This playbook should provide any future developer or AI assistant with the context and tools needed to resolve this issue in minutes, not weeks.
