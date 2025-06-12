import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { uploadOrgAvatar as uploadOrgAvatarService } from '@/services/organizationService';

// Define the organization settings interface
export interface OrganizationSettings {
  // General settings
  name: string;
  description: string;
  avatarFile: File | null;
  avatarUrl: string | null;
  
  // Appearance settings
  primaryColor: string;
  logoUrl: string | null;
  customTheme: boolean;
  
  // Notification settings
  emailNotifications: boolean;
  slackIntegration: boolean;
  weeklyReports: boolean;
  memberJoinNotifications: boolean;
  
  // Advanced settings
  allowMemberInvites: boolean;
  requireApprovalForJoining: boolean;
  maxMembers: number;
  defaultRole: 'member' | 'manager';
}

interface OrganizationSettingsContextType {
  settings: OrganizationSettings;
  originalSettings: OrganizationSettings;
  updateSetting: <K extends keyof OrganizationSettings>(key: K, value: OrganizationSettings[K]) => void;
  resetSettings: () => void;
  saveSettings: () => Promise<void>;
  hasUnsavedChanges: boolean;
  isLoading: boolean;
  isSaving: boolean;
}

const OrganizationSettingsContext = createContext<OrganizationSettingsContextType | undefined>(undefined);

export const useOrganizationSettings = () => {
  const context = useContext(OrganizationSettingsContext);
  if (!context) {
    throw new Error('useOrganizationSettings must be used within an OrganizationSettingsProvider');
  }
  return context;
};

interface OrganizationSettingsProviderProps {
  children: ReactNode;
}

// Default settings based on organization data
const createDefaultSettings = (organization: any): OrganizationSettings => ({
  // General - only fields that exist in the database
  name: organization?.name || '',
  description: organization?.description || '',
  avatarFile: null,
  avatarUrl: organization?.avatar_url || null,
  
  // Appearance - default values since these don't exist in DB yet
  primaryColor: 'blue',
  logoUrl: null,
  customTheme: false,
  
  // Notifications - default values since these don't exist in DB yet
  emailNotifications: true,
  slackIntegration: false,
  weeklyReports: false,
  memberJoinNotifications: false,
  
  // Advanced - default values since these don't exist in DB yet
  allowMemberInvites: true,
  requireApprovalForJoining: false,
  maxMembers: 50,
  defaultRole: 'member'
});

export const OrganizationSettingsProvider: React.FC<OrganizationSettingsProviderProps> = ({ children }) => {
  const { organization, fetchUserData, user } = useAuth();
  const [settings, setSettings] = useState<OrganizationSettings>(createDefaultSettings(null));
  const [originalSettings, setOriginalSettings] = useState<OrganizationSettings>(createDefaultSettings(null));
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load settings from organization data
  useEffect(() => {
    if (organization) {
      const defaultSettings = createDefaultSettings(organization);
      setSettings(defaultSettings);
      setOriginalSettings(defaultSettings);
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }
  }, [organization]);

  // Check if there are unsaved changes
  const hasUnsavedChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);

  const updateSetting = <K extends keyof OrganizationSettings>(key: K, value: OrganizationSettings[K]) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const saveSettings = async () => {
    if (!organization) {
      toast.error('No organization context available');
      return;
    }

    setIsSaving(true);
    try {
      let newAvatarUrl = settings.avatarUrl;
      
      // Handle avatar upload if a new file is selected
      if (settings.avatarFile) {
        const uploadedUrl = await uploadOrgAvatarService(organization.id, settings.avatarFile);
        if (uploadedUrl) {
          newAvatarUrl = uploadedUrl;
        } else {
          toast.error("Failed to upload avatar. Other changes will still be saved.");
        }
      }

      // Prepare update data - only update columns that exist in the database
      const updates = {
        name: settings.name.trim(),
        description: settings.description.trim(),
        avatar_url: newAvatarUrl,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('organizations')
        .update(updates)
        .eq('id', organization.id);

      if (error) throw error;

      // Update the avatar URL in settings and reset avatar file
      const updatedSettings = {
        ...settings,
        avatarUrl: newAvatarUrl,
        avatarFile: null
      };
      
      setSettings(updatedSettings);
      setOriginalSettings(updatedSettings);
      
      toast.success('Organization settings saved successfully!');
      
      // Refresh user data to get updated organization info
      if (user) {
        await fetchUserData(user);
      }
      
    } catch (error) {
      console.error('Failed to save organization settings:', error);
      toast.error('Failed to save organization settings');
    } finally {
      setIsSaving(false);
    }
  };

  const resetSettings = () => {
    setSettings(originalSettings);
    toast.success('Settings reset to last saved values');
  };

  return (
    <OrganizationSettingsContext.Provider
      value={{
        settings,
        originalSettings,
        updateSetting,
        resetSettings,
        saveSettings,
        hasUnsavedChanges,
        isLoading,
        isSaving
      }}
    >
      {children}
    </OrganizationSettingsContext.Provider>
  );
}; 