import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Building, FileText, Upload } from 'lucide-react';
import { useOrganizationSettings } from '../OrganizationSettingsContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const OrganizationGeneralSettings = () => {
  const { settings, updateSetting } = useOrganizationSettings();

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }

      updateSetting('avatarFile', file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        updateSetting('avatarUrl', e.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      toast.success('Avatar selected - remember to save changes');
    }
  };

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building className="h-4 w-4" />
            Basic Information
          </CardTitle>
          <CardDescription>
            Update your organization's basic details and identity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="org-name" className="text-sm font-medium">Organization Name</Label>
            <Input 
              id="org-name"
              value={settings.name}
              onChange={(e) => updateSetting('name', e.target.value)}
              placeholder="Enter organization name"
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              This name will be visible to all members and in reports
            </p>
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <Label htmlFor="org-description" className="text-sm font-medium">Description</Label>
            <Textarea 
              id="org-description"
              value={settings.description}
              onChange={(e) => updateSetting('description', e.target.value)}
              placeholder="Enter a brief description of your organization"
              className="min-h-[100px] w-full"
            />
            <p className="text-xs text-muted-foreground">
              Optional description to help members understand your organization's purpose
            </p>
          </div>
        </CardContent>
      </Card>
      
      <Separator />
      
      {/* Organization Avatar */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Organization Avatar
          </CardTitle>
          <CardDescription>
            Upload a logo or avatar to represent your organization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              {settings.avatarUrl ? (
                <img 
                  src={settings.avatarUrl} 
                  alt="Organization avatar" 
                  className="w-16 h-16 rounded-lg object-cover border border-border"
                />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center border border-border">
                  <Building className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="flex-1 space-y-3">
              <div className="space-y-2">
                <Label htmlFor="avatar-upload" className="text-sm font-medium">Upload New Avatar</Label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/80"
                />
                {settings.avatarFile && (
                  <Badge variant="secondary" className="text-xs">
                    New avatar selected
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Recommended: Square image, at least 200x200 pixels, max 5MB
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Separator />
      
      {/* Organization Info Summary */}
      <Card className="bg-muted/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Summary
          </CardTitle>
          <CardDescription>
            Review your organization information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Organization Name:</span>
              <span className="text-sm text-muted-foreground">
                {settings.name || 'Not set'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Description:</span>
              <span className="text-sm text-muted-foreground">
                {settings.description ? `${settings.description.substring(0, 50)}${settings.description.length > 50 ? '...' : ''}` : 'Not set'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Avatar:</span>
              <span className="text-sm text-muted-foreground">
                {settings.avatarUrl ? 'Set' : 'Not set'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrganizationGeneralSettings; 