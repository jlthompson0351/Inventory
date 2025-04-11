
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useOrganization } from '@/hooks/useOrganization';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const OrganizationSetup: React.FC = () => {
  const [orgName, setOrgName] = useState('');
  const { createOrganization, organizations } = useOrganization();
  const navigate = useNavigate();

  const handleCreateOrganization = async () => {
    if (!orgName.trim()) {
      toast.error('Organization name cannot be empty');
      return;
    }

    const newOrg = await createOrganization(orgName);
    
    if (newOrg) {
      toast.success(`Organization "${newOrg.name}" created successfully`);
      navigate('/');
    }
  };

  // If user already has organizations, redirect to dashboard
  React.useEffect(() => {
    if (organizations.length > 0) {
      navigate('/');
    }
  }, [organizations, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">
          Create Your Organization
        </h2>
        <div className="space-y-4">
          <Input 
            placeholder="Organization Name" 
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
          />
          <Button 
            onClick={handleCreateOrganization} 
            className="w-full"
          >
            Create Organization
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OrganizationSetup;
