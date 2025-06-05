import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Upload an avatar for the organization
export const uploadOrgAvatar = async (orgId: string, file: File): Promise<string | null> => {
  try {
    const fileExt = file.name.split('.').pop();
    const filePath = `org-${orgId}-${Math.random()}.${fileExt}`;
    
    // Upload the file to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('org-avatars')
      .upload(filePath, file);
    
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

// Get the current user's organization
export const getUserOrganization = async (): Promise<any> => {
  try {
    // Get the current user's organization ID using our new function
    const { data: orgId, error: orgIdError } = await supabase.rpc('get_current_organization_id');
    
    if (orgIdError) throw orgIdError;
    
    if (!orgId) {
      return null;
    }
    
    // Get the organization details
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single();
      
    if (orgError) throw orgError;
    
    return org;
  } catch (error) {
    console.error('Error getting user organization:', error);
    return null;
  }
};

// Update the organization details
export const updateOrganization = async (orgId: string, updates: any): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('organizations')
      .update(updates)
      .eq('id', orgId);
      
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error('Error updating organization:', error);
    toast.error('Failed to update organization');
    return false;
  }
};
