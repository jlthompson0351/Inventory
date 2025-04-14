
import React, { useState } from 'react';
import { ServerCog } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

const SystemSettings: React.FC = () => {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [backupInterval, setBackupInterval] = useState("24");
  const [loading, setLoading] = useState(false);

  const handleSaveSettings = () => {
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      toast.success("System settings updated successfully");
    }, 800);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle>System Settings</CardTitle>
          <CardDescription>Configure global system settings</CardDescription>
        </div>
        <ServerCog className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="maintenance-mode">Maintenance Mode</Label>
              <p className="text-xs text-muted-foreground">
                When enabled, only admins can access the system
              </p>
            </div>
            <Switch 
              id="maintenance-mode"
              checked={maintenanceMode}
              onCheckedChange={setMaintenanceMode}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="backup-interval">Automatic Backup Interval (hours)</Label>
            <Input 
              id="backup-interval"
              type="number"
              value={backupInterval}
              onChange={(e) => setBackupInterval(e.target.value)}
              min="1"
              max="168"
            />
            <p className="text-xs text-muted-foreground">
              How often the system should create automatic backups
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSaveSettings} disabled={loading}>
          {loading ? "Saving..." : "Save Settings"}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default SystemSettings;
