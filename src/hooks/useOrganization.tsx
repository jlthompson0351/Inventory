import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
    organization,
    userRoles
  } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  
  // Simplified version - just a stub that doesn't actually change organizations
  // This is for backwards compatibility with components that expect this function
  const selectOrganization = useCallback(async (organizationId) => {
    console.log('Organization switching is disabled - using single organization model');
    return true;
  }, []);

  // Simplified version - just a stub that doesn't actually fetch organizations
  // This is for backwards compatibility with components that expect this function
  const fetchOrganizations = useCallback(async () => {
    console.log('Organization fetching is disabled - using single organization model');
    return true;
  }, []);
  
  // Method to update the organization details
  const updateOrganization = useCallback(async (organizationId, updates) => {
    if (!organizationId) {
      toast.error('No organization to update');
      return false;
    }
    
    setIsLoading(true);
    
    try {
      const { error } = await supabase
        .from('organizations')
        .update(updates)
        .eq('id', organizationId);
        
      if (error) throw error;
      
      toast.success('Organization updated successfully');
      return true;
    } catch (error) {
      console.error('Error updating organization:', error);
      toast.error('Failed to update organization');
      setLastError('Failed to update organization');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // For backwards compatibility, provide both currentOrganization and organizations
  // where organizations is just an array with the single organization
  return {
    currentOrganization: organization ? normalizeOrganization(organization) : null,
    organizations: organization ? [normalizeOrganization(organization)] : [],
    selectOrganization,
    fetchOrganizations,
    updateOrganization,
    isLoading,
    lastError,
    userRoles,
    // Helper function to maintain compatibility with components that use organization hierarchies
    getOrganizationAncestors: useCallback(() => [], [])
  };
}

// For backwards compatibility, but prefer named export for consistency
export default useOrganization; 