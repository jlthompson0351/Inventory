
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Sun, Moon, Laptop, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

const ThemeSettings = () => {
  const [theme, setTheme] = useState("light");
  const [accentColor, setAccentColor] = useState("blue");
  const [useSystemPreference, setUseSystemPreference] = useState(false);
  
  const handleThemeChange = (value: string) => {
    setTheme(value);
    toast.success(`Theme set to ${value} mode`);
  };
  
  const handleAccentColorChange = (value: string) => {
    setAccentColor(value);
    toast.success(`Accent color set to ${value}`);
  };
  
  const colorOptions = [
    { value: "blue", label: "Blue", bgClass: "bg-blue-500" },
    { value: "green", label: "Green", bgClass: "bg-green-500" },
    { value: "purple", label: "Purple", bgClass: "bg-purple-500" },
    { value: "red", label: "Red", bgClass: "bg-red-500" },
    { value: "amber", label: "Amber", bgClass: "bg-amber-500" }
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Use System Theme Preference</h3>
          <Switch 
            checked={useSystemPreference} 
            onCheckedChange={(checked) => {
              setUseSystemPreference(checked);
              toast.success(checked ? "Using system theme preference" : "Using manual theme selection");
            }} 
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Automatically switch between light and dark mode based on your system settings
        </p>
      </div>
      
      <div className="space-y-4">
        <h3 className="font-medium">Theme Mode</h3>
        <ToggleGroup 
          type="single" 
          value={theme}
          onValueChange={handleThemeChange} 
          className="flex justify-start"
          disabled={useSystemPreference}
        >
          <ToggleGroupItem value="light" className="flex items-center gap-2">
            <Sun className="h-4 w-4" />
            <span>Light</span>
          </ToggleGroupItem>
          <ToggleGroupItem value="dark" className="flex items-center gap-2">
            <Moon className="h-4 w-4" />
            <span>Dark</span>
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      
      <div className="space-y-4">
        <h3 className="font-medium">Accent Color</h3>
        <div className="grid grid-cols-5 gap-2">
          {colorOptions.map((color) => (
            <button
              key={color.value}
              className={`h-8 w-8 rounded-full ${color.bgClass} flex items-center justify-center`}
              onClick={() => handleAccentColorChange(color.value)}
            >
              {accentColor === color.value && (
                <Check className="h-4 w-4 text-white" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ThemeSettings;
