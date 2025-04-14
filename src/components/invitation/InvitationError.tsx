
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle } from 'lucide-react';

interface InvitationErrorProps {
  error: string;
}

const InvitationError = ({ error }: InvitationErrorProps) => {
  const navigate = useNavigate();
  
  return (
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
  );
};

export default InvitationError;
