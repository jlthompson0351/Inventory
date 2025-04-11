
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

export const useOrganization = () => {
  const [currentOrganization, setCurrentOrganization] = useState<{
    id: string, 
    name: string
  } | null>(null);
  const [organizations, setOrganizations] = useState<Array<{
    id: string, 
    name: string
  }>>([]);
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
      .select('organizations(id, name)')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching organizations:', error);
      return;
    }

    const userOrgs = data.map((org: any) => org.organizations);
    setOrganizations(userOrgs);

    // If user has only one org, set it as current
    if (userOrgs.length === 1) {
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
      return null;
    }

    // Refresh organizations list
    await fetchOrganizations();
    setCurrentOrganization(orgData);
    return orgData;
  };

  // Select an organization
  const selectOrganization = (orgId: string) => {
    const org = organizations.find(o => o.id === orgId);
    if (org) {
      setCurrentOrganization(org);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  return {
    currentOrganization,
    organizations,
    createOrganization,
    selectOrganization,
    fetchOrganizations
  };
};
