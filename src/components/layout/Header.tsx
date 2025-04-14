
import { Link } from "react-router-dom";
import { Package } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import UserMenu from "./UserMenu";

const Header = () => {
  return (
    <header className="bg-white shadow z-20">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="md:inline-flex" />
            <Link to="/" className="flex items-center">
              <Package className="h-8 w-8 text-primary" />
              <span className="ml-2 text-xl font-bold text-gray-900">StockFlow</span>
            </Link>
          </div>

          <div className="flex items-center">
            <UserMenu />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
