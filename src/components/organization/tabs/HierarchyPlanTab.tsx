import { useState, useEffect } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, ArrowRight, Edit, Trash2, AlertCircle } from "lucide-react";
import OrganizationAvatar from "@/components/common/OrganizationAvatar";
import OrganizationBreadcrumb from "@/components/organization/OrganizationBreadcrumb";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface HierarchyPlanTabProps {
  organizationId: string;
}

interface SubOrganization {
  id: string;
  name: string;
  description: string;
  parent_id: string;
  avatarUrl?: string;
}

const HierarchyPlanTab = ({ organizationId }: HierarchyPlanTabProps) => {
  const { getOrganizationDetails } = useOrganization();
  const [organization, setOrganization] = useState<any>(null);
  const [subOrganizations, setSubOrganizations] = useState<SubOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [currentSubOrg, setCurrentSubOrg] = useState<SubOrganization | null>(null);

  useEffect(() => {
    if (organizationId) {
      fetchSubOrganizations();
      fetchOrganizationDetails();
    }
  }, [organizationId]);

  const fetchOrganizationDetails = async () => {
    try {
      const orgDetails = await getOrganizationDetails(organizationId);
      setOrganization(orgDetails);
    } catch (error) {
      console.error("Error fetching organization details:", error);
      toast.error("Could not load organization details");
    }
  };

  const fetchSubOrganizations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name, description, parent_id, avatar_url")
        .eq("parent_id", organizationId);

      if (error) throw error;

      setSubOrganizations(
        data.map((org) => ({
          id: org.id,
          name: org.name,
          description: org.description,
          parent_id: org.parent_id,
          avatarUrl: org.avatar_url,
        }))
      );
    } catch (error) {
      console.error("Error fetching sub-organizations:", error);
      toast.error("There was an error loading the organization hierarchy.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubOrg = async () => {
    try {
      const { data, error } = await supabase
        .from("organizations")
        .insert([
          {
            name: formData.name,
            description: formData.description,
            parent_id: organizationId,
          },
        ])
        .select();

      if (error) throw error;

      toast.success(`${formData.name} has been added to the hierarchy.`);

      setFormData({ name: "", description: "" });
      setIsAddDialogOpen(false);
      fetchSubOrganizations();
    } catch (error) {
      console.error("Error creating sub-organization:", error);
      toast.error("There was an error adding the sub-organization.");
    }
  };

  const handleEditSubOrg = async () => {
    if (!currentSubOrg) return;

    try {
      const { error } = await supabase
        .from("organizations")
        .update({
          name: formData.name,
          description: formData.description,
        })
        .eq("id", currentSubOrg.id);

      if (error) throw error;

      toast.success(`${formData.name} has been updated.`);

      setFormData({ name: "", description: "" });
      setIsEditDialogOpen(false);
      setCurrentSubOrg(null);
      fetchSubOrganizations();
    } catch (error) {
      console.error("Error updating sub-organization:", error);
      toast.error("There was an error updating the sub-organization.");
    }
  };

  const handleDeleteSubOrg = async () => {
    if (!currentSubOrg) return;

    try {
      const { error } = await supabase
        .from("organizations")
        .delete()
        .eq("id", currentSubOrg.id);

      if (error) throw error;

      toast.success(`${currentSubOrg.name} has been removed from the hierarchy.`);

      setIsDeleteDialogOpen(false);
      setCurrentSubOrg(null);
      fetchSubOrganizations();
    } catch (error) {
      console.error("Error deleting sub-organization:", error);
      toast.error("There was an error removing the sub-organization.");
    }
  };

  const openEditDialog = (org: SubOrganization) => {
    setCurrentSubOrg(org);
    setFormData({
      name: org.name,
      description: org.description || "",
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (org: SubOrganization) => {
    setCurrentSubOrg(org);
    setIsDeleteDialogOpen(true);
  };

  if (loading && !organization) {
    return <div className="py-10 text-center">Loading hierarchy plan...</div>;
  }

  if (!organization) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Organization not found or you don't have permission to view it.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Organization Hierarchy</h2>
          <p className="text-muted-foreground">
            Manage your organization structure and sub-organizations
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Sub-Organization
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Sub-Organization</DialogTitle>
              <DialogDescription>
                Create a new organization under {organization?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddSubOrg}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Organization</CardTitle>
          <CardDescription>
            You are currently viewing the hierarchy for this organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <OrganizationAvatar
              size="md"
              name={organization?.name || ""}
              src={organization?.avatarUrl}
            />
            <div>
              <h3 className="font-medium">{organization?.name}</h3>
              <p className="text-sm text-muted-foreground">{organization?.description}</p>
            </div>
          </div>
          <div className="mt-4">
            <OrganizationBreadcrumb
              organizationId={organizationId}
              showCurrent={true}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sub-Organizations</CardTitle>
          <CardDescription>
            Organizations that belong to {organization?.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {subOrganizations.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-muted-foreground">No sub-organizations found</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setIsAddDialogOpen(true)}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add your first sub-organization
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {subOrganizations.map((org) => (
                <div
                  key={org.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center space-x-4">
                    <OrganizationAvatar
                      size="sm"
                      name={org.name}
                      src={org.avatarUrl}
                    />
                    <div>
                      <h3 className="font-medium">{org.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {org.description || "No description provided"}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(org)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDeleteDialog(org)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <a href={`/organization/${org.id}`}>
                        <ArrowRight className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Sub-Organization</DialogTitle>
            <DialogDescription>
              Update details for {currentSubOrg?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditSubOrg}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Sub-Organization</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {currentSubOrg?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteSubOrg}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HierarchyPlanTab; 