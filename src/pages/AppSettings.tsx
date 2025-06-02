import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Bell, Moon, Globe, Eye } from "lucide-react";
import ThemeSettings from "@/components/settings/ThemeSettings";
import NotificationSettings from "@/components/settings/NotificationSettings";
import DisplaySettings from "@/components/settings/DisplaySettings";
import LanguageSettings from "@/components/settings/LanguageSettings";

const AppSettings = () => {
  const [activeTab, setActiveTab] = useState("theme");
  
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="h-5 w-5" />
        <h1 className="text-2xl font-bold">App Settings</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Personalize Your Experience</CardTitle>
          <CardDescription>
            Configure how your inventory management system looks and behaves to match your preferences.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs 
            defaultValue="theme" 
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid grid-cols-4 mb-6">
              <TabsTrigger value="theme" className="flex items-center gap-2">
                <Moon className="h-4 w-4" />
                <span className="hidden sm:inline">Theme</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                <span className="hidden sm:inline">Notifications</span>
              </TabsTrigger>
              <TabsTrigger value="display" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                <span className="hidden sm:inline">Display</span>
              </TabsTrigger>
              <TabsTrigger value="language" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                <span className="hidden sm:inline">Language</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="theme">
              <ThemeSettings />
            </TabsContent>
            
            <TabsContent value="notifications">
              <NotificationSettings />
            </TabsContent>
            
            <TabsContent value="display">
              <DisplaySettings />
            </TabsContent>
            
            <TabsContent value="language">
              <LanguageSettings />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AppSettings;
