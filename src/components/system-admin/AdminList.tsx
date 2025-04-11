
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, AlertTriangle } from 'lucide-react';
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
  role: 'admin';
  email: string | null;
  created_at: string;
};

interface AdminListProps {
  admins: SystemAdmin[];
  loading: boolean;
  onAdminRemoved: () => void;
}

const AdminList: React.FC<AdminListProps> = ({ admins, loading, onAdminRemoved }) => {
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [adminToRemove, setAdminToRemove] = useState<{ id: string; email: string } | null>(null);

  const openRemoveDialog = (adminId: string, adminEmail: string) => {
    setAdminToRemove({ id: adminId, email: adminEmail });
    setConfirmDialogOpen(true);
  };

  const handleRemoveAdmin = async () => {
    if (!adminToRemove) return;

    // Get current user to prevent self-deletion
    const { data: { user } } = await supabase.auth.getUser();
    
    // Find the admin to check if it's the current user
    const admin = admins.find(admin => admin.id === adminToRemove.id);
    
    if (admin?.user_id === user?.id) {
      toast.error("You cannot remove yourself as a system admin");
      setConfirmDialogOpen(false);
      setAdminToRemove(null);
      return;
    }
    
    try {
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
                  <div>
                    <p className="font-medium">{admin.email}</p>
                    <p className="text-sm text-gray-500">Added: {new Date(admin.created_at).toLocaleDateString()}</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => openRemoveDialog(admin.id, admin.email || '')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
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
