
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useOrganization } from '@/hooks/useOrganization';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import OrganizationAvatar from '@/components/common/OrganizationAvatar';

const OrganizationSetup: React.FC = () => {
  const [orgName, setOrgName] = useState('');
  const [orgAvatar, setOrgAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [canCreateOrg, setCanCreateOrg] = useState(false);
  const { createOrganization, organizations } = useOrganization();
  const navigate = useNavigate();

  // Handle file change for avatar upload
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      setOrgAvatar(null);
      setAvatarPreview(null);
      return;
    }
    
    const file = e.target.files[0];
    setOrgAvatar(file);
    
    // Create a preview URL
    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);
    
    // Clean up the preview URL when the component unmounts
    return () => URL.revokeObjectURL(objectUrl);
  };

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

  const uploadOrgAvatar = async (orgId: string): Promise<string | null> => {
    if (!orgAvatar) return null;
    
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

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!orgName.trim()) {
      toast.error('Organization name cannot be empty');
      return;
    }

    try {
      setIsSubmitting(true);
      const newOrg = await createOrganization(orgName);
      
      if (newOrg) {
        // If avatar is provided, upload it and update the organization
        if (orgAvatar) {
          const avatarUrl = await uploadOrgAvatar(newOrg.id);
          
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

  // If user already has organizations and isn't a system admin, redirect to dashboard
  useEffect(() => {
    if (organizations && organizations.length > 0 && !canCreateOrg) {
      navigate('/');
    }
  }, [organizations, navigate, canCreateOrg]);

  if (!canCreateOrg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              Permission Denied
            </CardTitle>
            <CardDescription className="text-center">
              You don't have permission to create new organizations
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button 
              onClick={() => navigate('/')}
              className="w-full"
            >
              Return to Dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Create Your Organization
          </CardTitle>
          <CardDescription className="text-center">
            Set up your organization to get started with inventory management
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleCreateOrganization}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="organization-name">Organization Name</Label>
              <Input 
                id="organization-name"
                placeholder="Enter organization name" 
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="organization-avatar">Organization Logo</Label>
              <div className="flex justify-center mb-4">
                <OrganizationAvatar 
                  src={avatarPreview} 
                  name={orgName} 
                  size="lg" 
                />
              </div>
              <Input 
                id="organization-avatar"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
              />
              <p className="text-xs text-muted-foreground">
                Upload a logo for your organization (optional)
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Organization'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default OrganizationSetup;
