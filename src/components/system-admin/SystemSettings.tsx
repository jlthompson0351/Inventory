import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Settings, Shield, Mail, Database } from 'lucide-react';

interface SystemConfig {
  maintenanceMode: boolean;
  allowNewRegistrations: boolean;
  maxOrganizationsPerUser: number;
  maxMembersPerOrganization: number;
  systemEmailAddress: string;
}

export default function SystemSettings() {
  const [config, setConfig] = useState<SystemConfig>({
    maintenanceMode: false,
    allowNewRegistrations: true,
    maxOrganizationsPerUser: 5,
    maxMembersPerOrganization: 50,
    systemEmailAddress: 'system@company.com'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('system_config')
        .upsert([{
          key: 'system_settings',
          value: config
        }]);

      if (error) throw error;
      toast.success('System settings updated successfully');
    } catch (error) {
      console.error('Error updating system settings:', error);
      toast.error('Failed to update system settings');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>System Settings</CardTitle>
          <CardDescription>
            Configure system-wide settings and behaviors
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* System Status */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">System Status</h3>
            </div>
            <div className="grid gap-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Maintenance Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Temporarily disable access to the system for maintenance
                  </p>
                </div>
                <Switch
                  checked={config.maintenanceMode}
                  onCheckedChange={(checked) =>
                    setConfig((prev) => ({ ...prev, maintenanceMode: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow New Registrations</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable or disable new user registrations
                  </p>
                </div>
                <Switch
                  checked={config.allowNewRegistrations}
                  onCheckedChange={(checked) =>
                    setConfig((prev) => ({ ...prev, allowNewRegistrations: checked }))
                  }
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Organization Limits */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Organization Limits</h3>
            </div>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="max-orgs">Maximum Organizations per User</Label>
                <Input
                  id="max-orgs"
                  type="number"
                  value={config.maxOrganizationsPerUser}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      maxOrganizationsPerUser: parseInt(e.target.value) || 0
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max-members">Maximum Members per Organization</Label>
                <Input
                  id="max-members"
                  type="number"
                  value={config.maxMembersPerOrganization}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      maxMembersPerOrganization: parseInt(e.target.value) || 0
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Email Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Email Settings</h3>
            </div>
            <div className="space-y-2">
              <Label htmlFor="system-email">System Email Address</Label>
              <Input
                id="system-email"
                type="email"
                value={config.systemEmailAddress}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    systemEmailAddress: e.target.value
                  }))
                }
              />
              <p className="text-sm text-muted-foreground">
                Used for system notifications and alerts
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
