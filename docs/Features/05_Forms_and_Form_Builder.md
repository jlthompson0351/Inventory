# 05.05 Forms & Form Builder (Updated August 2025)

This document provides a detailed overview of the dynamic forms system in the BarcodEx application.

---

## 🏗️ **Core Concepts**

-   **Dynamic Forms**: The system allows for the creation of custom form templates to collect data for different asset types and purposes (e.g., intake, monthly inventory).
-   **Formula Fields**: Forms can include fields whose values are automatically calculated based on other fields in the form.
-   **Secure Evaluation**: All formula calculations are performed securely, without the use of `eval()`.

---

## 🔑 **Key Features**

-   **Form Builder UI**: A visual interface for creating and editing form templates.
-   **Asset Type Integration**: Forms are linked to asset types, so the correct form is automatically loaded for a given asset.
-   **Secure Formula Engine**: A safe formula evaluator (`src/lib/formulaEvaluator.ts`) handles all calculations.
-   **Submission Auditing**: All form submissions are stored in the `form_submissions` table and linked to the `inventory_history` for a complete audit trail.

---

## 🏛️ **Calculation Architecture**

To ensure accuracy, performance, and maintainability, the form calculation system operates on a two-tier model:

1.  **Frontend (Real-time Preview)**:
    *   **Technology**: `Math.js` (via the `safeEvaluator.ts` utility).
    *   **Purpose**: Provides immediate, real-time feedback to the user as they enter data into forms. This happens client-side within the `FormRenderer.tsx` and `DynamicForm.tsx` components.
    *   **Behavior**: This is for **preview only**. The results of this calculation are not considered authoritative and are not what is ultimately saved.

2.  **Backend (Authoritative Calculation)**:
    *   **Technology**: PostgreSQL Function (`calculate_form_formulas`).
    *   **Purpose**: Acts as the single source of truth for all formula calculations. When a form is submitted, the backend services (e.g., `assetInventoryService.ts`) call this database RPC function.
    *   **Behavior**: The database function re-evaluates all formulas using the submitted data and any relevant asset metadata. The result from this function is what is stored in the `inventory_history` and is considered the final, correct value.

**This architecture prevents data drift, eliminates duplicate backend logic, and leverages the performance of PostgreSQL for complex calculations.**

---

## 📂 **Code Implementation**

-   **Frontend Service**: `formService.ts` (`src/services/formService.ts`)
-   **Key UI Components**:
    -   `FormBuilder.tsx` (`src/components/forms/FormBuilder.tsx`): The main UI for creating and editing forms.
    -   `DynamicForm.tsx` (`src/components/forms/DynamicForm.tsx`): Renders a form based on a JSON schema.
-   **Key Pages**:
    -   `Forms.tsx` (`src/pages/Forms.tsx`): The main page for managing form templates.
    -   `SubmitForm.tsx` (`src/pages/SubmitForm.tsx`): The page for filling out and submitting a form.

---

## 🗄️ **Database Model**

-   **`forms`**: Stores the JSON schema for each form template.
-   **`form_submissions`**: Stores the data for each submitted form.

For a complete schema, refer to `03_Supabase_Backend.md` and the auto-generated types in `src/types/database.types.ts`.







