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
  const [newInviteCustomMessage, setNewInviteCustomMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchInvitations = async () => {
    if (!organization?.id) return;

    try {
      // Use the function to fetch invitations using RPC
      const { data, error } = await supabase
        .rpc('get_organization_invitations', { target_organization_id: organization.id });

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
          target_email: newInviteEmail,
          target_role: newInviteRole,
          target_custom_message: newInviteCustomMessage,
          target_organization_id: organization.id
        });

      if (error) throw error;

      toast.success(`Invitation sent to ${newInviteEmail}`);
      setNewInviteEmail('');
      setNewInviteRole('member');
      setNewInviteCustomMessage('');
      fetchInvitations();
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast.error("Failed to send invitation");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resendInvitation = async (invitationId: string) => {
    try {
      // Assume an RPC function 'resend_invitation' exists
      const { error } = await supabase
        .rpc('resend_invitation', { invitation_id: invitationId });

      if (error) throw error;

      toast.success("Invitation resent successfully");
      fetchInvitations(); // Refresh the list to show updated expiry or status
    } catch (error) {
      console.error('Error resending invitation:', error);
      toast.error("Failed to resend invitation");
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
    newInviteCustomMessage,
    setNewInviteCustomMessage,
    isSubmitting,
    fetchInvitations,
    sendInvitation,
    resendInvitation,
    deleteInvitation
  };
};
