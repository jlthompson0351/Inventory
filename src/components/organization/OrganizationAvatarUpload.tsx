
import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import OrganizationAvatar from '@/components/common/OrganizationAvatar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface OrganizationAvatarUploadProps {
  orgName: string;
  avatarPreview: string | null;
  setAvatarPreview: (url: string | null) => void;
  setOrgAvatar: (file: File | null) => void;
}

const OrganizationAvatarUpload = ({ 
  orgName, 
  avatarPreview, 
  setAvatarPreview, 
  setOrgAvatar 
}: OrganizationAvatarUploadProps) => {
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

  return (
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
  );
};

export default OrganizationAvatarUpload;
