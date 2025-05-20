import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Database, Users, Building } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SystemStats {
  organizationsCount: number;
  usersCount: number;
  assetsCount: number;
  formsCount: number;
  activeUsers?: number;
  newOrganizations?: number;
}

interface SystemStatsProps {
  initialStats: SystemStats;
}

export default function SystemStats({ initialStats }: SystemStatsProps) {
  const [stats, setStats] = useState<SystemStats>(initialStats);
  const [loading, setLoading] = useState(false);

  const fetchDetailedStats = async () => {
    setLoading(true);
    try {
      // Get active users in last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { count: activeUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gt('last_sign_in', thirtyDaysAgo.toISOString());

      // Get organizations created in last 30 days
      const { count: newOrgs } = await supabase
        .from('organizations')
        .select('*', { count: 'exact', head: true })
        .gt('created_at', thirtyDaysAgo.toISOString());

      setStats(prev => ({
        ...prev,
        activeUsers: activeUsers || 0,
        newOrganizations: newOrgs || 0
      }));
    } catch (error) {
      console.error('Error fetching detailed stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetailedStats();
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>System Statistics</CardTitle>
          <CardDescription>
            Detailed statistics about system usage and resources
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Total Organizations</span>
              </div>
              <p className="text-2xl font-bold">{stats.organizationsCount}</p>
              {stats.newOrganizations !== undefined && (
                <p className="text-sm text-muted-foreground">
                  +{stats.newOrganizations} in last 30 days
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Total Users</span>
              </div>
              <p className="text-2xl font-bold">{stats.usersCount}</p>
              {stats.activeUsers !== undefined && (
                <p className="text-sm text-muted-foreground">
                  {stats.activeUsers} active in last 30 days
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Total Assets</span>
              </div>
              <p className="text-2xl font-bold">{stats.assetsCount}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Total Forms</span>
              </div>
              <p className="text-2xl font-bold">{stats.formsCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
