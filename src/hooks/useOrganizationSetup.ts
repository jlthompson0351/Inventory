import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/hooks/useAuth';

export const useOrganizationSetup = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [canCreateOrg, setCanCreateOrg] = useState(false);
  const { currentOrganization } = useOrganization();
  const { user, fetchUserData } = useAuth();
  const navigate = useNavigate();

  // Check if user can create organizations
  useEffect(() => {
    const checkUserPermissions = async () => {
      // Get current user - use the user from useAuth context
      if (!user) {
        // If user from useAuth is null, it might still be loading or not logged in.
        // The original code fetched user directly here. Let's ensure user context is prioritized.
        // If auth hook has user as null and not loading, then navigate.
        const session = await supabase.auth.getSession();
        if (!session.data.session?.user) {
          navigate('/login');
          return;
        }
        // If we reach here, it implies useAuth might not have updated yet, but a session exists.
        // This part might need more robust handling of auth state loading.
      }
      
      // Use user.id from useAuth context
      const userId = user?.id;
      if (!userId) {
        toast.error("User not available for permission check.");
        return;
      }

      console.log('Checking permissions for user:', userId);

      // Check if user is creating their first org (anyone can create their first org)
      const { data: existingOrgs, error: orgsError } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', userId); // Use userId from context
      
      if (orgsError) {
        console.error('Error checking organizations:', orgsError);
        toast.error('Error checking permissions');
        return;
      }

      const isFirstOrg = !existingOrgs || existingOrgs.length === 0;
      console.log('Is first org?', isFirstOrg);
      
      // Check if user is a system admin (can create multiple orgs)
      const { data: systemRoles, error: roleError } = await supabase
        .from('system_roles')
        .select('role')
        .eq('user_id', userId); // Use userId from context
      
      if (roleError) {
        console.error('Error checking system roles:', roleError);
      }
      
      // Check for both 'admin' and 'super_admin' roles
      const isSystemAdmin = systemRoles && systemRoles.length > 0 && 
        (systemRoles[0]?.role === 'admin' || systemRoles[0]?.role === 'super_admin');
      
      console.log('System roles:', systemRoles);
      console.log('Is system admin?', isSystemAdmin);
      
      // DEVELOPMENT BYPASS: Allow all users to create organizations
      // Remove this in production
      const devBypassEnabled = false;
      
      if (devBypassEnabled) {
        console.log('Development bypass enabled: All users can create organizations');
        setCanCreateOrg(true);
        return;
      }
      
      setCanCreateOrg(isSystemAdmin || isFirstOrg);
    };
    
    // Trigger checkUserPermissions only if user is loaded
    if (user) {
      checkUserPermissions();
    }
  }, [user, navigate]); // Depend on user from useAuth

  // If user already has an organization and isn't allowed to create another, redirect to dashboard
  useEffect(() => {
    if (currentOrganization && !canCreateOrg && user) { // Ensure user is loaded before this check
      navigate('/');
    }
  }, [currentOrganization, navigate, canCreateOrg, user]); 

  const uploadOrgAvatar = async (orgId: string, orgAvatar: File): Promise<string | null> => {
    try {
      const fileExt = orgAvatar.name.split('.').pop();
      const filePath = `org-${orgId}-${Math.random()}.${fileExt}`;
      
      // Upload the file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('org-avatars')
        .upload(filePath, orgAvatar);
      
      if (uploadError) {
        throw uploadError;
      }
      
      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('org-avatars')
        .getPublicUrl(filePath);
        
      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading organization avatar:', error);
      toast.error("Could not upload organization logo");
      return null;
    }
  };

  const handleCreateOrganization = async (orgName: string, orgAvatar: File | null) => {
    if (!user) {
      toast.error("User not authenticated.");
      setIsSubmitting(false);
      return;
    }

    if (!orgName.trim()) {
      toast.error("Organization name cannot be empty.");
      setIsSubmitting(false);
      return;
    }

    try {
      setIsSubmitting(true);

      // 1. Create the organization
      const { data: newOrgData, error: orgError } = await supabase
        .from('organizations')
        .insert({ name: orgName.trim() }) // avatar_url will be updated later if provided
        .select()
        .single();

      if (orgError || !newOrgData) {
        console.error('Error creating organization:', orgError);
        toast.error(orgError?.message || 'Failed to create organization record.');
        setIsSubmitting(false);
        return;
      }

      const newOrgId = newOrgData.id;

      // 2. Create the organization membership for the current user (as 'owner' or 'admin')
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: newOrgId,
          user_id: user.id,
          role: 'owner' // Or 'admin', depending on desired default role for creator
        });

      if (memberError) {
        console.error('Error creating organization membership:', memberError);
        // Attempt to delete the organization if membership fails (rollback)
        await supabase.from('organizations').delete().eq('id', newOrgId);
        toast.error(memberError.message || 'Failed to assign user to new organization.');
        setIsSubmitting(false);
        return;
      }
      
      let finalAvatarUrl = null;
      // 3. If avatar is provided, upload it and update the organization
      if (orgAvatar) {
        finalAvatarUrl = await uploadOrgAvatar(newOrgId, orgAvatar);
        if (finalAvatarUrl) {
          const { error: avatarUpdateError } = await supabase
            .from('organizations')
            .update({ avatar_url: finalAvatarUrl })
            .eq('id', newOrgId);
          
          if (avatarUpdateError) {
            console.warn('Failed to update organization with avatar:', avatarUpdateError);
            toast.info('Organization created, but logo upload failed.');
            // Not returning, org is created, avatar is just a bonus
          }
        }
      }
      
      toast.success(`Organization "${newOrgData.name}" created successfully`);
      
      // 4. Refresh user data in AuthContext to pick up new organization and membership
      if (fetchUserData && user) {
        await fetchUserData(user); 
      }
      
      navigate('/'); // Navigate to dashboard or new org page

    } catch (error) {
      console.error('Error in handleCreateOrganization:', error);
      toast.error(error instanceof Error ? error.message : 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    handleCreateOrganization,
    isSubmitting,
    canCreateOrg
  };
};
