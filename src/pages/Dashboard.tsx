
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package2, Users, ClipboardList, Eye, ArrowUpRight, ArrowRight, Layers, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import DashboardStats from "@/components/dashboard/DashboardStats";
import DashboardChart from "@/components/dashboard/DashboardChart";
import RecentActivities from "@/components/dashboard/RecentActivities";

const Dashboard = () => {
  const { currentOrganization } = useOrganization();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAssets: 0,
    activeUsers: 0,
    pendingForms: 0,
    assetTypes: 0
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!currentOrganization) return;
      
      try {
        setLoading(true);
        
        // In a real implementation, these would be actual queries to get real data
        // For now, we'll use placeholder data
        
        // Example query (commented out since we're using placeholder data)
        // const { count: totalAssets } = await supabase
        //   .from('assets')
        //   .select('*', { count: 'exact', head: true })
        //   .eq('organization_id', currentOrganization.id);
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        setStats({
          totalAssets: 217,
          activeUsers: 8,
          pendingForms: 12,
          assetTypes: 5
        });
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [currentOrganization]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Button variant="outline" size="sm" asChild>
          <Link to="/reports">
            View Reports <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
      
      {/* Dashboard Stats */}
      <DashboardStats stats={stats} loading={loading} />
      
      {/* Main Dashboard Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="col-span-1">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle>Inventory Status</CardTitle>
                  <CardDescription>Asset allocation and usage</CardDescription>
                </div>
                <Package2 className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <DashboardChart />
              </CardContent>
              <CardFooter>
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link to="/inventory">
                    <Eye className="mr-2 h-4 w-4" />
                    View Inventory
                  </Link>
                </Button>
              </CardFooter>
            </Card>
            
            <Card className="col-span-1">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle>Recent Activities</CardTitle>
                  <CardDescription>Latest system events</CardDescription>
                </div>
                <ClipboardList className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <RecentActivities />
              </CardContent>
              <CardFooter>
                <Button variant="outline" size="sm" asChild className="w-full">
                  <Link to="/inventory">View All Activities</Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Forms</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Pending</span>
                  <span className="text-sm font-medium">{stats.pendingForms}</span>
                </div>
                <Progress value={45} className="h-2" />
              </CardContent>
              <CardFooter className="pt-2">
                <Button variant="ghost" size="sm" asChild className="w-full">
                  <Link to="/forms">
                    <FileText className="mr-2 h-4 w-4" />
                    Manage Forms
                  </Link>
                </Button>
              </CardFooter>
            </Card>
            
            <Card className="col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Asset Types</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Configured</span>
                  <span className="text-sm font-medium">{stats.assetTypes}</span>
                </div>
                <Progress value={75} className="h-2" />
              </CardContent>
              <CardFooter className="pt-2">
                <Button variant="ghost" size="sm" asChild className="w-full">
                  <Link to="/asset-types">
                    <Layers className="mr-2 h-4 w-4" />
                    Manage Types
                  </Link>
                </Button>
              </CardFooter>
            </Card>
            
            <Card className="col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Team Members</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Active</span>
                  <span className="text-sm font-medium">{stats.activeUsers}</span>
                </div>
                <Progress value={65} className="h-2" />
              </CardContent>
              <CardFooter className="pt-2">
                <Button variant="ghost" size="sm" asChild className="w-full">
                  <Link to="/organization/members">
                    <Users className="mr-2 h-4 w-4" />
                    Manage Team
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Analytics</CardTitle>
              <CardDescription>
                Detailed analysis of inventory usage and trends
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <div className="flex h-full items-center justify-center border rounded-md bg-muted/20">
                <p className="text-sm text-muted-foreground">
                  Detailed analytics will be available in the next update
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;
