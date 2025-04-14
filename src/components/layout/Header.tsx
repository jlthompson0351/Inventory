
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  Package, 
  Settings, 
  LogOut,
  Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import UserAvatar from "@/components/common/UserAvatar";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { SidebarTrigger } from "@/components/ui/sidebar";

const Header = () => {
  const navigate = useNavigate();
  
  // Get user data (in a real app this would come from an auth context)
  const [user, setUser] = useState<{ name: string; email: string; avatarUrl: string | null } | null>(null);
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);
  
  // Fetch user data on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        // Use the RPC function to get profile data
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();
          
        // Check if user is a system admin
        const { data: systemRole } = await supabase
          .from('system_roles')
          .select('role')
          .eq('user_id', data.user.id)
          .single();
        
        setIsSystemAdmin(!!systemRole && ['admin', 'super_admin'].includes(systemRole.role));
        
        setUser({
          name: profileData?.full_name || data.user.user_metadata?.name || "User",
          email: data.user.email || "",
          avatarUrl: profileData?.avatar_url || null
        });
      }
    };
    
    fetchUserData();
  }, []);
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative rounded-full p-0 h-auto">
                  <UserAvatar src={user?.avatarUrl} name={user?.name} size="sm" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Profile Settings</span>
                  </Link>
                </DropdownMenuItem>
                {isSystemAdmin && (
                  <DropdownMenuItem asChild>
                    <Link to="/system-admin">
                      <Shield className="mr-2 h-4 w-4" />
                      <span>System Administration</span>
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
