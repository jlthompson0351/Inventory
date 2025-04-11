
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Define a more explicit type for SystemAdmin
type SystemAdmin = {
  id: string;
  user_id: string;
  role: 'admin';
  email: string | null; 
  created_at: string;
};

const SystemAdmin: React.FC = () => {
  const [admins, setAdmins] = useState<SystemAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUserIsAdmin, setCurrentUserIsAdmin] = useState(false);
  const navigate = useNavigate();

  // Check if current user is system admin on load
  useEffect(() => {
    const checkIfAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/login');
        return;
      }

      // Check if user is a system admin
      const { data: systemRole, error } = await supabase
        .from('system_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      const isAdmin = systemRole?.role === 'admin';
      setCurrentUserIsAdmin(isAdmin);

      if (!isAdmin) {
        toast.error('You do not have permission to access this page.');
        navigate('/');
      } else {
        // Load list of system admins
        fetchSystemAdmins();
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
      // Cast the role to 'admin' since we know all roles in this context are admin
      const typedAdmins: SystemAdmin[] = data.map(admin => ({
        ...admin,
        role: 'admin' as const
      }));
      setAdmins(typedAdmins);
    }
    
    setLoading(false);
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // First get the user_id from the email
      const { data: userData } = await supabase
        .rpc('get_user_id_by_email', { email_input: userEmail.trim() });
      
      if (!userData || userData.length === 0) {
        toast.error('User not found with that email');
        setIsSubmitting(false);
        return;
      }
      
      const foundUserId = userData[0].user_id;
      
      // Check if the user is already an admin
      const { data: existingRole } = await supabase
        .from('system_roles')
        .select('id')
        .eq('user_id', foundUserId);
      
      if (existingRole && existingRole.length > 0) {
        toast.error('This user is already a system admin');
        setIsSubmitting(false);
        return;
      }
      
      // Add the user as a system admin
      const { error: insertError } = await supabase
        .from('system_roles')
        .insert({
          user_id: foundUserId,
          role: 'admin'
        });
      
      if (insertError) {
        toast.error('Failed to add system admin');
        console.error('Error adding admin:', insertError);
      } else {
        toast.success(`${userEmail} has been added as a system admin`);
        setUserEmail('');
        fetchSystemAdmins();
      }
    } catch (error) {
      console.error('Error adding admin:', error);
      toast.error('An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveAdmin = async (adminId: string, adminEmail: string) => {
    // Get current user to prevent self-deletion
    const { data: { user } } = await supabase.auth.getUser();
    
    // Find the admin to check if it's the current user
    const adminToRemove = admins.find(admin => admin.id === adminId);
    
    if (adminToRemove?.user_id === user?.id) {
      toast.error("You cannot remove yourself as a system admin");
      return;
    }
    
    try {
      const { error } = await supabase
        .from('system_roles')
        .delete()
        .eq('id', adminId);
      
      if (error) {
        toast.error('Failed to remove admin');
        console.error('Error removing admin:', error);
      } else {
        toast.success(`${adminEmail} has been removed as system admin`);
        fetchSystemAdmins();
      }
    } catch (error) {
      console.error('Error removing admin:', error);
      toast.error('An error occurred');
    }
  };

  if (!currentUserIsAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              Access Denied
            </CardTitle>
            <CardDescription className="text-center">
              You need to be a system administrator to access this page.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button 
              onClick={() => navigate('/')}
              className="w-full"
            >
              Return to Dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-b from-gray-50 to-gray-100 p-4 gap-6">
      <Card className="w-full max-w-xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">
            System Administrators
          </CardTitle>
          <CardDescription>
            Manage users with system-wide administrative privileges
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddAdmin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="user-email">Add New System Admin</Label>
              <div className="flex gap-2">
                <Input 
                  id="user-email"
                  placeholder="Enter user email" 
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Adding...' : 'Add Admin'}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>Current System Admins</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-4">Loading administrators...</p>
          ) : admins.length === 0 ? (
            <p className="text-center py-4">No system administrators found.</p>
          ) : (
            <div className="space-y-2">
              {admins.map((admin) => (
                <div key={admin.id} className="flex items-center justify-between p-2 border rounded-md">
                  <div>
                    <p className="font-medium">{admin.email}</p>
                    <p className="text-sm text-gray-500">Added: {new Date(admin.created_at).toLocaleDateString()}</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => handleRemoveAdmin(admin.id, admin.email || '')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemAdmin;
