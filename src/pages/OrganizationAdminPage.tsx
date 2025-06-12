import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import AccessDeniedCard from '@/components/system-admin/AccessDeniedCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { 
  Building, 
  Users, 
  Paintbrush, 
  Bell, 
  Settings as SettingsIcon, 
  BarChart3,
  ChevronLeft,
  Save,
  RotateCcw
} from 'lucide-react';
import { OrganizationSettingsProvider, useOrganizationSettings } from '@/components/organization/OrganizationSettingsContext';
import OrganizationGeneralSettings from '@/components/organization/tabs/OrganizationGeneralSettings';
import OrganizationMembersSettings from '@/components/organization/tabs/OrganizationMembersSettings';
import OrganizationAppearanceSettings from '@/components/organization/tabs/OrganizationAppearanceSettings';
import OrganizationNotificationSettings from '@/components/organization/tabs/OrganizationNotificationSettings';
import OrganizationAdvancedSettings from '@/components/organization/tabs/OrganizationAdvancedSettings';
import OrganizationStatsSettings from '@/components/organization/tabs/OrganizationStatsSettings';

const OrganizationAdminContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState("general");
  const { hasUnsavedChanges, saveSettings, resetSettings, isLoading, isSaving } = useOrganizationSettings();
  const { organization } = useAuth();
  const navigate = useNavigate();

  const settingsTabs = [
    {
      value: "general",
      label: "General",
      icon: <Building className="h-4 w-4" />,
      description: "Basic organization information"
    },
    {
      value: "members", 
      label: "Members",
      icon: <Users className="h-4 w-4" />,
      description: "Manage team members"
    },
    {
      value: "appearance",
      label: "Appearance", 
      icon: <Paintbrush className="h-4 w-4" />,
      description: "Branding and themes"
    },
    {
      value: "notifications",
      label: "Notifications",
      icon: <Bell className="h-4 w-4" />,
      description: "Communication preferences"
    },
    {
      value: "advanced",
      label: "Advanced",
      icon: <SettingsIcon className="h-4 w-4" />,
      description: "Security and permissions"
    },
    {
      value: "statistics",
      label: "Statistics",
      icon: <BarChart3 className="h-4 w-4" />,
      description: "Analytics and reports"
    }
  ];

  const handleGoBack = () => {
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-7xl">
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-2">
            <Spinner className="h-5 w-5" />
            <span>Loading organization settings...</span>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto max-w-7xl space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleGoBack} 
            className="rounded-full h-8 w-8"
            title="Back to Dashboard"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="p-2 bg-primary/10 rounded-md">
            <Building className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Organization Settings</h1>
            <p className="text-sm text-muted-foreground">
              {organization?.name ? `Manage settings for ${organization.name}` : 'Manage your organization settings and preferences'}
            </p>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <Badge variant="secondary" className="text-amber-700 bg-amber-100">
              Unsaved Changes
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={resetSettings}
            disabled={isSaving}
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset Changes
          </Button>
          <Button
            size="sm"
            onClick={saveSettings}
            disabled={!hasUnsavedChanges || isSaving}
            className="flex items-center gap-2"
          >
            {isSaving ? (
              <Spinner className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
      
      <Separator />
      
      {/* Main Settings Content */}
      <div className="grid gap-6 lg:grid-cols-4">
        {/* Settings Navigation Sidebar */}
        <Card className="lg:col-span-1 h-fit">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Settings Categories</CardTitle>
            <CardDescription className="text-sm">
              Choose a category to configure
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {settingsTabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all hover:bg-muted/50 ${
                  activeTab === tab.value 
                    ? 'bg-primary/10 text-primary border border-primary/20' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className={`p-1.5 rounded-md ${
                  activeTab === tab.value ? 'bg-primary/20' : 'bg-muted'
                }`}>
                  {tab.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{tab.label}</div>
                  <div className="text-xs text-muted-foreground line-clamp-1">
                    {tab.description}
                  </div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
        
        {/* Settings Content Area */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center gap-2">
              {settingsTabs.find(tab => tab.value === activeTab)?.icon}
              <CardTitle>
                {settingsTabs.find(tab => tab.value === activeTab)?.label} Settings
              </CardTitle>
            </div>
            <CardDescription>
              {settingsTabs.find(tab => tab.value === activeTab)?.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activeTab === "general" && <OrganizationGeneralSettings />}
            {activeTab === "members" && <OrganizationMembersSettings />}
            {activeTab === "appearance" && <OrganizationAppearanceSettings />}
            {activeTab === "notifications" && <OrganizationNotificationSettings />}
            {activeTab === "advanced" && <OrganizationAdvancedSettings />}
            {activeTab === "statistics" && <OrganizationStatsSettings />}
          </CardContent>
        </Card>
      </div>
      
      {/* Help Text Footer */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground text-center">
            Organization settings affect all members and are saved automatically when you click "Save Changes".
            Need help? Contact your system administrator.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

const OrganizationAdminPage: React.FC = () => {
  const { userRoles } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!userRoles.isOrgAdmin) {
      navigate('/');
      return;
    }
  }, [userRoles.isOrgAdmin, navigate]);

  if (!userRoles.isOrgAdmin) {
    return <AccessDeniedCard />;
  }

  return (
    <OrganizationSettingsProvider>
      <OrganizationAdminContent />
    </OrganizationSettingsProvider>
  );
};

export default OrganizationAdminPage; 