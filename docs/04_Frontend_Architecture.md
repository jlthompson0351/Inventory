# 04 Frontend Architecture (Updated August 2025)

This document provides a high-level overview of the frontend architecture for the BarcodEx inventory management system.

---

## 🏗️ **Core Technologies**

-   **Framework**: **React 18**
-   **Build Tool**: **Vite**
-   **Styling**: **Tailwind CSS** with a custom theme and `shadcn/ui` components.
-   **Routing**: **React Router** for all client-side routing.
-   **State Management**:
    -   **Server State**: **TanStack Query (React Query)** for fetching, caching, and managing server state.
    -   **Local State**: React's built-in `useState`, `useReducer`, and `useContext` hooks for local and shared component state.

---

## 📂 **Directory Structure**

The `src` directory is organized as follows:

-   **`components/`**: Contains reusable UI components, organized by feature (e.g., `components/asset`, `components/inventory`).
    -   **`components/ui/`**: Low-level, generic UI components (e.g., `Button`, `Input`), largely from `shadcn/ui`.
-   **`hooks/`**: Custom React hooks that encapsulate reusable logic (e.g., `useAuth`, `useOrganization`).
-   **`pages/`**: The top-level components that correspond to application routes (e.g., `Dashboard.tsx`, `Assets.tsx`).
-   **`services/`**: Modules that handle communication with the Supabase backend (e.g., `assetService.ts`, `inventoryService.ts`).
-   **`types/`**: TypeScript type definitions, including the auto-generated `database.types.ts` from Supabase.
-   **`lib/`**: General utility functions.

---

## 💨 **State Management & Data Flow**

-   **Server State (TanStack Query)**: This is the primary method for managing data from the Supabase backend. It handles caching, re-fetching, and optimistic updates, providing a robust and performant data layer.
-   **Global State**: There is no global state management library like Redux or Zustand. Instead, global context is provided through custom hooks like `useAuth` and `useOrganization`, which use React's `useContext` behind the scenes.
-   **Local Component State**: Simple component state is managed with `useState`. More complex, co-located state is managed with `useReducer`.

---

## 🎨 **Styling & UI**

-   **Tailwind CSS**: The entire application is styled with Tailwind CSS, using a utility-first approach.
-   **`shadcn/ui`**: A collection of accessible and customizable UI components is used as the foundation for the design system. These are located in `src/components/ui`.
-   **Custom Components**: More complex, application-specific components are built on top of the `shadcn/ui` primitives and are located in `src/components/{feature}`.

---

This document provides a high-level architectural overview. For more detailed information on specific features, please refer to the documentation in the `05_Features/` directory.

















