
import React from 'react';
import { useSearchParams } from 'react-router-dom';
import AuthLayout from '@/components/auth/AuthLayout';
import InvitationLoading from '@/components/invitation/InvitationLoading';
import InvitationError from '@/components/invitation/InvitationError';
import InvitationDetails from '@/components/invitation/InvitationDetails';
import { useInvitation } from '@/hooks/useInvitation';
import { useAcceptInvitation } from '@/hooks/useAcceptInvitation';

const InvitationAccept = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const { invitation, loading, error } = useInvitation(token);
  const { accepting, handleAcceptInvitation } = useAcceptInvitation(token, invitation);

  if (loading) {
    return (
      <AuthLayout>
        <InvitationLoading />
      </AuthLayout>
    );
  }

  if (error) {
    return (
      <AuthLayout>
        <InvitationError error={error} />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      {invitation && (
        <InvitationDetails 
          invitation={invitation}
          accepting={accepting}
          onAccept={handleAcceptInvitation}
        />
      )}
    </AuthLayout>
  );
};

export default InvitationAccept;
