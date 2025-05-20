import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Shield, AlertTriangle } from 'lucide-react';

const PermissionDeniedCard: React.FC = () => {
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(false);
  const [userDetails, setUserDetails] = useState<any>(null);

  const checkPermissions = async () => {
    setIsChecking(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setUserDetails({ error: 'Not logged in' });
        return;
      }
      
      // Check existing organizations
      const { data: existingOrgs, error: orgsError } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id);
        
      // Check system roles
      const { data: systemRoles, error: rolesError } = await supabase
        .from('system_roles')
        .select('*')
        .eq('user_id', user.id);
      
      setUserDetails({
        userId: user.id,
        email: user.email,
        existingOrgs: existingOrgs || [],
        orgsError: orgsError?.message,
        systemRoles: systemRoles || [],
        rolesError: rolesError?.message,
        isFirstOrg: !existingOrgs || existingOrgs.length === 0,
        isAdmin: systemRoles && systemRoles.length > 0 && 
          (systemRoles[0]?.role === 'admin' || systemRoles[0]?.role === 'super_admin')
      });
    } catch (error) {
      setUserDetails({ error: 'Error checking permissions' });
      console.error('Error checking permissions:', error);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">
          Permission Denied
        </CardTitle>
        <CardDescription className="text-center">
          Only super administrators can create organizations
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <p className="text-center text-muted-foreground">
          Organizations can only be created by:
        </p>
        <ul className="list-disc pl-6">
          <li>First-time users (for their initial organization)</li>
          <li>Super administrators (for all additional organizations)</li>
        </ul>
        
        <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded">
          <p className="text-sm">
            If you need a new organization created, please contact the application super administrator.
            They will create the organization and add you as an administrator.
          </p>
        </div>
        
        {!userDetails && (
          <Button 
            variant="outline" 
            className="w-full"
            onClick={checkPermissions}
            disabled={isChecking}
          >
            {isChecking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Checking your permissions...
              </>
            ) : (
              <>
                <Shield className="mr-2 h-4 w-4" />
                Check my permissions
              </>
            )}
          </Button>
        )}
        
        {userDetails && (
          <div className="rounded-md bg-muted p-4 text-sm">
            <h4 className="font-medium mb-2">Permission Details:</h4>
            {userDetails.error ? (
              <p className="text-destructive">{userDetails.error}</p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div>User ID:</div>
                  <div className="truncate">{userDetails.userId}</div>
                  
                  <div>Email:</div>
                  <div>{userDetails.email}</div>
                  
                  <div>First Organization:</div>
                  <div>{userDetails.isFirstOrg ? 'Yes' : 'No'}</div>
                  
                  <div>Admin Role:</div>
                  <div>{userDetails.isAdmin ? 'Yes' : 'No'}</div>
                </div>
                
                {userDetails.systemRoles.length > 0 && (
                  <div className="mt-2">
                    <div className="font-medium">Admin Roles:</div>
                    <pre className="bg-background p-2 rounded text-xs mt-1 overflow-auto">
                      {JSON.stringify(userDetails.systemRoles, null, 2)}
                    </pre>
                  </div>
                )}
                
                {userDetails.existingOrgs.length > 0 && (
                  <div className="mt-2">
                    <div className="font-medium">Existing Organizations:</div>
                    <pre className="bg-background p-2 rounded text-xs mt-1 overflow-auto">
                      {JSON.stringify(userDetails.existingOrgs, null, 2)}
                    </pre>
                  </div>
                )}
                
                <div className="bg-yellow-100 border-l-4 border-yellow-500 p-2 mt-3">
                  <div className="flex">
                    <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
                    <p className="text-sm text-yellow-700">
                      The development bypass has been disabled. Only super admins can create new organizations now.
                    </p>
                  </div>
                </div>
              </>
            )}
            
            <Button
              variant="outline"
              size="sm"
              className="mt-3 w-full"
              onClick={() => setUserDetails(null)}
            >
              Close
            </Button>
          </div>
        )}
      </CardContent>
      
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
