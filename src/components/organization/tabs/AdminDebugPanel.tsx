import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useOrganization } from '@/hooks/useOrganization';
import { SetupMothership } from '@/scripts/setupMothership';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { InfoIcon, AlertTriangle, Database, RefreshCw, Terminal, User } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from "date-fns";
import { PostgrestResponse, PostgrestSingleResponse } from '@supabase/supabase-js';

type DiagnosticResult = {
  id: string;
  severity: 'error' | 'warning' | 'info' | 'success';
  message: string;
  details?: string;
  timestamp: Date;
};

// Define the structure for table counts response
interface TableCounts {
  [key: string]: number;
}

export function AdminDebugPanel() {
  const { currentOrganization, organizations, fetchOrganizations } = useOrganization();
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDiagnosticRunning, setIsDiagnosticRunning] = useState(false);
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [systemInfo, setSystemInfo] = useState<any>(null);
  const [tableCounts, setTableCounts] = useState<TableCounts | null>(null);
  const [tableCountsLoading, setTableCountsLoading] = useState(false);

  // Check if user is super admin
  useEffect(() => {
    const checkSuperAdmin = async () => {
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          console.error('Error getting user data:', userError);
          toast.error('Failed to get user data. Please refresh and try again.');
          return;
        }
        
        if (!userData.user) {
          setIsLoading(false);
          return;
        }
        
        setUserInfo({
          id: userData.user.id,
          email: userData.user.email,
          lastSignIn: userData.user.last_sign_in_at,
        });

        const { data, error } = await supabase
          .from('system_roles')
          .select('role')
          .eq('user_id', userData.user.id)
          .eq('role', 'super_admin')
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error checking super admin status:', error);
          toast.error('Failed to verify admin permissions. Some features may be unavailable.');
        }
        
        setIsSuperAdmin(!!data);
      } catch (err) {
        console.error('Error checking admin status:', err);
        toast.error('An unexpected error occurred while checking permissions.');
      } finally {
        setIsLoading(false);
      }
    };

    // Get system info
    const getSystemInfo = async () => {
      try {
        const info = {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          timestamp: new Date().toISOString(),
        };
        setSystemInfo(info);
      } catch (err) {
        console.error('Error getting system info:', err);
        toast.error('Failed to gather system information.');
      }
    };

    checkSuperAdmin();
    getSystemInfo();
  }, []);

  const runDatabaseDiagnostics = async () => {
    setIsDiagnosticRunning(true);
    setResults([]);
    const diagnosticResults: DiagnosticResult[] = [];

    try {
      // Check organizations table
      const { data: orgs, error: orgsError } = await supabase
        .from('organizations')
        .select('id, name, created_at')
        .order('created_at', { ascending: false });

      if (orgsError) {
        diagnosticResults.push({
          id: 'org-table-error',
          severity: 'error',
          message: 'Error accessing organizations table',
          details: orgsError.message,
          timestamp: new Date(),
        });
        toast.error('Error checking organizations table: ' + orgsError.message);
      } else {
        diagnosticResults.push({
          id: 'org-table-check',
          severity: 'success',
          message: `Organizations table accessible. Found ${orgs.length} organizations.`,
          timestamp: new Date(),
        });
      }

      // Check if Mothership organization exists
      const mothershipOrg = orgs?.find(org => org.name === 'Mothership');
      if (!mothershipOrg) {
        diagnosticResults.push({
          id: 'mothership-check',
          severity: 'warning',
          message: 'Mothership organization not found',
          details: 'The default organization should be present for proper system function.',
          timestamp: new Date(),
        });
        toast.warning('Mothership organization not found. System may not function correctly.');
      } else {
        diagnosticResults.push({
          id: 'mothership-check',
          severity: 'success',
          message: 'Mothership organization found',
          details: `ID: ${mothershipOrg.id}, Created: ${mothershipOrg.created_at}`,
          timestamp: new Date(),
        });
      }

      // Check user memberships
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        diagnosticResults.push({
          id: 'user-check-error',
          severity: 'error',
          message: 'Error retrieving user data',
          details: userError.message,
          timestamp: new Date(),
        });
        toast.error('Failed to retrieve user data: ' + userError.message);
      } else if (user) {
        const { data: memberships, error: membershipsError } = await supabase
          .from('organization_members')
          .select('organization_id, role')
          .eq('user_id', user.id);
          
        if (membershipsError) {
          diagnosticResults.push({
            id: 'user-memberships-error',
            severity: 'error',
            message: 'Error accessing user organization memberships',
            details: membershipsError.message,
            timestamp: new Date(),
          });
          toast.error('Error checking user memberships: ' + membershipsError.message);
        } else {
          diagnosticResults.push({
            id: 'user-memberships-check',
            severity: 'success',
            message: `User is a member of ${memberships.length} organizations`,
            timestamp: new Date(),
          });
        }

        // Check if user is member of mothership
        if (mothershipOrg) {
          const isMemberOfMothership = memberships?.some(m => m.organization_id === mothershipOrg.id);
          diagnosticResults.push({
            id: 'mothership-membership-check',
            severity: isMemberOfMothership ? 'success' : 'warning',
            message: isMemberOfMothership 
              ? 'User is a member of Mothership organization' 
              : 'User is NOT a member of Mothership organization',
            timestamp: new Date(),
          });
          
          if (!isMemberOfMothership) {
            toast.warning('User is not a member of the Mothership organization. Some features may be limited.');
          }
        }
      }

      setResults(prev => [...prev, ...diagnosticResults]);
      toast.success('Diagnostics completed successfully');
    } catch (error) {
      console.error('Error running diagnostics:', error);
      toast.error('Error running diagnostics: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setResults(prev => [...prev, {
        id: 'diagnostic-error',
        severity: 'error',
        message: 'Unexpected error during diagnostics',
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      }]);
    } finally {
      setIsDiagnosticRunning(false);
    }
  };

  const getTableCounts = async () => {
    setTableCountsLoading(true);
    try {
      // Use the get_table_counts database function
      const { data, error } = await supabase.rpc('get_table_counts');

      if (error) {
        toast.error('Error fetching table counts: ' + error.message);
        console.error('Error fetching table counts:', error);
        return;
      }
      
      // Transform the data to the expected format
      const tableCountData: TableCounts = {
        'Organizations': data.organizations || 0,
        'Profiles': data.profiles || 0,
        'Inventory Items': data.inventory_items || 0,
        'Asset Types': data.asset_types || 0,
        'Forms': data.forms || 0,
        'Organization Members': data.organization_members || 0,
        'System Roles': data.system_roles || 0
      };
      
      setTableCounts(tableCountData);
      toast.success('Table counts updated successfully');
    } catch (error) {
      console.error('Error getting table counts:', error);
      toast.error('Error getting table counts: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setTableCountsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (isSuperAdmin === false) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Access Denied</AlertTitle>
        <AlertDescription>
          You need to be a super administrator to access this panel.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertTitle>Admin Debug Panel</AlertTitle>
        <AlertDescription>
          This panel contains advanced diagnostic tools and should only be used by system administrators.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="organizations">
        <TabsList>
          <TabsTrigger value="organizations">Organizations</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="user">User</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
        </TabsList>
        
        <TabsContent value="organizations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Organization Management</CardTitle>
              <CardDescription>Debug and fix organization-related issues</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col space-y-2">
                <div className="flex justify-between items-center">
                  <h3 className="text-md font-medium">Current Organization</h3>
                  <Badge variant="outline">
                    {currentOrganization ? currentOrganization.name : 'None'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <h3 className="text-md font-medium">Organization Count</h3>
                  <Badge variant="outline">
                    {organizations ? organizations.length : '0'}
                  </Badge>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    toast.promise(fetchOrganizations(), {
                      loading: 'Refreshing organizations...',
                      success: 'Organizations refreshed successfully',
                      error: 'Failed to refresh organizations'
                    });
                  }}
                  size="sm"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh Organizations
                </Button>
                
                <SetupMothership />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Information</CardTitle>
              <CardDescription>Environment and configuration details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {systemInfo && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="font-medium">User Agent</div>
                    <div className="text-sm truncate">{systemInfo.userAgent}</div>
                    
                    <div className="font-medium">Platform</div>
                    <div>{systemInfo.platform}</div>
                    
                    <div className="font-medium">Language</div>
                    <div>{systemInfo.language}</div>
                    
                    <div className="font-medium">Time Zone</div>
                    <div>{systemInfo.timeZone}</div>
                    
                    <div className="font-medium">Timestamp</div>
                    <div>{new Date(systemInfo.timestamp).toLocaleString()}</div>
                  </div>
                </div>
              )}
              
              <Separator />
              
              <div className="space-y-2">
                <h3 className="text-md font-medium">Environment Variables</h3>
                <div className="text-sm p-2 bg-muted rounded-md">
                  <div>NODE_ENV: {import.meta.env.MODE}</div>
                  <div>API URL: {import.meta.env.VITE_SUPABASE_URL || 'Not set'}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="user" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Information</CardTitle>
              <CardDescription>Current user details and permissions</CardDescription>
            </CardHeader>
            <CardContent>
              {userInfo && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="font-medium">User ID</div>
                    <div className="text-sm break-all">{userInfo.id}</div>
                    
                    <div className="font-medium">Email</div>
                    <div>{userInfo.email}</div>
                    
                    <div className="font-medium">Last Sign In</div>
                    <div>{userInfo.lastSignIn ? new Date(userInfo.lastSignIn).toLocaleString() : 'N/A'}</div>
                    
                    <div className="font-medium">Super Admin</div>
                    <div>{isSuperAdmin ? 'Yes' : 'No'}</div>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          const { error } = await supabase.auth.refreshSession();
                          if (error) {
                            toast.error('Failed to refresh session: ' + error.message);
                            return;
                          }
                          toast.success('Session refreshed successfully');
                        } catch (error) {
                          toast.error('Failed to refresh session: ' + (error instanceof Error ? error.message : 'Unknown error'));
                        }
                      }}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Refresh Session
                    </Button>
                    
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        const { data, error } = await supabase.auth.getSession();
                        if (error) {
                          toast.error('Failed to get session: ' + error.message);
                          return;
                        }
                        console.log('Current session:', data.session);
                        toast.success('Session info logged to console');
                      }}
                    >
                      <Terminal className="mr-2 h-4 w-4" />
                      Log Session Info
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="database">
          <div className="space-y-4">
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={getTableCounts}
                disabled={tableCountsLoading}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${tableCountsLoading ? 'animate-spin' : ''}`} />
                {tableCountsLoading ? 'Loading...' : 'Get Table Counts'}
              </Button>
            </div>
            
            {tableCounts && (
              <div className="mt-4">
                <h3 className="text-lg font-medium mb-2">Database Table Counts</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(tableCounts).map(([table, count]) => (
                    <Card key={table}>
                      <CardHeader className="py-2 px-4">
                        <CardTitle className="text-sm font-medium">{table}</CardTitle>
                      </CardHeader>
                      <CardContent className="py-2 px-4">
                        <p className="text-2xl font-bold">{count}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 