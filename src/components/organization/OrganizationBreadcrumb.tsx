import React from 'react';
import { useOrganization } from '@/hooks/useOrganization';
import OrganizationAvatar from '@/components/common/OrganizationAvatar';

interface OrganizationBreadcrumbProps {
  organizationId?: string;
  className?: string;
}

const OrganizationBreadcrumb: React.FC<OrganizationBreadcrumbProps> = ({
  className = '',
}) => {
  const { 
    currentOrganization
  } = useOrganization();
  
  if (!currentOrganization) {
    return null;
  }
  
  return (
    <div className={`flex items-center text-sm ${className}`}>
      <div
        className="flex items-center gap-1.5 font-medium text-blue-600"
        title={currentOrganization.name}
      >
        <OrganizationAvatar
          size="sm"
          name={currentOrganization.name}
          src={currentOrganization.avatarUrl}
        />
        <span className="truncate max-w-[120px]">{currentOrganization.name}</span>
      </div>
    </div>
  );
};

export default OrganizationBreadcrumb; 