
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import AccessDeniedCard from '@/components/system-admin/AccessDeniedCard';
import AddAdminForm from '@/components/system-admin/AddAdminForm';
import AdminList, { type SystemAdmin } from '@/components/system-admin/AdminList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Database, ServerCog, Shield, Users } from 'lucide-react';

const SystemAdmin: React.FC = () => {
  const [admins, setAdmins] = useState<SystemAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserIsAdmin, setCurrentUserIsAdmin] = useState(false);
  const [currentUserIsSuperAdmin, setCurrentUserIsSuperAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("admins");
  const navigate = useNavigate();

  // System stats
  const [stats, setStats] = useState({
    organizationsCount: 0,
    usersCount: 0,
    loading: true
  });

  // Check if current user is system admin on load
  useEffect(() => {
    const checkIfAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/login');
        return;
      }

      setCurrentUserId(user.id);

      // Check if user is a system admin
      const { data: systemRole, error } = await supabase
        .from('system_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      const isAdmin = systemRole?.role === 'admin' || systemRole?.role === 'super_admin';
      const isSuperAdmin = systemRole?.role === 'super_admin';
      
      setCurrentUserIsAdmin(isAdmin);
      setCurrentUserIsSuperAdmin(isSuperAdmin);

      if (!isAdmin) {
        toast.error('You do not have permission to access this page.');
        navigate('/');
      } else {
        // Load list of system admins
        fetchSystemAdmins();
        
        // If super admin, also fetch system stats
        if (isSuperAdmin) {
          fetchSystemStats();
        }
      }
    };

    checkIfAdmin();
  }, [navigate]);

  const fetchSystemAdmins = async () => {
    setLoading(true);
    
    // Use the RPC function to get system admins
    const { data, error } = await supabase.rpc('get_system_admins');
    
    if (error) {
      console.error('Error fetching system admins:', error);
      toast.error('Failed to load admin users');
    } else if (data) {
      // Transform the data to match the SystemAdmin type
      const transformedData: SystemAdmin[] = data.map((admin) => ({
        ...admin,
        role: admin.role as 'admin' | 'super_admin'
      }));
      
      setAdmins(transformedData);
    }
    
    setLoading(false);
  };

  const fetchSystemStats = async () => {
    setStats(prev => ({ ...prev, loading: true }));
    
    try {
      // Get organizations count
      const { count: orgsCount, error: orgsError } = await supabase
        .from('organizations')
        .select('*', { count: 'exact', head: true });

      if (orgsError) throw orgsError;
      
      // Get users count (through profiles as we can't directly query auth.users)
      const { count: usersCount, error: usersError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
        
      if (usersError) throw usersError;
      
      setStats({
        organizationsCount: orgsCount || 0,
        usersCount: usersCount || 0,
        loading: false
      });
    } catch (error) {
      console.error('Error fetching system stats:', error);
      toast.error('Failed to load system statistics');
      setStats(prev => ({ ...prev, loading: false }));
    }
  };

  if (!currentUserIsAdmin) {
    return <AccessDeniedCard />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-b from-gray-50 to-gray-100 p-4 gap-6">
      <Card className="w-full max-w-6xl">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl font-bold">System Administration</CardTitle>
              <CardDescription>
                {currentUserIsSuperAdmin ? 
                  "Super admin control panel for system-wide settings" : 
                  "Admin control panel for managing system admins"}
              </CardDescription>
            </div>
            <Badge variant={currentUserIsSuperAdmin ? "destructive" : "secondary"} className="flex items-center gap-1">
              <Shield className="h-3 w-3" />
              {currentUserIsSuperAdmin ? "Super Admin" : "Admin"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="admins" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-2 md:grid-cols-4 mb-4">
              <TabsTrigger value="admins" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">System Admins</span>
                <span className="sm:hidden">Admins</span>
              </TabsTrigger>
              <TabsTrigger value="stats" className="flex items-center gap-2" disabled={!currentUserIsSuperAdmin}>
                <Database className="h-4 w-4" />
                <span className="hidden sm:inline">System Statistics</span>
                <span className="sm:hidden">Stats</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2" disabled={!currentUserIsSuperAdmin}>
                <ServerCog className="h-4 w-4" />
                <span className="hidden sm:inline">System Settings</span>
                <span className="sm:hidden">Settings</span>
              </TabsTrigger>
              <TabsTrigger value="logs" className="flex items-center gap-2" disabled={!currentUserIsSuperAdmin}>
                <AlertTriangle className="h-4 w-4" />
                <span className="hidden sm:inline">System Logs</span>
                <span className="sm:hidden">Logs</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="admins" className="space-y-6">
              <AddAdminForm 
                onAdminAdded={fetchSystemAdmins} 
                currentUserIsSuperAdmin={currentUserIsSuperAdmin}
              />
              <AdminList 
                admins={admins}
                loading={loading}
                onAdminRemoved={fetchSystemAdmins}
                currentUserId={currentUserId}
                currentUserIsSuperAdmin={currentUserIsSuperAdmin}
              />
            </TabsContent>

            <TabsContent value="stats">
              {currentUserIsSuperAdmin && (
                <Card>
                  <CardHeader>
                    <CardTitle>System Statistics</CardTitle>
                    <CardDescription>Overview of system usage and metrics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {stats.loading ? (
                      <div className="space-y-2">
                        <p>Loading statistics...</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="border rounded-lg p-4">
                          <p className="text-sm text-muted-foreground">Total Organizations</p>
                          <h3 className="text-3xl font-bold">{stats.organizationsCount}</h3>
                        </div>
                        <div className="border rounded-lg p-4">
                          <p className="text-sm text-muted-foreground">Total Users</p>
                          <h3 className="text-3xl font-bold">{stats.usersCount}</h3>
                        </div>
                      </div>
                    )}
                    <div className="flex justify-end mt-4">
                      <Button variant="outline" onClick={fetchSystemStats}>
                        Refresh Stats
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="settings">
              {currentUserIsSuperAdmin && (
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
              )}
            </TabsContent>

            <TabsContent value="logs">
              {currentUserIsSuperAdmin && (
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
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemAdmin;
