
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

const NotificationSettings = () => {
  const [settings, setSettings] = useState({
    emailNotifications: true,
    checkoutAlerts: true,
    inventoryAlerts: false,
    systemUpdates: true,
    newFeatures: true,
    dailyDigest: false
  });
  
  const handleToggle = (setting: string, value: boolean) => {
    setSettings(prev => ({ ...prev, [setting]: value }));
    toast.success(`${setting} ${value ? 'enabled' : 'disabled'}`);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="font-medium">Email Notifications</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-notifications">Receive email notifications</Label>
              <p className="text-sm text-muted-foreground">Receive email updates about your account activity</p>
            </div>
            <Switch 
              id="email-notifications"
              checked={settings.emailNotifications}
              onCheckedChange={(checked) => handleToggle("emailNotifications", checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="daily-digest">Daily digest</Label>
              <p className="text-sm text-muted-foreground">Receive a daily summary of all activities</p>
            </div>
            <Switch 
              id="daily-digest"
              checked={settings.dailyDigest}
              onCheckedChange={(checked) => handleToggle("dailyDigest", checked)}
            />
          </div>
        </div>
      </div>
      
      <Separator />
      
      <div className="space-y-4">
        <h3 className="font-medium">System Alerts</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="checkout-alerts">Checkout alerts</Label>
              <p className="text-sm text-muted-foreground">Get notified when items are checked out</p>
            </div>
            <Switch 
              id="checkout-alerts"
              checked={settings.checkoutAlerts}
              onCheckedChange={(checked) => handleToggle("checkoutAlerts", checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="inventory-alerts">Inventory alerts</Label>
              <p className="text-sm text-muted-foreground">Get notified when inventory is low</p>
            </div>
            <Switch 
              id="inventory-alerts"
              checked={settings.inventoryAlerts}
              onCheckedChange={(checked) => handleToggle("inventoryAlerts", checked)}
            />
          </div>
        </div>
      </div>
      
      <Separator />
      
      <div className="space-y-4">
        <h3 className="font-medium">General Updates</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="system-updates">System updates</Label>
              <p className="text-sm text-muted-foreground">Get notified about system maintenance and updates</p>
            </div>
            <Switch 
              id="system-updates"
              checked={settings.systemUpdates}
              onCheckedChange={(checked) => handleToggle("systemUpdates", checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="new-features">New features</Label>
              <p className="text-sm text-muted-foreground">Get notified when new features are released</p>
            </div>
            <Switch 
              id="new-features"
              checked={settings.newFeatures}
              onCheckedChange={(checked) => handleToggle("newFeatures", checked)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;
