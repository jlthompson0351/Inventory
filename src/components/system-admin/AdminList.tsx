
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, AlertTriangle, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Define the type for SystemAdmin
export type SystemAdmin = {
  id: string;
  user_id: string;
  role: 'admin' | 'super_admin';
  email: string | null;
  created_at: string;
};

interface AdminListProps {
  admins: SystemAdmin[];
  loading: boolean;
  onAdminRemoved: () => void;
  currentUserId: string | null;
  currentUserIsSuperAdmin: boolean;
}

const AdminList: React.FC<AdminListProps> = ({ 
  admins, 
  loading, 
  onAdminRemoved, 
  currentUserId,
  currentUserIsSuperAdmin
}) => {
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [adminToRemove, setAdminToRemove] = useState<{ id: string; email: string } | null>(null);

  const openRemoveDialog = (adminId: string, adminEmail: string) => {
    setAdminToRemove({ id: adminId, email: adminEmail });
    setConfirmDialogOpen(true);
  };

  const handleRemoveAdmin = async () => {
    if (!adminToRemove) return;

    try {
      // Find the admin to check if it's the current user or a super_admin
      const admin = admins.find(admin => admin.id === adminToRemove.id);
      
      if (!admin) {
        toast.error("Admin not found");
        setConfirmDialogOpen(false);
        setAdminToRemove(null);
        return;
      }
      
      // Prevent removing yourself
      if (admin.user_id === currentUserId) {
        toast.error("You cannot remove yourself as a system admin");
        setConfirmDialogOpen(false);
        setAdminToRemove(null);
        return;
      }
      
      // Prevent regular admins from removing super_admins
      if (admin.role === 'super_admin' && !currentUserIsSuperAdmin) {
        toast.error("Only super admins can remove other super admins");
        setConfirmDialogOpen(false);
        setAdminToRemove(null);
        return;
      }
      
      const { error } = await supabase
        .from('system_roles')
        .delete()
        .eq('id', adminToRemove.id);
      
      if (error) {
        toast.error('Failed to remove admin');
        console.error('Error removing admin:', error);
      } else {
        toast.success(`${adminToRemove.email} has been removed as system admin`);
        onAdminRemoved();
      }
    } catch (error) {
      console.error('Error removing admin:', error);
      toast.error('An error occurred');
    } finally {
      setConfirmDialogOpen(false);
      setAdminToRemove(null);
    }
  };

  // Function to check if an admin can be removed
  const canRemoveAdmin = (admin: SystemAdmin) => {
    // Super admins can remove any admin except themselves
    if (currentUserIsSuperAdmin) {
      return admin.user_id !== currentUserId;
    }
    
    // Regular admins can only remove other regular admins, not super admins
    return admin.role !== 'super_admin' && admin.user_id !== currentUserId;
  };

  return (
    <>
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
                  <div className="flex items-center gap-2">
                    {admin.role === 'super_admin' && (
                      <Shield className="h-4 w-4 text-amber-500" aria-label="Super Admin" />
                    )}
                    <div>
                      <p className="font-medium">{admin.email}</p>
                      <div className="flex items-center gap-1">
                        <p className="text-sm text-gray-500">
                          {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'} • Added: {new Date(admin.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                  {canRemoveAdmin(admin) ? (
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={() => openRemoveDialog(admin.id, admin.email || '')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="icon" 
                      disabled
                      aria-label={admin.user_id === currentUserId ? "Cannot remove yourself" : "Cannot remove super admin"}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirm Admin Removal
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {adminToRemove?.email} as a system administrator? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRemoveAdmin}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove Admin
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AdminList;
