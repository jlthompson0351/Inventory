
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import OrganizationAvatarUpload from '@/components/organization/OrganizationAvatarUpload';
import { useNavigate } from 'react-router-dom';

interface GeneralSettingsTabProps {
  orgName: string;
  setOrgName: (name: string) => void;
  orgDescription: string;
  setOrgDescription: (description: string) => void;
  avatarPreview: string | null;
  setAvatarPreview: (url: string | null) => void;
  setOrgAvatar: (file: File | null) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  isSubmitting: boolean;
}

const GeneralSettingsTab = ({
  orgName,
  setOrgName,
  orgDescription,
  setOrgDescription,
  avatarPreview,
  setAvatarPreview,
  setOrgAvatar,
  handleSubmit,
  isSubmitting
}: GeneralSettingsTabProps) => {
  const navigate = useNavigate();
  
  return (
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
            <Label htmlFor="org-description">Organization Description (Optional)</Label>
            <Textarea 
              id="org-description"
              value={orgDescription}
              onChange={(e) => setOrgDescription(e.target.value)}
              placeholder="Enter a brief description of your organization"
              className="min-h-[100px]"
            />
          </div>

          <OrganizationAvatarUpload
            orgName={orgName}
            avatarPreview={avatarPreview}
            setAvatarPreview={setAvatarPreview}
            setOrgAvatar={setOrgAvatar}
          />
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
  );
};

export default GeneralSettingsTab;
