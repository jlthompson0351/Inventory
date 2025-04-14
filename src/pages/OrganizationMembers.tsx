
import React from 'react';
import { useOrganization } from '@/hooks/useOrganization';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useOrganizationMembers } from '@/hooks/useOrganizationMembers';
import { useOrganizationInvitations } from '@/hooks/useOrganizationInvitations';
import MembersList from '@/components/organization/MembersList';
import InviteForm from '@/components/organization/InviteForm';
import PendingInvitationsList from '@/components/organization/PendingInvitationsList';

const OrganizationMembers = () => {
  const { currentOrganization } = useOrganization();
  const navigate = useNavigate();
  
  // Use custom hooks to manage members and invitations
  const { members, isLoading, updateMemberRole, removeMember } = useOrganizationMembers(currentOrganization?.id);
  const { 
    invitations, 
    newInviteEmail, 
    setNewInviteEmail, 
    newInviteRole, 
    setNewInviteRole, 
    isSubmitting, 
    sendInvitation, 
    deleteInvitation 
  } = useOrganizationInvitations(currentOrganization?.id);

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
        <MembersList 
          members={members} 
          isLoading={isLoading} 
          onUpdateRole={updateMemberRole} 
          onRemoveMember={removeMember} 
        />
        
        <div className="space-y-6">
          <InviteForm 
            email={newInviteEmail}
            setEmail={setNewInviteEmail}
            role={newInviteRole}
            setRole={setNewInviteRole}
            isSubmitting={isSubmitting}
            onSubmit={sendInvitation}
          />
          
          <PendingInvitationsList 
            invitations={invitations} 
            onDelete={deleteInvitation} 
          />
        </div>
      </div>
    </div>
  );
};

export default OrganizationMembers;
