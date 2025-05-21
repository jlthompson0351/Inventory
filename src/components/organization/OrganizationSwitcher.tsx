import React from 'react';
import { Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useOrganization } from '@/hooks/useOrganization';
import OrganizationAvatar from '@/components/common/OrganizationAvatar';
import { Skeleton } from '@/components/ui/skeleton';

const OrganizationSwitcher = () => {
  const navigate = useNavigate();
  const { 
    currentOrganization, 
    isLoading
  } = useOrganization();

  const handleOrganizationSettings = () => {
    navigate('/organization/settings');
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 border rounded-md shadow-sm p-3">
        <Skeleton className="h-6 w-6 rounded-full" />
        <Skeleton className="h-4 w-24" />
      </div>
    );
  }

  if (!currentOrganization) {
    return (
      <div className="flex items-center gap-2 border rounded-md shadow-sm p-3 bg-amber-50">
        <p className="text-sm font-medium text-amber-700">
          No organization available
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between border rounded-md shadow-sm p-3">
      <div className="flex items-center space-x-2 overflow-hidden">
        <OrganizationAvatar 
          size="sm" 
          name={currentOrganization.name} 
          src={currentOrganization.avatar_url}
        />
        <div className="flex flex-col items-start text-left">
          <span className="font-medium truncate max-w-[120px]">
            {currentOrganization.name}
          </span>
          <span className="text-xs text-muted-foreground truncate max-w-[120px]">
            Your organization
          </span>
        </div>
      </div>
      <Button 
        variant="ghost" 
        size="sm"
        className="ml-2 p-2"
        onClick={handleOrganizationSettings}
      >
        <Settings className="h-4 w-4" />
        <span className="sr-only">Organization Settings</span>
      </Button>
    </div>
  );
};

export default React.memo(OrganizationSwitcher);
