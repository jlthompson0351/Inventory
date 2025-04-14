
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

export const useOrganizationMembers = (organizationId: string | undefined) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMembers = async () => {
    if (!organizationId) return;

    setIsLoading(true);
    try {
      // Fetch members with their profiles
      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          id,
          user_id,
          role,
          is_primary,
          user_id (
            email:email
          ),
          profiles!user_id (
            full_name
          )
        `)
        .eq('organization_id', organizationId);

      if (error) throw error;

      const formattedMembers: Member[] = data.map((member: any) => ({
        id: member.id,
        user_id: member.user_id,
        role: member.role,
        is_primary: member.is_primary,
        email: member.user_id.email,
        full_name: member.profiles?.full_name || null
      }));

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
