
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';

export const useOrganizationSetup = () => {
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

  // If user already has organizations and isn't a system admin, redirect to dashboard
  useEffect(() => {
    if (organizations && organizations.length > 0 && !canCreateOrg) {
      navigate('/');
    }
  }, [organizations, navigate, canCreateOrg]);

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
    try {
      setIsSubmitting(true);
      const newOrg = await createOrganization(orgName);
      
      if (newOrg) {
        // If avatar is provided, upload it and update the organization
        if (orgAvatar) {
          const avatarUrl = await uploadOrgAvatar(newOrg.id, orgAvatar);
          
          if (avatarUrl) {
            // Update organization with avatar URL
            await supabase
              .from('organizations')
              .update({ avatar_url: avatarUrl })
              .eq('id', newOrg.id);
          }
        }
        
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

  return {
    handleCreateOrganization,
    isSubmitting,
    canCreateOrg
  };
};
