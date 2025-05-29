import { useState, useEffect, useMemo, useCallback } from "react";
import { Plus, Edit, Trash2, Loader2, ArrowUp, ArrowDown, Filter, Copy, RefreshCw, Search, FileText, ListCheck, Package, FileStack, Archive, ArchiveRestore } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { BarcodeToggle } from "@/components/inventory/BarcodeToggle";
import { 
  AssetType, 
  AssetTypeWithCount,
  getAssetTypesWithCounts, 
  getArchivedAssetTypesWithCounts,
  createAssetType, 
  updateAssetType, 
  deleteAssetType,
  restoreAssetType,
  createDefaultFormsForAssetType,
  removeAssetTypeFormLink,
  addAssetTypeFormLink,
  getAssetTypeForms,
  checkAssetTypeNameExists
} from "@/services/assetTypeService";
import { supabase } from "@/integrations/supabase/client"; // Import the supabase client directly
import { useNavigate } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import { getFormsByAssetType, getForms } from '@/services/formService';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

// Color options for asset types
const colorOptions = [
  "#6E56CF", "#0EA5E9", "#10B981", "#EAB308", "#EF4444", 
  "#F97316", "#8B5CF6", "#EC4899", "#06B6D4", "#14B8A6"
];

type SortField = "name" | "asset_count" | "created_at" | "deleted_at";
type ViewMode = "active" | "archived";

const AssetTypes = () => {
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const [assetTypes, setAssetTypes] = useState<AssetTypeWithCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAssetType, setEditingAssetType] = useState<AssetTypeWithCount | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterOptions, setFilterOptions] = useState<{
    hasAssets: boolean;
  }>({ hasAssets: false });
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#6E56CF"
  });
  const [barcodeSettings, setBarcodeSettings] = useState({
    enabled: false,
    type: "qr",
    prefix: "",
  });
  const navigate = useNavigate();
  const [formsModalOpen, setFormsModalOpen] = useState(false);
  const [formsForAssetType, setFormsForAssetType] = useState<any[]>([]);
  const [selectedAssetType, setSelectedAssetType] = useState<AssetTypeWithCount | null>(null);
  const [allForms, setAllForms] = useState<any[]>([]);
  const [assetTypeForms, setAssetTypeForms] = useState<{ [assetTypeId: string]: any[] }>({});
  const [supabaseConnected, setSupabaseConnected] = useState<boolean | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("active");
  const [archivedAssetTypes, setArchivedAssetTypes] = useState<AssetTypeWithCount[]>([]);
  
  // Memoize the current organization ID to stabilize dependencies
  const currentOrgId = useMemo(() => currentOrganization?.id, [currentOrganization?.id]);
  
  // Fix the Supabase connection check function
  const checkSupabaseConnection = useCallback(async () => {
    if (supabaseConnected !== null) return supabaseConnected;
    
    try {
      console.log('Checking Supabase connection...');
      // Correct syntax for Supabase count query
      const { data, error } = await supabase
        .from('asset_types')
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.error('Supabase connection error:', error);
        toast({
          title: "Database Connection Error",
          description: "There was an issue connecting to the database. Please try again.",
          variant: "destructive"
        });
        setSupabaseConnected(false);
        return false;
      }
      
      console.log('Supabase connection successful');
      setSupabaseConnected(true);
      return true;
    } catch (err) {
      console.error('Failed to check Supabase connection:', err);
      toast({
        title: "Database Connection Error",
        description: "Could not verify database connection. Please refresh the page.",
        variant: "destructive"
      });
      setSupabaseConnected(false);
      return false;
    }
  }, [toast, supabaseConnected]);

  // Check connection once on mount
  useEffect(() => {
    checkSupabaseConnection();
  }, []);

  // Handle data fetching based on view type and organization
  useEffect(() => {
    if (supabaseConnected === false || !currentOrgId) return;
    fetchDataBasedOnViewMode();
  }, [currentOrgId, supabaseConnected, viewMode]);

  const fetchDataBasedOnViewMode = useCallback(async () => {
    if (!currentOrgId) {
      setAssetTypes([]);
      setArchivedAssetTypes([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      if (viewMode === "active") {
        const data = await getAssetTypesWithCounts(supabase, currentOrgId);
        setAssetTypes(data || []);
        setArchivedAssetTypes([]);
        console.log('Fetched active asset types successfully:', data?.length || 0);
      } else {
        const data = await getArchivedAssetTypesWithCounts(supabase, currentOrgId);
        setArchivedAssetTypes(data || []);
        setAssetTypes([]);
        console.log('Fetched archived asset types successfully:', data?.length || 0);
      }
    } catch (error) {
      console.error(`Failed to fetch ${viewMode} asset types:`, error);
      toast({
        title: "Error",
        description: `Failed to load ${viewMode} asset types: ` + (error instanceof Error ? error.message : "Unknown error"),
        variant: "destructive"
      });
      setAssetTypes([]);
      setArchivedAssetTypes([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentOrgId, toast, viewMode, supabase]);

  const displayList = useMemo(() => {
    return viewMode === "active" ? assetTypes : archivedAssetTypes;
  }, [viewMode, assetTypes, archivedAssetTypes]);

  // Apply filters and sorting to the currently displayed asset types
  const filteredAssetTypes = useMemo(() => {
    let filtered = [...displayList];
    
    if (viewMode === "active" && filterOptions.hasAssets) {
      filtered = filtered.filter(type => type.asset_count > 0);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(
        type => type.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
               (type.description && type.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    filtered.sort((a, b) => {
      if (sortField === "name") {
        return sortDirection === 'asc' 
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      } else if (sortField === "asset_count") {
        return sortDirection === 'asc'
          ? a.asset_count - b.asset_count
          : b.asset_count - a.asset_count;
      } else if (sortField === "created_at") {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      } else if (sortField === "deleted_at" && viewMode === "archived") {
        const dateA = a.deleted_at ? new Date(a.deleted_at).getTime() : 0;
        const dateB = b.deleted_at ? new Date(b.deleted_at).getTime() : 0;
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      }
      return 0;
    });
    
    return filtered;
  }, [displayList, filterOptions.hasAssets, searchTerm, sortField, sortDirection, viewMode]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleColorChange = (color: string) => {
    setFormData(prev => ({ ...prev, color }));
  };

  const handleBarcodeSettingsChange = (settings: {
    enabled: boolean;
    barcodeType: string;
    prefix: string;
  }) => {
    setBarcodeSettings({
      enabled: settings.enabled,
      type: settings.barcodeType,
      prefix: settings.prefix || "",
    });
  };

  const handleAddEdit = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Asset type name is required",
        variant: "destructive"
      });
      return;
    }

    if (!currentOrganization) {
      toast({
        title: "Error",
        description: "No organization selected",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingAssetType) {
        // Check for duplicate name when editing
        const nameExists = await checkAssetTypeNameExists(
          supabase,
          formData.name,
          currentOrganization.id,
          editingAssetType.id
        );
        
        if (nameExists) {
          toast({
            title: "Validation Error", 
            description: `An asset type named "${formData.name}" already exists in this organization.`,
            variant: "destructive"
          });
          setIsSubmitting(false);
          return;
        }
        
        // Update existing asset type
        await updateAssetType(supabase, editingAssetType.id, {
          ...formData,
          enable_barcodes: barcodeSettings.enabled,
          barcode_type: barcodeSettings.type,
          barcode_prefix: barcodeSettings.prefix
        });
        toast({
          title: "Asset Type Updated",
          description: `"${formData.name}" has been updated successfully.`
        });
      } else {
        // Create new asset type - validation is in the service
        const result = await createAssetType(supabase, {
          name: formData.name,
          description: formData.description,
          organization_id: currentOrganization.id,
          color: formData.color,
          enable_barcodes: barcodeSettings.enabled,
          barcode_type: barcodeSettings.type,
          barcode_prefix: barcodeSettings.prefix
        });

        // Create default forms for this asset type
        await createDefaultFormsForAssetType(supabase, result.id);
        
        toast({
          title: "Asset Type Created",
          description: `"${formData.name}" has been created successfully. Default forms have been generated.`
        });
      }
      
      resetForm();
      fetchDataBasedOnViewMode();
    } catch (error: any) {
      console.error("Error saving asset type:", error);
      
      // Provide user-friendly error messages
      let errorMessage = "Failed to save asset type";
      if (error.message?.includes("already exists")) {
        errorMessage = error.message;
      } else if (error.code === '23505') {
        errorMessage = `An asset type named "${formData.name}" already exists in this organization.`;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (assetType: AssetTypeWithCount) => {
    navigate(`/asset-types/edit/${assetType.id}`);
  };

  const handleSoftDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to archive asset type "${name}"? It can be restored later.`)) {
      try {
        await deleteAssetType(supabase, id);
        toast({
          title: "Asset Type Archived",
          description: `"${name}" has been archived successfully.`
        });
        fetchDataBasedOnViewMode();
      } catch (error) {
        console.error("Error archiving asset type:", error);
        toast({
          title: "Error",
          description: "Failed to archive asset type. " + (error instanceof Error ? error.message : String(error)),
          variant: "destructive"
        });
      }
    }
  };

  const handleRestore = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to restore asset type "${name}"?`)) {
      try {
        const success = await restoreAssetType(id);
        if (success) {
          toast({
            title: "Asset Type Restored",
            description: `"${name}" has been restored successfully.`
          });
          fetchDataBasedOnViewMode();
        } else {
          throw new Error("Restore operation returned false from service.");
        }
      } catch (error: any) {
        console.error("Error restoring asset type:", error);
        toast({
          title: "Error Restoring Asset Type",
          description: error.message || "Failed to restore asset type. There might be a name conflict with an active type.",
          variant: "destructive"
        });
      }
    }
  };

  const resetForm = () => {
    setFormData({ 
      name: "", 
      description: "",
      color: "#6E56CF"
    });
    setBarcodeSettings({
      enabled: false,
      type: "qr",
      prefix: ""
    });
    setEditingAssetType(null);
    setIsFormOpen(false);
  };

  const toggleSortDirection = () => {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const toggleHasAssetsFilter = () => {
    setFilterOptions(prev => ({
      ...prev,
      hasAssets: !prev.hasAssets
    }));
  };

  const openFormsModal = async (assetType: AssetTypeWithCount) => {
    setSelectedAssetType(assetType);
    setFormsModalOpen(true);
    if (currentOrganization?.id && assetType.id) {
      const forms = await getAssetTypeForms(assetType.id, currentOrganization.id);
      setFormsForAssetType(forms);
    }
  };

  useEffect(() => {
    if (!formsModalOpen && editingAssetType && currentOrganization?.id) {
      getAssetTypeForms(editingAssetType.id, currentOrganization.id).then(setFormsForAssetType);
    }
  }, [formsModalOpen, editingAssetType, currentOrganization]);

  useEffect(() => {
    if (isFormOpen && currentOrganization?.id) {
      (async () => {
        try {
          const forms = await getForms(currentOrganization.id);
          setAllForms(forms || []);
        } catch (e) {
          console.error("Error fetching all forms:", e);
          setAllForms([]);
        }
      })();
    }
  }, [isFormOpen, currentOrganization]);

  const suggestFormPurpose = (formName: string): string => {
    const name = formName.toLowerCase();
    
    if (name.includes('intake') || name.includes('add') || name.includes('new') || name.includes('create')) {
      return 'intake';
    }
    
    if (name.includes('inventory') || name.includes('check') || name.includes('list') || name.includes('manage')) {
      return 'inventory';
    }
    
    if (name.includes('adjust') || name.includes('update') || name.includes('modify') || name.includes('change')) {
      return 'adjustment';
    }
    
    if (name.includes('transfer') || name.includes('move') || name.includes('relocate') || name.includes('transport')) {
      return 'transfer';
    }
    
    return 'intake';
  };

  useEffect(() => {
    const loadFormsForAllAssetTypes = async () => {
      if (!currentOrganization?.id || assetTypes.length === 0) return;
      
      const formsMap: { [assetTypeId: string]: any[] } = {};
      
      assetTypes.forEach(assetType => {
        formsMap[assetType.id] = [];
      });
      
      await Promise.all(assetTypes.map(async (assetType) => {
        try {
          const forms = await getAssetTypeForms(assetType.id, currentOrganization.id);
          formsMap[assetType.id] = forms || [];
        } catch (e) {
          console.error(`Error fetching forms for asset type ${assetType.id}:`, e);
          formsMap[assetType.id] = [];
        }
      }));
      
      setAssetTypeForms(formsMap);
    };
    
    loadFormsForAllAssetTypes();
  }, [assetTypes, currentOrganization]);

  if (!currentOrganization) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>No Organization Selected</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center mb-4">
              Please select an organization to manage asset types.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Asset Types</h1>
          <p className="text-muted-foreground">Manage asset categories for inventory</p>
        </div>
        <Button onClick={() => { setEditingAssetType(null); setIsFormOpen(true); }} disabled={viewMode === 'archived'}>
            <Plus className="mr-2 h-4 w-4" />
            Add New Asset Type
        </Button>
      </div>

      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)} className="mb-4">
        <TabsList>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="relative w-full sm:w-64">
                <Input
                  placeholder="Search asset types..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
                <div className="absolute left-2.5 top-2.5">
                  <Search className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  console.log('Refresh clicked, current loading states:', { isLoading });
                  setIsLoading(false);
                  setTimeout(() => {
                    fetchDataBasedOnViewMode();
                  }, 50);
                }}
                disabled={isLoading}
              >
                <RefreshCw className="h-4 w-4" />
                <span className="sr-only">Refresh</span>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Filter Options</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={toggleHasAssetsFilter} className="flex items-center justify-between">
                    <span>Has Assets</span>
                    <Switch checked={filterOptions.hasAssets} />
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    {sortDirection === 'asc' ? <ArrowUp className="h-4 w-4 mr-2" /> : <ArrowDown className="h-4 w-4 mr-2" />}
                    Sort
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Sort Options</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => { setSortField("name"); toggleSortDirection(); }}
                    className={sortField === "name" ? "bg-accent" : ""}
                  >
                    Name {sortField === "name" && (sortDirection === 'asc' ? '(A-Z)' : '(Z-A)')}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => { setSortField("asset_count"); toggleSortDirection(); }}
                    className={sortField === "asset_count" ? "bg-accent" : ""}
                  >
                    Asset Count {sortField === "asset_count" && (sortDirection === 'asc' ? '(Low-High)' : '(High-Low)')}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => { setSortField("created_at"); toggleSortDirection(); }}
                    className={sortField === "created_at" ? "bg-accent" : ""}
                  >
                    Date Created {sortField === "created_at" && (sortDirection === 'asc' ? '(Old-New)' : '(New-Old)')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">{viewMode === 'active' ? 'Active Items' : 'Total Items (Historically)'}</TableHead>
                  {viewMode === 'archived' && <TableHead>Archived At</TableHead>}
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={viewMode === 'archived' ? 5 : 4} className="text-center py-6">
                      <div className="flex justify-center items-center">
                        <Loader2 className="h-6 w-6 mr-2" />
                        Loading asset types...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredAssetTypes.length > 0 ? (
                  filteredAssetTypes.map((assetType) => (
                    <TableRow key={assetType.id}>
                      <TableCell
                        className={viewMode === 'active' ? "cursor-pointer hover:bg-accent/30 transition" : ""}
                        onClick={() => viewMode === 'active' && navigate(`/asset-types/${assetType.id}`)}
                      >
                        <div className="flex items-center">
                          <div 
                            className="w-5 h-5 rounded-full mr-2"
                            style={{ backgroundColor: assetType.color || '#6E56CF', opacity: viewMode === 'archived' ? 0.5 : 1 }}
                          />
                          <span className="font-medium">{assetType.name}</span>
                          {viewMode === 'archived' && <Archive className="h-4 w-4 ml-2 text-muted-foreground" />}
                        </div>
                      </TableCell>
                      <TableCell
                        className={viewMode === 'active' ? "cursor-pointer hover:bg-accent/30 transition" : ""}
                        onClick={() => viewMode === 'active' && navigate(`/asset-types/${assetType.id}`)}
                      >
                        {assetType.description}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={assetType.asset_count > 0 ? "default" : "outline"}>
                          {assetType.asset_count}
                        </Badge>
                      </TableCell>
                      {viewMode === 'archived' && (
                        <TableCell>
                          {assetType.deleted_at ? new Date(assetType.deleted_at).toLocaleDateString() : 'N/A'}
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex space-x-1 justify-end" onClick={e => e.stopPropagation()}>
                          {viewMode === 'active' ? (
                            <>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={() => navigate(`/asset-types/${assetType.id}`)}><Package className="h-4 w-4" /></Button>
                                  </TooltipTrigger><TooltipContent>View Details</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={() => openFormsModal(assetType)}><FileStack className="h-4 w-4" /></Button>
                                  </TooltipTrigger><TooltipContent>Manage Forms</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(assetType)}><Edit className="h-4 w-4" /></Button>
                                  </TooltipTrigger><TooltipContent>Edit</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleSoftDelete(assetType.id, assetType.name)}><Trash2 className="h-4 w-4" /></Button>
                                  </TooltipTrigger><TooltipContent>Archive</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </>
                          ) : (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" onClick={() => handleRestore(assetType.id, assetType.name)}>
                                    <ArchiveRestore className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Restore Asset Type</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={viewMode === 'archived' ? 5 : 4} className="text-center py-6">
                      {isLoading ? 'Loading...' : (searchTerm ? `No matching ${viewMode} asset types found.` : `No ${viewMode} asset types found.`)}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>About Asset Types</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Asset types help you categorize and organize your inventory items. Each item in your inventory can be assigned an asset type, making it easier to filter, search, and generate reports based on categories.
            </p>
            <div className="mt-4 space-y-2">
              <p>
                <strong>Features:</strong>
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Color coding to visually identify asset types</li>
                <li>Custom icons to match your asset categories</li>
                <li>Asset count tracking for reporting</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
        if (!isOpen) resetForm();
        else {
          if (!editingAssetType) {
            setFormData({ name: "", description: "", color: "#6E56CF" });
            setBarcodeSettings({ enabled: false, type: "qr", prefix: "" });
          }
        }
        setIsFormOpen(isOpen);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAssetType ? "Edit Asset Type" : "Add New Asset Type"}</DialogTitle>
            <DialogDescription>
              {editingAssetType ? "Edit the details of your asset type." : "Create a new asset type to categorize your inventory."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 pb-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., Laptops, Chairs, Tools"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Briefly describe this asset type"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="color"
                  type="color"
                  name="color"
                  value={formData.color}
                  onChange={handleInputChange}
                  className="w-12 h-8 p-1"
                />
                <div className="flex flex-wrap gap-1">
                  {colorOptions.map((color) => (
                    <Button
                      key={color}
                      variant="outline"
                      size="icon"
                      className="w-6 h-6 rounded-full"
                      style={{ backgroundColor: color }}
                      onClick={() => handleColorChange(color)}
                    />
                  ))}
                </div>
              </div>
            </div>
            <BarcodeToggle
              enabled={barcodeSettings.enabled}
              barcodeType={barcodeSettings.type}
              prefix={barcodeSettings.prefix}
              onChange={handleBarcodeSettingsChange}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Cancel</Button>
            <Button onClick={handleAddEdit} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editingAssetType ? "Save Changes" : "Create Asset Type"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AssetTypes;

