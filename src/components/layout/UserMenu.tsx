import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { 
  Settings, 
  LogOut,
  Shield,
  User,
  Sliders
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import UserAvatar from "@/components/common/UserAvatar";
import { supabase } from "@/integrations/supabase/client";

const UserMenu = () => {
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="w-full flex items-center justify-start gap-3 px-2 py-1.5 h-auto text-left">
          <UserAvatar src={user?.avatarUrl} name={user?.name} size="sm" />
          <div className="flex flex-col items-start">
            <span className="text-sm font-medium">{user?.name}</span>
            <span className="text-xs text-muted-foreground">{user?.email}</span>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuItem asChild>
          <Link to="/profile">
            <User className="mr-2 h-4 w-4" />
            <span>Profile Settings</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/app-settings">
            <Sliders className="mr-2 h-4 w-4" />
            <span>App Settings</span>
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
  );
};

export default UserMenu;
