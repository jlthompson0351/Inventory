
import React from 'react';
import { ServerCog } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

const SystemSettings: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>System Settings</CardTitle>
        <CardDescription>Configure global system settings</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          System settings configuration will be available in a future update.
        </p>
      </CardContent>
    </Card>
  );
};

export default SystemSettings;
