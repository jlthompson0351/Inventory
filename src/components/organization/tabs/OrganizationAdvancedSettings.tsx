import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Shield, Users, Lock, UserCheck } from 'lucide-react';
import { useOrganizationSettings } from '../OrganizationSettingsContext';
import { toast } from 'sonner';

const OrganizationAdvancedSettings = () => {
  const { settings, updateSetting } = useOrganizationSettings();

  const handleSwitchChange = (key: keyof typeof settings, value: boolean, label: string) => {
    updateSetting(key, value);
    toast.success(`${label} ${value ? 'enabled' : 'disabled'}`);
  };

  const handleMaxMembersChange = (value: string) => {
    const numValue = parseInt(value) || 50;
    updateSetting('maxMembers', numValue);
    toast.success(`Maximum members set to ${numValue}`);
  };

  const handleDefaultRoleChange = (value: 'member' | 'manager') => {
    updateSetting('defaultRole', value);
    toast.success(`Default role set to ${value}`);
  };

  return (
    <div className="space-y-6">
      {/* Security Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security & Access Control
          </CardTitle>
          <CardDescription>
            Manage security settings and access permissions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Require Approval for Joining</Label>
              <p className="text-xs text-muted-foreground">
                New members must be approved by an admin before joining
              </p>
              {settings.requireApprovalForJoining && (
                <Badge variant="secondary" className="text-xs">
                  Manual approval required
                </Badge>
              )}
            </div>
            <Switch 
              checked={settings.requireApprovalForJoining}
              onCheckedChange={(checked) => handleSwitchChange('requireApprovalForJoining', checked, 'Manual approval')}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Allow Member Invites</Label>
              <p className="text-xs text-muted-foreground">
                Let existing members invite new people to the organization
              </p>
            </div>
            <Switch 
              checked={settings.allowMemberInvites}
              onCheckedChange={(checked) => handleSwitchChange('allowMemberInvites', checked, 'Member invites')}
            />
          </div>
        </CardContent>
      </Card>
      
      <Separator />
      
      {/* Member Management */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Member Management
          </CardTitle>
          <CardDescription>
            Configure member limits and default permissions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Maximum Members</Label>
            <Input
              type="number"
              value={settings.maxMembers}
              onChange={(e) => handleMaxMembersChange(e.target.value)}
              min="1"
              max="1000"
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Maximum number of members allowed in your organization (1-1000)
            </p>
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <Label className="text-sm font-medium">Default Member Role</Label>
            <Select value={settings.defaultRole} onValueChange={handleDefaultRoleChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select default role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Default role assigned to new members when they join
            </p>
          </div>
        </CardContent>
      </Card>
      
      <Separator />
      
      {/* Organization Limits */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Organization Limits
          </CardTitle>
          <CardDescription>
            Current usage and limits for your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
              <div className="space-y-1">
                <div className="text-sm font-medium">Member Limit</div>
                <div className="text-xs text-muted-foreground">Maximum allowed members</div>
              </div>
              <Badge variant="outline" className="text-sm">
                {settings.maxMembers} max
              </Badge>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
              <div className="space-y-1">
                <div className="text-sm font-medium">Default Role</div>
                <div className="text-xs text-muted-foreground">Role for new members</div>
              </div>
              <Badge variant="outline" className="text-sm capitalize">
                {settings.defaultRole}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Separator />
      
      {/* Security Summary */}
      <Card className="bg-muted/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            Security Summary
          </CardTitle>
          <CardDescription>
            Overview of your current security settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Approval Required:</span>
              <Badge variant={settings.requireApprovalForJoining ? 'default' : 'outline'} className="text-xs">
                {settings.requireApprovalForJoining ? 'Yes' : 'No'}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Member Invites:</span>
              <Badge variant={settings.allowMemberInvites ? 'default' : 'outline'} className="text-xs">
                {settings.allowMemberInvites ? 'Allowed' : 'Restricted'}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Security Level:</span>
              <Badge 
                variant={settings.requireApprovalForJoining && !settings.allowMemberInvites ? 'default' : 'outline'} 
                className="text-xs"
              >
                {settings.requireApprovalForJoining && !settings.allowMemberInvites ? 'High' : 'Standard'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrganizationAdvancedSettings; 