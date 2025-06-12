import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, Bell, Moon, Globe, Eye, RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { SettingsProvider, useSettings } from "@/components/settings/SettingsContext";
import ThemeSettings from "@/components/settings/ThemeSettings";
import NotificationSettings from "@/components/settings/NotificationSettings";
import DisplaySettings from "@/components/settings/DisplaySettings";
import LanguageSettings from "@/components/settings/LanguageSettings";

const AppSettingsContent = () => {
  const [activeTab, setActiveTab] = useState("theme");
  const { hasUnsavedChanges, saveSettings, resetSettings, isLoading } = useSettings();
  
  const settingsTabs = [
    {
      value: "theme",
      label: "Theme",
      icon: <Moon className="h-4 w-4" />,
      description: "Appearance and colors"
    },
    {
      value: "notifications", 
      label: "Notifications",
      icon: <Bell className="h-4 w-4" />,
      description: "Alerts and updates"
    },
    {
      value: "display",
      label: "Display", 
      icon: <Eye className="h-4 w-4" />,
      description: "Layout and sizing"
    },
    {
      value: "language",
      label: "Language",
      icon: <Globe className="h-4 w-4" />,
      description: "Localization options"
    }
  ];

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-7xl">
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-2">
            <Spinner className="h-5 w-5" />
            <span>Loading settings...</span>
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
          <div className="p-2 bg-primary/10 rounded-md">
            <Settings className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">App Settings</h1>
            <p className="text-sm text-muted-foreground">
              Customize your experience and preferences
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
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset to Defaults
          </Button>
          <Button
            size="sm"
            onClick={saveSettings}
            disabled={!hasUnsavedChanges}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            Save Changes
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
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsContent value="theme" className="mt-0">
                <ThemeSettings />
              </TabsContent>
              
              <TabsContent value="notifications" className="mt-0">
                <NotificationSettings />
              </TabsContent>
              
              <TabsContent value="display" className="mt-0">
                <DisplaySettings />
              </TabsContent>
              
              <TabsContent value="language" className="mt-0">
                <LanguageSettings />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
      
      {/* Help Text Footer */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground text-center">
            Settings are automatically saved to your browser and will persist across sessions.
            Need help? Contact your system administrator.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

const AppSettings = () => {
  return (
    <SettingsProvider>
      <AppSettingsContent />
    </SettingsProvider>
  );
};

export default AppSettings;
