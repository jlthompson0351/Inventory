
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import OrganizationSetupForm from '@/components/organization/OrganizationSetupForm';
import { useOrganizationSetup } from '@/hooks/useOrganizationSetup';

const OrganizationSetup: React.FC = () => {
  const { handleCreateOrganization, isSubmitting, canCreateOrg } = useOrganizationSetup();
  const navigate = useNavigate();

  if (!canCreateOrg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              Permission Denied
            </CardTitle>
            <CardDescription className="text-center">
              You don't have permission to create new organizations
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button 
              onClick={() => navigate('/')}
              className="w-full"
            >
              Return to Dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 p-4">
      <OrganizationSetupForm 
        onSubmit={handleCreateOrganization}
        isSubmitting={isSubmitting}
      />
    </div>
  );
};

export default OrganizationSetup;
