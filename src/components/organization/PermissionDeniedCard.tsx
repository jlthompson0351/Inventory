import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const PermissionDeniedCard: React.FC<{message?: string}> = ({message}) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <Card className="w-full max-w-lg">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center flex items-center justify-center">
          <AlertTriangle className="h-6 w-6 mr-2 text-destructive" />
          Access Denied
        </CardTitle>
        <CardDescription className="text-center">
          {message || "You do not have the necessary permissions to access this page or perform this action."}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <p className="text-center text-muted-foreground">
          If you believe this is an error, please contact your organization administrator.
        </p>
        {user && (
          <div className="text-center text-xs text-muted-foreground pt-2">
            Authenticated as: {user.email}
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex flex-col gap-2">
        <Button 
          onClick={() => navigate(-1)}
          variant="outline"
          className="w-full"
        >
          Go Back
        </Button>
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
