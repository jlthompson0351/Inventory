import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { 
  LogOut,
  Shield,
  User,
  Sliders,
  Settings
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import UserAvatar from "@/components/common/UserAvatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";

const UserMenu = () => {
  const navigate = useNavigate();
  const { user, profile, userRoles, organizationRole } = useAuth();
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const displayName = profile?.full_name || user?.email || "User";
  const avatarUrl = profile?.avatar_url || null;
  const email = user?.email || "";

  if (!user) {
    return (
      <div className="w-full flex items-center justify-start gap-3 px-2 py-1.5 h-auto">
        <UserAvatar src={null} name={null} size="sm" />
        <div className="flex flex-col items-start">
          <span className="text-sm font-medium">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="w-full flex items-center justify-start gap-3 px-2 py-1.5 h-auto text-left">
          <UserAvatar src={avatarUrl} name={displayName} size="sm" />
          <div className="flex flex-col items-start">
            <span className="text-sm font-medium">{displayName}</span>
            <span className="text-xs text-muted-foreground">{email}</span>
            {organizationRole && (
              <Badge variant="secondary" className="mt-1 capitalize text-xs">
                {organizationRole}
              </Badge>
            )}
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
        {userRoles?.isOrgAdmin && (
          <DropdownMenuItem asChild>
            <Link to="/organization-admin">
              <Settings className="mr-2 h-4 w-4" />
              <span>Organization Admin</span>
            </Link>
          </DropdownMenuItem>
        )}
        {userRoles?.isPlatformOperator && (
          <DropdownMenuItem asChild>
            <Link to="/platform-dashboard">
              <Shield className="mr-2 h-4 w-4" />
              <span>Platform Dashboard</span>
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
