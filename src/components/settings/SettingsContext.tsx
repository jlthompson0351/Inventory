import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'sonner';

// Define the settings interface
export interface AppSettings {
  // Theme settings
  theme: 'light' | 'dark';
  accentColor: string;
  useSystemPreference: boolean;
  
  // Display settings
  denseMode: boolean;
  fontSize: number;
  tableRows: string;
  animationsEnabled: boolean;
  
  // Notification settings
  emailNotifications: boolean;
  pushNotifications: boolean;
  inventoryAlerts: boolean;
  lowStockAlerts: boolean;
  systemUpdates: boolean;
  newFeatures: boolean;
  
  // Language settings
  language: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  timezone: string;
}

// Default settings
const defaultSettings: AppSettings = {
  // Theme
  theme: 'light',
  accentColor: 'blue',
  useSystemPreference: false,
  
  // Display
  denseMode: false,
  fontSize: 14,
  tableRows: '10',
  animationsEnabled: true,
  
  // Notifications
  emailNotifications: true,
  pushNotifications: true,
  inventoryAlerts: true,
  lowStockAlerts: true,
  systemUpdates: true,
  newFeatures: false,
  
  // Language
  language: 'en',
  dateFormat: 'MM/DD/YYYY',
  timeFormat: '12h',
  timezone: 'America/New_York'
};

interface SettingsContextType {
  settings: AppSettings;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  resetSettings: () => void;
  saveSettings: () => void;
  hasUnsavedChanges: boolean;
  isLoading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [savedSettings, setSavedSettings] = useState<AppSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const savedSettingsString = localStorage.getItem('app-settings');
      if (savedSettingsString) {
        const parsed = JSON.parse(savedSettingsString);
        // Merge with defaults to ensure all new settings have default values
        const mergedSettings = { ...defaultSettings, ...parsed };
        setSettings(mergedSettings);
        setSavedSettings(mergedSettings);
      }
    } catch (error) {
      console.error('Failed to load settings from localStorage:', error);
      toast.error('Failed to load saved settings, using defaults');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check if there are unsaved changes
  const hasUnsavedChanges = JSON.stringify(settings) !== JSON.stringify(savedSettings);

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const saveSettings = () => {
    try {
      localStorage.setItem('app-settings', JSON.stringify(settings));
      setSavedSettings(settings);
      toast.success('Settings saved successfully!');
      
      // Apply theme changes immediately
      if (settings.useSystemPreference) {
        // Remove any manual theme classes and let system preference take over
        document.documentElement.classList.remove('light', 'dark');
      } else {
        // Apply the selected theme
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(settings.theme);
      }
      
      // Apply other immediate changes (like font size)
      document.documentElement.style.fontSize = `${settings.fontSize}px`;
      
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    }
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    toast.success('Settings reset to defaults');
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSetting,
        resetSettings,
        saveSettings,
        hasUnsavedChanges,
        isLoading
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}; 