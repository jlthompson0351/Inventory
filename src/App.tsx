import React, { Component, ErrorInfo, ReactNode, useEffect, lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import PageLayout from "./components/layout/PageLayout";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import LoadingScreen from "./components/common/LoadingScreen";
import ErrorBoundary from "./components/common/ErrorBoundary";
import FormErrorBoundary from "./components/common/FormErrorBoundary";
// Lazy load pages for better performance
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Inventory = lazy(() => import("./pages/Inventory"));
const NewItem = lazy(() => import("./pages/NewItem"));
const BarcodeScanner = lazy(() => import("./pages/BarcodeScanner"));
const Forms = lazy(() => import("./pages/Forms"));
const FormBuilder = lazy(() => import("./pages/FormBuilder"));
const FormDetail = lazy(() => import("./pages/FormDetail"));
const AssetTypes = lazy(() => import("./pages/AssetTypes"));
const Assets = lazy(() => import("./pages/Assets"));
const NewAsset = lazy(() => import("./pages/NewAsset"));
const AssetDetail = lazy(() => import("./pages/AssetDetail"));
const AssetQRManager = lazy(() => import("./pages/AssetQRManager"));
const Reports = lazy(() => import("./pages/Reports"));
const ReportBuilder = lazy(() => import("./pages/ReportBuilder"));
const Login = lazy(() => import("./pages/Login"));
const NotFound = lazy(() => import("./pages/NotFound"));
const OrganizationAdminPage = lazy(() => import("./pages/OrganizationAdminPage"));
const Profile = lazy(() => import("./pages/Profile"));
const AppSettings = lazy(() => import("./pages/AppSettings"));
const OrganizationMembers = lazy(() => import("./pages/OrganizationMembers"));
const InvitationAccept = lazy(() => import("./pages/InvitationAccept"));
const AdminDebugPanel = lazy(() => import("./pages/AdminDebugPanel"));
const FormPreview = lazy(() => import("./pages/FormPreview"));
const AssetTypeDetail = lazy(() => import("./pages/AssetTypeDetail"));
const AssetTypeEdit = lazy(() => import("./pages/AssetTypeEdit"));
const InventoryItemDetail = lazy(() => import("./pages/InventoryItemDetail").then(m => ({ default: m.InventoryItemDetail })));
const EditInventoryItem = lazy(() => import("./pages/EditInventoryItem").then(m => ({ default: m.EditInventoryItem })));
const ScanAsset = lazy(() => import('./pages/ScanAsset'));
const BarcodeDemo = lazy(() => import("./pages/BarcodeDemo"));
const SubmitForm = lazy(() => import("./pages/SubmitForm"));
const InventoryCheck = lazy(() => import("./pages/InventoryCheck"));
const QRScanHandler = lazy(() => import("./pages/QRScanHandler"));
const MobileAssetWorkflow = lazy(() => import("./pages/MobileAssetWorkflow"));

// New inventory workflow pages - lazy loaded
const InventoryAddSelectionPage = lazy(() => import("./pages/InventoryAddSelection"));
const AssetTypeBrowserPage = lazy(() => import("./pages/AssetTypeBrowser"));
const AssetListByTypePage = lazy(() => import("./pages/AssetListByType"));
const DynamicInventoryFormPage = lazy(() => import("./pages/DynamicInventoryForm"));
const AddInventoryPage = lazy(() => import("./pages/AddInventoryPage"));
const AddInventoryForAssetPage = lazy(() => import("./pages/AddInventoryForAssetPage"));
const InventoryActionSelectorPage = lazy(() => import("./pages/InventoryActionSelectorPage"));
const InventoryHistory = lazy(() => import("./pages/InventoryHistory"));



// Create a new query client for React Query
const queryClient = new QueryClient();

/**
 * AppRoutes Component
 * 
 * Main route configuration component that handles authentication state
 * and renders appropriate routes based on user login status.
 */
const AppRoutes = () => {
  const { user, loading } = useAuth();
  
  useEffect(() => {
    if (loading) {
      console.log("Auth: Loading user data");
    } else {
      console.log("Auth: User " + (user ? "logged in" : "logged out"));
    }
  }, [user, loading]);

  // Show loading screen while authentication is being checked
  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        {/* Public routes - accessible without login */}
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
        <Route path="/invitation" element={<InvitationAccept />} />
        <Route path="/qr/:code" element={<QRScanHandler />} />
        
        {/* Mobile QR Workflow - accessible without traditional login (uses PIN) */}
        <Route path="/mobile/asset/:assetId" element={<MobileAssetWorkflow />} />
        
        {/* Redirect organization-setup to dashboard - no longer needed in single organization mode */}
        <Route path="/organization-setup" element={user ? <Navigate to="/" /> : <Navigate to="/login" />} />
        
        {/* Redirect old system-admin to new organization-admin route */}
        <Route path="/system-admin" element={<Navigate to="/organization-admin" replace />} />
        
        {/* Protected admin routes */}
        <Route path="/organization-admin" element={user ? <OrganizationAdminPage /> : <Navigate to="/login" />} />
        
        {/* Main application routes - require authentication */}
        <Route path="/" element={user ? <PageLayout><Dashboard /></PageLayout> : <Navigate to="/login" />} />
        
        {/* Inventory Management Routes */}
        <Route path="/inventory" element={user ? <PageLayout><Inventory /></PageLayout> : <Navigate to="/login" />} />
        
        {/* Legacy routes redirected to new inventory workflow */}
        <Route path="/inventory/new" element={<Navigate to="/inventory/add" replace />} />
        <Route path="/inventory/scan" element={<Navigate to="/inventory/add" replace />} />
        <Route path="/scan" element={<Navigate to="/inventory/add" replace />} />
        
        {/* New inventory workflow routes */}
        <Route path="/inventory/add" element={user ? <PageLayout><ErrorBoundary context="Inventory Selection"><InventoryAddSelectionPage /></ErrorBoundary></PageLayout> : <Navigate to="/login" />} />
        <Route path="/inventory/action/:assetId" element={user ? <PageLayout><ErrorBoundary context="Inventory Actions"><InventoryActionSelectorPage /></ErrorBoundary></PageLayout> : <Navigate to="/login" />} />
        <Route path="/inventory/add/:assetId" element={user ? <PageLayout><ErrorBoundary context="Add Inventory"><AddInventoryPage /></ErrorBoundary></PageLayout> : <Navigate to="/login" />} />
        <Route path="/inventory/add-for-asset/:assetId" element={user ? <PageLayout><ErrorBoundary context="Asset Inventory"><AddInventoryForAssetPage /></ErrorBoundary></PageLayout> : <Navigate to="/login" />} />
        <Route path="/inventory/browse-assets" element={user ? <PageLayout><AssetTypeBrowserPage /></PageLayout> : <Navigate to="/login" />} />
        <Route path="/inventory/asset-type/:assetTypeId" element={user ? <PageLayout><AssetListByTypePage /></PageLayout> : <Navigate to="/login" />} />
        <Route path="/inventory/item/:id" element={user ? <PageLayout><InventoryItemDetail /></PageLayout> : <Navigate to="/login" />} />
        <Route path="/inventory/:inventoryItemId/history" element={user ? <PageLayout><InventoryHistory /></PageLayout> : <Navigate to="/login" />} />
        <Route path="/inventory/edit/:id" element={user ? <PageLayout><EditInventoryItem /></PageLayout> : <Navigate to="/login" />} />
        
        {/* Form Management Routes */}
        <Route path="/forms" element={user ? <PageLayout><Forms /></PageLayout> : <Navigate to="/login" />} />
        <Route path="/forms/new" element={user ? <PageLayout><FormErrorBoundary formName="Form Builder"><FormBuilder /></FormErrorBoundary></PageLayout> : <Navigate to="/login" />} />
        <Route path="/forms/edit/:id" element={user ? <PageLayout><FormErrorBoundary formName="Form Builder"><FormBuilder /></FormErrorBoundary></PageLayout> : <Navigate to="/login" />} />
        <Route path="/forms/:id" element={user ? <PageLayout><FormErrorBoundary formName="Form Detail"><FormDetail /></FormErrorBoundary></PageLayout> : <Navigate to="/login" />} />
        <Route path="/forms/preview/:id" element={user ? <PageLayout><FormErrorBoundary formName="Form Preview"><FormPreview /></FormErrorBoundary></PageLayout> : <Navigate to="/login" />} />
        <Route path="/forms/submit/:id" element={<FormErrorBoundary formName="Form Submission"><FormSubmissionWrapper /></FormErrorBoundary>} />
        
        {/* Asset Type Management Routes */}
        <Route path="/asset-types" element={user ? <PageLayout><AssetTypes /></PageLayout> : <Navigate to="/login" />} />
        <Route path="/asset-types/:id" element={user ? <PageLayout><AssetTypeDetail /></PageLayout> : <Navigate to="/login" />} />
        <Route path="/asset-types/edit/:id" element={user ? <PageLayout><AssetTypeEdit /></PageLayout> : <Navigate to="/login" />} />
        
        {/* Asset Management Routes */}
        <Route path="/assets" element={user ? <PageLayout><Assets /></PageLayout> : <Navigate to="/login" />} />
        <Route path="/assets/new" element={user ? <PageLayout><NewAsset /></PageLayout> : <Navigate to="/login" />} />
        <Route path="/assets/:id" element={user ? <PageLayout><AssetDetail /></PageLayout> : <Navigate to="/login" />} />
        <Route path="/assets/:id/edit" element={user ? <PageLayout><NewAsset /></PageLayout> : <Navigate to="/login" />} />
        <Route path="/assets/:assetId/inventory-check" element={user ? <PageLayout><InventoryCheck /></PageLayout> : <Navigate to="/login" />} />
        <Route path="/assets/scan/:qrCode" element={user ? <PageLayout><ScanAsset /></PageLayout> : <Navigate to="/login" />} />
        <Route path="/assets/qr-manager" element={user ? <PageLayout><AssetQRManager /></PageLayout> : <Navigate to="/login" />} />
        
        {/* Reporting Routes */}
        <Route path="/reports" element={user ? <PageLayout><Reports /></PageLayout> : <Navigate to="/login" />} />
        <Route path="/reports/new" element={user ? <PageLayout><ErrorBoundary context="Report Builder"><ReportBuilder /></ErrorBoundary></PageLayout> : <Navigate to="/login" />} />
        <Route path="/reports/:id" element={user ? <PageLayout><ErrorBoundary context="Report Builder"><ReportBuilder /></ErrorBoundary></PageLayout> : <Navigate to="/login" />} />
        
        {/* User and Organization Settings Routes */}
        <Route path="/profile" element={user ? <PageLayout><Profile /></PageLayout> : <Navigate to="/login" />} />
        <Route path="/app-settings" element={user ? <PageLayout><AppSettings /></PageLayout> : <Navigate to="/login" />} />
        <Route path="/organization/members" element={user ? <PageLayout><OrganizationMembers /></PageLayout> : <Navigate to="/login" />} />
        
        {/* Utilities and Tools */}
        <Route path="/admin/debug" element={user ? <PageLayout><AdminDebugPanel /></PageLayout> : <Navigate to="/login" />} />
        <Route path="/barcode-tools" element={user ? <PageLayout><BarcodeDemo /></PageLayout> : <Navigate to="/login" />} />
        
        {/* Catch-all route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

/**
 * AppErrorBoundary Wrapper
 * 
 * Global error boundary wrapper using our improved ErrorBoundary component.
 * Catches unhandled errors in the React component tree and provides a
 * user-friendly error page with recovery options.
 */
const AppErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    context="application"
    showDetails={process.env.NODE_ENV === 'development'}
    onError={(error, errorInfo) => {
      console.error("GLOBAL ERROR CAUGHT:", error);
      console.error("Component Stack:", errorInfo.componentStack);
      
      // Here you could send to error reporting service
      // Example: Sentry.captureException(error, { extra: errorInfo });
    }}
  >
    {children}
  </ErrorBoundary>
);

/**
 * FormSubmissionWrapper Component
 * 
 * Handles authentication for form submissions from both:
 * 1. Traditional login users
 * 2. Mobile QR PIN authentication users
 */
const FormSubmissionWrapper = () => {
  const { user } = useAuth();
  const location = useLocation();
  
  // Check if user came from mobile QR workflow with valid PIN session
  const hasMobilePinAuth = location.state?.fromMobileQR && location.state?.authSession;
  
  // Allow access if either traditional auth OR mobile PIN auth
  if (user || hasMobilePinAuth) {
    return <PageLayout><SubmitForm /></PageLayout>;
  }
  
  return <Navigate to="/login" />;
};

/**
 * Main App Component
 * 
 * Root component that sets up providers and global configuration:
 * - Error Boundary for catching unhandled errors
 * - Query Client for data fetching
 * - Auth Provider for user authentication
 * - Toast and UI providers
 * - Router for navigation
 */
const App = () => {
  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
};

export default App;
