import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';
import OrganizationAvatar from '@/components/common/OrganizationAvatar';

interface OrganizationBreadcrumbProps {
  organizationId?: string;
  showCurrent?: boolean;
  className?: string;
  maxItems?: number;
}

const OrganizationBreadcrumb: React.FC<OrganizationBreadcrumbProps> = ({
  organizationId,
  showCurrent = true,
  className = '',
  maxItems = 3,
}) => {
  const navigate = useNavigate();
  const { 
    currentOrganization, 
    organizations, 
    selectOrganization,
    getOrganizationAncestors 
  } = useOrganization();
  
  // Get the target organization - either the provided ID or current organization
  const targetOrgId = organizationId || currentOrganization?.id;
  
  if (!targetOrgId || !currentOrganization) {
    return null;
  }
  
  // Get the ancestry chain (parent organizations)
  const ancestors = getOrganizationAncestors(targetOrgId);
  
  // Find the current organization being viewed
  const currentOrg = organizationId 
    ? organizations.find(org => org.id === organizationId)
    : currentOrganization;
    
  if (!currentOrg) {
    return null;
  }
  
  // Build the complete breadcrumb trail
  let breadcrumbItems = [...ancestors];
  
  // Add the current org if requested
  if (showCurrent) {
    breadcrumbItems.push(currentOrg);
  }
  
  // Limit the number of items if needed
  if (breadcrumbItems.length > maxItems) {
    const firstItem = breadcrumbItems[0];
    const lastItems = breadcrumbItems.slice(-maxItems + 1);
    breadcrumbItems = [firstItem, { id: 'ellipsis', name: '...' } as any, ...lastItems];
  }
  
  const handleOrgClick = (orgId: string) => {
    if (orgId === currentOrganization.id) return;
    
    selectOrganization(orgId);
    navigate('/dashboard');
  };
  
  return (
    <div className={`flex items-center text-sm ${className}`}>
      {breadcrumbItems.map((org, index) => (
        <React.Fragment key={org.id}>
          {index > 0 && (
            <ChevronRight className="mx-1 h-4 w-4 text-gray-400" />
          )}
          
          {org.id === 'ellipsis' ? (
            <span className="text-gray-500">...</span>
          ) : (
            <button
              className={`flex items-center gap-1.5 hover:text-blue-600 hover:underline ${
                org.id === currentOrg.id ? 'font-medium text-blue-600' : 'text-gray-700'
              }`}
              onClick={() => handleOrgClick(org.id)}
              title={org.name}
            >
              <OrganizationAvatar
                size="sm"
                name={org.name}
                src={org.avatarUrl}
              />
              <span className="truncate max-w-[120px]">{org.name}</span>
            </button>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default OrganizationBreadcrumb; 