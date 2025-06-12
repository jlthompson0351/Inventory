import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Palette, Check, Brush } from 'lucide-react';
import { useOrganizationSettings } from '../OrganizationSettingsContext';
import { toast } from 'sonner';

const OrganizationAppearanceSettings = () => {
  const { settings, updateSetting } = useOrganizationSettings();

  const handlePrimaryColorChange = (color: string) => {
    updateSetting('primaryColor', color);
    toast.success(`Primary color set to ${color}`);
  };

  const handleCustomThemeChange = (checked: boolean) => {
    updateSetting('customTheme', checked);
    toast.success(`Custom theme ${checked ? 'enabled' : 'disabled'}`);
  };

  const colorOptions = [
    { value: "blue", label: "Blue", bgClass: "bg-blue-500", description: "Professional blue" },
    { value: "green", label: "Green", bgClass: "bg-green-500", description: "Growth green" },
    { value: "purple", label: "Purple", bgClass: "bg-purple-500", description: "Creative purple" },
    { value: "red", label: "Red", bgClass: "bg-red-500", description: "Bold red" },
    { value: "amber", label: "Amber", bgClass: "bg-amber-500", description: "Warm amber" },
    { value: "teal", label: "Teal", bgClass: "bg-teal-500", description: "Modern teal" }
  ];

  return (
    <div className="space-y-6">
      {/* Theme Options */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Brush className="h-4 w-4" />
            Theme Options
          </CardTitle>
          <CardDescription>
            Customize your organization's visual appearance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Enable Custom Theme</Label>
              <p className="text-xs text-muted-foreground">
                Allow custom branding and color schemes for your organization
              </p>
              {settings.customTheme && (
                <Badge variant="secondary" className="text-xs">
                  Custom branding active
                </Badge>
              )}
            </div>
            <Switch 
              checked={settings.customTheme}
              onCheckedChange={handleCustomThemeChange}
            />
          </div>
        </CardContent>
      </Card>
      
      <Separator />
      
      {/* Primary Color Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Primary Color
          </CardTitle>
          <CardDescription>
            Choose a primary color for your organization's interface
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {colorOptions.map((color) => (
              <div key={color.value} className="text-center space-y-2">
                <button
                  className={`w-16 h-16 rounded-xl ${color.bgClass} flex items-center justify-center transition-all hover:scale-105 hover:shadow-md border-2 ${
                    settings.primaryColor === color.value ? 'border-foreground shadow-lg' : 'border-transparent'
                  }`}
                  onClick={() => handlePrimaryColorChange(color.value)}
                >
                  {settings.primaryColor === color.value && (
                    <Check className="h-6 w-6 text-white drop-shadow" />
                  )}
                </button>
                <div className="space-y-1">
                  <div className="text-sm font-medium">{color.label}</div>
                  <div className="text-xs text-muted-foreground">{color.description}</div>
                  {settings.primaryColor === color.value && (
                    <Badge variant="default" className="text-xs">
                      Active
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      <Separator />
      
      {/* Preview Section */}
      <Card className="bg-muted/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Preview</CardTitle>
          <CardDescription>
            See how your branding choices will look
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 border rounded-lg bg-background">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-8 h-8 rounded-md ${colorOptions.find(c => c.value === settings.primaryColor)?.bgClass || 'bg-blue-500'}`} />
                <div>
                  <div className="font-semibold">Sample Organization Interface</div>
                  <div className="text-sm text-muted-foreground">How your app will look</div>
                </div>
              </div>
              <div className="space-y-2">
                <div className={`h-2 rounded-full ${colorOptions.find(c => c.value === settings.primaryColor)?.bgClass || 'bg-blue-500'} w-3/4`} />
                <div className="h-2 rounded-full bg-muted w-1/2" />
                <div className="h-2 rounded-full bg-muted w-2/3" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              This preview shows how your selected colors will appear in the interface
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrganizationAppearanceSettings; 