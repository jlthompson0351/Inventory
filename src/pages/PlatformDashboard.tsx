import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { PlusCircle, List, Settings, AlertTriangle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import type { Organization } from '@/types/organization'; // Using our full type
import SystemSettings from '@/components/system-admin/SystemSettings'; // For platform-wide settings

const PlatformDashboard: React.FC = () => {
  const { user, userRoles } = useAuth();
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgDescription, setNewOrgDescription] = useState('');
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);

  useEffect(() => {
    if (!userRoles.isPlatformOperator) {
      toast.error("Access Denied: You are not a platform operator.");
      navigate('/');
    } else {
      fetchAllOrganizations();
    }
  }, [userRoles.isPlatformOperator, navigate]);

  const fetchAllOrganizations = async () => {
    setIsLoadingOrgs(true);
    try {
      // We'll create this RPC next
      const { data, error } = await supabase.rpc('get_all_organizations_for_platform_admin');
      if (error) throw error;
      setOrganizations(data || []);
    } catch (error) {
      console.error('Error fetching organizations:', error);
      toast.error('Failed to load organizations.');
      setOrganizations([]);
    } finally {
      setIsLoadingOrgs(false);
    }
  };

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) {
      toast.error("Organization name cannot be empty.");
      return;
    }
    setIsCreatingOrg(true);
    try {
      // We'll create this RPC next
      const { data: newOrgId, error } = await supabase.rpc('create_organization_for_platform_admin', {
        org_name: newOrgName.trim(),
        org_description: newOrgDescription.trim()
      });

      if (error) throw error;
      
      toast.success(`Organization '${newOrgName.trim()}' created successfully! You have been added as an admin.`);
      setNewOrgName('');
      setNewOrgDescription('');
      setShowCreateForm(false);
      fetchAllOrganizations(); // Refresh the list
    } catch (error) {
      console.error('Error creating organization:', error);
      toast.error(`Failed to create organization: ${(error as Error).message}`);
    } finally {
      setIsCreatingOrg(false);
    }
  };
  
  // TODO: Implement a way for platform admin to set context to a specific org
  // For now, they would manage orgs by being an admin in them and using /organization-admin
  // after ensuring they are a member of that org.

  if (!userRoles.isPlatformOperator) {
    return (
      <div className="p-4">
        <Card className="max-w-md mx-auto">
          <CardHeader className="flex flex-row items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <CardTitle className="text-destructive">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p>You do not have permission to view this page.</p>
            <Button onClick={() => navigate('/')} className="mt-4">Go to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Platform Dashboard</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><List className="h-6 w-6" /> All Organizations</CardTitle>
          <CardDescription>View and manage all organizations on the platform.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingOrgs ? (
            <p>Loading organizations...</p>
          ) : organizations.length === 0 ? (
            <p>No organizations found.</p>
          ) : (
            <ul className="space-y-2">
              {organizations.map(org => (
                <li key={org.id} className="p-3 border rounded-md flex justify-between items-center">
                  <div>
                    <span className="font-semibold">{org.name}</span>
                    <p className="text-sm text-muted-foreground">ID: {org.id}</p>
                    {org.description && <p className="text-sm text-muted-foreground mt-1">{org.description}</p>}
                  </div>
                  {/* 
                    Future: Add a "Set Context & Manage" button here.
                    This button would ideally:
                    1. Call an RPC to set the 'active' organization for the platform admin's session.
                    2. Navigate to /organization-admin.
                    The useAuth hook would then need to respect this platform admin's active org choice.
                    For now, the platform admin must be added as a member during org creation.
                  */}
                   <Button variant="outline" size="sm" onClick={() => navigate(`/organization-admin?org_id=${org.id}`)} disabled>
                     Manage (Future)
                   </Button>
                </li>
              ))}
            </ul>
          )}
          <Button onClick={() => setShowCreateForm(!showCreateForm)} className="mt-4">
            <PlusCircle className="mr-2 h-4 w-4" /> {showCreateForm ? 'Cancel' : 'Create New Organization'}
          </Button>
          {showCreateForm && (
            <form onSubmit={handleCreateOrganization} className="mt-4 p-4 border rounded-md space-y-4">
              <div>
                <Label htmlFor="newOrgName">Organization Name</Label>
                <Input id="newOrgName" value={newOrgName} onChange={(e) => setNewOrgName(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="newOrgDescription">Organization Description (Optional)</Label>
                <Textarea id="newOrgDescription" value={newOrgDescription} onChange={(e) => setNewOrgDescription(e.target.value)} />
              </div>
              <Button type="submit" disabled={isCreatingOrg}>
                {isCreatingOrg ? 'Creating...' : 'Confirm Create Organization'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><Settings className="h-6 w-6" /> System-Wide Settings</CardTitle>
            <CardDescription>Configure global settings for the entire platform.</CardDescription>
        </CardHeader>
        <CardContent>
            <SystemSettings />
        </CardContent>
      </Card>

    </div>
  );
};

export default PlatformDashboard; 