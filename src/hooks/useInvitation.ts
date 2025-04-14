
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { InvitationWithOrgName } from '@/types/invitation';

export const useInvitation = (token: string | null) => {
  const [invitation, setInvitation] = useState<InvitationWithOrgName | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvitation = async () => {
      if (!token) {
        setError('Invalid invitation link');
        setLoading(false);
        return;
      }

      try {
        // Call the function to get invitation by token using RPC
        const { data: invitationData, error: invitationError } = await supabase
          .rpc('get_invitation_by_token', { token_input: token });
        
        if (invitationError || !invitationData || invitationData.length === 0) {
          console.error('Error fetching invitation:', invitationError);
          setError('Invitation not found');
          setLoading(false);
          return;
        }

        // Since we're getting an array back from the RPC function, get the first item
        const invitationItem = invitationData[0];

        // Check if the invitation has expired
        if (new Date(invitationItem.expires_at) < new Date()) {
          setError('This invitation has expired');
          setLoading(false);
          return;
        }

        // Check if the invitation has already been accepted
        if (invitationItem.accepted_at) {
          setError('This invitation has already been accepted');
          setLoading(false);
          return;
        }

        // Fetch organization name
        const { data: orgData } = await supabase
          .from('organizations')
          .select('name')
          .eq('id', invitationItem.organization_id)
          .single();

        setInvitation({
          ...invitationItem,
          organizationName: orgData?.name || 'Unknown Organization'
        });
      } catch (error) {
        console.error('Error fetching invitation:', error);
        setError('An error occurred while loading the invitation');
      } finally {
        setLoading(false);
      }
    };

    fetchInvitation();
  }, [token]);

  return { invitation, loading, error };
};
