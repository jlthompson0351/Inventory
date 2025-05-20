import React, { useState } from 'react';
import { useOrganization } from '@/hooks/useOrganization';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useOrganizationMembers } from '@/hooks/useOrganizationMembers';
import { useOrganizationInvitations } from '@/hooks/useOrganizationInvitations';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MembersList from '@/components/organization/MembersList';
import InviteForm from '@/components/organization/InviteForm';
import DirectUserAddForm from '@/components/organization/DirectUserAddForm';
import PendingInvitationsList from '@/components/organization/PendingInvitationsList';

const OrganizationMembers = () => {
  const { currentOrganization, organizations, fetchOrganizations } = useOrganization();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>("invite");
  
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
    deleteInvitation,
    fetchInvitations 
  } = useOrganizationInvitations(currentOrganization?.id);

  if (!currentOrganization) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">No Organization Selected</h2>
          <p className="text-muted-foreground mb-4">Please select or create an organization.</p>
          <div className="p-4 mb-6 border rounded-md bg-gray-50 max-w-lg">
            <h2 className="text-xl font-semibold mb-2">Organization Debug Info</h2>
            <div>
              <p className="font-medium">Available Organizations ({organizations.length}):</p>
              {organizations.length > 0 ? (
                <pre className="bg-white p-2 rounded text-sm">
                  {JSON.stringify(organizations, null, 2)}
                </pre>
              ) : (
                <p className="text-red-500">No organizations available</p>
              )}
            </div>
            <button
              onClick={() => fetchOrganizations()}
              className="mt-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Refresh Organizations
            </button>
          </div>
          <Button onClick={() => navigate('/organization-setup')}>
            Create Organization
          </Button>
        </div>
      </div>
    );
  }

  const handleUserAdded = () => {
    // Refresh the members list when a user is added directly
    membersRefresh();
  };

  const membersRefresh = () => {
    // We'll fetch both members and pending invitations
    // In a real application, these would be separate functions in their respective hooks
    if (currentOrganization?.id) {
      fetchInvitations();
    }
  };

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
          <Tabs defaultValue="invite" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="invite">Email Invitation</TabsTrigger>
              <TabsTrigger value="direct">Direct Add</TabsTrigger>
            </TabsList>
            <TabsContent value="invite" className="pt-4">
              <InviteForm 
                email={newInviteEmail}
                setEmail={setNewInviteEmail}
                role={newInviteRole}
                setRole={setNewInviteRole}
                isSubmitting={isSubmitting}
                onSubmit={sendInvitation}
              />
            </TabsContent>
            <TabsContent value="direct" className="pt-4">
              {currentOrganization.id && (
                <DirectUserAddForm 
                  organizationId={currentOrganization.id}
                  onUserAdded={handleUserAdded}
                />
              )}
            </TabsContent>
          </Tabs>
          
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
