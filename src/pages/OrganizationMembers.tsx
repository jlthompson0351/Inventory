
import React, { useState, useEffect } from 'react';
import { useOrganization } from '@/hooks/useOrganization';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Shield, Trash2, AlertCircle } from 'lucide-react';
import { nanoid } from 'nanoid';

interface Member {
  id: string;
  user_id: string;
  role: string;
  is_primary: boolean;
  email: string;
  full_name: string | null;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  created_at: string;
  expires_at: string;
}

const OrganizationMembers = () => {
  const { currentOrganization } = useOrganization();
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [newInviteEmail, setNewInviteEmail] = useState('');
  const [newInviteRole, setNewInviteRole] = useState('member');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const fetchMembers = async () => {
    if (!currentOrganization) return;

    setIsLoading(true);
    try {
      // Fetch members with their profiles
      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          id,
          user_id,
          role,
          is_primary,
          user_id (
            email:email
          ),
          profiles!user_id (
            full_name
          )
        `)
        .eq('organization_id', currentOrganization.id);

      if (error) throw error;

      const formattedMembers: Member[] = data.map((member: any) => ({
        id: member.id,
        user_id: member.user_id,
        role: member.role,
        is_primary: member.is_primary,
        email: member.user_id.email,
        full_name: member.profiles?.full_name || null
      }));

      setMembers(formattedMembers);
    } catch (error) {
      console.error('Error fetching members:', error);
      toast.error("Failed to load organization members");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInvitations = async () => {
    if (!currentOrganization) return;

    try {
      const { data, error } = await supabase
        .from('organization_invitations')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString());

      if (error) throw error;
      setInvitations(data || []);
    } catch (error) {
      console.error('Error fetching invitations:', error);
      toast.error("Failed to load pending invitations");
    }
  };

  useEffect(() => {
    if (currentOrganization) {
      fetchMembers();
      fetchInvitations();
    }
  }, [currentOrganization]);

  const sendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrganization) return;

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Create expiration date (30 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      // Generate a random token
      const token = nanoid(32);

      // Create the invitation
      const { error } = await supabase
        .from('organization_invitations')
        .insert({
          organization_id: currentOrganization.id,
          email: newInviteEmail,
          role: newInviteRole,
          invited_by: user.id,
          token: token,
          expires_at: expiresAt.toISOString()
        });

      if (error) throw error;

      toast.success(`Invitation sent to ${newInviteEmail}`);
      setNewInviteEmail('');
      setNewInviteRole('member');
      fetchInvitations();
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast.error("Failed to send invitation");
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('organization_invitations')
        .delete()
        .eq('id', invitationId);

      if (error) throw error;

      toast.success("Invitation canceled");
      fetchInvitations();
    } catch (error) {
      console.error('Error canceling invitation:', error);
      toast.error("Failed to cancel invitation");
    }
  };

  const updateMemberRole = async (memberId: string, role: string) => {
    try {
      const { error } = await supabase
        .from('organization_members')
        .update({ role })
        .eq('id', memberId);

      if (error) throw error;

      toast.success("Member role updated");
      fetchMembers();
    } catch (error) {
      console.error('Error updating member role:', error);
      toast.error("Failed to update member role");
    }
  };

  const removeMember = async (memberId: string, isPrimary: boolean) => {
    if (isPrimary) {
      toast.error("Cannot remove the primary member of an organization");
      return;
    }

    try {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast.success("Member removed from organization");
      fetchMembers();
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error("Failed to remove member");
    }
  };

  if (!currentOrganization) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">No Organization Selected</h2>
          <p className="text-muted-foreground mb-4">Please select or create an organization.</p>
          <Button onClick={() => navigate('/organization-setup')}>
            Create Organization
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Organization Members</h1>
      
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Members</CardTitle>
            <CardDescription>Manage your organization's members</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-4 text-center">Loading members...</div>
            ) : members.length === 0 ? (
              <div className="py-4 text-center text-muted-foreground">
                No members found
              </div>
            ) : (
              <div className="space-y-4">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3 border rounded-md">
                    <div className="flex items-center gap-3">
                      <div className="bg-muted h-10 w-10 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {member.full_name || "Unnamed User"}
                          {member.is_primary && (
                            <span className="ml-2 text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5">
                              Primary
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Select 
                        defaultValue={member.role} 
                        disabled={member.is_primary}
                        onValueChange={(value) => updateMemberRole(member.id, value)}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue placeholder="Role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Button 
                        variant="ghost" 
                        size="icon"
                        disabled={member.is_primary}
                        onClick={() => removeMember(member.id, member.is_primary)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Invite New Members</CardTitle>
              <CardDescription>Send invitations to join your organization</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={sendInvitation} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-email">Email Address</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="Enter email address"
                    value={newInviteEmail}
                    onChange={(e) => setNewInviteEmail(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="invite-role">Role</Label>
                  <Select value={newInviteRole} onValueChange={setNewInviteRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Sending..." : "Send Invitation"}
                </Button>
              </form>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Pending Invitations</CardTitle>
            </CardHeader>
            <CardContent>
              {invitations.length === 0 ? (
                <div className="py-4 text-center text-muted-foreground">
                  No pending invitations
                </div>
              ) : (
                <div className="space-y-4">
                  {invitations.map((invitation) => (
                    <div key={invitation.id} className="flex items-center justify-between p-3 border rounded-md">
                      <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{invitation.email}</p>
                          <p className="text-xs text-muted-foreground">
                            Invited as {invitation.role} • Expires in {
                              Math.ceil((new Date(invitation.expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                            } days
                          </p>
                        </div>
                      </div>
                      
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => deleteInvitation(invitation.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default OrganizationMembers;
