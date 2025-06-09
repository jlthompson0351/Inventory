import React, { useState } from 'react';
import { useOrganization } from '@/hooks/useOrganization';
import { useOrganizationMembers } from '@/hooks/useOrganizationMembers';
import { useOrganizationInvitations } from '@/hooks/useOrganizationInvitations';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MembersList from '@/components/organization/MembersList';
import InviteForm from '@/components/organization/InviteForm';
import PendingInvitationsList from '@/components/organization/PendingInvitationsList';

// This component will render the main content for member management.
// It can be used directly in a tab or wrapped by a page component if needed.
const OrganizationMembersContent: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const [activeTab, setActiveTab] = useState<string>("invite");
  
  const { members, isLoading, updateMemberRole, removeMember, deleteUserCompletely } = useOrganizationMembers();
  const { 
    invitations, 
    newInviteEmail, 
    setNewInviteEmail, 
    newInviteRole, 
    setNewInviteRole, 
    newInviteCustomMessage,
    setNewInviteCustomMessage,
    isSubmitting, 
    sendInvitation, 
    resendInvitation,
    deleteInvitation,
    fetchInvitations 
  } = useOrganizationInvitations();

  if (!currentOrganization) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">No Organization Loaded</h2>
          <p className="text-muted-foreground mb-4">Organization context is not available.</p>
        </div>
      </div>
    );
  }

  // Main layout for member management content
  return (
    <div className="grid lg:grid-cols-5 gap-6">
      <div className="lg:col-span-3 space-y-4">
        <div className="bg-card text-card-foreground shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Current Members</h2>
          <MembersList 
            members={members || []} 
            isLoading={isLoading}
            onRoleChange={updateMemberRole}
            onRemoveMember={removeMember}
            onDeleteUser={deleteUserCompletely}
          />
        </div>
      </div>
      
      <div className="lg:col-span-2">
        <div className="bg-card text-card-foreground shadow rounded-lg">
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
                  customMessage={newInviteCustomMessage}
                  setCustomMessage={setNewInviteCustomMessage}
                  onSubmit={sendInvitation}
                  isSubmitting={isSubmitting}
                />
              </TabsContent>
              
              <TabsContent value="pending" className="mt-0">
                <PendingInvitationsList
                  invitations={invitations || []}
                  onDelete={deleteInvitation}
                  onResend={resendInvitation}
                  onRefresh={fetchInvitations}
                />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

// The page component can still exist if you want a direct route to /organization/members
// For now, we are primarily using OrganizationMembersContent in a tab.
// If OrganizationMembers.tsx is ONLY used as a tab, this can be simplified to just export OrganizationMembersContent directly.
const OrganizationMembersPage = () => {
  // This would be a minimal wrapper if OrganizationMembersContent needs to be a full page.
  // It might include a page title, breadcrumbs, etc.
  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Organization Members</h1>
        {/* Button to settings could be here if this is a standalone page */}
      </div>
      <p className="text-muted-foreground mb-6">
        Manage the members of your organization. Invite new users or manage existing ones.
      </p>
      <OrganizationMembersContent />
    </div>
  );
}

// Default export could be OrganizationMembersPage if you need the route /organization/members
// Or it could be OrganizationMembersContent if this file is only used for the tab content.
// For now, to match the import in OrganizationAdminPage, we export OrganizationMembersContent as default.
export default OrganizationMembersContent; 
// If you want to keep /organization/members route working with this structure:
// export { OrganizationMembersPage as OrganizationMembers }; 
// And update the import in App.tsx to match if needed.
