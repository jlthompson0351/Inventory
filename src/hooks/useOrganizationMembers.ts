import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Member {
  id: string;
  user_id: string;
  role: string;
  is_primary: boolean;
  email: string;
  full_name: string | null;
}

interface User {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
  };
}

export const useOrganizationMembers = (organizationId: string | undefined) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMembers = async () => {
    if (!organizationId) return;

    setIsLoading(true);
    try {
      // First, get the member records
      const { data: memberData, error: memberError } = await supabase
        .from('organization_members')
        .select('id, user_id, role, is_primary')
        .eq('organization_id', organizationId);

      if (memberError) throw memberError;
      
      if (!memberData || memberData.length === 0) {
        setMembers([]);
        setIsLoading(false);
        return;
      }

      // Now get the user emails for these members
      const userIds = memberData.map(member => member.user_id);
      
      // Get the auth user emails - simulating this since we don't have admin access
      // In a real implementation, you would use the admin API
      
      // Instead, we'll try getting profile data directly
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);
        
      if (profileError) throw profileError;
      
      // Map the data together
      const formattedMembers = memberData.map((member) => {
        const profile = profileData?.find(p => p.id === member.user_id);
        
        return {
          id: member.id,
          user_id: member.user_id,
          role: member.role,
          is_primary: member.is_primary,
          email: `user-${member.user_id.substring(0, 8)}@example.com`, // Fallback email
          full_name: profile?.full_name || null
        };
      });
      
      setMembers(formattedMembers);
    } catch (error) {
      console.error('Error fetching members:', error);
      toast.error("Failed to load organization members");
    } finally {
      setIsLoading(false);
    }
  };

  const updateMemberRole = async (memberId: string, role: string) => {
    try {
      const { error } = await supabase
        .from('organization_members')
        .update({ role })
        .eq('id', memberId);

      if (error) throw error;

      toast.success("Member role updated");
      fetchMembers();
    } catch (error) {
      console.error('Error updating member role:', error);
      toast.error("Failed to update member role");
    }
  };

  const removeMember = async (memberId: string, isPrimary: boolean) => {
    if (isPrimary) {
      toast.error("Cannot remove the primary member of an organization");
      return;
    }

    try {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast.success("Member removed from organization");
      fetchMembers();
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error("Failed to remove member");
    }
  };

  useEffect(() => {
    if (organizationId) {
      fetchMembers();
    }
  }, [organizationId]);

  return {
    members,
    isLoading,
    fetchMembers,
    updateMemberRole,
    removeMember
  };
};

export type { Member };
