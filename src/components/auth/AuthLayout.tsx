
import { Package } from "lucide-react";
import React from "react";

interface AuthLayoutProps {
  children: React.ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-muted/30 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center">
            <Package className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mt-4">StockFlow</h1>
          <p className="text-muted-foreground">Inventory Management System</p>
        </div>
        
        {children}
        
        <p className="text-sm text-center text-muted-foreground mt-6">
          By using this service, you agree to our{" "}
          <a href="#" className="underline">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="#" className="underline">
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </div>
  );
};

export default AuthLayout;
