# 02 Deployment Guide (Updated August 2025)

This document provides comprehensive instructions for building, previewing, and deploying the BarcodEx inventory management application.

---

## 🚀 **Quick Start Commands**

```bash
# 1. Build the application for production
npm run build

# 2. Preview the production build locally (starts on port 4173)
npm run preview

# 3. Deploy to Firebase hosting (requires Firebase login)
firebase deploy --only hosting
```

---

## ✅ **System Status & Pre-Deployment Checklist**

-   [x] **Vite Configuration**: Fully optimized for production.
-   [x] **Firebase Hosting**: Configured for the `inventorydepor` project.
-   [x] **Supabase Backend**: Connected to the `kxcubbibhofdvporfarj` project.
-   [x] **Security**: All `eval()` usage has been removed.
-   [x] **CI/CD**: GitHub Actions are configured for automated deployments.

---

## 🔧 **Environment Configuration**

-   **Production**: Your production environment is configured in `src/integrations/supabase/client.ts` with secure fallbacks.
-   **Local Development**: Use a `.env.local` file to override the production Supabase URL and anon key for local testing.

---

## 🚀 **Deployment Workflow**

### **Automated Deployment (Recommended)**
-   **Trigger**: A push to the `main` branch on GitHub.
-   **Process**: GitHub Actions will automatically build and deploy the application.
-   **URL**: **https://inventorydepor.web.app**

### **Manual Deployment**
1.  `npm run build`
2.  `firebase deploy --only hosting`

### **Local Testing**
1.  `npm run build`
2.  `npm run preview`
3.  Access at **http://localhost:4173**.

---

## 🐛 **Troubleshooting**

-   **Deployment Fails**: Run `firebase login` and ensure you have access to the `inventorydepor` project.
-   **Mobile QR Fails**: Check RLS policies in Supabase and ensure your Firebase hosting is configured for SPA rewrites.
-   **Data Issues**: Verify your local `.env.local` file is not overriding production variables during the build step.

---

This guide provides the essential information for deploying the application. For a more detailed breakdown of the underlying services, refer to `03_Supabase_Backend.md`.










