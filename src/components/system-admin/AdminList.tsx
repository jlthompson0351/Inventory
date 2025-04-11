
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
        onAdminRemoved();
      }
    } catch (error) {
      console.error('Error removing admin:', error);
      toast.error('An error occurred');
    }
  };

  return (
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
  );
};

export default AdminList;
