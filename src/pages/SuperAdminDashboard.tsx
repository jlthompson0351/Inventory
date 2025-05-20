import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { AlertTriangle, 
  Database, 
  ServerCog, 
  Shield, 
  Users, 
  Activity,
  Settings,
  Building
} from 'lucide-react';
import AdminList from '@/components/system-admin/AdminList';
import AddAdminForm from '@/components/system-admin/AddAdminForm';
import SystemStats from '@/components/system-admin/SystemStats';
import SystemLogs from '@/components/system-admin/SystemLogs';
import SystemSettings from '@/components/system-admin/SystemSettings';
import { SetupMothership } from '@/components/system-admin/SetupMothership';

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [admins, setAdmins] = useState([]);
  const [systemStats, setSystemStats] = useState({
    organizationsCount: 0,
    usersCount: 0,
    assetsCount: 0,
    formsCount: 0
  });

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/login');
        return;
      }

      setCurrentUserId(user.id);

      const { data: systemRole } = await supabase
        .from('system_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'super_admin')
        .single();

      if (!systemRole) {
        toast.error('Super Admin access required');
        navigate('/');
        return;
      }

      setIsSuperAdmin(true);
      await Promise.all([
        fetchAdmins(),
        fetchSystemStats()
      ]);
    } catch (error) {
      console.error('Error checking access:', error);
      toast.error('An error occurred');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const fetchAdmins = async () => {
    const { data, error } = await supabase
      .from('system_roles')
      .select(`
        id,
        role,
        user_id,
        created_at,
        profiles:user_id (
          email
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching admins:', error);
      return;
    }

    setAdmins(data || []);
  };

  const fetchSystemStats = async () => {
    try {
      const [orgs, users, assets, forms] = await Promise.all([
        supabase.from('organizations').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('inventory_items').select('*', { count: 'exact', head: true }),
        supabase.from('forms').select('*', { count: 'exact', head: true })
      ]);

      setSystemStats({
        organizationsCount: orgs.count || 0,
        usersCount: users.count || 0,
        assetsCount: assets.count || 0,
        formsCount: forms.count || 0
      });
    } catch (error) {
      console.error('Error fetching system stats:', error);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8">
            <div className="flex items-center justify-center">
              <Activity className="h-6 w-6 animate-spin mr-2" />
              <span>Loading super admin dashboard...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You need super administrator privileges to access this dashboard.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
          <p className="text-muted-foreground">System-wide administration and monitoring</p>
        </div>
        <Badge variant="destructive" className="flex items-center gap-1">
          <Shield className="h-3 w-3" />
          Super Admin
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Organizations</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStats.organizationsCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStats.usersCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Assets</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStats.assetsCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Forms</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStats.formsCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common super admin tasks</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <SetupMothership />
          <Button variant="outline" onClick={fetchSystemStats}>
            Refresh Stats
          </Button>
          <Button variant="outline" asChild>
            <a href="/admin/debug" target="_blank" rel="noopener noreferrer">
              Debug Panel
            </a>
          </Button>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="admins" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Admins
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Statistics
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="admins">
          <div className="grid gap-6">
            <AddAdminForm onAdminAdded={fetchAdmins} currentUserIsSuperAdmin={true} />
            <AdminList 
              admins={admins}
              loading={loading}
              onAdminRemoved={fetchAdmins}
              currentUserId={currentUserId}
              currentUserIsSuperAdmin={true}
            />
          </div>
        </TabsContent>

        <TabsContent value="stats">
          <SystemStats initialStats={systemStats} />
        </TabsContent>

        <TabsContent value="settings">
          <SystemSettings />
        </TabsContent>

        <TabsContent value="logs">
          <SystemLogs />
        </TabsContent>
      </Tabs>
    </div>
  );
} 