
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import AccessDeniedCard from '@/components/system-admin/AccessDeniedCard';
import AddAdminForm from '@/components/system-admin/AddAdminForm';
import AdminList, { type SystemAdmin } from '@/components/system-admin/AdminList';

const SystemAdmin: React.FC = () => {
  const [admins, setAdmins] = useState<SystemAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserIsAdmin, setCurrentUserIsAdmin] = useState(false);
  const [currentUserIsSuperAdmin, setCurrentUserIsSuperAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const navigate = useNavigate();

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

  if (!currentUserIsAdmin) {
    return <AccessDeniedCard />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-b from-gray-50 to-gray-100 p-4 gap-6">
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
    </div>
  );
};

export default SystemAdmin;
