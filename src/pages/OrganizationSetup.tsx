
import React from 'react';
import OrganizationSetupForm from '@/components/organization/OrganizationSetupForm';
import PermissionDeniedCard from '@/components/organization/PermissionDeniedCard';
import { useOrganizationSetup } from '@/hooks/useOrganizationSetup';

const OrganizationSetup: React.FC = () => {
  const { handleCreateOrganization, isSubmitting, canCreateOrg } = useOrganizationSetup();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 p-4">
      {canCreateOrg ? (
        <OrganizationSetupForm 
          onSubmit={handleCreateOrganization}
          isSubmitting={isSubmitting}
        />
      ) : (
        <PermissionDeniedCard />
      )}
    </div>
  );
};

export default OrganizationSetup;
