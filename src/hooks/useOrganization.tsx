import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getUserOrganization, updateOrganization as updateOrgService } from '@/services/organizationService';

// Helper function to normalize organization field names for consistency
const normalizeOrganization = (org) => {
  // The database and AuthContext use avatar_url, but parts of the code expect avatarUrl
  // Let's make sure both properties exist
  if (!org) return null;
  
  return {
    ...org,
    avatarUrl: org.avatar_url,
    avatar_url: org.avatar_url || org.avatarUrl
  };
};

export function useOrganization() {
  const { 
    organization,
    userRoles
  } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  
  // Method to update the organization details
  const updateOrganization = useCallback(async (organizationId: string, updates: any) => {
    if (!organizationId) {
      toast.error('No organization to update');
      return false;
    }
    
    setIsLoading(true);
    
    try {
      const result = await updateOrgService(organizationId, updates);
      
      if (result) {
        toast.success('Organization updated successfully');
      }
      
      return result;
    } catch (error) {
      console.error('Error updating organization:', error);
      toast.error('Failed to update organization');
      setLastError('Failed to update organization');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // For backward compatibility, maintain the old property names
  return {
    currentOrganization: organization ? normalizeOrganization(organization) : null,
    organizations: organization ? [normalizeOrganization(organization)] : [],
    updateOrganization,
    isLoading,
    lastError,
    userRoles
  };
}

// For backwards compatibility, but prefer named export for consistency
export default useOrganization; 