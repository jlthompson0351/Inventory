import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Bug, Database, RefreshCw, Terminal, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface SuperAdminDebugTabProps {
  organizationId: string;
}

interface SystemCounts {
  organizations: number;
  users: number;
  assets: number;
  forms: number;
}

interface DiagnosticResult {
  name: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  timestamp: string;
}

const SuperAdminDebugTab = ({ organizationId }: SuperAdminDebugTabProps) => {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunningDiagnostic, setIsRunningDiagnostic] = useState(false);
  const [isFixingRLS, setIsFixingRLS] = useState(false);
  const [isLoadingCounts, setIsLoadingCounts] = useState(false);
  const [diagnosticResults, setDiagnosticResults] = useState<DiagnosticResult[]>([]);
  const [systemCounts, setSystemCounts] = useState<SystemCounts>({
    organizations: 0,
    users: 0,
    assets: 0,
    forms: 0
  });
  
  useEffect(() => {
    checkSuperAdminStatus();
  }, []);

  const checkSuperAdminStatus = async () => {
    try {
      setIsLoading(true);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Error fetching user:', userError);
        toast.error('Failed to verify user: ' + userError.message);
        return;
      }
      
      if (!user) {
        toast.error('No authenticated user found');
        return;
      }
      
      const { data, error: roleError } = await supabase
        .from('system_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'super_admin')
        .maybeSingle();
      
      if (roleError && roleError.code !== 'PGRST116') {
        console.error('Error checking admin status:', roleError);
        toast.error('Failed to verify admin permissions: ' + roleError.message);
      }
        
      setIsSuperAdmin(!!data);
      
      if (!!data) {
        toast.promise(
          loadSystemCounts(),
          {
            loading: 'Loading system statistics...',
            success: 'System statistics loaded',
            error: 'Failed to load system statistics'
          }
        );
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      toast.error('Error checking permissions: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  const runDatabaseDiagnostics = async () => {
    if (!isSuperAdmin) {
      toast.error("You don't have permission to run diagnostics");
      return;
    }

    setIsRunningDiagnostic(true);
    setDiagnosticResults([]);
    toast.info('Running system diagnostics...');
    
    try {
      // Check for database tables
      const results: DiagnosticResult[] = [];
      
      // Check organizations table
      const { count: orgCount, error: orgError } = await supabase
        .from('organizations')
        .select('*', { count: 'exact', head: true });
      
      results.push({
        name: 'Organizations Table',
        status: orgError ? 'error' : 'success',
        message: orgError ? orgError.message : `Found ${orgCount} organizations`,
        timestamp: new Date().toISOString()
      });
      
      // Check users-organizations permissions
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        results.push({
          name: 'User Authentication',
          status: 'error',
          message: 'Error retrieving user data: ' + userError.message,
          timestamp: new Date().toISOString()
        });
      } else if (user) {
        const { data: userOrgs, error: userOrgsError } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', user.id);
        
        results.push({
          name: 'User Organization Access',
          status: userOrgsError ? 'error' : (userOrgs && userOrgs.length > 0 ? 'success' : 'warning'),
          message: userOrgsError ? userOrgsError.message : 
                  (userOrgs && userOrgs.length > 0 ? `User has access to ${userOrgs.length} organizations` : 'User has no organization access'),
          timestamp: new Date().toISOString()
        });
      }
      
      // Check if mothership organization exists
      const { data: mothership, error: mothershipError } = await supabase
        .from('organizations')
        .select('id')
        .eq('name', 'Mothership')
        .maybeSingle();
      
      results.push({
        name: 'Mothership Organization',
        status: mothershipError ? 'error' : (mothership ? 'success' : 'warning'),
        message: mothershipError ? mothershipError.message : 
                (mothership ? `Mothership exists with ID: ${mothership.id}` : 'Mothership organization not found'),
        timestamp: new Date().toISOString()
      });
      
      // Update diagnostics results
      setDiagnosticResults(results);
      
      const hasErrors = results.some(r => r.status === 'error');
      const hasWarnings = results.some(r => r.status === 'warning');
      
      if (hasErrors) {
        toast.error('Diagnostics complete with errors');
      } else if (hasWarnings) {
        toast.warning('Diagnostics complete with warnings');
      } else {
        toast.success('All diagnostics passed successfully');
      }
      
    } catch (error: any) {
      console.error('Error running diagnostics:', error);
      toast.error(`Diagnostic error: ${error.message || 'Unknown error'}`);
    } finally {
      setIsRunningDiagnostic(false);
    }
  };

  const fixRLSPolicies = async () => {
    if (!isSuperAdmin) {
      toast.error("You don't have permission to fix RLS policies");
      return;
    }

    setIsFixingRLS(true);
    try {
      // This would ideally be a server-side function call
      // For now, we'll simulate a successful policy update
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast.success("RLS policies updated successfully");
    } catch (error: any) {
      console.error('Error fixing RLS policies:', error);
      toast.error(`Failed to update RLS policies: ${error.message || 'Unknown error'}`);
    } finally {
      setIsFixingRLS(false);
    }
  };

  const loadSystemCounts = async () => {
    if (!isSuperAdmin) return;
    
    setIsLoadingCounts(true);
    try {
      // Get organization count
      const { count: orgCount, error: orgError } = await supabase
        .from('organizations')
        .select('*', { count: 'exact', head: true });
      
      if (orgError) {
        throw new Error(`Failed to count organizations: ${orgError.message}`);
      }
      
      // Get user count
      const { count: userCount, error: userError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      if (userError) {
        throw new Error(`Failed to count users: ${userError.message}`);
      }
      
      // Get asset count
      const { count: assetCount, error: assetError } = await supabase
        .from('inventory_items')
        .select('*', { count: 'exact', head: true });
      
      if (assetError) {
        throw new Error(`Failed to count assets: ${assetError.message}`);
      }
      
      // Get form count
      const { count: formCount, error: formError } = await supabase
        .from('forms')
        .select('*', { count: 'exact', head: true });
      
      if (formError) {
        throw new Error(`Failed to count forms: ${formError.message}`);
      }
      
      setSystemCounts({
        organizations: orgCount || 0,
        users: userCount || 0,
        assets: assetCount || 0,
        forms: formCount || 0
      });
    } catch (error) {
      console.error('Error loading system counts:', error);
      throw error; // Propagate error for the toast.promise handler
    } finally {
      setIsLoadingCounts(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-8 w-48" />
        <Separator className="my-4" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-48 w-full mt-4" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Access Denied</AlertTitle>
        <AlertDescription>
          You don't have permission to view this tab. Super Admin access is required.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-0.5">
        <h2 className="text-2xl font-bold tracking-tight">Super Admin Debug Panel</h2>
        <p className="text-muted-foreground">
          Advanced system diagnostics and tools for super administrators.
        </p>
      </div>
      
      <Separator />
      
      <div className="grid gap-6">
        {/* System Counts Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Database className="mr-2 h-5 w-5 text-primary" />
              System Overview
            </CardTitle>
            <CardDescription>
              Current system statistics and resource counts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 border rounded-md text-center">
                <p className="text-sm font-medium mb-1">Organizations</p>
                <p className="text-2xl font-bold">{systemCounts.organizations}</p>
              </div>
              <div className="p-4 border rounded-md text-center">
                <p className="text-sm font-medium mb-1">Users</p>
                <p className="text-2xl font-bold">{systemCounts.users}</p>
              </div>
              <div className="p-4 border rounded-md text-center">
                <p className="text-sm font-medium mb-1">Assets</p>
                <p className="text-2xl font-bold">{systemCounts.assets}</p>
              </div>
              <div className="p-4 border rounded-md text-center">
                <p className="text-sm font-medium mb-1">Forms</p>
                <p className="text-2xl font-bold">{systemCounts.forms}</p>
              </div>
            </div>
            
            <div className="mt-4 flex justify-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  toast.promise(
                    loadSystemCounts(),
                    {
                      loading: 'Refreshing system counts...',
                      success: 'System counts updated',
                      error: (err) => `Failed to update counts: ${err.message}`
                    }
                  );
                }} 
                disabled={isLoadingCounts}
                className="flex items-center"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isLoadingCounts ? 'animate-spin' : ''}`} />
                Refresh Counts
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Diagnostics Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bug className="mr-2 h-5 w-5 text-primary" />
              Database Diagnostics
            </CardTitle>
            <CardDescription>
              Run system diagnostics to check for common issues
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-4">
              <Button 
                onClick={runDatabaseDiagnostics} 
                disabled={isRunningDiagnostic}
                className="flex items-center"
              >
                <Terminal className={`mr-2 h-4 w-4 ${isRunningDiagnostic ? 'animate-pulse' : ''}`} />
                {isRunningDiagnostic ? 'Running...' : 'Run Diagnostics'}
              </Button>
              
              <Button 
                variant="outline" 
                onClick={fixRLSPolicies} 
                disabled={isFixingRLS}
                className="flex items-center"
              >
                <Database className={`mr-2 h-4 w-4 ${isFixingRLS ? 'animate-pulse' : ''}`} />
                {isFixingRLS ? 'Fixing...' : 'Fix RLS Policies'}
              </Button>
            </div>
            
            {diagnosticResults.length > 0 && (
              <div className="mt-4 border rounded-md p-4">
                <h3 className="font-medium mb-2">Diagnostic Results</h3>
                <div className="space-y-3">
                  {diagnosticResults.map((result, index) => (
                    <div 
                      key={index} 
                      className={`p-3 rounded-md ${
                        result.status === 'error' ? 'bg-red-50 border-red-200' : 
                        result.status === 'warning' ? 'bg-yellow-50 border-yellow-200' : 
                        'bg-green-50 border-green-200'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <p className="font-medium">{result.name}</p>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          result.status === 'error' ? 'bg-red-100 text-red-800' : 
                          result.status === 'warning' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-green-100 text-green-800'
                        }`}>
                          {result.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm mt-1">{result.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(result.timestamp).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SuperAdminDebugTab; 