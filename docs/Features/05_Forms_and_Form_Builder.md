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







