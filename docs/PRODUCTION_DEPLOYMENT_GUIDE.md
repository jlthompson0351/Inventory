# 🚀 Production Deployment Guide (Updated August 2025)

## 🎯 Quick Deploy Commands

```bash
# 1. Build the application for production
npm run build

# 2. Preview the production build locally (starts on port 4173)
npm run preview

# 3. Deploy to Firebase hosting (requires Firebase login)
firebase deploy --only hosting
```

---

## 📋 Pre-Deployment Checklist

### ✅ **System Status**
- [x] **Vite Configuration**: Optimized with chunk splitting and environment variable handling.
- [x] **Firebase Hosting**: Configured for the `inventorydepor` project.
- [x] **Supabase Backend**: `kxcubbibhofdvporfarj` project is live and connected.
- [x] **Security**: All `eval()` usage has been eliminated and replaced with a secure formula evaluator.
- [x] **Mobile QR Workflow**: Production-ready with PIN authentication and anonymous access.
- [x] **CI/CD**: GitHub Actions are configured for automated deployments on push to `main`.

### ⚠️ **Known Issues & Improvements**
- [ ] **Missing Registration UI**: No user registration link on the login page. **(HIGH PRIORITY)**
- [ ] **Broken 'Add User' Button**: Organization member invitation is non-functional. **(HIGH PRIORITY)**
- [ ] **Avatar Upload**: Test environment limitations prevent full validation. **(MEDIUM PRIORITY)**
- [ ] **ESLint Errors**: A significant number of `any` type warnings can be addressed. **(LOW PRIORITY)**

---

## 🔧 Environment Configuration

### **Production Environment Variables**
Your production environment is configured directly in your Supabase client initialization with secure fallbacks.

```typescript
// src/integrations/supabase/client.ts
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://kxcubbibhofdvporfarj.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your_fallback_anon_key'; // Replace with your actual anon key

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### **Local Development Overrides**
For local development, you can use a `.env.local` file to override these values:

```bash
# .env.local (this file is ignored by git)
VITE_SUPABASE_URL=your_local_or_staging_supabase_url
VITE_SUPABASE_ANON_KEY=your_local_or_staging_anon_key
```

---

## 🚀 Deployment Workflow

### **Option 1: Automated Deployment via GitHub Actions (Recommended)**
Your project is configured for continuous deployment. Simply push your changes to the `main` branch.

1.  **Commit and Push Changes**:
    ```bash
    git add .
    git commit -m "Your feature or fix description"
    git push origin main
    ```

2.  **Monitor Deployment**:
    -   Check the **Actions** tab in your GitHub repository.
    -   The workflow will automatically build and deploy your application to Firebase Hosting.

3.  **Verify Live**:
    -   Your application will be live at: **https://inventorydepor.web.app**

### **Option 2: Manual Deployment**
If you need to deploy manually, follow these steps:

1.  **Build the Project**:
    ```bash
    npm run build
    ```

2.  **Deploy to Firebase**:
    ```bash
    firebase deploy --only hosting
    ```

3.  **Verify**:
    -   Check the Firebase Hosting dashboard for the latest release.
    -   Visit your live URL to confirm the changes.

### **Option 3: Local Testing & Preview**
Before deploying, you can test the production build locally:

1.  **Build and Preview**:
    ```bash
    npm run build
    npm run preview
    ```

2.  **Access Locally**:
    -   The preview server will start on **http://localhost:4173**.

---

## 🔍 Key Configurations

### **Firebase Project**
-   **Project ID**: `inventorydepor`
-   **Hosting URL**: https://inventorydepor.web.app

### **Vite Build Configuration**
-   **Output Directory**: `dist`
-   **Performance**: Optimized with manual chunk splitting for faster load times.
-   **Security**: `eval()` has been completely removed.
-   **Environment**: Configured for production with secure fallbacks.

### **Supabase Backend**
-   **Project URL**: `https://kxcubbibhofdvporfarj.supabase.co`
-   **Security**: Row-Level Security (RLS) is enabled, with specific policies for anonymous mobile QR access.
-   **Database**: PostgreSQL with custom functions for barcode generation and asset management.

---

## 🐛 Troubleshooting Common Issues

### **Deployment Fails**
-   **Check Firebase Login**: Run `firebase login` to re-authenticate.
-   **Check Build Errors**: Run `npm run build` locally to see if there are any compilation errors.
-   **Clear Cache**: If you suspect caching issues, run:
    ```bash
    rm -rf node_modules dist && npm install && npm run build
    ```

### **Mobile QR Workflow Fails in Production**
-   **Check Routes**: Ensure the `/mobile/asset/:assetId` route is correctly configured in `src/App.tsx`.
-   **Check RLS Policies**: Verify that your anonymous access policies are enabled in the Supabase dashboard.
-   **Check Environment Variables**: Make sure your Vite config correctly injects the Supabase URL and anon key.

### **Data Not Loading on Dashboard**
-   **Check Database Schema**: As identified in our tests, there was a mismatch (`assets.asset_id` vs `assets.id`). Ensure your frontend queries match your database schema.
-   **Check RLS Policies**: Make sure authenticated users have the correct SELECT permissions on all required tables.
-   **Check Browser Console**: Look for any Supabase or network errors in the browser's developer tools.

---

## 🛠️ Monitoring & Maintenance

### **Firebase Console**
-   **Hosting**: Monitor deployments, traffic, and data usage.
-   **Performance**: Track your application's performance and Core Web Vitals.

### **Supabase Dashboard**
-   **Database Health**: Monitor query performance and database load.
-   **API Usage**: Keep an eye on your API request volume.
-   **Authentication**: Review user sign-ups and login activity.

### **GitHub Actions**
-   **Deployment Status**: Check the status of your automated deployment workflows.

---

## ✅ **Current Status**

-   **Deployment**: 🚀 **Automated & Production-Ready**
-   **Security**: 🔒 **Hardened & Secure**
-   **Performance**: ⚡ **Optimized for Production**

**Your application is in a solid state, with a reliable deployment process and a clear understanding of its current functional status.**

