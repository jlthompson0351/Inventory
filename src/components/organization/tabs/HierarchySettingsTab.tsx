import React, { useState, useEffect } from 'react';
import { useOrganization } from '@/hooks/useOrganization';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectGroup, 
  SelectItem, 
  SelectLabel, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  Building, 
  BuildingIcon, 
  ArrowDown, 
  ArrowUp, 
  AlertCircle, 
  Save, 
  X 
} from 'lucide-react';
import OrganizationAvatar from '@/components/common/OrganizationAvatar';
import OrganizationBreadcrumb from '@/components/organization/OrganizationBreadcrumb';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface HierarchySettingsTabProps {
  organizationId: string;
}

export function HierarchySettingsTab({ organizationId }: HierarchySettingsTabProps) {
  const { 
    currentOrganization, 
    organizations, 
    getOrganizationDetails, 
    updateOrganization,
    getOrganizationAncestors,
    getChildOrganizations 
  } = useOrganization();

  const [organization, setOrganization] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [parentId, setParentId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isParentChanged, setIsParentChanged] = useState(false);
  const [ancestors, setAncestors] = useState<any[]>([]);
  const [children, setChildren] = useState<any[]>([]);
  const [possibleParents, setPossibleParents] = useState<any[]>([]);

  // Get current organization details
  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      const details = await getOrganizationDetails(organizationId);
      if (details) {
        setOrganization(details);
        setName(details.name);
        setParentId(details.parent_id);
        setDescription(details.description || '');
        
        // Get ancestors and children
        const orgAncestors = getOrganizationAncestors(organizationId);
        setAncestors(orgAncestors);
        
        const orgChildren = getChildOrganizations(organizationId);
        setChildren(orgChildren);
        
        // Filter organizations that can be parents (to avoid circular references)
        const childIds = getAllChildrenIds(organizationId);
        const validParents = organizations.filter(org => 
          org.id !== organizationId && !childIds.includes(org.id)
        );
        setPossibleParents(validParents);
      }
      setLoading(false);
    };
    
    if (organizations.length > 0) {
      fetchDetails();
    }
  }, [organizationId, organizations]);

  // Get all children IDs recursively to prevent circular references
  const getAllChildrenIds = (orgId: string): string[] => {
    const directChildren = getChildOrganizations(orgId);
    if (directChildren.length === 0) return [];
    
    const childIds = directChildren.map(child => child.id);
    const grandchildIds = directChildren.flatMap(child => getAllChildrenIds(child.id));
    
    return [...childIds, ...grandchildIds];
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      // If parent organization is changing, show a confirmation
      if (parentId !== organization.parent_id) {
        setIsParentChanged(true);
        setSaving(false);
        return;
      }
      
      await saveChanges();
    } catch (error) {
      console.error('Error saving organization:', error);
      toast.error('Failed to save changes');
      setSaving(false);
    }
  };

  // Save changes after confirmation if needed
  const saveChanges = async () => {
    setSaving(true);
    
    const updates = {
      name,
      description,
      parent_id: parentId
    };
    
    const result = await updateOrganization(organizationId, updates);
    
    if (result) {
      toast.success('Organization updated successfully');
      setIsParentChanged(false);
      
      // If parent changed, refresh ancestors and possible parents
      if (parentId !== organization.parent_id) {
        const orgAncestors = getOrganizationAncestors(organizationId);
        setAncestors(orgAncestors);
        
        // Update local organization state
        setOrganization({
          ...organization,
          parent_id: parentId
        });
      }
    }
    
    setSaving(false);
  };

  // Cancel parent change
  const cancelParentChange = () => {
    setParentId(organization.parent_id);
    setIsParentChanged(false);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (!organization) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Organization not found or you don't have permission to view it.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Organization Hierarchy Settings</CardTitle>
          <CardDescription>
            Manage the hierarchical structure of your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Current Organization</label>
              <div className="flex items-center gap-2 p-2 border rounded">
                <OrganizationAvatar
                  size="sm"
                  name={organization.name}
                  src={organization.avatar_url}
                />
                <div>
                  <p className="font-medium">{organization.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Hierarchy Level: {organization.hierarchy_level || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Hierarchy Path</label>
              <OrganizationBreadcrumb
                organizationId={organizationId}
                showCurrent={true}
                maxItems={4}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">Organization Name</label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter organization name"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">Description</label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter a brief description of this organization"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="parent" className="text-sm font-medium">Parent Organization</label>
              <Select
                value={parentId || ''}
                onValueChange={(value) => setParentId(value === '' ? null : value)}
              >
                <SelectTrigger id="parent">
                  <SelectValue placeholder="Select a parent organization" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">
                    <span className="flex items-center gap-2">
                      <BuildingIcon className="h-4 w-4" />
                      <span>No Parent (Top-Level Organization)</span>
                    </span>
                  </SelectItem>
                  <SelectGroup>
                    {possibleParents.length > 0 ? (
                      possibleParents.map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          <span className="flex items-center gap-2">
                            <Building className="h-4 w-4" />
                            <span>{org.name}</span>
                          </span>
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="" disabled>
                        No available parent organizations
                      </SelectItem>
                    )}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Changing the parent organization will update the hierarchy level automatically.
              </p>
            </div>

            {isParentChanged && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Hierarchy Change</AlertTitle>
                <AlertDescription>
                  Changing the parent organization will affect the entire hierarchy. 
                  Are you sure you want to continue?
                  
                  <div className="mt-4 flex gap-2">
                    <Button variant="destructive" size="sm" onClick={cancelParentChange}>
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                    <Button variant="default" size="sm" onClick={saveChanges}>
                      <Save className="h-4 w-4 mr-1" />
                      Confirm Change
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {children.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Child Organizations</label>
                <div className="border rounded p-2 space-y-2">
                  {children.map((child) => (
                    <div key={child.id} className="flex items-center gap-2 p-2 bg-muted rounded">
                      <OrganizationAvatar
                        size="sm"
                        name={child.name}
                        src={child.avatarUrl}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{child.name}</p>
                      </div>
                      <Badge variant="outline">
                        Level {child.hierarchyLevel}
                      </Badge>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  These organizations will move with this organization if you change its parent.
                </p>
              </div>
            )}
          </form>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => {
              setName(organization.name);
              setDescription(organization.description || '');
              setParentId(organization.parent_id);
              setIsParentChanged(false);
            }}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            onClick={handleSubmit}
            disabled={saving || (
              name === organization.name && 
              description === (organization.description || '') && 
              parentId === organization.parent_id
            )}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 