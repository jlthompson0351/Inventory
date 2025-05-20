import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, AlertCircle } from "lucide-react";
import { useOrganizationSetup } from "@/hooks/useOrganizationSetup";
import { useAuth } from "@/hooks/useAuth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const OrganizationSetup = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, userRoles } = useAuth();
  const { handleCreateOrganization, isSubmitting, canCreateOrg } = useOrganizationSetup();
  
  const [orgName, setOrgName] = useState("");
  
  // Check permissions on page load, redirect if not allowed
  useEffect(() => {
    if (!canCreateOrg && !isSubmitting) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to create an organization. Please contact a system administrator.",
        variant: "destructive",
      });
      navigate("/");
    }
  }, [canCreateOrg, navigate, toast, isSubmitting]);
  
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create an organization",
        variant: "destructive",
      });
      return;
    }
    
    if (!orgName.trim()) {
      toast({
        title: "Error",
        description: "Please enter an organization name",
        variant: "destructive",
      });
      return;
    }
    
    // Use the hook to handle organization creation
    await handleCreateOrganization(orgName.trim(), null);
  };

  // If user doesn't have permission, show loading state while redirecting
  if (!canCreateOrg) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="w-full max-w-md p-4">
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-2xl">Access Restricted</CardTitle>
              <CardDescription>
                Checking permissions...
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center p-4">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="w-full max-w-md p-4">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-2xl">Create Your Organization</CardTitle>
            <CardDescription>
              Get started by creating your organization
            </CardDescription>
          </CardHeader>
          {!userRoles.isSystemAdmin && !userRoles.isSuperAdmin && (
            <CardContent className="pt-0">
              <Alert variant="default" className="bg-blue-50 text-blue-800 border-blue-200">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>First Organization</AlertTitle>
                <AlertDescription>
                  You're creating your first organization. After this, only system administrators will be able to create additional organizations.
                </AlertDescription>
              </Alert>
            </CardContent>
          )}
          <form onSubmit={onSubmit}>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Organization Name</Label>
                  <Input
                    id="name"
                    placeholder="Enter your organization name"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    required
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full" type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Organization"
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default OrganizationSetup;
