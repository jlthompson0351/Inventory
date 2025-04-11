import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Package2, FileText, Layers } from "lucide-react";
import Header from "./Header";

interface PageLayoutProps {
  children: ReactNode;
}

const PageLayout = ({ children }: PageLayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex flex-col md:flex-row">
        <div className="bg-secondary w-full md:w-[220px] py-4 overflow-y-auto">
          <nav className="px-4 py-2">
            <ul className="space-y-1">
              <li>
                <Link to="/inventory" className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-primary/10 text-sm font-medium">
                  <Package2 className="w-4 h-4" />
                  Inventory
                </Link>
              </li>
              <li>
                <Link to="/forms" className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-primary/10 text-sm font-medium">
                  <FileText className="w-4 h-4" />
                  Forms
                </Link>
              </li>
              <li>
                <Link to="/asset-types" className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-primary/10 text-sm font-medium">
                  <Layers className="w-4 h-4" />
                  Asset Types
                </Link>
              </li>
              <li>
                <Link to="/reports" className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-primary/10 text-sm font-medium">
                  <FileText className="w-4 h-4" />
                  Reports
                </Link>
              </li>
            </ul>
          </nav>
        </div>
        
        <main className="flex-1 py-6 px-4 overflow-y-auto">
          <div className="container mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
      <footer className="py-4 bg-secondary">
        <div className="container mx-auto max-w-7xl px-4">
          <p className="text-center text-sm text-muted-foreground">
            StockFlow Inventory Management &copy; {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default PageLayout;
