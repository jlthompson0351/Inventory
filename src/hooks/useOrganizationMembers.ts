import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { deleteUser } from '@/services/organizationService';
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
      // First, get organization members
      const { data: memberData, error: memberError } = await supabase
        .from('organization_members')
        .select('id, role, created_at, user_id')
        .eq('organization_id', organization.id);

      if (memberError) throw memberError;
      
      if (!memberData || memberData.length === 0) {
        setMembers([]);
        setIsLoading(false);
        return;
      }

      // Get user IDs to fetch profiles
      const userIds = memberData.map(member => member.user_id);
      
      // Fetch profiles for all members
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      if (profileError) {
        console.warn('Error fetching profiles:', profileError);
        // Continue without profile data
      }

      // Get user emails from auth.users (if needed)
      // For now, we'll use placeholder emails since we can't directly query auth.users
      
      // Combine member and profile data
      const formattedMembers: OrganizationMember[] = memberData.map((member: any, index: number) => {
        const profile = profileData?.find(p => p.id === member.user_id);
        
        return {
          id: member.id,
          user_id: member.user_id,
          role: member.role,
          email: `member${index + 1}@organization.com`, // Placeholder - would need RPC to get real email
          full_name: profile?.full_name || `Member ${index + 1}`,
          avatar_url: profile?.avatar_url || null,
          joined_at: member.created_at || new Date().toISOString(),
        };
      });
      
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

  const deleteUserCompletely = async (userId: string) => {
    if (!user || !organization) return;

    try {
      const success = await deleteUser(userId);
      if (success) {
        fetchMembers();
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error("Failed to delete user");
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
    removeMember,
    deleteUserCompletely
  };
};
