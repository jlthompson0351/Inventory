import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AlertCircle, ChevronDown, Plus, Settings, Users, RefreshCw, Clock, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/hooks/useAuth';
import OrganizationAvatar from '@/components/common/OrganizationAvatar';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { SetupMothership } from '@/components/system-admin/SetupMothership';

// Helper function to organize organizations into a hierarchical structure
const organizeHierarchy = (organizations) => {
  // First, create a map of all organizations by their ID
  const orgMap = new Map();
  organizations.forEach(org => orgMap.set(org.id, { ...org, children: [] }));
  
  // Root level organizations (those with no parent)
  const rootOrgs = [];
  
  // Populate the children arrays and collect root orgs
  organizations.forEach(org => {
    const orgWithChildren = orgMap.get(org.id);
    
    if (org.parent_id && orgMap.has(org.parent_id)) {
      // This org has a parent that exists in our list
      const parent = orgMap.get(org.parent_id);
      parent.children.push(orgWithChildren);
    } else {
      // This is a root level org
      rootOrgs.push(orgWithChildren);
    }
  });
  
  // Sort by name at each level
  const sortByName = (orgs) => {
    orgs.sort((a, b) => a.name.localeCompare(b.name));
    orgs.forEach(org => {
      if (org.children.length > 0) {
        sortByName(org.children);
      }
    });
    return orgs;
  };
  
  return sortByName(rootOrgs);
};

// Memoize OrganizationItem to prevent unnecessary re-renders
const OrganizationItem = React.memo(({ org, level = 0, currentOrgId, handleOrgChange, isLoading }) => {
  const isCurrent = org.id === currentOrgId;
  
  return (
    <>
      <DropdownMenuItem 
        key={org.id} 
        className={`cursor-pointer ${isCurrent ? 'bg-muted' : ''}`}
        disabled={isCurrent || isLoading}
        onClick={() => handleOrgChange(org.id)}
      >
        <div className="flex items-center gap-2 w-full" style={{ paddingLeft: `${level * 12}px` }}>
          <OrganizationAvatar 
            size="sm" 
            name={org.name} 
            src={org.avatar_url} 
          />
          <div className="flex flex-col flex-1 min-w-0">
            <span className="font-medium truncate">{org.name}</span>
            <span className="text-xs text-muted-foreground flex items-center">
              {isCurrent ? (
                <span className="flex items-center text-green-600">
                  <Clock className="mr-1 h-3 w-3" />
                  Current organization
                </span>
              ) : (
                <span>Click to switch</span>
              )}
            </span>
          </div>
        </div>
      </DropdownMenuItem>
      
      {/* Render children recursively with increased indentation */}
      {org.children && org.children.map(child => (
        <OrganizationItem 
          key={child.id}
          org={child} 
          level={level + 1} 
          currentOrgId={currentOrgId}
          handleOrgChange={handleOrgChange}
          isLoading={isLoading}
        />
      ))}
    </>
  );
});

OrganizationItem.displayName = 'OrganizationItem';

const OrganizationSwitcher = () => {
  const navigate = useNavigate();
  const { 
    currentOrganization, 
    organizations, 
    selectOrganization,
    fetchOrganizations,
    isLoading,
    lastError
  } = useOrganization();
  const { userRoles } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [canCreateOrg, setCanCreateOrg] = useState(false);
  const [hierarchicalOrgs, setHierarchicalOrgs] = useState([]);
  const [isSwitching, setIsSwitching] = useState(false);

  // Memoize hierarchical data to prevent recalculation on every render
  const memoizedHierarchicalData = useMemo(() => {
    if (organizations?.length > 0) {
      return organizeHierarchy(organizations);
    }
    return [];
  }, [organizations]);

  // Update state only when the memoized data changes
  useEffect(() => {
    setHierarchicalOrgs(memoizedHierarchicalData);
  }, [memoizedHierarchicalData]);

  // Check if user can create organizations - with stable dependencies
  useEffect(() => {
    // User can create org if:
    // 1. They are a system admin OR super admin 
    // 2. They have no organizations yet (first org)
    // 3. They are in the Mothership organization (special case)
    const isAdmin = userRoles?.isSystemAdmin || userRoles?.isSuperAdmin;
    const isFirstOrg = organizations?.length === 0;
    const isInMothership = currentOrganization?.name === 'Mothership';
    
    setCanCreateOrg(isAdmin || isFirstOrg || isInMothership);
  }, [
    organizations?.length, 
    userRoles?.isSystemAdmin, 
    userRoles?.isSuperAdmin, 
    currentOrganization?.name
  ]);

  // Memoize handlers to prevent recreation on every render
  const handleOrgChange = useCallback(async (orgId: string) => {
    try {
      setIsSwitching(true);
      console.log(`OrganizationSwitcher: Switching to organization ${orgId}`);
      
      // First close the dropdown to give immediate feedback
      setIsOpen(false);
      
      // Then switch the organization
      const result = await selectOrganization(orgId);
      
      if (result) {
        // Show success message with organization name
        const selectedOrg = organizations.find(org => org.id === orgId);
        toast.success(`Switched to ${selectedOrg?.name || 'organization'}`);
        
        // Reload the current page to refresh data for the new organization
        window.location.reload();
      }
    } catch (error) {
      console.error("Error switching organization:", error);
      toast.error("Failed to switch organization. Please try again.");
      
      // Reopen the dropdown so user can try again
      setIsOpen(true);
    } finally {
      setIsSwitching(false);
    }
  }, [organizations, selectOrganization]);

  const handleRefresh = useCallback(async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    
    try {
      setIsSwitching(true);
      console.log("OrganizationSwitcher: Refreshing organizations list");
      await fetchOrganizations();
      toast.success("Organizations refreshed");
    } catch (error) {
      console.error("Failed to refresh organizations:", error);
      toast.error("Failed to refresh organizations. Please try again.");
    } finally {
      setIsSwitching(false);
    }
  }, [fetchOrganizations]);

  const handleCreateNewOrg = useCallback(() => {
    // Double-check permission before navigating
    if (!canCreateOrg) {
      toast.error("You don't have permission to create a new organization. Please contact a system administrator.");
      return;
    }
    navigate('/organization-setup');
    setIsOpen(false);
  }, [canCreateOrg, navigate]);

  const handleManageMembers = useCallback(() => {
    navigate('/organization/members');
    setIsOpen(false);
  }, [navigate]);

  const handleOrganizationSettings = useCallback(() => {
    navigate('/organization/settings');
    setIsOpen(false);
  }, [navigate]);

  if (isLoading || isSwitching) {
    return (
      <div className="flex items-center gap-2 border rounded-md shadow-sm p-3">
        <Skeleton className="h-6 w-6 rounded-full" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4 ml-auto" />
      </div>
    );
  }

  if (!currentOrganization) {
    return (
      <div className="flex flex-col items-center gap-2 border rounded-md shadow-sm p-3 bg-amber-50">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <p className="text-sm font-medium text-amber-700">
            No organization selected
          </p>
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={handleRefresh}
            disabled={isLoading || isSwitching}
            className="ml-1 h-7 w-7 p-0 rounded-full"
            title="Refresh Organizations"
          >
            <span className="sr-only">Refresh</span>
            <RefreshCw className={`h-4 w-4 ${isLoading || isSwitching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        
        <div className="w-full space-y-2">
          <p className="text-xs text-muted-foreground mb-2">
            You need to set up or select an organization to continue.
          </p>
          
          <SetupMothership />
        </div>
      </div>
    );
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild disabled={isLoading || isSwitching}>
        <Button 
          variant="outline" 
          className="flex items-center gap-2 px-3 py-2 border rounded-md shadow-sm hover:shadow"
          data-testid="organization-switcher"
        >
          <OrganizationAvatar 
            size="sm" 
            name={currentOrganization.name} 
            src={currentOrganization.avatar_url} 
          />
          <span className="font-medium truncate max-w-[150px]">
            {currentOrganization.name}
          </span>
          
          <div className="flex gap-1 items-center">
            <span 
              onClick={handleRefresh}
              className={`h-6 w-6 p-0 rounded-full ml-1 cursor-pointer flex items-center justify-center hover:bg-gray-100 ${(isLoading || isSwitching) ? 'pointer-events-none' : ''}`}
              title="Refresh Organizations"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${(isLoading || isSwitching) ? 'animate-spin' : ''}`} />
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel className="flex justify-between items-center">
          <span>Your Organizations</span>
          <span className="text-xs text-muted-foreground">
            {organizations.length} organization{organizations.length !== 1 ? 's' : ''}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {lastError && (
          <div className="text-xs text-red-500 p-2 bg-red-50 mb-2 rounded">
            Error: {lastError}
          </div>
        )}
        
        <div className="max-h-[250px] overflow-y-auto py-1">
          {hierarchicalOrgs.map((org) => (
            <OrganizationItem 
              key={org.id}
              org={org}
              currentOrgId={currentOrganization.id}
              handleOrgChange={handleOrgChange}
              isLoading={isLoading || isSwitching}
            />
          ))}
        </div>
        
        <DropdownMenuSeparator />
        
        {/* Only show System Admin for super admins */}
        {userRoles.isSuperAdmin && (
          <>
            <DropdownMenuItem className="cursor-pointer" onClick={() => navigate('/system-admin')}>
              <Shield className="mr-2 h-4 w-4" />
              System Administration
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        
        <DropdownMenuItem className="cursor-pointer" onClick={handleOrganizationSettings}>
          <Settings className="mr-2 h-4 w-4" />
          Organization Settings
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer" onClick={handleManageMembers}>
          <Users className="mr-2 h-4 w-4" />
          Manage Members
        </DropdownMenuItem>
        
        {canCreateOrg && (
          <DropdownMenuItem className="cursor-pointer" onClick={handleCreateNewOrg}>
            <Plus className="mr-2 h-4 w-4" />
            Create New Organization
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default OrganizationSwitcher;
