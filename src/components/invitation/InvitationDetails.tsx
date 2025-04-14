
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building, CheckCircle, Loader2 } from 'lucide-react';
import { InvitationWithOrgName } from '@/types/invitation';

interface InvitationDetailsProps {
  invitation: InvitationWithOrgName;
  accepting: boolean;
  onAccept: () => Promise<void>;
}

const InvitationDetails = ({ invitation, accepting, onAccept }: InvitationDetailsProps) => {
  const navigate = useNavigate();
  
  return (
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
        <h3 className="text-xl font-bold mb-1">{invitation.organizationName}</h3>
        <p className="text-muted-foreground mb-4">
          You've been invited to join as a{' '}
          <span className="font-medium">{invitation.role}</span>
        </p>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        <Button 
          onClick={onAccept} 
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
  );
};

export default InvitationDetails;
