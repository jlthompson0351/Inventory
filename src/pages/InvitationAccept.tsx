
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Building, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import AuthLayout from '@/components/auth/AuthLayout';
import { Invitation } from '@/types/invitation';

interface InvitationWithOrgName extends Invitation {
  organizationName: string;
}

const InvitationAccept = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const [invitation, setInvitation] = useState<InvitationWithOrgName | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

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

  if (loading) {
    return (
      <AuthLayout>
        <Card className="w-full">
          <CardContent className="flex flex-col items-center justify-center py-10">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <p>Loading invitation...</p>
          </CardContent>
        </Card>
      </AuthLayout>
    );
  }

  if (error) {
    return (
      <AuthLayout>
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-center text-destructive">Invalid Invitation</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-6">
            <XCircle className="h-16 w-16 text-destructive mb-4" />
            <p className="text-center text-lg mb-2">
              {error}
            </p>
            <p className="text-center text-muted-foreground">
              Please contact your organization administrator for a new invitation.
            </p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => navigate('/')} className="w-full">
              Go to Dashboard
            </Button>
          </CardFooter>
        </Card>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-center">Organization Invitation</CardTitle>
          <CardDescription className="text-center">
            You've been invited to join an organization
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-6">
          <div className="bg-primary/10 p-4 rounded-full mb-4">
            <Building className="h-12 w-12 text-primary" />
          </div>
          <h3 className="text-xl font-bold mb-1">{invitation?.organizationName}</h3>
          <p className="text-muted-foreground mb-4">
            You've been invited to join as a{' '}
            <span className="font-medium">{invitation?.role}</span>
          </p>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button 
            onClick={handleAcceptInvitation} 
            className="w-full" 
            disabled={accepting}
          >
            {accepting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Accepting...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Accept Invitation
              </>
            )}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => navigate('/')} 
            className="w-full"
          >
            Decline
          </Button>
        </CardFooter>
      </Card>
    </AuthLayout>
  );
};

export default InvitationAccept;
