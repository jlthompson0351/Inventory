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
  const { currentOrganization } = useOrganization();
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
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">No Organization Available</h2>
          <p className="text-muted-foreground mb-4">There was an error loading your organization.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Organization Members</h1>
        <Button
          variant="outline"
          className="mt-2 sm:mt-0"
          onClick={() => navigate('/organization/settings')}
        >
          Organization Settings
        </Button>
      </div>
      
      <div className="mb-6">
        <p className="text-muted-foreground">
          Manage the members of your organization. Invite new users or manage existing ones.
        </p>
      </div>
      
      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Current Members</h2>
            <MembersList 
              members={members || []} 
              isLoading={isLoading}
              onRoleChange={updateMemberRole}
              onRemoveMember={removeMember}
            />
          </div>
        </div>
        
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="invite">Invite Members</TabsTrigger>
                <TabsTrigger value="pending">Pending ({invitations?.length || 0})</TabsTrigger>
              </TabsList>
              
              <div className="p-6">
                <TabsContent value="invite" className="mt-0">
                  <InviteForm
                    email={newInviteEmail}
                    setEmail={setNewInviteEmail}
                    role={newInviteRole}
                    setRole={setNewInviteRole}
                    onSubmit={sendInvitation}
                    isSubmitting={isSubmitting}
                  />
                </TabsContent>
                
                <TabsContent value="pending" className="mt-0">
                  <PendingInvitationsList
                    invitations={invitations || []}
                    onDelete={deleteInvitation}
                    onRefresh={fetchInvitations}
                  />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrganizationMembers;
