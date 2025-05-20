import React, { useState, useEffect } from 'react';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export interface BarcodeToggleProps {
  // Legacy props
  enabled?: boolean;
  barcodeType?: string;
  type?: string;
  prefix?: string;
  onChange?: (settings: {
    enabled: boolean;
    barcodeType: string;
    prefix: string;
  }) => void;
  onBarcodeSettingsChange?: (settings: {
    enabled: boolean;
    type: string;
    prefix: string;
  }) => void;
  
  // New props
  initialSettings?: {
    enabled: boolean;
    type: string;
    prefix: string;
  };
  onSettingsChange?: (settings: {
    enabled: boolean;
    type: string;
    prefix?: string;
  }) => void;
  onSave?: () => void;
  isSaving?: boolean;
}

export function BarcodeToggle({
  // Support both new and legacy props
  enabled,
  barcodeType,
  type,
  prefix = '',
  onChange,
  onBarcodeSettingsChange,
  initialSettings,
  onSettingsChange,
  onSave,
  isSaving = false
}: BarcodeToggleProps) {
  // Initialize state from either initialSettings or legacy props
  const [settings, setSettings] = useState({
    enabled: initialSettings?.enabled ?? enabled ?? false,
    type: initialSettings?.type ?? barcodeType ?? type ?? 'qr',
    prefix: initialSettings?.prefix ?? prefix ?? ''
  });
  
  // Update internal state when props change
  useEffect(() => {
    if (initialSettings) {
      setSettings(initialSettings);
    } else if (enabled !== undefined) {
      setSettings(prev => ({ 
        ...prev, 
        enabled: enabled,
        type: barcodeType ?? type ?? prev.type,
        prefix: prefix ?? prev.prefix
      }));
    }
  }, [initialSettings, enabled, barcodeType, type, prefix]);
  
  // Update handler that works with both prop styles
  const handleSettingsChange = (newSettings: Partial<typeof settings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    
    // Call appropriate callbacks
    if (onSettingsChange) {
      onSettingsChange(updatedSettings);
    }
    
    if (onChange) {
      onChange({
        enabled: updatedSettings.enabled,
        barcodeType: updatedSettings.type,
        prefix: updatedSettings.prefix
      });
    }
    
    if (onBarcodeSettingsChange) {
      onBarcodeSettingsChange(updatedSettings);
    }
  };

  const handleEnableChange = (checked: boolean) => {
    handleSettingsChange({ enabled: checked });
  };
  
  const handleTypeChange = (value: string) => {
    handleSettingsChange({ type: value });
  };
  
  const handlePrefixChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleSettingsChange({ prefix: e.target.value });
  };
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label htmlFor="barcode-toggle" className="text-base font-medium">
          Enable barcodes for assets
        </Label>
        <Switch
          id="barcode-toggle"
          checked={settings.enabled}
          onCheckedChange={handleEnableChange}
        />
      </div>
      
      <div className={settings.enabled ? "space-y-4" : "space-y-4 opacity-50 pointer-events-none"}>
        <div className="grid gap-2">
          <Label htmlFor="barcode-type">Barcode Type</Label>
          <Select 
            value={settings.type} 
            onValueChange={handleTypeChange}
            disabled={!settings.enabled}
          >
            <SelectTrigger id="barcode-type">
              <SelectValue placeholder="Select barcode type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="qr">QR Code</SelectItem>
              <SelectItem value="code128">Code 128</SelectItem>
              <SelectItem value="code39">Code 39</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            QR codes store more data and are easier to scan with mobile devices
          </p>
        </div>
        
        <div className="grid gap-2">
          <Label htmlFor="barcode-prefix">Barcode Prefix (Optional)</Label>
          <Input
            id="barcode-prefix"
            value={settings.prefix}
            onChange={handlePrefixChange}
            placeholder="e.g., TOOL, EQUIP"
            maxLength={10}
            disabled={!settings.enabled}
          />
          <p className="text-xs text-muted-foreground">
            A short identifier that will be added to the beginning of each barcode
          </p>
        </div>
      </div>
      
      {onSave && (
        <div className="flex justify-end pt-2">
          <Button 
            onClick={onSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      )}
    </div>
  );
} 