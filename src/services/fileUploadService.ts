import { supabase } from '@/integrations/supabase/client';

/**
 * Uploads a file to Supabase storage
 * @param file The file to upload
 * @param organizationId The organization ID to associate the file with
 * @param path Optional path within the organization folder
 * @returns The full URL to the uploaded file
 */
export async function uploadFormFile(
  file: File, 
  organizationId: string,
  path: string = ''
): Promise<string> {
  if (!file) {
    throw new Error("No file provided");
  }

  // Create a unique file name to avoid collisions
  const timestamp = new Date().getTime();
  const fileExt = file.name.split('.').pop();
  const fileName = `${timestamp}-${file.name.replace(`.${fileExt}`, '')}.${fileExt}`;
  
  // Store in organization folder structure
  const storagePath = `${organizationId}/${path}/${fileName}`.replace(/\/+/g, '/');
  
  try {
    const { data, error } = await supabase.storage
      .from('form-uploads')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('form-uploads')
      .getPublicUrl(data.path);
      
    return publicUrl;
  } catch (error) {
    console.error('File upload failed:', error);
    throw error;
  }
}

/**
 * Deletes a file from Supabase storage
 * @param fileUrl The URL of the file to delete
 * @returns True if successful
 */
export async function deleteFormFile(fileUrl: string): Promise<boolean> {
  try {
    // Extract path from URL
    const url = new URL(fileUrl);
    const pathParts = url.pathname.split('/');
    const filePath = pathParts.slice(pathParts.indexOf('form-uploads') + 1).join('/');
    
    const { error } = await supabase.storage
      .from('form-uploads')
      .remove([filePath]);
    
    if (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('File deletion failed:', error);
    return false;
  }
} 