import { useState, useEffect, useCallback, useRef } from 'react';
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
  
  // Use a ref to track initialization 
  const initialized = useRef(false);
  // Use another ref to avoid double initialization
  const restoringFromStorage = useRef(false);

  // Debug changes to currentOrganization
  useEffect(() => {
    if (currentOrganization) {
      console.log("Current organization changed:", currentOrganization?.name, currentOrganization?.id);
    }
  }, [currentOrganization?.id]);

  // Debug changes to organizations array
  useEffect(() => {
    if (organizations) {
      console.log("Organizations list changed:", organizations?.length);
    }
  }, [organizations?.length]);

  // On component mount, try to load persisted organization
  useEffect(() => {
    // Only run once and only if not already restoring
    if (initialized.current || restoringFromStorage.current || !organizations?.length) return;
    
    try {
      restoringFromStorage.current = true;
      setDebugState('checking-localStorage');
      
      // If we already have a currentOrganization, we don't need to restore from localStorage
      if (currentOrganization) {
        // But we do need to ensure it's saved to localStorage
        localStorage.setItem(CURRENT_ORG_STORAGE_KEY, currentOrganization.id);
        initialized.current = true;
        restoringFromStorage.current = false;
        return;
      }
      
      const savedOrgId = localStorage.getItem(CURRENT_ORG_STORAGE_KEY);
      if (savedOrgId) {
        // Verify this organization is in the user's list
        const foundOrg = organizations.find(org => org.id === savedOrgId);
        if (foundOrg) {
          console.log('Restoring saved organization:', foundOrg.name);
          setCurrentOrganization(normalizeOrganization(foundOrg));
          setDebugState('restored-from-localStorage');
        } else {
          console.log('Saved organization not found in user organizations');
          // Just clear localStorage and use the first org if available
          localStorage.removeItem(CURRENT_ORG_STORAGE_KEY);
          setDebugState('localStorage-org-not-found');
          
          if (organizations.length > 0) {
            setCurrentOrganization(normalizeOrganization(organizations[0]));
            localStorage.setItem(CURRENT_ORG_STORAGE_KEY, organizations[0].id);
          }
        }
      } else if (organizations.length > 0) {
        // No saved organization, but we have organizations, so use the first one
        console.log('No saved organization, using first organization:', organizations[0].name);
        setCurrentOrganization(normalizeOrganization(organizations[0]));
        localStorage.setItem(CURRENT_ORG_STORAGE_KEY, organizations[0].id);
        setDebugState('using-first-organization');
      }
      
      initialized.current = true;
    } catch (e) {
      console.error('Error restoring saved organization:', e);
      localStorage.removeItem(CURRENT_ORG_STORAGE_KEY);
      setDebugState('localStorage-error');
    } finally {
      restoringFromStorage.current = false;
    }
  }, [organizations, currentOrganization, setCurrentOrganization]);

  // Function to set the selected organization
  const selectOrganization = useCallback(async (organizationId) => {
    if (!organizationId || isLoading) return false;
    
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
          }
        }
      } catch (dbError) {
        console.warn('Failed to update primary organization status:', dbError);
      }
      
      return true;
    } catch (error) {
      console.error('Error selecting organization:', error);
      setLastError(error.message || 'Failed to select organization');
      toast.error('Failed to switch organization: ' + error.message);
      setDebugState('organization-switch-error');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [organizations, setCurrentOrganization, user, isLoading]);

  // Function to refresh the organizations list
  const fetchOrganizations = useCallback(async () => {
    if (isLoading) return false;
    
    setIsLoading(true);
    setLastError(null);
    setDebugState('refreshing-organizations');
    
    try {
      console.log('Refreshing organizations list...');
      
      // Re-fetch the current user's session to trigger useAuth useEffect
      const { error } = await supabase.auth.refreshSession();
      
      if (error) {
        throw error;
      }
      
      setDebugState('organizations-refreshed');
      return true;
    } catch (error) {
      console.error('Error refreshing organizations:', error);
      setLastError(error.message || 'Failed to refresh organizations');
      toast.error('Failed to refresh organizations: ' + error.message);
      setDebugState('organizations-refresh-error');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  // Check for current org state occasionally to help with debugging
  // This won't fix the issue, but helps diagnose it
  useEffect(() => {
    // 5 second interval is too frequent and causes performance issues
    // Change to a longer interval of 30 seconds
    const intervalId = setInterval(() => {
      const savedOrgId = localStorage.getItem(CURRENT_ORG_STORAGE_KEY);
      const currentOrgId = currentOrganization?.id;
      
      if (savedOrgId !== currentOrgId) {
        console.log(`Organization mismatch: localStorage=${savedOrgId}, current=${currentOrgId}`);
        
        // Auto-fix the mismatch by updating localStorage if we have a current org
        if (currentOrgId) {
          localStorage.setItem(CURRENT_ORG_STORAGE_KEY, currentOrgId);
        }
        // Or restore from localStorage if we don't
        else if (savedOrgId && organizations) {
          const orgToRestore = organizations.find(org => org.id === savedOrgId);
          if (orgToRestore && !restoringFromStorage.current) {
            restoringFromStorage.current = true;
            setCurrentOrganization(normalizeOrganization(orgToRestore));
            restoringFromStorage.current = false;
          }
        }
      }
    }, 30000); // Check every 30 seconds instead of 5
    
    return () => clearInterval(intervalId);
  }, [currentOrganization, organizations, setCurrentOrganization]);

  return {
    currentOrganization: currentOrganization ? normalizeOrganization(currentOrganization) : null,
    organizations: organizations?.map(org => normalizeOrganization(org)) || [],
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