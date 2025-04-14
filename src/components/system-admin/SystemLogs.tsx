
import React, { useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

const SystemLogs: React.FC = () => {
  const [loading, setLoading] = useState(false);
  
  // Sample log data
  const [logs, setLogs] = useState([
    { timestamp: '2025-04-14 09:32:15', level: 'INFO', message: 'System startup complete' },
    { timestamp: '2025-04-14 09:31:50', level: 'INFO', message: 'Database connection established' },
    { timestamp: '2025-04-14 09:31:48', level: 'WARN', message: 'Cache size approaching limit' },
    { timestamp: '2025-04-14 09:30:22', level: 'ERROR', message: 'Failed to send notification email' },
    { timestamp: '2025-04-14 09:28:15', level: 'INFO', message: 'User authentication successful' },
  ]);

  const refreshLogs = () => {
    setLoading(true);
    
    // Simulate API call to refresh logs
    setTimeout(() => {
      // Add a new log entry at the top
      const newLog = {
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        level: 'INFO',
        message: 'Log data refreshed'
      };
      
      setLogs([newLog, ...logs.slice(0, 4)]);
      setLoading(false);
    }, 800);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle>System Logs</CardTitle>
          <CardDescription>Review system activity and error logs</CardDescription>
        </div>
        <AlertTriangle className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[320px] w-full rounded-md border">
          <div className="p-4">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="pb-2 text-left text-xs font-medium text-muted-foreground">Timestamp</th>
                  <th className="pb-2 text-left text-xs font-medium text-muted-foreground">Level</th>
                  <th className="pb-2 text-left text-xs font-medium text-muted-foreground">Message</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2 text-xs font-mono">{log.timestamp}</td>
                    <td className={`py-2 text-xs font-medium ${
                      log.level === 'ERROR' ? 'text-destructive' : 
                      log.level === 'WARN' ? 'text-amber-500' : 'text-primary'
                    }`}>
                      {log.level}
                    </td>
                    <td className="py-2 text-xs">{log.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={refreshLogs}
          disabled={loading}
          className="flex items-center gap-1"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          Refresh Logs
        </Button>
      </CardFooter>
    </Card>
  );
};

export default SystemLogs;
