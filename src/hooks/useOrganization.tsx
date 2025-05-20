import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

// Organization storage key for persistence
const CURRENT_ORG_STORAGE_KEY = 'barcodex-current-organization';

// Helper function to normalize organization field names for consistency
const normalizeOrganization = (org) => {
  // The database and AuthContext use avatar_url, but parts of the code expect avatarUrl
  // Let's make sure both properties exist
  if (!org) return null;
  
  return {
    ...org,
    avatarUrl: org.avatar_url,
    avatar_url: org.avatar_url || org.avatarUrl,
    parentId: org.parent_id,
    parent_id: org.parent_id || org.parentId,
    hierarchyLevel: org.hierarchy_level,
    hierarchy_level: org.hierarchy_level || org.hierarchyLevel
  };
};

export function useOrganization() {
  const { 
    organizations, 
    currentOrganization, 
    setCurrentOrganization,
    userRoles,
    user
  } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [debugState, setDebugState] = useState<string>('init');

  // Debug changes to currentOrganization
  useEffect(() => {
    console.log("Current organization changed:", currentOrganization?.name, currentOrganization?.id);
  }, [currentOrganization]);

  // Debug changes to organizations array
  useEffect(() => {
    console.log("Organizations list changed:", organizations?.length);
  }, [organizations]);

  // On component mount, try to load persisted organization
  useEffect(() => {
    if (!currentOrganization && organizations.length > 0) {
      try {
        setDebugState('checking-localStorage');
        console.log("Checking localStorage for saved organization");
        
        const savedOrgId = localStorage.getItem(CURRENT_ORG_STORAGE_KEY);
        if (savedOrgId) {
          console.log(`Found saved organization ID: ${savedOrgId}`);
          
          // Verify this organization is in the user's list
          const foundOrg = organizations.find(org => org.id === savedOrgId);
          if (foundOrg) {
            console.log('Restoring saved organization:', foundOrg.name);
            setCurrentOrganization(normalizeOrganization(foundOrg));
            setDebugState('restored-from-localStorage');
          } else {
            console.log('Saved organization not found in user organizations');
            localStorage.removeItem(CURRENT_ORG_STORAGE_KEY);
            setDebugState('localStorage-org-not-found');
          }
        } else {
          console.log('No saved organization found in localStorage');
          setDebugState('no-localStorage-found');
        }
      } catch (e) {
        console.error('Error restoring saved organization:', e);
        localStorage.removeItem(CURRENT_ORG_STORAGE_KEY);
        setDebugState('localStorage-error');
      }
    }
  }, [organizations, currentOrganization, setCurrentOrganization]);

  // Function to set the selected organization
  const selectOrganization = async (organizationId: string) => {
    setIsLoading(true);
    setLastError(null);
    setDebugState('selecting-organization');

    try {
      console.log(`Attempting to switch to organization: ${organizationId}`);
      
      // Find the organization in our list
      const organization = organizations.find(org => org.id === organizationId);
      if (!organization) {
        throw new Error('Organization not found in your organizations list');
      }
      
      // Save to localStorage for persistence - just the ID for reliability
      localStorage.setItem(CURRENT_ORG_STORAGE_KEY, organization.id);
      console.log(`Saved organization ID to localStorage: ${organization.id}`);
      
      // Update the current organization in context
      console.log(`Switching to organization: ${organization.name}`);
      setCurrentOrganization(normalizeOrganization(organization));
      setDebugState('organization-switched');
      
      // Update primary organization in database (optional enhancement)
      try {
        if (user?.id) {
          // First set all to not primary
          await supabase
            .from('organization_members')
            .update({ is_primary: false })
            .eq('user_id', user.id);
            
          // Then set the selected one to primary
          const { error } = await supabase
            .from('organization_members')
            .update({ is_primary: true })
            .match({ user_id: user.id, organization_id: organizationId });
          
          if (error) {
            console.warn('Could not set organization as primary:', error);
          } else {
            console.log('Successfully set organization as primary in database');
          }
        }
      } catch (dbError) {
        console.warn('Failed to update primary organization status:', dbError);
      }
      
      return true;
    } catch (error: any) {
      console.error('Error selecting organization:', error);
      setLastError(error.message || 'Failed to select organization');
      toast.error('Failed to switch organization: ' + error.message);
      setDebugState('organization-switch-error');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Function to refresh the organizations list
  const fetchOrganizations = async () => {
    setIsLoading(true);
    setLastError(null);
    setDebugState('refreshing-organizations');
    
    try {
      console.log('Refreshing organizations list...');
      
      // Re-fetch the current user's session to trigger useAuth useEffect
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        throw error;
      }
      
      setDebugState('organizations-refreshed');
      return true;
    } catch (error: any) {
      console.error('Error refreshing organizations:', error);
      setLastError(error.message || 'Failed to refresh organizations');
      toast.error('Failed to refresh organizations: ' + error.message);
      setDebugState('organizations-refresh-error');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Check for current org state periodically to help with debugging
  useEffect(() => {
    const intervalId = setInterval(() => {
      const savedOrgId = localStorage.getItem(CURRENT_ORG_STORAGE_KEY);
      const currentOrgId = currentOrganization?.id;
      
      if (savedOrgId !== currentOrgId) {
        console.log(`Organization mismatch: localStorage=${savedOrgId}, current=${currentOrgId}`);
      }
    }, 5000);
    
    return () => clearInterval(intervalId);
  }, [currentOrganization]);

  return {
    currentOrganization: currentOrganization ? normalizeOrganization(currentOrganization) : null,
    organizations: organizations.map(org => normalizeOrganization(org)),
    selectOrganization,
    fetchOrganizations,
    isLoading,
    lastError,
    userRoles,
    debugState
  };
}

// For backwards compatibility, but prefer named export for consistency
export default useOrganization; 