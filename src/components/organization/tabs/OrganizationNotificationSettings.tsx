import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, Mail, MessageSquare, TrendingUp } from 'lucide-react';
import { useOrganizationSettings } from '../OrganizationSettingsContext';
import { toast } from 'sonner';

const OrganizationNotificationSettings = () => {
  const { settings, updateSetting } = useOrganizationSettings();

  const handleNotificationChange = (key: keyof typeof settings, value: boolean, label: string) => {
    updateSetting(key, value);
    toast.success(`${label} ${value ? 'enabled' : 'disabled'}`);
  };

  return (
    <div className="space-y-6">
      {/* Email Notifications */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Notifications
          </CardTitle>
          <CardDescription>
            Configure email alerts for organization activities
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">General Email Notifications</Label>
              <p className="text-xs text-muted-foreground">
                Receive email notifications for important organization updates
              </p>
              {settings.emailNotifications && (
                <Badge variant="secondary" className="text-xs">
                  Email alerts active
                </Badge>
              )}
            </div>
            <Switch 
              checked={settings.emailNotifications}
              onCheckedChange={(checked) => handleNotificationChange('emailNotifications', checked, 'Email notifications')}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Member Join Notifications</Label>
              <p className="text-xs text-muted-foreground">
                Get notified when new members join your organization
              </p>
            </div>
            <Switch 
              checked={settings.memberJoinNotifications}
              onCheckedChange={(checked) => handleNotificationChange('memberJoinNotifications', checked, 'Member join notifications')}
            />
          </div>
        </CardContent>
      </Card>
      
      <Separator />
      
      {/* Integration Notifications */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Integrations
          </CardTitle>
          <CardDescription>
            Connect with external communication platforms
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Slack Integration</Label>
              <p className="text-xs text-muted-foreground">
                Send notifications to your Slack workspace
              </p>
              {settings.slackIntegration && (
                <Badge variant="secondary" className="text-xs">
                  Slack connected
                </Badge>
              )}
            </div>
            <Switch 
              checked={settings.slackIntegration}
              onCheckedChange={(checked) => handleNotificationChange('slackIntegration', checked, 'Slack integration')}
            />
          </div>
        </CardContent>
      </Card>
      
      <Separator />
      
      {/* Reporting Notifications */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Reports & Analytics
          </CardTitle>
          <CardDescription>
            Automated reporting and insights delivery
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Weekly Reports</Label>
              <p className="text-xs text-muted-foreground">
                Receive weekly summary reports of organization activity
              </p>
              {settings.weeklyReports && (
                <Badge variant="secondary" className="text-xs">
                  Weekly reports active
                </Badge>
              )}
            </div>
            <Switch 
              checked={settings.weeklyReports}
              onCheckedChange={(checked) => handleNotificationChange('weeklyReports', checked, 'Weekly reports')}
            />
          </div>
        </CardContent>
      </Card>
      
      <Separator />
      
      {/* Notification Summary */}
      <Card className="bg-muted/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notification Summary
          </CardTitle>
          <CardDescription>
            Overview of your current notification settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Email Notifications:</span>
              <Badge variant={settings.emailNotifications ? 'default' : 'outline'} className="text-xs">
                {settings.emailNotifications ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Member Notifications:</span>
              <Badge variant={settings.memberJoinNotifications ? 'default' : 'outline'} className="text-xs">
                {settings.memberJoinNotifications ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Slack Integration:</span>
              <Badge variant={settings.slackIntegration ? 'default' : 'outline'} className="text-xs">
                {settings.slackIntegration ? 'Connected' : 'Not Connected'}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Weekly Reports:</span>
              <Badge variant={settings.weeklyReports ? 'default' : 'outline'} className="text-xs">
                {settings.weeklyReports ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrganizationNotificationSettings; 