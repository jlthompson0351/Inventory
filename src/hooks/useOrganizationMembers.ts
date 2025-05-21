import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface Member {
  id: string;
  user_id: string;
  role: string;
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

export const useOrganizationMembers = () => {
  const { organization } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMembers = async () => {
    if (!organization?.id) return;

    setIsLoading(true);
    try {
      // Get the member records for the organization
      const { data: memberData, error: memberError } = await supabase
        .from('organization_members')
        .select('id, user_id, role')
        .eq('organization_id', organization.id);

      if (memberError) throw memberError;
      
      if (!memberData || memberData.length === 0) {
        setMembers([]);
        setIsLoading(false);
        return;
      }

      // Now get the user emails for these members
      const userIds = memberData.map(member => member.user_id);
      
      // Get profile data 
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

  const removeMember = async (memberId: string) => {
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
    if (organization?.id) {
      fetchMembers();
    }
  }, [organization?.id]);

  return {
    members,
    isLoading,
    fetchMembers,
    updateMemberRole,
    removeMember
  };
};

export type { Member };
