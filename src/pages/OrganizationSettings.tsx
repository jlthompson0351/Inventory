
import React, { useState, useEffect } from 'react';
import { useOrganization } from '@/hooks/useOrganization';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import OrganizationAvatar from '@/components/common/OrganizationAvatar';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

const OrganizationSettings = () => {
  const { currentOrganization, updateOrganization } = useOrganization();
  const [orgName, setOrgName] = useState('');
  const [orgAvatar, setOrgAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (currentOrganization) {
      setOrgName(currentOrganization.name);
      setAvatarPreview(currentOrganization.avatarUrl || null);
    }
  }, [currentOrganization]);

  // Handle file change for avatar upload
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      setOrgAvatar(null);
      return;
    }
    
    const file = e.target.files[0];
    setOrgAvatar(file);
    
    // Create a preview URL
    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);
    
    return () => URL.revokeObjectURL(objectUrl);
  };

  const uploadOrgAvatar = async (orgId: string, file: File): Promise<string | null> => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentOrganization) {
      toast.error("No organization selected");
      return;
    }

    if (!orgName.trim()) {
      toast.error('Organization name cannot be empty');
      return;
    }

    setIsSubmitting(true);
    try {
      let avatarUrl = currentOrganization.avatarUrl;
      
      // If avatar is provided, upload it
      if (orgAvatar) {
        const newAvatarUrl = await uploadOrgAvatar(currentOrganization.id, orgAvatar);
        if (newAvatarUrl) {
          avatarUrl = newAvatarUrl;
        }
      }
      
      // Update organization
      await updateOrganization(currentOrganization.id, { 
        name: orgName, 
        avatar_url: avatarUrl 
      });
      
      toast.success("Organization updated successfully");
    } catch (error) {
      console.error("Error updating organization:", error);
      toast.error("Failed to update organization");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentOrganization) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">No Organization Selected</h2>
          <p className="text-muted-foreground mb-4">Please select or create an organization.</p>
          <Button onClick={() => navigate('/organization-setup')}>
            Create Organization
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Organization Settings</h1>
      
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>Update your organization's basic information</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="org-name">Organization Name</Label>
              <Input 
                id="org-name"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Enter organization name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="org-avatar">Organization Logo</Label>
              <div className="flex justify-center mb-4">
                <OrganizationAvatar 
                  src={avatarPreview} 
                  name={orgName} 
                  size="lg" 
                />
              </div>
              <Input 
                id="org-avatar"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
              />
              <p className="text-xs text-muted-foreground">
                Upload a logo for your organization (optional)
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default OrganizationSettings;
