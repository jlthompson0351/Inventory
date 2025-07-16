import React, { useState } from 'react';
import { useOrganization } from '@/hooks/useOrganization';
import { useOrganizationMembers } from '@/hooks/useOrganizationMembers';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MembersList } from '@/components/organization/MembersList';
import DirectUserAddForm from '@/components/organization/DirectUserAddForm';

// This component will render the main content for member management.
// It can be used directly in a tab or wrapped by a page component if needed.
const OrganizationMembersContent: React.FC = () => {
  const { currentOrganization } = useOrganization();
  
  const { members, isLoading, updateMemberRole, removeMember, deleteUserCompletely, refreshMembers } = useOrganizationMembers();

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
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Members Settings</h2>
          <div className="text-sm text-muted-foreground">
            Manage team members
          </div>
        </div>
        <p className="text-muted-foreground">
          View current members and add new ones directly to your organization.
        </p>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Current Members Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border rounded-xl shadow-sm">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold">Current Members</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {members?.length || 0} member{(members?.length || 0) !== 1 ? 's' : ''} in your organization
              </p>
            </div>
            <div className="p-6">
              <MembersList />
            </div>
          </div>
        </div>
        
        {/* Right Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card border rounded-xl shadow-sm">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold">Add New Member</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Create user accounts directly
              </p>
            </div>
            
            <div className="p-6">
              <DirectUserAddForm
                organizationId={currentOrganization.id}
                onUserAdded={() => {
                  refreshMembers();
                }}
              />
            </div>
          </div>
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
        Manage the members of your organization. Create new users directly or manage existing ones.
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
