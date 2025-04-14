
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { InvitationWithOrgName } from '@/types/invitation';

export const useAcceptInvitation = (token: string | null, invitation: InvitationWithOrgName | null) => {
  const [accepting, setAccepting] = useState(false);
  const navigate = useNavigate();

  const handleAcceptInvitation = async () => {
    if (!token) return;

    setAccepting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // If user is not logged in, redirect to login with return URL
        const returnUrl = `/invitation?token=${token}`;
        navigate(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
        return;
      }

      // Call the accept_invitation function using RPC
      const { data, error } = await supabase
        .rpc('accept_invitation', { invitation_token: token });

      if (error) {
        throw error;
      }

      toast.success(`You've joined ${invitation?.organizationName}!`);
      navigate('/');
    } catch (error) {
      console.error('Error accepting invitation:', error);
      toast.error("Failed to accept invitation");
    } finally {
      setAccepting(false);
    }
  };

  return { accepting, handleAcceptInvitation };
};
