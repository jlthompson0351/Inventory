
import { useState } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const LanguageSettings = () => {
  const [language, setLanguage] = useState("en");
  const [dateFormat, setDateFormat] = useState("MM/DD/YYYY");
  const [timeFormat, setTimeFormat] = useState("12h");
  
  const handleLanguageChange = (value: string) => {
    setLanguage(value);
    toast.success(`Language set to ${value === 'en' ? 'English' : value === 'es' ? 'Spanish' : value === 'fr' ? 'French' : 'German'}`);
  };
  
  const handleDateFormatChange = (value: string) => {
    setDateFormat(value);
    toast.success(`Date format set to ${value}`);
  };
  
  const handleTimeFormatChange = (value: string) => {
    setTimeFormat(value);
    toast.success(`Time format set to ${value === '12h' ? '12-hour' : '24-hour'}`);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="font-medium">Interface Language</h3>
        <Select value={language} onValueChange={handleLanguageChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select language" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="es">Spanish</SelectItem>
            <SelectItem value="fr">French</SelectItem>
            <SelectItem value="de">German</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-4">
        <h3 className="font-medium">Date Format</h3>
        <RadioGroup value={dateFormat} onValueChange={handleDateFormatChange}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="MM/DD/YYYY" id="date-format-1" />
            <Label htmlFor="date-format-1">MM/DD/YYYY (US)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="DD/MM/YYYY" id="date-format-2" />
            <Label htmlFor="date-format-2">DD/MM/YYYY (Europe)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="YYYY-MM-DD" id="date-format-3" />
            <Label htmlFor="date-format-3">YYYY-MM-DD (ISO)</Label>
          </div>
        </RadioGroup>
      </div>
      
      <div className="space-y-4">
        <h3 className="font-medium">Time Format</h3>
        <RadioGroup value={timeFormat} onValueChange={handleTimeFormatChange}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="12h" id="time-format-1" />
            <Label htmlFor="time-format-1">12-hour (1:30 PM)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="24h" id="time-format-2" />
            <Label htmlFor="time-format-2">24-hour (13:30)</Label>
          </div>
        </RadioGroup>
      </div>
    </div>
  );
};

export default LanguageSettings;
