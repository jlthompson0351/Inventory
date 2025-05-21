import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PendingInvitation } from '@/types/invitation';
import { useAuth } from '@/hooks/useAuth';

export const useOrganizationInvitations = () => {
  const { organization } = useAuth();
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [newInviteEmail, setNewInviteEmail] = useState('');
  const [newInviteRole, setNewInviteRole] = useState('member');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchInvitations = async () => {
    if (!organization?.id) return;

    try {
      // Use the function to fetch invitations using RPC
      const { data, error } = await supabase
        .rpc('get_organization_invitations', { org_id: organization.id });

      if (error) throw error;
      
      setInvitations(data || []);
    } catch (error) {
      console.error('Error fetching invitations:', error);
      toast.error("Failed to load pending invitations");
    }
  };

  const sendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization?.id) return;

    setIsSubmitting(true);
    try {
      // Use the function to create an invitation using RPC
      const { data, error } = await supabase
        .rpc('create_invitation', {
          org_id: organization.id,
          email_address: newInviteEmail,
          member_role: newInviteRole
        });

      if (error) throw error;

      toast.success(`Invitation sent to ${newInviteEmail}`);
      setNewInviteEmail('');
      setNewInviteRole('member');
      fetchInvitations();
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast.error("Failed to send invitation");
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteInvitation = async (invitationId: string) => {
    try {
      // Use the function to delete an invitation using RPC
      const { data, error } = await supabase
        .rpc('delete_invitation', { invitation_id: invitationId });

      if (error) throw error;

      toast.success("Invitation canceled");
      fetchInvitations();
    } catch (error) {
      console.error('Error canceling invitation:', error);
      toast.error("Failed to cancel invitation");
    }
  };

  useEffect(() => {
    if (organization?.id) {
      fetchInvitations();
    }
  }, [organization?.id]);

  return {
    invitations,
    newInviteEmail,
    setNewInviteEmail,
    newInviteRole,
    setNewInviteRole,
    isSubmitting,
    fetchInvitations,
    sendInvitation,
    deleteInvitation
  };
};
