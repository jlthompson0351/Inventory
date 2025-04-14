
import React, { useState } from 'react';
import { Database } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

interface SystemStatsProps {
  initialStats?: {
    organizationsCount: number;
    usersCount: number;
  };
}

const SystemStats: React.FC<SystemStatsProps> = ({ initialStats }) => {
  const [stats, setStats] = useState({
    organizationsCount: initialStats?.organizationsCount || 0,
    usersCount: initialStats?.usersCount || 0,
    loading: false
  });

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

  return (
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
  );
};

export default SystemStats;
