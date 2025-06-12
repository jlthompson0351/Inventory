import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Sun, Moon, Check } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useSettings } from "./SettingsContext";
import { toast } from "sonner";

const ThemeSettings = () => {
  const { settings, updateSetting } = useSettings();
  
  const handleThemeChange = (value: string) => {
    if (value && (value === 'light' || value === 'dark')) {
      updateSetting('theme', value);
      toast.success(`Theme set to ${value} mode`);
    }
  };
  
  const handleAccentColorChange = (value: string) => {
    updateSetting('accentColor', value);
    toast.success(`Accent color set to ${value}`);
  };
  
  const handleSystemPreferenceChange = (checked: boolean) => {
    updateSetting('useSystemPreference', checked);
    toast.success(checked ? "Using system theme preference" : "Using manual theme selection");
  };
  
  const colorOptions = [
    { value: "blue", label: "Blue", bgClass: "bg-blue-500", description: "Professional blue" },
    { value: "green", label: "Green", bgClass: "bg-green-500", description: "Nature green" },
    { value: "purple", label: "Purple", bgClass: "bg-purple-500", description: "Creative purple" },
    { value: "red", label: "Red", bgClass: "bg-red-500", description: "Bold red" },
    { value: "amber", label: "Amber", bgClass: "bg-amber-500", description: "Warm amber" }
  ];

  return (
    <div className="space-y-6">
      {/* System Theme Preference */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sun className="h-4 w-4" />
            System Preference
          </CardTitle>
          <CardDescription>
            Let your operating system control the theme automatically
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Use System Theme Preference</Label>
              <p className="text-xs text-muted-foreground">
                Automatically switch between light and dark mode based on your system settings
              </p>
              {settings.useSystemPreference && (
                <Badge variant="secondary" className="text-xs">
                  Following system settings
                </Badge>
              )}
            </div>
            <Switch 
              checked={settings.useSystemPreference} 
              onCheckedChange={handleSystemPreferenceChange}
            />
          </div>
        </CardContent>
      </Card>
      
      <Separator />
      
      {/* Manual Theme Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Moon className="h-4 w-4" />
            Theme Mode
          </CardTitle>
          <CardDescription>
            Choose between light and dark appearance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ToggleGroup 
            type="single" 
            value={settings.theme}
            onValueChange={handleThemeChange} 
            className="grid grid-cols-2 gap-3 w-full"
            disabled={settings.useSystemPreference}
          >
            <ToggleGroupItem 
              value="light" 
              className="flex flex-col items-center gap-2 p-4 h-auto data-[state=on]:bg-primary/10 data-[state=on]:border-primary/20"
            >
              <Sun className="h-5 w-5" />
              <div className="text-center">
                <div className="font-medium">Light</div>
                <div className="text-xs text-muted-foreground">Bright interface</div>
              </div>
            </ToggleGroupItem>
            <ToggleGroupItem 
              value="dark" 
              className="flex flex-col items-center gap-2 p-4 h-auto data-[state=on]:bg-primary/10 data-[state=on]:border-primary/20"
            >
              <Moon className="h-5 w-5" />
              <div className="text-center">
                <div className="font-medium">Dark</div>
                <div className="text-xs text-muted-foreground">Easy on eyes</div>
              </div>
            </ToggleGroupItem>
          </ToggleGroup>
          
          {settings.useSystemPreference && (
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Manual theme selection is disabled while using system preference
            </p>
          )}
        </CardContent>
      </Card>
      
      <Separator />
      
      {/* Accent Color Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Accent Color</CardTitle>
          <CardDescription>
            Choose a color that represents your style throughout the app
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-3">
            {colorOptions.map((color) => (
              <div key={color.value} className="text-center space-y-2">
                <button
                  className={`w-12 h-12 rounded-xl ${color.bgClass} flex items-center justify-center transition-all hover:scale-105 hover:shadow-md border-2 ${
                    settings.accentColor === color.value ? 'border-foreground shadow-lg' : 'border-transparent'
                  }`}
                  onClick={() => handleAccentColorChange(color.value)}
                >
                  {settings.accentColor === color.value && (
                    <Check className="h-5 w-5 text-white drop-shadow" />
                  )}
                </button>
                <div className="space-y-1">
                  <div className="text-xs font-medium">{color.label}</div>
                  <div className="text-xs text-muted-foreground">{color.description}</div>
                  {settings.accentColor === color.value && (
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
    </div>
  );
};

export default ThemeSettings;
