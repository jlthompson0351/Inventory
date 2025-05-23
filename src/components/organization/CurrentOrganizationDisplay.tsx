import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrganization } from '@/hooks/useOrganization';
import OrganizationAvatar from '@/components/common/OrganizationAvatar';
import { Skeleton } from '@/components/ui/skeleton';

const CurrentOrganizationDisplay = () => {
  const navigate = useNavigate();
  const { 
    currentOrganization, 
    isLoading
  } = useOrganization();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-3">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-5 w-28" />
      </div>
    );
  }

  if (!currentOrganization) {
    return (
      <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-md">
        <p className="text-sm font-medium text-amber-700">
          Organization data not available
        </p>
      </div>
    );
  }

  return (
    <div 
      className="flex items-center space-x-3 p-3 rounded-md"
    >
      <OrganizationAvatar 
        size="md"
        name={currentOrganization.name} 
        src={currentOrganization.avatar_url}
      />
      <div className="flex flex-col items-start text-left">
        <span className="font-semibold text-base truncate max-w-[180px]">
          {currentOrganization.name}
        </span>
      </div>
    </div>
  );
};

export default React.memo(CurrentOrganizationDisplay); 