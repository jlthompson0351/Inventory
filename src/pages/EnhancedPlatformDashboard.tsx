import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { 
  PlusCircle, 
  List, 
  Settings, 
  AlertTriangle, 
  Users, 
  UserPlus, 
  UserMinus, 
  Mail,
  Building,
  Crown,
  MoreHorizontal,
  Eye,
  Trash2,
  UserX
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { deleteOrganization, deleteUser, getOrganizationDeletionPreview } from '@/services/organizationService';

type Organization = {
  id: string;
  name: string;
  description: string;
  created_at: string;
  avatar_url: string;
  member_count: number;
  admin_count: number;
};

type OrganizationMember = {
  user_id: string;
  email: string;
  full_name: string;
  role: string;
  joined_at: string;
  avatar_url: string;
};

type OrganizationInvitation = {
  id: string;
  email: string;
  role: string;
  invited_by: string;
  inviter_name: string;
  expires_at: string;
  created_at: string;
};

const EnhancedPlatformDashboard: React.FC = () => {
  const { user, userRoles } = useAuth();
  const navigate = useNavigate();
  
  // Organizations state
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(true);
  
  // Create organization state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgDescription, setNewOrgDescription] = useState('');
  const [newOrgAdminEmail, setNewOrgAdminEmail] = useState('');
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);
  
  // Organization management state
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [orgMembers, setOrgMembers] = useState<OrganizationMember[]>([]);
  const [orgInvitations, setOrgInvitations] = useState<OrganizationInvitation[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [showManageOrg, setShowManageOrg] = useState(false);
  
  // Add user state
  const [showAddUser, setShowAddUser] = useState(false);
  const [addUserEmail, setAddUserEmail] = useState('');
  const [addUserRole, setAddUserRole] = useState('member');
  const [isAddingUser, setIsAddingUser] = useState(false);
  
  // Create user state
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [createUserEmail, setCreateUserEmail] = useState('');
  const [createUserName, setCreateUserName] = useState('');
  const [createUserRole, setCreateUserRole] = useState('member');
  const [createUserPassword, setCreateUserPassword] = useState('');
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  
  // Batch add state
  const [showBatchAdd, setShowBatchAdd] = useState(false);
  const [batchEmails, setBatchEmails] = useState('');
  const [batchRole, setBatchRole] = useState('member');
  const [isBatchAdding, setIsBatchAdding] = useState(false);

  // Deletion state
  const [deletionPreview, setDeletionPreview] = useState<any>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isDeletingOrg, setIsDeletingOrg] = useState(false);

  useEffect(() => {
    if (!userRoles.isPlatformOperator) {
      toast.error("Access Denied: You are not a platform operator.");
      navigate('/');
    } else {
      fetchAllOrganizations();
    }
  }, [userRoles.isPlatformOperator, navigate]);

  const fetchAllOrganizations = async () => {
    setIsLoadingOrgs(true);
    try {
      const { data, error } = await supabase.rpc('get_all_organizations_for_platform_admin');
      if (error) throw error;
      setOrganizations(data || []);
    } catch (error) {
      console.error('Error fetching organizations:', error);
      toast.error('Failed to load organizations.');
      setOrganizations([]);
    } finally {
      setIsLoadingOrgs(false);
    }
  };

  const fetchOrganizationDetails = async (org: Organization) => {
    setIsLoadingMembers(true);
    try {
      // Fetch members
      const { data: members, error: membersError } = await supabase.rpc(
        'get_organization_members_for_platform_admin', 
        { org_id: org.id }
      );
      if (membersError) throw membersError;
      setOrgMembers(members || []);

      // Fetch invitations
      const { data: invitations, error: invitationsError } = await supabase.rpc(
        'get_organization_invitations_for_platform_admin',
        { org_id: org.id }
      );
      if (invitationsError) throw invitationsError;
      setOrgInvitations(invitations || []);

    } catch (error) {
      console.error('Error fetching organization details:', error);
      toast.error('Failed to load organization details.');
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const loadDeletionPreview = async (orgId: string) => {
    setIsLoadingPreview(true);
    try {
      const preview = await getOrganizationDeletionPreview(orgId);
      setDeletionPreview(preview);
    } catch (error) {
      console.error('Error loading deletion preview:', error);
      toast.error('Failed to load deletion preview');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleDeleteOrganization = async (org: Organization) => {
    await loadDeletionPreview(org.id);
  };

  const confirmDeleteOrganization = async () => {
    if (!selectedOrg || !deletionPreview) return;

    const confirmationText = "DELETE ORGANIZATION";
    const userInput = prompt(
      `⚠️ DANGER: This will permanently delete "${selectedOrg.name}" and ALL associated data:\n\n` +
      `• ${deletionPreview.data_to_delete?.members || 0} users (COMPLETELY DELETED from system)\n` +
      `• ${deletionPreview.data_to_delete?.assets || 0} assets\n` +
      `• ${deletionPreview.data_to_delete?.inventory_items || 0} inventory items\n` +
      `• ${deletionPreview.data_to_delete?.forms || 0} forms\n` +
      `• ${deletionPreview.data_to_delete?.form_submissions || 0} form submissions\n` +
      `• ${deletionPreview.data_to_delete?.reports || 0} reports\n\n` +
      `This action CANNOT be undone!\n\n` +
      `Type "${confirmationText}" to confirm:`
    );

    if (userInput !== confirmationText) {
      if (userInput !== null) {
        toast.error('Deletion cancelled - text did not match.');
      }
      return;
    }

    setIsDeletingOrg(true);
    try {
      const success = await deleteOrganization(selectedOrg.id);
      if (success) {
        setShowManageOrg(false);
        setSelectedOrg(null);
        setDeletionPreview(null);
        fetchAllOrganizations();
      }
    } catch (error) {
      console.error('Error deleting organization:', error);
    } finally {
      setIsDeletingOrg(false);
    }
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    try {
      const success = await deleteUser(userId);
      if (success && selectedOrg) {
        await fetchOrganizationDetails(selectedOrg);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim() || !newOrgAdminEmail.trim()) {
      toast.error("Organization name and admin email are required.");
      return;
    }
    setIsCreatingOrg(true);
    try {
      // First create the organization
      const { data: newOrgId, error: orgError } = await supabase.rpc('create_organization_with_admin', {
        org_name: newOrgName.trim(),
        org_description: newOrgDescription.trim() || null,
        admin_email: null // Don't use the old invitation system
      });

      if (orgError) throw orgError;
      
      // Generate a temporary password for the admin
      const tempPassword = 'Admin' + Math.random().toString(36).substring(2, 8);
      
      toast.success(`✅ Organization '${newOrgName.trim()}' created successfully!

Now create the admin user:
1. Click here: https://supabase.com/dashboard/project/kxcubbibhofdvporfarj/auth/users
2. Click "Add User"
3. Email: ${newOrgAdminEmail.trim()}
4. Password: ${tempPassword}
5. Enable "Auto Confirm User"

Admin will be added to organization automatically when they login.
Tell them: Email: ${newOrgAdminEmail.trim()} / Password: ${tempPassword}`, {
        duration: 25000
      });
      
      setNewOrgName('');
      setNewOrgDescription('');
      setNewOrgAdminEmail('');
      setShowCreateForm(false);
      fetchAllOrganizations();
    } catch (error) {
      console.error('Error creating organization:', error);
      toast.error(`Failed to create organization: ${(error as Error).message}`);
    } finally {
      setIsCreatingOrg(false);
    }
  };

  const handleManageOrganization = async (org: Organization) => {
    setSelectedOrg(org);
    setShowManageOrg(true);
    await fetchOrganizationDetails(org);
    // Pre-load deletion preview
    await loadDeletionPreview(org.id);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg || !addUserEmail.trim()) {
      toast.error("Please provide a valid email.");
      return;
    }
    
    setIsAddingUser(true);
    try {
      const { data, error } = await supabase.rpc('add_user_to_organization_as_platform_admin', {
        org_id: selectedOrg.id,
        user_email: addUserEmail.trim(),
        user_role: addUserRole
      });

      if (error) throw error;
      
      toast.success(`User ${addUserEmail.trim()} added to organization as ${addUserRole}.`);
      setAddUserEmail('');
      setAddUserRole('member');
      setShowAddUser(false);
      await fetchOrganizationDetails(selectedOrg);
    } catch (error) {
      console.error('Error adding user:', error);
      toast.error(`Failed to add user: ${(error as Error).message}`);
    } finally {
      setIsAddingUser(false);
    }
  };

  const handleRemoveUser = async (userId: string, userEmail: string) => {
    if (!selectedOrg) return;
    
    if (!confirm(`Are you sure you want to remove ${userEmail} from ${selectedOrg.name}?`)) {
      return;
    }

    try {
      const { data, error } = await supabase.rpc('remove_user_from_organization_as_platform_admin', {
        org_id: selectedOrg.id,
        target_user_id: userId
      });

      if (error) throw error;
      
      toast.success(`User ${userEmail} removed from organization.`);
      await fetchOrganizationDetails(selectedOrg);
    } catch (error) {
      console.error('Error removing user:', error);
      toast.error(`Failed to remove user: ${(error as Error).message}`);
    }
  };

  const generateTempPassword = () => {
    // Simple password generation without database call
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCreateUserPassword(result);
    toast.success('Simple temporary password generated!');
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg || !createUserEmail.trim() || !createUserPassword.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }
    
    setIsCreatingUser(true);
    try {
      // Call the new automated Edge Function
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/create-user-automated-fixed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'apikey': supabase.supabaseKey,
        },
        body: JSON.stringify({
          email: createUserEmail.trim(),
          password: createUserPassword.trim(),
          organizationId: selectedOrg.id,
          role: createUserRole
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'User creation failed');
      }

      if (result.success) {
        toast.success(`🎉 User created successfully!
        
Email: ${createUserEmail}
Organization: ${selectedOrg.name}
Role: ${createUserRole}

They can now login and will be prompted to change their password.`);
        
        // Refresh organization members
        await fetchOrganizationDetails(selectedOrg);
        
        // Clear form
        setCreateUserEmail('');
        setCreateUserName('');
        setCreateUserPassword('');
        setCreateUserRole('member');
        setShowCreateUser(false);
      } else {
        throw new Error(result.error || 'User creation failed');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error(`Failed to create user: ${(error as Error).message}`);
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleBatchAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg || !batchEmails.trim()) {
      toast.error("Please provide email addresses.");
      return;
    }
    
    const emailList = batchEmails.split('\n').map(email => email.trim()).filter(email => email);
    if (emailList.length === 0) {
      toast.error("No valid email addresses found.");
      return;
    }
    
    setIsBatchAdding(true);
    try {
      const { data, error } = await supabase.rpc('create_multiple_invitations_as_platform_admin', {
        org_id: selectedOrg.id,
        user_emails: emailList,
        user_role: batchRole
      });

      if (error) throw error;
      
      toast.success(`Batch operation completed: ${data.success_count} success, ${data.error_count} errors`);
      if (data.errors.length > 0) {
        console.log('Batch errors:', data.errors);
      }
      
      setBatchEmails('');
      setBatchRole('member');
      setShowBatchAdd(false);
      await fetchOrganizationDetails(selectedOrg);
    } catch (error) {
      console.error('Error batch adding users:', error);
      toast.error(`Failed to batch add users: ${(error as Error).message}`);
    } finally {
      setIsBatchAdding(false);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner': return 'default';
      case 'admin': return 'secondary';
      case 'member': return 'outline';
      default: return 'outline';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="h-3 w-3" />;
      case 'admin': return <Settings className="h-3 w-3" />;
      default: return <Users className="h-3 w-3" />;
    }
  };

  if (!userRoles.isPlatformOperator) {
    return (
      <div className="p-4">
        <Card className="max-w-md mx-auto">
          <CardHeader className="flex flex-row items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <CardTitle className="text-destructive">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p>You do not have permission to view this page.</p>
            <Button onClick={() => navigate('/')} className="mt-4">Go to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Platform Management Dashboard</h1>
        <Badge variant="secondary" className="px-3 py-1">
          Platform Operator
        </Badge>
      </div>

      {/* Organizations Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-6 w-6" /> 
            Organizations ({organizations.length})
          </CardTitle>
          <CardDescription>Create and manage all organizations on the platform.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingOrgs ? (
            <p>Loading organizations...</p>
          ) : organizations.length === 0 ? (
            <p>No organizations found.</p>
          ) : (
            <div className="grid gap-4">
              {organizations.map(org => (
                <div key={org.id} className="p-4 border rounded-lg flex justify-between items-center">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-lg">{org.name}</span>
                      <Badge variant="outline">{org.member_count} members</Badge>
                      <Badge variant="secondary">{org.admin_count} admins</Badge>
                    </div>
                    {org.description && (
                      <p className="text-sm text-muted-foreground mb-2">{org.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Created: {new Date(org.created_at).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-muted-foreground">ID: {org.id}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleManageOrganization(org)}
                    >
                      <Eye className="mr-2 h-4 w-4" /> 
                      Manage
                    </Button>

                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="mt-4 flex gap-2">
            <Button onClick={() => setShowCreateForm(!showCreateForm)}>
              <PlusCircle className="mr-2 h-4 w-4" /> 
              {showCreateForm ? 'Cancel' : 'Create Organization'}
            </Button>
            <Button variant="outline" onClick={fetchAllOrganizations}>
              Refresh
            </Button>
          </div>

          {showCreateForm && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Create New Organization</CardTitle>
                <CardDescription>
                  Create a new organization and optionally assign an admin.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateOrganization} className="space-y-4">
                  <div>
                    <Label htmlFor="newOrgName">Organization Name *</Label>
                    <Input 
                      id="newOrgName" 
                      value={newOrgName} 
                      onChange={(e) => setNewOrgName(e.target.value)} 
                      required 
                    />
                  </div>
                  <div>
                    <Label htmlFor="newOrgDescription">Description (Optional)</Label>
                    <Textarea 
                      id="newOrgDescription" 
                      value={newOrgDescription} 
                      onChange={(e) => setNewOrgDescription(e.target.value)} 
                    />
                  </div>
                  <div>
                    <Label htmlFor="newOrgAdminEmail">Admin Email *</Label>
                    <Input 
                      id="newOrgAdminEmail" 
                      type="email" 
                      value={newOrgAdminEmail} 
                      onChange={(e) => setNewOrgAdminEmail(e.target.value)}
                      placeholder="admin@company.com"
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      This person will be automatically created as the organization admin with a temporary password
                    </p>
                  </div>
                  <Button type="submit" disabled={isCreatingOrg}>
                    {isCreatingOrg ? 'Creating...' : 'Create Organization'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Organization Management Dialog */}
      <Dialog open={showManageOrg} onOpenChange={setShowManageOrg}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Manage {selectedOrg?.name}
            </DialogTitle>
            <DialogDescription>
              Manage members, invitations, and settings for this organization.
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrg && (
            <Tabs defaultValue="members" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="members">Members ({orgMembers.length})</TabsTrigger>
                <TabsTrigger value="invitations">Invitations ({orgInvitations.length})</TabsTrigger>
                <TabsTrigger value="danger" className="text-destructive">Danger Zone</TabsTrigger>
              </TabsList>
              
              <TabsContent value="members" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Organization Members</h3>
                  <div className="flex gap-2">
                    <Button onClick={() => setShowAddUser(true)} size="sm" variant="outline">
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add Existing
                    </Button>
                    <Button onClick={() => setShowCreateUser(true)} size="sm" variant="outline">
                      <UserPlus className="mr-2 h-4 w-4" />
                      Create User
                    </Button>
                    <Button onClick={() => setShowBatchAdd(true)} size="sm" variant="outline">
                      <Users className="mr-2 h-4 w-4" />
                      Batch Add
                    </Button>
                  </div>
                </div>
                
                {isLoadingMembers ? (
                  <p>Loading members...</p>
                ) : orgMembers.length === 0 ? (
                  <p className="text-muted-foreground">No members found.</p>
                ) : (
                  <div className="space-y-2">
                    {orgMembers.map(member => (
                      <div key={member.user_id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                            {member.full_name ? member.full_name[0].toUpperCase() : member.email[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium">{member.full_name || 'No name'}</p>
                            <p className="text-sm text-muted-foreground">{member.email}</p>
                            <p className="text-xs text-muted-foreground">
                              Joined: {new Date(member.joined_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={getRoleBadgeVariant(member.role)} className="gap-1">
                            {getRoleIcon(member.role)}
                            {member.role}
                          </Badge>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleRemoveUser(member.user_id, member.email)}
                            className="text-destructive hover:text-destructive"
                            title="Remove from Organization"
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="destructive" 
                                size="sm"
                                title="Delete User Permanently"
                              >
                                <UserX className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle className="flex items-center gap-2">
                                  <AlertTriangle className="h-5 w-5 text-destructive" />
                                  Delete User Permanently?
                                </AlertDialogTitle>
                                <AlertDialogDescription className="space-y-2">
                                  <p>
                                    You are about to permanently delete <strong>{member.full_name || member.email}</strong> from the system.
                                  </p>
                                  <Alert variant="destructive" className="mt-3">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>Warning</AlertTitle>
                                    <AlertDescription>
                                      This action cannot be undone. The user and all their associated data will be permanently removed from the system.
                                    </AlertDescription>
                                  </Alert>
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteUser(member.user_id, member.email)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete User Permanently
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="invitations" className="space-y-4">
                <h3 className="text-lg font-semibold">Pending Invitations</h3>
                {orgInvitations.length === 0 ? (
                  <p className="text-muted-foreground">No pending invitations.</p>
                ) : (
                  <div className="space-y-2">
                    {orgInvitations.map(invitation => (
                      <div key={invitation.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Mail className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{invitation.email}</p>
                            <p className="text-sm text-muted-foreground">
                              Invited by: {invitation.inviter_name || 'Unknown'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Expires: {new Date(invitation.expires_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Badge variant={getRoleBadgeVariant(invitation.role)} className="gap-1">
                          {getRoleIcon(invitation.role)}
                          {invitation.role}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="danger" className="space-y-4">
                <div className="space-y-4">
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Danger Zone</AlertTitle>
                    <AlertDescription>
                      Irreversible actions that will permanently delete data.
                    </AlertDescription>
                  </Alert>

                  <Card className="border-destructive">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-destructive">
                        <Trash2 className="h-5 w-5" />
                        Delete Organization
                      </CardTitle>
                      <CardDescription>
                        Permanently delete this organization and all associated data.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {deletionPreview && selectedOrg && (
                        <div className="bg-muted/50 p-4 rounded-lg">
                          <h4 className="font-semibold mb-2">What will be deleted:</h4>
                          <ul className="text-sm space-y-1">
                            <li>• {deletionPreview.data_to_delete?.members || 0} users (completely removed from system)</li>
                            <li>• {deletionPreview.data_to_delete?.assets || 0} assets</li>
                            <li>• {deletionPreview.data_to_delete?.inventory_items || 0} inventory items</li>
                            <li>• {deletionPreview.data_to_delete?.forms || 0} forms</li>
                            <li>• {deletionPreview.data_to_delete?.form_submissions || 0} form submissions</li>
                            <li>• {deletionPreview.data_to_delete?.reports || 0} reports</li>
                          </ul>
                        </div>
                      )}

                      <Button
                        variant="destructive"
                        onClick={confirmDeleteOrganization}
                        disabled={isDeletingOrg || isLoadingPreview || !deletionPreview}
                        className="w-full"
                      >
                        {isDeletingOrg ? 'Deleting Organization...' : 'Delete Organization Permanently'}
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Add User Dialog */}
      <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Existing User to {selectedOrg?.name}</DialogTitle>
            <DialogDescription>
              Add an existing user to this organization by their email address.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddUser} className="space-y-4">
            <div>
              <Label htmlFor="addUserEmail">User Email *</Label>
              <Input 
                id="addUserEmail" 
                type="email"
                value={addUserEmail} 
                onChange={(e) => setAddUserEmail(e.target.value)} 
                placeholder="user@company.com"
                required 
              />
            </div>
            <div>
              <Label htmlFor="addUserRole">Role</Label>
              <Select value={addUserRole} onValueChange={setAddUserRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="owner">Owner</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={isAddingUser}>
                {isAddingUser ? 'Adding...' : 'Add User'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowAddUser(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={showCreateUser} onOpenChange={setShowCreateUser}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New User for {selectedOrg?.name}</DialogTitle>
            <DialogDescription>
              Create a new user instantly. Just enter their email and password - they'll be created immediately and can login right away.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <Label htmlFor="createUserEmail">Email *</Label>
              <Input 
                id="createUserEmail" 
                type="email"
                value={createUserEmail} 
                onChange={(e) => setCreateUserEmail(e.target.value)} 
                placeholder="newuser@company.com"
                required 
              />
            </div>
            <div>
              <Label htmlFor="createUserPassword">Temporary Password *</Label>
              <div className="flex gap-2">
                <Input 
                  id="createUserPassword" 
                  type="text"
                  value={createUserPassword} 
                  onChange={(e) => setCreateUserPassword(e.target.value)} 
                  placeholder="Enter or generate a temp password"
                  required 
                />
                <Button type="button" onClick={generateTempPassword} variant="outline" size="sm">
                  Generate
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                You'll share this password directly with the user. They'll change it on first login.
              </p>
            </div>
            <div>
              <Label htmlFor="createUserRole">Role in Organization</Label>
              <Select value={createUserRole} onValueChange={setCreateUserRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="owner">Owner</SelectItem>
                </SelectContent>
              </Select>
            </div>
                          <div className="bg-green-50 p-3 rounded-md">
                <h4 className="font-medium text-sm mb-1">✅ Fully Automated:</h4>
                <ol className="text-xs text-muted-foreground space-y-1">
                  <li>1. User created instantly</li>
                  <li>2. Added to organization automatically</li>
                  <li>3. Can login immediately</li>
                  <li>4. Forced to change password on first login</li>
                </ol>
              </div>
            <div className="flex gap-2">
                              <Button type="submit" disabled={isCreatingUser}>
                  {isCreatingUser ? 'Creating User...' : 'Create User'}
                </Button>
              <Button type="button" variant="outline" onClick={() => setShowCreateUser(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Batch Add Dialog */}
      <Dialog open={showBatchAdd} onOpenChange={setShowBatchAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Batch Add Users to {selectedOrg?.name}</DialogTitle>
            <DialogDescription>
              Add multiple users at once. Enter one email per line.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleBatchAdd} className="space-y-4">
            <div>
              <Label htmlFor="batchEmails">Email Addresses *</Label>
              <Textarea 
                id="batchEmails" 
                value={batchEmails} 
                onChange={(e) => setBatchEmails(e.target.value)} 
                placeholder="user1@company.com&#10;user2@company.com&#10;user3@company.com"
                rows={6}
                required 
              />
              <p className="text-xs text-muted-foreground">
                One email per line. Existing users will be added directly, new emails will receive invitations.
              </p>
            </div>
            <div>
              <Label htmlFor="batchRole">Role for All Users</Label>
              <Select value={batchRole} onValueChange={setBatchRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="owner">Owner</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={isBatchAdding}>
                {isBatchAdding ? 'Processing...' : 'Batch Add Users'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowBatchAdd(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EnhancedPlatformDashboard; 