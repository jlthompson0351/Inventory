
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const PermissionDeniedCard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">
          Permission Denied
        </CardTitle>
        <CardDescription className="text-center">
          You don't have permission to create new organizations
        </CardDescription>
      </CardHeader>
      <CardFooter>
        <Button 
          onClick={() => navigate('/')}
          className="w-full"
        >
          Return to Dashboard
        </Button>
      </CardFooter>
    </Card>
  );
};

export default PermissionDeniedCard;
