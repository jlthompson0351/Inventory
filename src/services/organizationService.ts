
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
