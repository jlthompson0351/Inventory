
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import OrganizationAvatar from '@/components/common/OrganizationAvatar';
import { useNavigate } from 'react-router-dom';

interface OrganizationSetupFormProps {
  onSubmit: (orgName: string, orgAvatar: File | null) => Promise<void>;
  isSubmitting: boolean;
}

const OrganizationSetupForm: React.FC<OrganizationSetupFormProps> = ({ 
  onSubmit, 
  isSubmitting 
}) => {
  const [orgName, setOrgName] = useState('');
  const [orgAvatar, setOrgAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
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

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!orgName.trim()) {
      toast.error('Organization name cannot be empty');
      return;
    }

    await onSubmit(orgName, orgAvatar);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">
          Create Your Organization
        </CardTitle>
        <CardDescription className="text-center">
          Set up your organization to get started with inventory management
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleFormSubmit}>
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
  );
};

export default OrganizationSetupForm;
