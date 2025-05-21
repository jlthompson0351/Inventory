import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/hooks/useAuth';
import OrganizationAvatar from '@/components/common/OrganizationAvatar';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { SetupMothership } from '@/components/system-admin/SetupMothership';

// Organization interface
interface Organization {
  id: string;
  name: string;
  avatar_url?: string;
  parent_id?: string;
  children?: Organization[];
  [key: string]: any; // For other possible properties
}

// Helper function to organize organizations into a hierarchical structure
const organizeHierarchy = (organizations: Organization[]): Organization[] => {
  // First, create a map of all organizations by their ID
  const orgMap = new Map<string, Organization>();
  organizations.forEach(org => orgMap.set(org.id, { ...org, children: [] }));
  
  // Root level organizations (those with no parent)
  const rootOrgs: Organization[] = [];
  
  // Populate the children arrays and collect root orgs
  organizations.forEach(org => {
    const orgWithChildren = orgMap.get(org.id);
    
    if (org.parent_id && orgMap.has(org.parent_id)) {
      // This org has a parent that exists in our list
      const parent = orgMap.get(org.parent_id);
      if (parent && parent.children) {
        parent.children.push(orgWithChildren as Organization);
      }
    } else {
      // This is a root level org
      rootOrgs.push(orgWithChildren as Organization);
    }
  });
  
  // Sort by name at each level
  const sortByName = (orgs: Organization[]): Organization[] => {
    orgs.sort((a, b) => a.name.localeCompare(b.name));
    orgs.forEach(org => {
      if (org.children && org.children.length > 0) {
        sortByName(org.children);
      }
    });
    return orgs;
  };
  
  return sortByName(rootOrgs);
};

// Props for OrganizationItem
interface OrganizationItemProps {
  org: Organization;
  level?: number;
  currentOrgId: string | undefined;
  handleOrgChange: (orgId: string) => void;
  isLoading: boolean;
}

// Memoize OrganizationItem to prevent unnecessary re-renders
const OrganizationItem = React.memo(({ 
  org, 
  level = 0, 
  currentOrgId, 
  handleOrgChange, 
  isLoading 
}: OrganizationItemProps) => {
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
    isLoading: orgIsLoading,
    lastError
  } = useOrganization();
  const { userRoles } = useAuth();
  const [canCreateOrg, setCanCreateOrg] = useState(false);
  const [hierarchicalOrgs, setHierarchicalOrgs] = useState<Organization[]>([]);
  const [isSwitching, setIsSwitching] = useState(false);
  const initialRenderRef = useRef(true);
  
  // Current organization ID - safely extracted and memoized
  const currentOrgId = useMemo(() => currentOrganization?.id, [currentOrganization?.id]);
  
  // Memoized flag for admin status 
  const isAdmin = useMemo(() => 
    userRoles?.isSystemAdmin || userRoles?.isSuperAdmin, 
    [userRoles?.isSystemAdmin, userRoles?.isSuperAdmin]
  );
  
  // Memoized flag for Mothership organization
  const isInMothership = useMemo(() => 
    currentOrganization?.name === 'Mothership',
    [currentOrganization?.name]
  );
  
  // Memoize hierarchical data to prevent recalculation on every render
  const memoizedHierarchicalData = useMemo(() => {
    if (organizations?.length > 0) {
      return organizeHierarchy(organizations);
    }
    return [];
  }, [organizations]);

  // Stable boolean flag for if we have organizations
  const hasOrganizations = useMemo(() => 
    Array.isArray(organizations) && organizations.length > 0,
    [organizations]
  );
  
  // Check if user can create organizations - with stable dependencies
  useEffect(() => {
    if (initialRenderRef.current) {
      // Skip the first render to avoid potential double updates
      initialRenderRef.current = false;
      return;
    }
    
    // User can create org if:
    // 1. They are a system admin OR super admin 
    // 2. They have no organizations yet (first org)
    // 3. They are in the Mothership organization (special case)
    const isFirstOrg = !hasOrganizations;
    setCanCreateOrg(isAdmin || isFirstOrg || isInMothership);
  }, [isAdmin, hasOrganizations, isInMothership]);

  // Update hierarchical orgs only when the memoized data changes
  useEffect(() => {
    if (initialRenderRef.current) {
      // Set initial state on first render without causing a state update
      if (memoizedHierarchicalData.length > 0) {
        hierarchicalOrgs.length = 0;
        hierarchicalOrgs.push(...memoizedHierarchicalData);
      }
      return;
    }
    
    // After first render, update state normally, but only if data has changed
    if (JSON.stringify(hierarchicalOrgs) !== JSON.stringify(memoizedHierarchicalData)) {
      setHierarchicalOrgs(memoizedHierarchicalData);
    }
  }, [memoizedHierarchicalData]);

  // Memoize handlers to prevent recreation on every render
  const handleOrgChange = useCallback(async (orgId: string) => {
    if (!orgId || isSwitching) return;
    
    try {
      setIsSwitching(true);
      console.log(`OrganizationSwitcher: Switching to organization ${orgId}`);
      
      // Then switch the organization
      const result = await selectOrganization(orgId);
      
      if (result) {
        // Show success message with organization name
        const selectedOrg = organizations.find(org => org.id === orgId);
        toast.success(`Switched to ${selectedOrg?.name || 'organization'}`);
        
        // Redirect to dashboard instead of reload to prevent potential infinite loops
        navigate('/dashboard');
      }
    } catch (error) {
      console.error("Error switching organization:", error);
      toast.error("Failed to switch organization. Please try again.");
    } finally {
      setIsSwitching(false);
    }
  }, [selectOrganization, organizations, navigate, isSwitching]);

  const handleRefresh = useCallback(async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    
    if (isSwitching) return;
    
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
  }, [fetchOrganizations, isSwitching]);

  const handleCreateNewOrg = useCallback(() => {
    // Double-check permission before navigating
    if (!canCreateOrg) {
      toast.error("You don't have permission to create a new organization. Please contact a system administrator.");
      return;
    }
    navigate('/organization-setup');
  }, [canCreateOrg, navigate]);

  const handleManageMembers = useCallback(() => {
    navigate('/organization/members');
  }, [navigate]);

  const handleOrganizationSettings = useCallback(() => {
    navigate('/organization/settings');
  }, [navigate]);

  const handleSuperAdmin = useCallback(() => {
    navigate('/super-admin');
  }, [navigate]);

  // Combined loading state
  const isLoading = orgIsLoading || isSwitching;

  if (isLoading) {
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
            disabled={isLoading}
            className="ml-1 h-7 w-7 p-0 rounded-full"
            title="Refresh Organizations"
          >
            <span className="sr-only">Refresh</span>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        
        {organizations.length > 0 ? (
          <div className="w-full">
            <Select 
              onValueChange={(value) => handleOrgChange(value)} 
              disabled={isLoading}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select an organization" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map(org => (
                  <SelectItem key={org.id} value={org.id}>
                    <div className="flex items-center gap-2">
                      <OrganizationAvatar size="sm" name={org.name} src={org.avatar_url} />
                      <span>{org.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="text-center p-2">
            <p className="text-sm text-muted-foreground mb-3">
              You do not have any organizations yet.
            </p>
            {canCreateOrg && (
              <Button 
                onClick={handleCreateNewOrg} 
                disabled={isLoading}
                variant="outline" 
                size="sm"
              >
                <Plus className="mr-1 h-4 w-4" />
                Create Organization
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline"
          className="w-full justify-start overflow-hidden"
          disabled={isLoading}
        >
          <div className="flex items-center space-x-2 overflow-hidden flex-1">
            <OrganizationAvatar 
              size="sm" 
              name={currentOrganization.name} 
              src={currentOrganization.avatar_url}
            />
            <div className="flex flex-col items-start text-left">
              <span className="font-medium truncate max-w-[120px]">
                {currentOrganization.name}
              </span>
              <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                Switch organization
              </span>
            </div>
          </div>
          <ChevronDown className="h-4 w-4 ml-auto opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[220px] max-h-[400px] overflow-auto">
        <DropdownMenuLabel>Your Organizations</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {hierarchicalOrgs.length === 0 ? (
          <div className="p-2 text-center">
            <p className="text-sm text-muted-foreground">
              No organizations found
            </p>
          </div>
        ) : (
          hierarchicalOrgs.map(org => (
            <OrganizationItem 
              key={org.id}
              org={org}
              currentOrgId={currentOrgId}
              handleOrgChange={handleOrgChange}
              isLoading={isLoading}
            />
          ))
        )}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={handleRefresh} 
          disabled={isLoading}
          className="cursor-pointer"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          <span>Refresh List</span>
        </DropdownMenuItem>
        
        {canCreateOrg && (
          <DropdownMenuItem 
            onClick={handleCreateNewOrg} 
            disabled={isLoading}
            className="cursor-pointer"
          >
            <Plus className="mr-2 h-4 w-4" />
            <span>New Organization</span>
          </DropdownMenuItem>
        )}
        
        <DropdownMenuItem 
          onClick={handleManageMembers} 
          disabled={isLoading}
          className="cursor-pointer"
        >
          <Users className="mr-2 h-4 w-4" />
          <span>Manage Members</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={handleOrganizationSettings} 
          disabled={isLoading}
          className="cursor-pointer"
        >
          <Settings className="mr-2 h-4 w-4" />
          <span>Organization Settings</span>
        </DropdownMenuItem>
        
        {currentOrganization.name === "Mothership" && (
          <DropdownMenuItem 
            onClick={handleSuperAdmin}
            className="cursor-pointer"
          >
            <Shield className="mr-2 h-4 w-4 text-purple-600" />
            <span className="text-purple-600 font-semibold">Super Admin</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default React.memo(OrganizationSwitcher);
