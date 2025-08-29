# 01 System Overview (Updated August 2025)

This document provides a high-level overview of the BarcodEx inventory management system, its architecture, and its core features.

---

## 🎯 **Core Purpose**

BarcodEx is an enterprise-grade inventory management system designed for organizations that need to track physical assets with precision and efficiency. Its key features include:

-   **Asset & Inventory Tracking**: A robust system for managing assets, their types, and real-time inventory levels.
-   **Barcode & QR Code Integration**: A complete system for generating, printing, and scanning barcodes and QR codes to streamline asset management.
-   **Mobile-First Field Operations**: A secure, PIN-based mobile workflow for performing inventory checks and data entry in the field.
-   **Dynamic Forms**: A flexible form builder for creating custom data collection templates for different asset types.
-   **Advanced Reporting**: A powerful reporting engine with data visualization to provide insights into inventory levels and asset history.

---

## 🏗️ **System Architecture**

BarcodEx is built on a modern, scalable tech stack:

-   **Frontend**: A single-page application (SPA) built with **React** and **Vite**.
-   **Backend**: A serverless backend powered by **Supabase**, which provides:
    -   A **PostgreSQL** database for data storage.
    -   **Authentication** for user management.
    -   **Row-Level Security (RLS)** for data isolation between organizations.
    -   **Storage** for file uploads (e.g., avatars).
-   **Deployment**: The application is deployed to **Firebase Hosting**, providing a global CDN, SSL, and automated deployments via GitHub Actions.

---

## 📂 **Documentation Structure**

This documentation is organized into a series of comprehensive guides:

-   **`01_System_Overview.md`**: (This document) A high-level introduction to the application.
-   **`02_Deployment_Guide.md`**: Instructions for building, previewing, and deploying the application.
-   **`03_Supabase_Backend.md`**: A detailed overview of the backend architecture, including the data model, security, and API.
-   **`04_Frontend_Architecture.md`**: An overview of the frontend codebase, including state management, component structure, and key libraries.
-   **`05_Features/`**: A directory containing detailed documentation for each of the core features of the application.

This consolidated structure is designed to be the single source of truth for the application, for both human developers and AI agents.








