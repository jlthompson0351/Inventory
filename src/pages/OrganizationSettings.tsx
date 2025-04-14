
import React, { useState, useEffect } from 'react';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building, MailIcon, Paintbrush, Settings } from 'lucide-react';
import { uploadOrgAvatar } from '@/services/organizationService';
import GeneralSettingsTab from '@/components/organization/tabs/GeneralSettingsTab';
import PlaceholderTab from '@/components/organization/tabs/PlaceholderTab';

const OrganizationSettings = () => {
  const { currentOrganization, updateOrganization } = useOrganization();
  const [orgName, setOrgName] = useState('');
  const [orgDescription, setOrgDescription] = useState('');
  const [orgAvatar, setOrgAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const navigate = useNavigate();

  useEffect(() => {
    if (currentOrganization) {
      setOrgName(currentOrganization.name);
      setAvatarPreview(currentOrganization.avatarUrl || null);
    }
  }, [currentOrganization]);

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
          <button onClick={() => navigate('/organization-setup')}>
            Create Organization
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Organization Settings</h1>
      
      <Tabs defaultValue="general" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 grid grid-cols-2 md:grid-cols-4 w-full max-w-2xl mx-auto">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            <span className="hidden sm:inline">General</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <Paintbrush className="h-4 w-4" />
            <span className="hidden sm:inline">Appearance</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <MailIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Advanced</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <GeneralSettingsTab
            orgName={orgName}
            setOrgName={setOrgName}
            orgDescription={orgDescription}
            setOrgDescription={setOrgDescription}
            avatarPreview={avatarPreview}
            setAvatarPreview={setAvatarPreview}
            setOrgAvatar={setOrgAvatar}
            handleSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        </TabsContent>
        
        <TabsContent value="appearance">
          <PlaceholderTab 
            title="Appearance Settings" 
            description="Customize how your organization looks" 
          />
        </TabsContent>
        
        <TabsContent value="notifications">
          <PlaceholderTab 
            title="Notification Settings" 
            description="Manage how you receive notifications" 
          />
        </TabsContent>
        
        <TabsContent value="advanced">
          <PlaceholderTab 
            title="Advanced Settings" 
            description="Manage advanced organization options" 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OrganizationSettings;
