
import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

const SystemLogs: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>System Logs</CardTitle>
        <CardDescription>Review system activity and error logs</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          System logs viewer will be available in a future update.
        </p>
      </CardContent>
    </Card>
  );
};

export default SystemLogs;
