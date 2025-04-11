
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useOrganization } from '@/hooks/useOrganization';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';

const OrganizationSetup: React.FC = () => {
  const [orgName, setOrgName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [canCreateOrg, setCanCreateOrg] = useState(false);
  const { createOrganization, organizations } = useOrganization();
  const navigate = useNavigate();

  // Check if user can create organizations
  useEffect(() => {
    const checkUserPermissions = async () => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/login');
        return;
      }

      // Check if user is creating their first org (anyone can create their first org)
      const { data: existingOrgs, error: orgsError } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id);
      
      if (orgsError) {
        console.error('Error checking organizations:', orgsError);
        toast.error('Error checking permissions');
        return;
      }
      
      // Check if user is a system admin (can create multiple orgs)
      const { data: systemRoles, error: roleError } = await supabase
        .from('system_roles')
        .select('role')
        .eq('user_id', user.id);
      
      if (roleError) {
        console.error('Error checking system roles:', roleError);
      }
      
      const isSystemAdmin = systemRoles && systemRoles.length > 0 && systemRoles[0]?.role === 'admin';
      const isFirstOrg = !existingOrgs || existingOrgs.length === 0;
      
      setCanCreateOrg(isSystemAdmin || isFirstOrg);
    };
    
    checkUserPermissions();
  }, [navigate]);

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!orgName.trim()) {
      toast.error('Organization name cannot be empty');
      return;
    }

    try {
      setIsSubmitting(true);
      const newOrg = await createOrganization(orgName);
      
      if (newOrg) {
        toast.success(`Organization "${newOrg.name}" created successfully`);
        navigate('/');
      }
    } catch (error) {
      console.error('Error creating organization:', error);
      toast.error('Failed to create organization');
    } finally {
      setIsSubmitting(false);
    }
  };

  // If user already has organizations and isn't a system admin, redirect to dashboard
  useEffect(() => {
    if (organizations && organizations.length > 0 && !canCreateOrg) {
      navigate('/');
    }
  }, [organizations, navigate, canCreateOrg]);

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
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Create Your Organization
          </CardTitle>
          <CardDescription className="text-center">
            Set up your organization to get started with inventory management
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleCreateOrganization}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="organization-name">Organization Name</Label>
              <Input 
                id="organization-name"
                placeholder="Enter organization name" 
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Organization'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default OrganizationSetup;
