import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Eye, Layout, Type, Table } from "lucide-react";
import { useSettings } from "./SettingsContext";
import { toast } from "sonner";

const DisplaySettings = () => {
  const { settings, updateSetting } = useSettings();
  
  const handleFontSizeChange = (value: number[]) => {
    updateSetting('fontSize', value[0]);
    toast.success(`Font size set to ${value[0]}px`);
  };
  
  const handleDenseModeChange = (checked: boolean) => {
    updateSetting('denseMode', checked);
    toast.success(`Dense mode ${checked ? 'enabled' : 'disabled'}`);
  };
  
  const handleAnimationsChange = (checked: boolean) => {
    updateSetting('animationsEnabled', checked);
    toast.success(`Animations ${checked ? 'enabled' : 'disabled'}`);
  };
  
  const handleTableRowsChange = (value: string) => {
    updateSetting('tableRows', value);
    toast.success(`Default table rows set to ${value}`);
  };

  return (
    <div className="space-y-6">
      {/* Layout Options */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Layout className="h-4 w-4" />
            Layout Options
          </CardTitle>
          <CardDescription>
            Customize how content is displayed and spaced
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Dense Mode</Label>
              <p className="text-xs text-muted-foreground">
                Show more content with compact spacing and reduced padding
              </p>
              {settings.denseMode && (
                <Badge variant="secondary" className="text-xs">
                  Compact layout active
                </Badge>
              )}
            </div>
            <Switch 
              checked={settings.denseMode}
              onCheckedChange={handleDenseModeChange}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Enable Animations</Label>
              <p className="text-xs text-muted-foreground">
                Use smooth transitions and animations for UI interactions
              </p>
              {!settings.animationsEnabled && (
                <Badge variant="outline" className="text-xs">
                  Reduced motion
                </Badge>
              )}
            </div>
            <Switch 
              checked={settings.animationsEnabled}
              onCheckedChange={handleAnimationsChange}
            />
          </div>
        </CardContent>
      </Card>
      
      <Separator />
      
      {/* Typography */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Type className="h-4 w-4" />
            Typography
          </CardTitle>
          <CardDescription>
            Adjust text size and readability options
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Font Size: {settings.fontSize}px</Label>
              <Badge variant="outline" className="text-xs">
                {settings.fontSize < 14 ? 'Small' : settings.fontSize > 16 ? 'Large' : 'Medium'}
              </Badge>
            </div>
            <Slider 
              value={[settings.fontSize]}
              min={12} 
              max={18} 
              step={1} 
              onValueChange={handleFontSizeChange}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Small (12px)</span>
              <span>Medium (14px)</span>
              <span>Large (18px)</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Separator />
      
      {/* Data Display */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Table className="h-4 w-4" />
            Data Display
          </CardTitle>
          <CardDescription>
            Configure how data tables and lists are presented
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Default Table Rows</Label>
              <Select value={settings.tableRows} onValueChange={handleTableRowsChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select number of rows" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 rows</SelectItem>
                  <SelectItem value="10">10 rows</SelectItem>
                  <SelectItem value="25">25 rows</SelectItem>
                  <SelectItem value="50">50 rows</SelectItem>
                  <SelectItem value="100">100 rows</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Default number of rows to display in data tables and inventory lists
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DisplaySettings;
