import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Shield, Trash2, AlertTriangle } from 'lucide-react';
import { deleteOrganization, getOrganizationDeletionPreview } from '@/services/organizationService';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface AdminSettingsTabProps {
  organizationId: string;
}

const AdminSettingsTab = ({ organizationId }: AdminSettingsTabProps) => {
  const [systemVersion, setSystemVersion] = useState('1.0.0');
  const [deletionPreview, setDeletionPreview] = useState<any>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isDeletingOrg, setIsDeletingOrg] = useState(false);
  const navigate = useNavigate();
  const { userRoles } = useAuth();

  const loadDeletionPreview = async () => {
    setIsLoadingPreview(true);
    try {
      const preview = await getOrganizationDeletionPreview(organizationId);
      setDeletionPreview(preview);
    } catch (error) {
      console.error('Error loading deletion preview:', error);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleDeleteOrganization = async () => {
    const confirmationText = "DELETE ORGANIZATION";
    const userInput = prompt(
      `WARNING: This will permanently delete the entire organization and ALL associated data including:\n\n` +
      `• ${deletionPreview?.data_to_delete?.members || 0} members (users will be completely deleted)\n` +
      `• ${deletionPreview?.data_to_delete?.assets || 0} assets\n` +
      `• ${deletionPreview?.data_to_delete?.inventory_items || 0} inventory items\n` +
      `• ${deletionPreview?.data_to_delete?.forms || 0} forms\n` +
      `• ${deletionPreview?.data_to_delete?.form_submissions || 0} form submissions\n` +
      `• ${deletionPreview?.data_to_delete?.reports || 0} reports\n\n` +
      `This action CANNOT be undone!\n\n` +
      `Type "${confirmationText}" to confirm:`
    );

    if (userInput !== confirmationText) {
      if (userInput !== null) {
        alert('Deletion cancelled - text did not match.');
      }
      return;
    }

    setIsDeletingOrg(true);
    try {
      const success = await deleteOrganization(organizationId);
      if (success) {
        // Redirect to a safe page since the organization no longer exists
        navigate('/');
      }
    } catch (error) {
      console.error('Error deleting organization:', error);
    } finally {
      setIsDeletingOrg(false);
    }
  };

  useEffect(() => {
    loadDeletionPreview();
  }, [organizationId]);

  return (
    <div className="space-y-6">
      <div className="space-y-0.5">
        <h2 className="text-2xl font-bold tracking-tight">Advanced Settings</h2>
        <p className="text-muted-foreground">
          Manage system settings and administrative options.
        </p>
      </div>
      
      <Separator />
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="mr-2 h-5 w-5 text-primary" />
              System Information
            </CardTitle>
            <CardDescription>
              Details about the current system and organization settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">Organization ID</p>
                <p className="text-sm text-muted-foreground">{organizationId}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">System Version</p>
                <p className="text-sm text-muted-foreground">{systemVersion}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {userRoles.isOrgAdmin && (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="flex items-center text-destructive">
                <Trash2 className="mr-2 h-5 w-5" />
                Danger Zone
              </CardTitle>
              <CardDescription>
                Irreversible actions that will permanently delete data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>
                  Deleting the organization will permanently remove all data and cannot be undone.
                </AlertDescription>
              </Alert>

              {deletionPreview && (
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">What will be deleted:</h4>
                  <ul className="text-sm space-y-1">
                    <li>• {deletionPreview.data_to_delete.members} members (users completely removed)</li>
                    <li>• {deletionPreview.data_to_delete.assets} assets</li>
                    <li>• {deletionPreview.data_to_delete.inventory_items} inventory items</li>
                    <li>• {deletionPreview.data_to_delete.forms} forms</li>
                    <li>• {deletionPreview.data_to_delete.form_submissions} form submissions</li>
                    <li>• {deletionPreview.data_to_delete.reports} reports</li>
                  </ul>
                </div>
              )}

              <Button
                variant="destructive"
                onClick={handleDeleteOrganization}
                disabled={isDeletingOrg || isLoadingPreview}
                className="w-full"
              >
                {isDeletingOrg ? 'Deleting Organization...' : 'Delete Organization Permanently'}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminSettingsTab; 