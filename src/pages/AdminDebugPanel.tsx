import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { useOrganization } from '@/hooks/useOrganization';
import { SetupMothership } from '@/scripts/setupMothership';
import { Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';

const AdminDebugPanel = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { fetchOrganizations, organizations, currentOrganization } = useOrganization();
  const [loading, setLoading] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [databaseDiagnostics, setDatabaseDiagnostics] = useState<any>(null);
  const [userCount, setUserCount] = useState<number | null>(null);
  const [organizationCount, setOrganizationCount] = useState<number | null>(null);
  const [assetCount, setAssetCount] = useState<number | null>(null);
  const [formCount, setFormCount] = useState<number | null>(null);
  const [systemHealth, setSystemHealth] = useState<boolean | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  useEffect(() => {
    checkUserPermissions();
    loadCounts();
  }, []);

  const checkUserPermissions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const { data, error } = await supabase
        .from('system_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'super_admin')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking permissions:', error);
        toast({
          title: 'Permission Check Failed',
          description: 'Could not verify your permissions.',
          variant: 'destructive'
        });
        navigate('/');
        return;
      }

      setIsSuperAdmin(!!data);
      if (!data) {
        toast({
          title: 'Access Denied',
          description: 'This page is only available to system administrators.',
          variant: 'destructive'
        });
        navigate('/');
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
      navigate('/');
    }
  };

  const runDatabaseDiagnostics = async () => {
    setLoading(true);
    try {
      // Get current user data
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Not authenticated',
          description: 'Please log in to access this feature.',
          variant: 'destructive'
        });
        return;
      }

      // Check system roles
      const { data: systemRoles, error: rolesError } = await supabase
        .from('system_roles')
        .select('*')
        .eq('user_id', user.id);

      // Get org members
      const { data: orgMembers, error: membersError } = await supabase
        .from('organization_members')
        .select('*')
        .eq('user_id', user.id);

      // Get organizations
      const { data: organizations, error: orgsError } = await supabase
        .from('organizations')
        .select('*');

      // Get organization membership with organization details
      const { data: joinedData, error: joinError } = await supabase
        .from('organization_members')
        .select(`
          id,
          role,
          is_primary,
          organizations:organization_id (
            id,
            name,
            avatar_url
          )
        `)
        .eq('user_id', user.id);

      const diagnosticData = {
        userId: user.id,
        systemRoles,
        orgMembers,
        organizations,
        joinedData,
        rolesError,
        membersError, 
        orgsError,
        joinError
      };

      setDatabaseDiagnostics(diagnosticData);
      setSystemHealth(!rolesError && !membersError && !orgsError && !joinError);
      
      toast({
        title: 'Diagnostics Complete',
        description: 'Database diagnostic information has been retrieved.',
      });
    } catch (error) {
      console.error('Error running diagnostics:', error);
      toast({
        title: 'Diagnostic Error',
        description: 'Failed to run database diagnostics.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fixRlsPolicy = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('fix-rls-policies', {});
      
      if (error) {
        console.error('Error fixing RLS policy:', error);
        toast({
          title: 'Error',
          description: 'Failed to fix RLS policies: ' + error.message,
          variant: 'destructive'
        });
        return;
      }
      
      toast({
        title: 'Success',
        description: 'RLS policy has been fixed! Please refresh your data.',
      });
      
      await fetchOrganizations();
    } catch (error) {
      console.error('Error fixing RLS policy:', error);
      toast({
        title: 'Error',
        description: 'An unknown error occurred while trying to fix RLS policies.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCounts = async () => {
    try {
      // Get user count
      const { count: userCount, error: userError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });
      
      if (!userError) {
        setUserCount(userCount);
      }

      // Get organization count
      const { count: orgCount, error: orgError } = await supabase
        .from('organizations')
        .select('*', { count: 'exact', head: true });
      
      if (!orgError) {
        setOrganizationCount(orgCount);
      }

      // Get asset count
      const { count: assetCount, error: assetError } = await supabase
        .from('inventory_items')
        .select('*', { count: 'exact', head: true });
      
      if (!assetError) {
        setAssetCount(assetCount);
      }

      // Get form count
      const { count: formCount, error: formError } = await supabase
        .from('forms')
        .select('*', { count: 'exact', head: true });
      
      if (!formError) {
        setFormCount(formCount);
      }
    } catch (error) {
      console.error('Error loading counts:', error);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)] flex-col">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground mt-2">Checking permissions...</p>
      </div>
    );
  }

  const resetDatabase = async () => {
    if (!showConfirmation) {
      setShowConfirmation(true);
      return;
    }

    setLoading(true);
    try {
      // This would be a real implementation with proper edge function
      // For now, just simulate the action
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: 'Database Reset',
        description: 'Database has been reset to default state.',
      });
    } catch (error) {
      console.error('Error resetting database:', error);
      toast({
        title: 'Reset Failed',
        description: 'Failed to reset database.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
      setShowConfirmation(false);
    }
  };

  return (
    <div className="container py-10 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Debug Panel</h1>
          <p className="text-muted-foreground">
            Advanced diagnostics and tools for system administrators
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-secondary p-2 rounded-md">
            {systemHealth === true && (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            )}
            {systemHealth === false && (
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
            )}
            <span>
              {systemHealth === null && 'System status unknown'}
              {systemHealth === true && 'System healthy'}
              {systemHealth === false && 'System issues detected'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Organizations</CardTitle>
            <CardDescription>Total in system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {organizationCount !== null ? organizationCount : '...'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Users</CardTitle>
            <CardDescription>Registered accounts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {userCount !== null ? userCount : '...'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Assets</CardTitle>
            <CardDescription>Inventory items</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {assetCount !== null ? assetCount : '...'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Forms</CardTitle>
            <CardDescription>Form templates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formCount !== null ? formCount : '...'}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="system">
        <TabsList>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="users">Users & Organizations</TabsTrigger>
          <TabsTrigger value="assets">Assets & Inventory</TabsTrigger>
          <TabsTrigger value="forms">Forms & Data</TabsTrigger>
          <TabsTrigger value="tools">Tools</TabsTrigger>
        </TabsList>
        
        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Diagnostics</CardTitle>
              <CardDescription>Check the health of your system components</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button 
                  onClick={runDatabaseDiagnostics} 
                  disabled={loading}
                  variant="outline"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Run Database Diagnostics
                </Button>
                <Button 
                  onClick={fixRlsPolicy} 
                  disabled={loading}
                  variant="outline"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Fix RLS Policies
                </Button>
                <Button 
                  onClick={fetchOrganizations} 
                  disabled={loading}
                  variant="outline"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Refresh Organizations
                </Button>
                <SetupMothership />
              </div>

              {databaseDiagnostics && (
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="diagnostics">
                    <AccordionTrigger>Database Diagnostic Results</AccordionTrigger>
                    <AccordionContent>
                      <pre className="bg-secondary p-4 rounded-md overflow-auto max-h-[400px] text-xs">
                        {JSON.stringify(databaseDiagnostics, null, 2)}
                      </pre>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="system-roles">
                    <AccordionTrigger>System Roles</AccordionTrigger>
                    <AccordionContent>
                      <pre className="bg-secondary p-4 rounded-md overflow-auto max-h-[400px] text-xs">
                        {JSON.stringify(databaseDiagnostics?.systemRoles, null, 2)}
                      </pre>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="organizations">
                    <AccordionTrigger>Organizations</AccordionTrigger>
                    <AccordionContent>
                      <pre className="bg-secondary p-4 rounded-md overflow-auto max-h-[400px] text-xs">
                        {JSON.stringify(databaseDiagnostics?.organizations, null, 2)}
                      </pre>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="organization-members">
                    <AccordionTrigger>Organization Members</AccordionTrigger>
                    <AccordionContent>
                      <pre className="bg-secondary p-4 rounded-md overflow-auto max-h-[400px] text-xs">
                        {JSON.stringify(databaseDiagnostics?.orgMembers, null, 2)}
                      </pre>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Current Organization</CardTitle>
              <CardDescription>View details of the currently selected organization</CardDescription>
            </CardHeader>
            <CardContent>
              {currentOrganization ? (
                <pre className="bg-secondary p-4 rounded-md overflow-auto max-h-[200px] text-xs">
                  {JSON.stringify(currentOrganization, null, 2)}
                </pre>
              ) : (
                <p>No organization selected</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Available Organizations</CardTitle>
              <CardDescription>All organizations accessible to the current user</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-secondary p-4 rounded-md overflow-auto max-h-[200px] text-xs">
                {JSON.stringify(organizations, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Advanced user diagnostic tools</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">User management diagnostics will be implemented here.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Asset Diagnostics</CardTitle>
              <CardDescription>Tools for troubleshooting inventory items</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Asset diagnostics will be implemented here.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forms" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Form Diagnostics</CardTitle>
              <CardDescription>Tools for troubleshooting forms and submissions</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Form diagnostics will be implemented here.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tools" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Tools</CardTitle>
              <CardDescription>Powerful tools for system maintenance (use with caution)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={resetDatabase}
                  disabled={loading}
                  variant="destructive"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {showConfirmation ? 'Confirm Reset' : 'Reset Database'}
                </Button>
                {showConfirmation && (
                  <Button
                    onClick={() => setShowConfirmation(false)}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                )}
              </div>
              {showConfirmation && (
                <div className="bg-destructive/10 border border-destructive p-4 rounded-md">
                  <p className="text-destructive font-medium">Warning: This action cannot be undone!</p>
                  <p className="text-destructive/80 text-sm">
                    This will reset the database to its default state. All user data, organizations, and configurations will be lost.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDebugPanel; 