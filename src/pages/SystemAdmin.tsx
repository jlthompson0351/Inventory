import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import AccessDeniedCard from '@/components/system-admin/AccessDeniedCard';
import AddAdminForm from '@/components/system-admin/AddAdminForm';
import AdminList, { type SystemAdmin } from '@/components/system-admin/AdminList';
import SystemStats from '@/components/system-admin/SystemStats';
import SystemSettings from '@/components/system-admin/SystemSettings';
import SystemLogs from '@/components/system-admin/SystemLogs';
import { OrganizationList } from '@/components/system-admin/OrganizationList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from "@/components/ui/button";
import { AlertTriangle, ChevronLeft, Database, ServerCog, Shield, Users, Building, Plus } from 'lucide-react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const SystemAdmin: React.FC = () => {
  const { user, userRoles } = useAuth();
  const [admins, setAdmins] = useState<SystemAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("admins");
  const [systemStats, setSystemStats] = useState({
    organizationsCount: 0,
    usersCount: 0,
    assetsCount: 0,
    formsCount: 0
  });
  const [orgName, setOrgName] = useState("");
  const [creatingOrg, setCreatingOrg] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // RESTRICT: Only allow super admins to access this page
    if (!userRoles.isSuperAdmin) {
      toast.error('You do not have permission to access this page. Only super administrators can access system administration.');
      navigate('/');
      return;
    }

    // Load list of system admins
    fetchSystemAdmins();
    
    // Fetch system stats
    fetchSystemStats();
  }, [navigate, userRoles]);

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
      
      // Get inventory items count instead of assets
      const { count: assetsCount, error: assetsError } = await supabase
        .from('inventory_items')
        .select('*', { count: 'exact', head: true });
        
      if (assetsError) throw assetsError;
      
      // Get forms count
      const { count: formsCount, error: formsError } = await supabase
        .from('forms')
        .select('*', { count: 'exact', head: true });
        
      if (formsError) throw formsError;
      
      setSystemStats({
        organizationsCount: orgsCount || 0,
        usersCount: usersCount || 0,
        assetsCount: assetsCount || 0,
        formsCount: formsCount || 0
      });
    } catch (error) {
      console.error('Error fetching system stats:', error);
      toast.error('Failed to load system statistics');
    }
  };

  // New function to create an organization
  const createOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!orgName.trim()) {
      toast.error('Please enter an organization name');
      return;
    }
    
    setCreatingOrg(true);
    
    try {
      // Step 1: Create organization
      const { data: organizationData, error: orgError } = await supabase
        .from('organizations')
        .insert([{ name: orgName.trim() }])
        .select()
        .single();
      
      if (orgError) throw orgError;
      
      if (!organizationData) {
        throw new Error("Failed to create organization");
      }
      
      toast.success(`Organization "${orgName}" created successfully!`);
      setOrgName("");
      fetchSystemStats(); // Refresh stats
    } catch (error) {
      console.error("Error creating organization:", error);
      toast.error("Failed to create organization. Please try again.");
    } finally {
      setCreatingOrg(false);
    }
  };

  const handleGoBack = () => {
    navigate('/');
  };

  // STRICT: Only allow super admins
  if (!userRoles.isSuperAdmin) {
    return <AccessDeniedCard />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-b from-gray-50 to-gray-100 p-4 gap-6">
      <Card className="w-full max-w-6xl">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleGoBack} 
                className="rounded-full h-8 w-8 mr-1"
                title="Back to Dashboard"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div>
                <CardTitle className="text-2xl font-bold">System Administration</CardTitle>
                <CardDescription>
                  Super admin control panel for system-wide settings
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                className="hidden md:flex items-center gap-1" 
                size="sm" 
                onClick={handleGoBack}
              >
                <ChevronLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
              <Badge variant="destructive" className="flex items-center gap-1">
                <Shield className="h-3 w-3" />
                Super Admin
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="admins" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-2 md:grid-cols-5 mb-4">
              <TabsTrigger value="organizations" className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                <span className="hidden sm:inline">Organizations</span>
                <span className="sm:hidden">Orgs</span>
              </TabsTrigger>
              <TabsTrigger value="admins" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">System Admins</span>
                <span className="sm:hidden">Admins</span>
              </TabsTrigger>
              <TabsTrigger value="stats" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                <span className="hidden sm:inline">System Statistics</span>
                <span className="sm:hidden">Stats</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <ServerCog className="h-4 w-4" />
                <span className="hidden sm:inline">System Settings</span>
                <span className="sm:hidden">Settings</span>
              </TabsTrigger>
              <TabsTrigger value="logs" className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                <span className="hidden sm:inline">System Logs</span>
                <span className="sm:hidden">Logs</span>
              </TabsTrigger>
            </TabsList>

            {/* Organizations Tab */}
            <TabsContent value="organizations" className="space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Create New Organization</CardTitle>
                  <CardDescription>
                    Create a new organization in the system
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={createOrganization} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Label htmlFor="org-name">Organization Name</Label>
                      <Input 
                        id="org-name" 
                        value={orgName} 
                        onChange={(e) => setOrgName(e.target.value)} 
                        placeholder="Enter organization name" 
                        required 
                      />
                    </div>
                    <Button type="submit" disabled={creatingOrg}>
                      {creatingOrg ? "Creating..." : (
                        <>
                          <Plus className="mr-2 h-4 w-4" />
                          Create Organization
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Manage Organizations</CardTitle>
                  <CardDescription>
                    View, edit, or delete organizations in the system
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <OrganizationList />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="admins" className="space-y-6">
              <AddAdminForm 
                onAdminAdded={fetchSystemAdmins} 
                isSuperAdmin={true}
              />
              <AdminList 
                admins={admins}
                loading={loading}
                onAdminRemoved={fetchSystemAdmins}
                currentUserId={user?.id || null}
                currentUserIsSuperAdmin={true}
              />
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
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemAdmin;
