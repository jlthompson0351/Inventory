
import { ReactNode } from "react";
import Header from "./Header";

interface PageLayoutProps {
  children: ReactNode;
}

const PageLayout = ({ children }: PageLayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-6">
        <div className="inventory-container">
          {children}
        </div>
      </main>
      <footer className="py-4 bg-secondary">
        <div className="inventory-container">
          <p className="text-center text-sm text-muted-foreground">
            BarcodeX Inventory Management &copy; {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default PageLayout;
