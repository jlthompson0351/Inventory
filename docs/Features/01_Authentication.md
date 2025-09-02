# 05.01 Authentication (Updated August 2025)

This document provides a detailed overview of the authentication system in the BarcodEx inventory management application.

---

## 🏗️ **Core Technology**

-   **Provider**: **Supabase Auth** is used for all user authentication and management.
-   **Method**: The primary authentication method is email and password.

---

## 🔑 **Key Features**

-   **User Sign-up & Login**: Standard email and password authentication.
-   **Session Management**: Supabase's built-in session management handles JWTs automatically.
-   **Password Resets**: A "forgot password" flow is implemented.
-   **Mobile PIN Authentication**: A separate, PIN-based authentication flow is used for the mobile QR workflow.

---

## 📂 **Code Implementation**

-   **Supabase Client**: The Supabase client is initialized in `src/integrations/supabase/client.ts`.
-   **Auth Hook**: The `useAuth` hook (`src/hooks/useAuth.tsx`) provides a global context for the current user and session.
-   **UI Components**:
    -   `LoginForm.tsx` (`src/components/auth/LoginForm.tsx`)
    -   `RegisterForm.tsx` (`src/components/auth/RegisterForm.tsx`)
-   **Protected Routes**: The `AuthLayout.tsx` component (`src/components/auth/AuthLayout.tsx`) acts as a wrapper for routes that require authentication.

---

## 🔒 **Security**

-   **Row-Level Security (RLS)**: All backend data access is protected by RLS policies that are tied to the authenticated user's ID (`auth.uid()`).
-   **Password Policies**: Supabase's built-in password strength requirements are enforced.

---

## 📲 **Mobile QR Workflow Integration**

-   The mobile workflow uses a separate PIN-based authentication system. See `05_Features/04_Mobile_QR_Workflow.md` for more details.










