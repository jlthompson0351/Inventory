
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Crown, ShieldAlert, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const AdminStatusCheck: React.FC = () => {
  const [isChecking, setIsChecking] = useState(false);
  const [adminStatus, setAdminStatus] = useState<{
    isAdmin: boolean;
    isSuperAdmin: boolean;
    email?: string;
  } | null>(null);

  const checkAdminStatus = async () => {
    setIsChecking(true);
    try {
      // First get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('You need to be logged in to check admin status');
        setIsChecking(false);
        return;
      }

      // Query the system_roles table
      const { data: systemRole, error } = await supabase
        .from('system_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      if (error) {
        console.error('Error checking admin status:', error);
        if (error.code === 'PGRST116') { // No rows returned
          setAdminStatus({
            isAdmin: false,
            isSuperAdmin: false,
            email: user.email
          });
        } else {
          toast.error('Error checking admin status');
        }
      } else {
        setAdminStatus({
          isAdmin: !!systemRole && ['admin', 'super_admin'].includes(systemRole.role),
          isSuperAdmin: !!systemRole && systemRole.role === 'super_admin',
          email: user.email
        });
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto mt-8">
      <CardHeader>
        <CardTitle>Admin Status Check</CardTitle>
        <CardDescription>Verify if you have admin privileges in the system</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Button 
            onClick={checkAdminStatus}
            disabled={isChecking}
            className="w-full"
          >
            {isChecking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Checking...
              </>
            ) : (
              'Check My Admin Status'
            )}
          </Button>

          {adminStatus && (
            <div className="mt-4 p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-semibold">User:</span>
                <span>{adminStatus.email}</span>
              </div>
              
              {adminStatus.isSuperAdmin ? (
                <div className="flex items-center gap-2 text-amber-500">
                  <Crown className="h-5 w-5" />
                  <span className="font-bold">You are a Super Admin</span>
                </div>
              ) : adminStatus.isAdmin ? (
                <div className="flex items-center gap-2 text-blue-500">
                  <ShieldAlert className="h-5 w-5" />
                  <span className="font-bold">You are an Admin (not Super Admin)</span>
                </div>
              ) : (
                <div className="text-gray-500">
                  You are not an admin in the system
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminStatusCheck;
