
import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const DisplaySettings = () => {
  const [settings, setSettings] = useState({
    denseMode: false,
    fontSize: 14,
    tableRows: "10",
    animationsEnabled: true
  });
  
  const handleFontSizeChange = (value: number[]) => {
    setSettings(prev => ({ ...prev, fontSize: value[0] }));
    toast.success(`Font size set to ${value[0]}px`);
  };
  
  const handleSwitchChange = (setting: string, value: boolean) => {
    setSettings(prev => ({ ...prev, [setting]: value }));
    toast.success(`${setting} ${value ? 'enabled' : 'disabled'}`);
  };
  
  const handleSelectChange = (value: string) => {
    setSettings(prev => ({ ...prev, tableRows: value }));
    toast.success(`Default table rows set to ${value}`);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Dense Mode</Label>
            <p className="text-sm text-muted-foreground">Show more content with compact spacing</p>
          </div>
          <Switch 
            checked={settings.denseMode}
            onCheckedChange={(checked) => handleSwitchChange("denseMode", checked)}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Enable Animations</Label>
            <p className="text-sm text-muted-foreground">Use animations for UI transitions</p>
          </div>
          <Switch 
            checked={settings.animationsEnabled}
            onCheckedChange={(checked) => handleSwitchChange("animationsEnabled", checked)}
          />
        </div>
      </div>
      
      <div className="space-y-4">
        <Label>Font Size: {settings.fontSize}px</Label>
        <Slider 
          defaultValue={[14]} 
          value={[settings.fontSize]}
          min={12} 
          max={18} 
          step={1} 
          onValueChange={handleFontSizeChange} 
        />
      </div>
      
      <div className="space-y-4">
        <Label>Default Table Rows</Label>
        <Select value={settings.tableRows} onValueChange={handleSelectChange}>
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
        <p className="text-sm text-muted-foreground">Default number of rows to show in tables</p>
      </div>
    </div>
  );
};

export default DisplaySettings;
