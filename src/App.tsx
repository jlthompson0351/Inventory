
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import PageLayout from "./components/layout/PageLayout";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import NewItem from "./pages/NewItem";
import BarcodeScanner from "./pages/BarcodeScanner";
import Forms from "./pages/Forms";
import FormBuilder from "./pages/FormBuilder";
import FormDetail from "./pages/FormDetail";
import AssetTypes from "./pages/AssetTypes";
import Reports from "./pages/Reports";
import ReportBuilder from "./pages/ReportBuilder";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import OrganizationSetup from "./pages/OrganizationSetup";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/organization-setup" element={<OrganizationSetup />} />
          
          {/* Protected routes with layout */}
          <Route path="/" element={<PageLayout><Dashboard /></PageLayout>} />
          <Route path="/inventory" element={<PageLayout><Inventory /></PageLayout>} />
          <Route path="/inventory/new" element={<PageLayout><NewItem /></PageLayout>} />
          <Route path="/inventory/scan" element={<PageLayout><BarcodeScanner /></PageLayout>} />
          <Route path="/forms" element={<PageLayout><Forms /></PageLayout>} />
          <Route path="/forms/new" element={<PageLayout><FormBuilder /></PageLayout>} />
          <Route path="/forms/:id" element={<PageLayout><FormDetail /></PageLayout>} />
          <Route path="/asset-types" element={<PageLayout><AssetTypes /></PageLayout>} />
          <Route path="/reports" element={<PageLayout><Reports /></PageLayout>} />
          <Route path="/reports/new" element={<PageLayout><ReportBuilder /></PageLayout>} />
          <Route path="/reports/:id" element={<PageLayout><ReportBuilder /></PageLayout>} />
          
          {/* Catch-all route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
