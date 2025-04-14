
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface Organization {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

export const useOrganization = () => {
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const navigate = useNavigate();

  // Fetch user's organizations
  const fetchOrganizations = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate('/login');
      return;
    }

    const { data, error } = await supabase
      .from('organization_members')
      .select('organizations(id, name, avatar_url)')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching organizations:', error);
      toast.error("Failed to load organizations");
      return;
    }

    const userOrgs = data.map((org: any) => ({
      id: org.organizations.id,
      name: org.organizations.name,
      avatarUrl: org.organizations.avatar_url,
    }));
    setOrganizations(userOrgs);

    // If user has only one org, set it as current
    if (userOrgs.length === 1) {
      setCurrentOrganization(userOrgs[0]);
    }
    // If we have orgs but no current org set, set the first one as current
    else if (userOrgs.length > 1 && !currentOrganization) {
      setCurrentOrganization(userOrgs[0]);
    }
  };

  // Create a new organization
  const createOrganization = async (name: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate('/login');
      return null;
    }

    // Start a transaction
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .insert({ name })
      .select()
      .single();

    if (orgError) {
      console.error('Error creating organization:', orgError);
      toast.error("Failed to create organization");
      return null;
    }

    // Add user as an admin to the organization
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({
        user_id: user.id,
        organization_id: orgData.id,
        role: 'admin',
        is_primary: true
      });

    if (memberError) {
      console.error('Error adding user to organization:', memberError);
      toast.error("Failed to join organization");
      return null;
    }

    // Refresh organizations list
    await fetchOrganizations();
    setCurrentOrganization({
      id: orgData.id, 
      name: orgData.name,
      avatarUrl: orgData.avatar_url
    });
    return orgData;
  };

  // Select an organization
  const selectOrganization = (orgId: string) => {
    const org = organizations.find(o => o.id === orgId);
    if (org) {
      setCurrentOrganization(org);
      toast.success(`Switched to ${org.name}`);
      return org;
    }
    return null;
  };

  // Get organization details by ID
  const getOrganizationDetails = async (orgId: string) => {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single();
    
    if (error) {
      console.error('Error fetching organization details:', error);
      return null;
    }
    
    return data;
  };

  // Update organization
  const updateOrganization = async (orgId: string, updates: { name?: string; avatar_url?: string | null }) => {
    const { data, error } = await supabase
      .from('organizations')
      .update(updates)
      .eq('id', orgId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating organization:', error);
      toast.error("Failed to update organization");
      return null;
    }
    
    // Update local state
    if (currentOrganization && currentOrganization.id === orgId) {
      setCurrentOrganization({
        ...currentOrganization,
        name: updates.name || currentOrganization.name,
        avatarUrl: updates.avatar_url !== undefined ? updates.avatar_url : currentOrganization.avatarUrl
      });
    }
    
    // Update organizations list
    setOrganizations(orgs => 
      orgs.map(org => 
        org.id === orgId 
          ? { 
              ...org, 
              name: updates.name || org.name,
              avatarUrl: updates.avatar_url !== undefined ? updates.avatar_url : org.avatarUrl
            } 
          : org
      )
    );
    
    toast.success("Organization updated successfully");
    return data;
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  return {
    currentOrganization,
    organizations,
    createOrganization,
    selectOrganization,
    fetchOrganizations,
    getOrganizationDetails,
    updateOrganization
  };
};
