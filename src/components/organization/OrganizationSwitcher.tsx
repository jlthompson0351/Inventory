
import React, { useState } from 'react';
import { Building, ChevronDown, LogOut, Plus, Settings, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useOrganization } from '@/hooks/useOrganization';
import OrganizationAvatar from '@/components/common/OrganizationAvatar';
import { Skeleton } from '@/components/ui/skeleton';

const OrganizationSwitcher = () => {
  const navigate = useNavigate();
  const { 
    currentOrganization, 
    organizations, 
    selectOrganization,
    fetchOrganizations
  } = useOrganization();
  const [isLoading, setIsLoading] = useState(false);

  const handleOrgChange = async (orgId: string) => {
    setIsLoading(true);
    try {
      await selectOrganization(orgId);
      // Force a refresh of organizations data
      await fetchOrganizations();
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNewOrg = () => {
    navigate('/organization-setup');
  };

  const handleManageMembers = () => {
    navigate('/organization/members');
  };

  const handleOrganizationSettings = () => {
    navigate('/organization/settings');
  };

  if (!currentOrganization) {
    return (
      <div className="flex items-center gap-2 px-2">
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-4 w-32" />
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={isLoading}>
        <Button variant="ghost" className="flex items-center gap-2 px-2" data-testid="organization-switcher">
          <OrganizationAvatar 
            size="sm" 
            name={currentOrganization.name} 
            src={currentOrganization.avatarUrl} 
          />
          <span className="font-medium truncate max-w-[150px]">
            {currentOrganization.name}
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Organizations</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {organizations.map((org) => (
          <DropdownMenuItem 
            key={org.id} 
            className="cursor-pointer"
            disabled={org.id === currentOrganization.id || isLoading}
            onClick={() => handleOrgChange(org.id)}
          >
            <div className="flex items-center gap-2">
              <OrganizationAvatar 
                size="xs" 
                name={org.name} 
                src={org.avatarUrl} 
              />
              <span className="truncate">{org.name}</span>
            </div>
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer" onClick={handleCreateNewOrg}>
          <Plus className="mr-2 h-4 w-4" />
          Create New Organization
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer" onClick={handleOrganizationSettings}>
          <Settings className="mr-2 h-4 w-4" />
          Organization Settings
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer" onClick={handleManageMembers}>
          <Users className="mr-2 h-4 w-4" />
          Manage Members
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default OrganizationSwitcher;
