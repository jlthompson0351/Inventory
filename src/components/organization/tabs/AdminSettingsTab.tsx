import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ExternalLink, LayoutDashboard, Shield, Terminal, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface AdminSettingsTabProps {
  organizationId: string;
}

const AdminSettingsTab = ({ organizationId }: AdminSettingsTabProps) => {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [systemVersion, setSystemVersion] = useState('1.0.0');

  useEffect(() => {
    const checkSuperAdminStatus = async () => {
      try {
        setIsLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) return;
        
        const { data } = await supabase
          .from('system_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'super_admin')
          .maybeSingle();
          
        setIsSuperAdmin(!!data);
      } catch (error) {
        console.error('Error checking admin status:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkSuperAdminStatus();
  }, []);

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
        
        {isSuperAdmin && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center text-primary">
                <Terminal className="mr-2 h-5 w-5" />
                Super Administrator Tools
              </CardTitle>
              <CardDescription>
                Advanced tools for system administrators only
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Administrator access</AlertTitle>
                <AlertDescription>
                  These tools provide advanced system access. Use with caution.
                </AlertDescription>
              </Alert>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-md">
                  <div className="flex items-center space-x-2 mb-2">
                    <LayoutDashboard className="h-5 w-5 text-primary" />
                    <h3 className="font-medium">Admin Debug Panel</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Access comprehensive system diagnostics and debugging tools.
                  </p>
                  <Button asChild variant="outline" className="w-full">
                    <Link to="/admin/debug" className="flex items-center">
                      Open Debug Panel
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminSettingsTab; 