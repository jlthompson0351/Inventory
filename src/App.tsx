
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
import SystemAdmin from "./pages/SystemAdmin";
import Profile from "./pages/Profile";
import { useEffect, useState } from "react";
import { supabase } from "./integrations/supabase/client";

const queryClient = new QueryClient();

const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  // Check auth state on initial load
  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
      setIsLoading(false);
    };
    
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    checkUser();
    
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
            <Route path="/organization-setup" element={<OrganizationSetup />} />
            <Route path="/system-admin" element={user ? <SystemAdmin /> : <Navigate to="/login" />} />
            
            {/* Protected routes with layout */}
            <Route path="/" element={user ? <PageLayout><Dashboard /></PageLayout> : <Navigate to="/login" />} />
            <Route path="/inventory" element={user ? <PageLayout><Inventory /></PageLayout> : <Navigate to="/login" />} />
            <Route path="/inventory/new" element={user ? <PageLayout><NewItem /></PageLayout> : <Navigate to="/login" />} />
            <Route path="/inventory/scan" element={user ? <PageLayout><BarcodeScanner /></PageLayout> : <Navigate to="/login" />} />
            <Route path="/forms" element={user ? <PageLayout><Forms /></PageLayout> : <Navigate to="/login" />} />
            <Route path="/forms/new" element={user ? <PageLayout><FormBuilder /></PageLayout> : <Navigate to="/login" />} />
            <Route path="/forms/:id" element={user ? <PageLayout><FormDetail /></PageLayout> : <Navigate to="/login" />} />
            <Route path="/asset-types" element={user ? <PageLayout><AssetTypes /></PageLayout> : <Navigate to="/login" />} />
            <Route path="/reports" element={user ? <PageLayout><Reports /></PageLayout> : <Navigate to="/login" />} />
            <Route path="/reports/new" element={user ? <PageLayout><ReportBuilder /></PageLayout> : <Navigate to="/login" />} />
            <Route path="/reports/:id" element={user ? <PageLayout><ReportBuilder /></PageLayout> : <Navigate to="/login" />} />
            <Route path="/profile" element={user ? <PageLayout><Profile /></PageLayout> : <Navigate to="/login" />} />
            
            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
