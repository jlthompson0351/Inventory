import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import type { OrganizationMember } from '@/types/organization';

export const useOrganizationMembers = () => {
  const { user, organization } = useAuth();
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMembers = async () => {
    if (!organization?.id) {
      setMembers([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data: memberData, error: memberError } = await supabase
        .from('organization_members')
        .select(`
          id, 
          role,
          joined_at:created_at,
          user_id, 
          profiles (full_name, avatar_url),
          users (email)
        `)
        .eq('organization_id', organization.id);

      if (memberError) throw memberError;
      
      if (!memberData) {
        setMembers([]);
        setIsLoading(false);
        return;
      }

      const formattedMembers: OrganizationMember[] = memberData.map((member: any) => ({
        id: member.id,
        user_id: member.user_id,
        role: member.role,
        email: member.users?.email || 'N/A',
        full_name: member.profiles?.full_name || null,
        avatar_url: member.profiles?.avatar_url || null,
        joined_at: member.joined_at || new Date().toISOString(),
      }));
      
      setMembers(formattedMembers);
    } catch (error) {
      console.error('Error fetching members:', error);
      toast.error("Failed to load organization members");
      setMembers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const updateMemberRole = async (memberId: string, role: string) => {
    if (!user || !organization) return;

    try {
      const { error } = await supabase
        .from('organization_members')
        .update({ role })
        .eq('id', memberId)
        .eq('organization_id', organization.id);

      if (error) throw error;

      toast.success("Member role updated");
      fetchMembers();
    } catch (error) {
      console.error('Error updating member role:', error);
      toast.error("Failed to update member role");
    }
  };

  const removeMember = async (memberId: string) => {
    if (!user || !organization) return;

    try {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', memberId)
        .eq('organization_id', organization.id);

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
    } else {
      setMembers([]);
      setIsLoading(false);
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
