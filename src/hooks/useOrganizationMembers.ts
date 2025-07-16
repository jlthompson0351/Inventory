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
      // Use the new RPC function to get members with activity data
      const { data: memberData, error: memberError } = await supabase
        .rpc('get_organization_members_with_activity' as any, {
          org_id: organization.id
        });

      if (memberError) {
        // Fallback to the basic function if the activity one fails
        console.warn('Activity function failed, falling back to basic:', memberError);
        const { data: basicData, error: basicError } = await supabase
          .rpc('get_organization_members_with_emails' as any, {
            org_id: organization.id
          });
        
        if (basicError) throw basicError;
        
        // Format the basic data for the UI
        const formattedMembers: OrganizationMember[] = basicData?.map((member: any) => ({
          id: member.member_id,
          user_id: member.user_id,
          role: member.role,
          email: member.email,
          full_name: member.full_name,
          avatar_url: member.avatar_url,
          joined_at: member.joined_at,
        })) || [];
        
        setMembers(formattedMembers);
        return;
      }
      
      // Format the activity-enhanced data for the UI
      const formattedMembers: OrganizationMember[] = memberData?.map((member: any) => ({
        id: member.member_id,
        user_id: member.user_id,
        role: member.role,
        email: member.email,
        full_name: member.full_name,
        avatar_url: member.avatar_url,
        joined_at: member.joined_at,
        last_sign_in_at: member.last_sign_in_at,
        created_at: member.created_at,
        recent_activity_count: member.recent_activity_count || 0,
        session_count: member.session_count || 0,
      })) || [];
      
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
    refreshMembers: fetchMembers, // Alias for convenience
    updateMemberRole,
    removeMember,
    deleteUserCompletely
  };
};
