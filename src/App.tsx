import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import PageLayout from "./components/layout/PageLayout";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import NewItem from "./pages/NewItem";
import BarcodeScanner from "./pages/BarcodeScanner";
import Forms from "./pages/Forms";
import FormBuilder from "./pages/FormBuilder";
import FormDetail from "./pages/FormDetail";
import AssetTypes from "./pages/AssetTypes";
import Assets from "./pages/Assets";
import NewAsset from "./pages/NewAsset";
import AssetDetail from "./pages/AssetDetail";
import AssetQRManager from "./pages/AssetQRManager";
import Reports from "./pages/Reports";
import ReportBuilder from "./pages/ReportBuilder";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
// import SystemAdmin from "./pages/SystemAdmin"; // Old import
import OrganizationAdminPage from "./pages/OrganizationAdminPage"; // New import
import Profile from "./pages/Profile";
import AppSettings from "./pages/AppSettings";
import OrganizationMembers from "./pages/OrganizationMembers";
import InvitationAccept from "./pages/InvitationAccept";
import AdminDebugPanel from "./pages/AdminDebugPanel";
import EnhancedPlatformDashboard from "./pages/EnhancedPlatformDashboard";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import LoadingScreen from "./components/common/LoadingScreen";
import { usePasswordRequirement } from "./hooks/usePasswordRequirement";
import { ForcePasswordChange } from "./components/auth/ForcePasswordChange";
import FormPreview from "./pages/FormPreview";
import AssetTypeDetail from "./pages/AssetTypeDetail";
import AssetTypeEdit from "./pages/AssetTypeEdit";
import { InventoryItemDetail } from "./pages/InventoryItemDetail";
import { EditInventoryItem } from "./pages/EditInventoryItem";
import ScanAsset from './pages/ScanAsset';
import BarcodeDemo from "./pages/BarcodeDemo";
import SubmitForm from "./pages/SubmitForm";
import InventoryCheck from "./pages/InventoryCheck";
import QRScanHandler from "./pages/QRScanHandler";
import MobileAssetWorkflow from "./pages/MobileAssetWorkflow";

// New inventory workflow pages
import InventoryAddSelectionPage from "./pages/InventoryAddSelection";
import AssetTypeBrowserPage from "./pages/AssetTypeBrowser";
import AssetListByTypePage from "./pages/AssetListByType";
import DynamicInventoryFormPage from "./pages/DynamicInventoryForm";
import AddInventoryPage from "./pages/AddInventoryPage";
import AddInventoryForAssetPage from "./pages/AddInventoryForAssetPage";
import InventoryActionSelectorPage from "./pages/InventoryActionSelectorPage";
import InventoryHistory from "./pages/InventoryHistory";

import React, { Component, ErrorInfo, ReactNode, useEffect } from 'react';

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
  const { isPasswordChangeRequired, isLoading: isLoadingPasswordRequirement } = usePasswordRequirement();
  
  useEffect(() => {
    if (loading) {
      console.log("Auth: Loading user data");
    } else if (user) {
      console.log("Auth: User logged in");
    }
    // Only log significant changes, not every render
  }, [user, loading]);

  // Show loading screen while authentication is being checked
  if (loading || isLoadingPasswordRequirement) {
    return <LoadingScreen />;
  }

  // Show password change screen if user is logged in but needs to change password
  if (user && isPasswordChangeRequired) {
    return <ForcePasswordChange />;
  }

  return (
    <>
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
        <Route path="/platform-dashboard" element={user ? <PageLayout><EnhancedPlatformDashboard /></PageLayout> : <Navigate to="/login" />} />
        
        {/* Main application routes - require authentication */}
        <Route path="/" element={user ? <PageLayout><Dashboard /></PageLayout> : <Navigate to="/login" />} />
        
        {/* Inventory Management Routes */}
        <Route path="/inventory" element={user ? <PageLayout><Inventory /></PageLayout> : <Navigate to="/login" />} />
        
        {/* Legacy routes redirected to new inventory workflow */}
        <Route path="/inventory/new" element={<Navigate to="/inventory/add" replace />} />
        <Route path="/inventory/scan" element={<Navigate to="/inventory/add" replace />} />
        <Route path="/scan" element={<Navigate to="/inventory/add" replace />} />
        
        {/* New inventory workflow routes */}
        <Route path="/inventory/add" element={user ? <PageLayout><InventoryAddSelectionPage /></PageLayout> : <Navigate to="/login" />} />
        <Route path="/inventory/action/:assetId" element={user ? <PageLayout><InventoryActionSelectorPage /></PageLayout> : <Navigate to="/login" />} />
        <Route path="/inventory/add/:assetId" element={user ? <PageLayout><AddInventoryPage /></PageLayout> : <Navigate to="/login" />} />
        <Route path="/inventory/add-for-asset/:assetId" element={user ? <PageLayout><AddInventoryForAssetPage /></PageLayout> : <Navigate to="/login" />} />
        <Route path="/inventory/browse-assets" element={user ? <PageLayout><AssetTypeBrowserPage /></PageLayout> : <Navigate to="/login" />} />
        <Route path="/inventory/asset-type/:assetTypeId" element={user ? <PageLayout><AssetListByTypePage /></PageLayout> : <Navigate to="/login" />} />
        <Route path="/inventory/item/:id" element={user ? <PageLayout><InventoryItemDetail /></PageLayout> : <Navigate to="/login" />} />
        <Route path="/inventory/:inventoryItemId/history" element={user ? <PageLayout><InventoryHistory /></PageLayout> : <Navigate to="/login" />} />
        <Route path="/inventory/edit/:id" element={user ? <PageLayout><EditInventoryItem /></PageLayout> : <Navigate to="/login" />} />
        
        {/* Form Management Routes */}
        <Route path="/forms" element={user ? <PageLayout><Forms /></PageLayout> : <Navigate to="/login" />} />
        <Route path="/forms/new" element={user ? <PageLayout><FormBuilder /></PageLayout> : <Navigate to="/login" />} />
        <Route path="/forms/edit/:id" element={user ? <PageLayout><FormBuilder /></PageLayout> : <Navigate to="/login" />} />
        <Route path="/forms/:id" element={user ? <PageLayout><FormDetail /></PageLayout> : <Navigate to="/login" />} />
        <Route path="/forms/preview/:id" element={user ? <PageLayout><FormPreview /></PageLayout> : <Navigate to="/login" />} />
        <Route path="/forms/submit/:id" element={<FormSubmissionWrapper />} />
        
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
        <Route path="/reports/new" element={user ? <PageLayout><ReportBuilder /></PageLayout> : <Navigate to="/login" />} />
        <Route path="/reports/:id" element={user ? <PageLayout><ReportBuilder /></PageLayout> : <Navigate to="/login" />} />
        
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
    </>
  );
};

/**
 * AppErrorBoundary Component
 * 
 * Global error boundary to catch unhandled errors in the React component tree.
 * Provides detailed error information during development and a friendly
 * error page for users.
 */
class AppErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean, error: Error | null, errorInfo: ErrorInfo | null}> {
  constructor(props: {children: ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("GLOBAL ERROR CAUGHT:", error);
    console.error("Component Stack:", errorInfo.componentStack);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', margin: '20px', border: '2px solid red', borderRadius: '8px', backgroundColor: '#FFEEEE' }}>
          <h1 style={{ color: 'red' }}>Something went wrong!</h1>
          <p>The application encountered an error. Here are the details:</p>
          <div style={{ padding: '20px', backgroundColor: 'white', borderRadius: '4px', marginTop: '20px' }}>
            <h2>Error:</h2>
            <pre style={{ color: 'red', overflow: 'auto' }}>
              {this.state.error?.toString()}
            </pre>
            
            <h2>Component Stack:</h2>
            <pre style={{ fontSize: '12px', overflow: 'auto', maxHeight: '300px' }}>
              {this.state.errorInfo?.componentStack}
            </pre>
          </div>
          <div style={{ marginTop: '20px' }}>
            <button 
              onClick={() => window.location.reload()}
              style={{ padding: '10px 20px', backgroundColor: '#007BFF', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

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
