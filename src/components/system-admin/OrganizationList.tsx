import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, AlertTriangle, Info, UserPlus } from 'lucide-react';

export interface Organization {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  avatar_url: string | null;
  is_mothership: boolean;
  memberCount?: number;
}

export function OrganizationList() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [targetOrg, setTargetOrg] = useState<Organization | null>(null);
  const [orgName, setOrgName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [userMemberships, setUserMemberships] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    setLoading(true);
    try {
      // First get all organizations
      const { data: orgs, error: orgsError } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (orgsError) throw orgsError;

      if (!orgs) {
        setOrganizations([]);
        return;
      }

      // Now get member counts for each organization
      const orgsWithCounts = await Promise.all(
        orgs.map(async (org) => {
          const { count, error: countError } = await supabase
            .from('organization_members')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', org.id);

          if (countError) {
            console.error(`Error getting member count for org ${org.id}:`, countError);
            return { ...org, memberCount: 0 };
          }

          return { ...org, memberCount: count || 0 };
        })
      );

      // Check which organizations current user is already a member of
      const { data: currentUser } = await supabase.auth.getUser();
      if (currentUser?.user) {
        const { data: memberships, error: membershipsError } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', currentUser.user.id);

        if (!membershipsError && memberships) {
          const membershipMap: Record<string, boolean> = {};
          memberships.forEach(m => {
            membershipMap[m.organization_id] = true;
          });
          setUserMemberships(membershipMap);
        }
      }

      // Each org in orgs already has is_mothership from the database
      setOrganizations(orgsWithCounts as Organization[]);
    } catch (error) {
      console.error('Error fetching organizations:', error);
      toast.error('Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (org: Organization) => {
    setTargetOrg(org);
    setOrgName(org.name);
    setEditDialogOpen(true);
  };

  const handleDelete = (org: Organization) => {
    setTargetOrg(org);
    setDeleteConfirmOpen(true);
  };

  const handleJoinAsAdmin = (org: Organization) => {
    setTargetOrg(org);
    setJoinDialogOpen(true);
  };

  const confirmJoinAsAdmin = async () => {
    if (!targetOrg) return;
    
    setIsProcessing(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        throw new Error('User not authenticated');
      }

      // Check if user is already a member
      const { data: existingMember, error: checkError } = await supabase
        .from('organization_members')
        .select('*')
        .eq('user_id', userData.user.id)
        .eq('organization_id', targetOrg.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "no rows returned" which is expected
        throw checkError;
      }

      if (existingMember) {
        // Update existing membership to admin role
        const { error: updateError } = await supabase
          .from('organization_members')
          .update({ role: 'admin' })
          .eq('user_id', userData.user.id)
          .eq('organization_id', targetOrg.id);

        if (updateError) throw updateError;
      } else {
        // Add user as admin to the organization
        const { error: insertError } = await supabase
          .from('organization_members')
          .insert({
            user_id: userData.user.id,
            organization_id: targetOrg.id,
            role: 'admin',
            is_primary: false
          });

        if (insertError) throw insertError;
      }

      toast.success(`You've been added as an admin to "${targetOrg.name}"`);
      fetchOrganizations(); // Refresh to update the UI
    } catch (error: any) {
      console.error('Error joining organization:', error);
      toast.error(`Error: ${error.message || 'Failed to join organization'}`);
    } finally {
      setIsProcessing(false);
      setJoinDialogOpen(false);
      setTargetOrg(null);
    }
  };

  const confirmDelete = async () => {
    if (!targetOrg) return;
    
    setIsProcessing(true);
    try {
      // Use the new RPC function to delete the organization
      const { data, error } = await supabase.rpc('delete_organization', {
        org_id: targetOrg.id
      });

      if (error) throw error;

      if (data) {
        toast.success(`Organization "${targetOrg.name}" deleted successfully`);
        // Refresh the list
        fetchOrganizations();
      } else {
        toast.error(`Failed to delete "${targetOrg.name}". Please try again.`);
      }
    } catch (error: any) {
      console.error('Error deleting organization:', error);
      const errorMessage = error.message || 'An unknown error occurred';
      toast.error(`Error: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
      setDeleteConfirmOpen(false);
      setTargetOrg(null);
    }
  };

  const saveChanges = async () => {
    if (!targetOrg || !orgName.trim()) return;
    
    setIsProcessing(true);
    try {
      const { data, error } = await supabase
        .from('organizations')
        .update({ name: orgName.trim(), updated_at: new Date().toISOString() })
        .eq('id', targetOrg.id)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        toast.success(`Organization renamed to "${orgName}"`);
        fetchOrganizations();
      }
    } catch (error: any) {
      console.error('Error updating organization:', error);
      toast.error(`Error: ${error.message || 'Failed to update organization'}`);
    } finally {
      setIsProcessing(false);
      setEditDialogOpen(false);
      setTargetOrg(null);
      setOrgName("");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <>
      {organizations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Info className="h-10 w-10 text-muted-foreground mb-4" />
          <h3 className="font-medium text-lg">No Organizations Found</h3>
          <p className="text-muted-foreground mt-2">
            There are no organizations in the system yet.
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Members</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {organizations.map((org) => (
              <TableRow key={org.id}>
                <TableCell className="font-medium">{org.name}</TableCell>
                <TableCell>{format(new Date(org.created_at), 'MMM d, yyyy')}</TableCell>
                <TableCell>{org.memberCount}</TableCell>
                <TableCell>
                  {org.is_mothership ? (
                    <Badge className="bg-blue-500">Mothership</Badge>
                  ) : (
                    <Badge variant="outline">Standard</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(org)}
                      disabled={isProcessing}
                    >
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    {!userMemberships[org.id] && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleJoinAsAdmin(org)}
                        disabled={isProcessing}
                        title="Join as Admin"
                      >
                        <UserPlus className="h-4 w-4" />
                        <span className="sr-only">Join as Admin</span>
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(org)}
                      disabled={org.is_mothership || isProcessing}
                      title={org.is_mothership ? "Cannot delete Mothership organization" : "Delete organization"}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Organization</DialogTitle>
            <DialogDescription>
              Update the organization details below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Organization Name</Label>
              <Input
                id="name"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Enter organization name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button 
              onClick={saveChanges}
              disabled={!orgName.trim() || isProcessing}
            >
              {isProcessing ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Join as Admin Dialog */}
      <AlertDialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Join as Admin</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to add yourself as an administrator to "{targetOrg?.name}". 
              This will give you full access to manage this organization.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmJoinAsAdmin}
              disabled={isProcessing}
            >
              {isProcessing ? "Joining..." : "Join as Admin"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Organization
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the organization "{targetOrg?.name}" and all associated data including:
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>All organization members</li>
                <li>All inventory items</li>
                <li>All asset types</li>
                <li>All forms and form responses</li>
                <li>All related data</li>
              </ul>
              <div className="mt-4 font-semibold">
                This action cannot be undone.
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessing ? "Deleting..." : "Delete Organization"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 