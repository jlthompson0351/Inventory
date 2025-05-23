import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Shield } from 'lucide-react';

interface AdminSettingsTabProps {
  organizationId: string;
}

const AdminSettingsTab = ({ organizationId }: AdminSettingsTabProps) => {
  const [systemVersion, setSystemVersion] = useState('1.0.0');

  return (
    <div className="space-y-6">
      <div className="space-y-0.5">
        <h2 className="text-2xl font-bold tracking-tight">Advanced Settings</h2>
        <p className="text-muted-foreground">
          Manage system settings and administrative options.
        </p>
      </div>
      
      <Separator />
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="mr-2 h-5 w-5 text-primary" />
              System Information
            </CardTitle>
            <CardDescription>
              Details about the current system and organization settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">Organization ID</p>
                <p className="text-sm text-muted-foreground">{organizationId}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">System Version</p>
                <p className="text-sm text-muted-foreground">{systemVersion}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminSettingsTab; 