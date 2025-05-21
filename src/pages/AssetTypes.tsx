import { useState, useEffect, useMemo, useCallback } from "react";
import { Plus, Edit, Trash2, Loader2, ArrowUp, ArrowDown, Filter, Copy, RefreshCw, Search, FileText, ListCheck, Package, FileStack } from "lucide-react";
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
  MothershipAssetType,
  getAssetTypesWithCounts, 
  getMothershipAssetTypes,
  createAssetType, 
  updateAssetType, 
  deleteAssetType,
  cloneAssetType,
  createDefaultFormsForAssetType,
  removeAssetTypeFormLink,
  addAssetTypeFormLink,
  getAssetTypeForms
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

type SortField = "name" | "asset_count" | "created_at";

const AssetTypes = () => {
  const { toast } = useToast();
  const { currentOrganization, organizations } = useOrganization();
  const { user } = useAuth();
  const [assetTypes, setAssetTypes] = useState<AssetTypeWithCount[]>([]);
  const [mothershipTypes, setMothershipTypes] = useState<MothershipAssetType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMothershpLoading, setIsMothershipLoading] = useState(true);
  const [activeView, setActiveView] = useState<"normal" | "mothership">("normal");
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isCloneDialogOpen, setIsCloneDialogOpen] = useState(false);
  const [editingAssetType, setEditingAssetType] = useState<AssetTypeWithCount | null>(null);
  const [cloningAssetType, setCloningAssetType] = useState<MothershipAssetType | null>(null);
  const [targetOrgId, setTargetOrgId] = useState<string>("");
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
    // Only fetch if we have an organization and know Supabase is connected
    if (supabaseConnected === false) return;
    
    if (activeView === "normal") {
      fetchAssetTypes();
    } else {
      fetchMothershipAssetTypes();
    }
  }, [currentOrgId, activeView, supabaseConnected]);

  const fetchAssetTypes = useCallback(async () => {
    if (!currentOrgId) {
      setAssetTypes([]);
      setIsLoading(false);
      return;
    }

    console.log('Setting isLoading to true');
    setIsLoading(true);
    try {
      const data = await getAssetTypesWithCounts(supabase, currentOrgId);
      setAssetTypes(data);
      console.log('Fetched asset types successfully:', data?.length || 0);
    } catch (error) {
      console.error("Failed to fetch asset types:", error);
      toast({
        title: "Error",
        description: "Failed to load asset types: " + (error instanceof Error ? error.message : "Unknown error"),
        variant: "destructive"
      });
    } finally {
      console.log('Setting isLoading to false');
      setIsLoading(false);
    }
  }, [currentOrgId, toast]);

  const fetchMothershipAssetTypes = useCallback(async () => {
    if (!user?.id) {
      setMothershipTypes([]);
      setIsMothershipLoading(false);
      return;
    }
    
    setIsMothershipLoading(true);
    try {
      const data = await getMothershipAssetTypes(supabase, user.id);
      setMothershipTypes(data);
    } catch (error) {
      console.error("Failed to fetch mothership asset types:", error);
      toast({
        title: "Error",
        description: "Failed to load mothership asset types: " + (error instanceof Error ? error.message : "You may not have sufficient permissions."),
        variant: "destructive"
      });
    } finally {
      setIsMothershipLoading(false);
    }
  }, [user?.id, toast]);
  
  // Apply filters and sorting to asset types
  const filteredAssetTypes = useMemo(() => {
    let filtered = [...assetTypes];
    
    // Apply filters
    if (filterOptions.hasAssets) {
      filtered = filtered.filter(type => type.asset_count > 0);
    }
    
    // Apply search term
    if (searchTerm) {
      filtered = filtered.filter(
        type => type.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
               (type.description && type.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    // Apply sorting
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
        return sortDirection === 'asc'
          ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return 0;
    });
    
    return filtered;
  }, [assetTypes, filterOptions.hasAssets, searchTerm, sortField, sortDirection]);

  // Apply filters and sorting to mothership asset types
  const filteredMothershipTypes = useMemo(() => {
    let filtered = [...mothershipTypes];
    
    // Apply search term
    if (searchTerm) {
      filtered = filtered.filter(
        type => type.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
               (type.description && type.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
               type.organization_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply sorting - mothership view always sorts by organization first
    filtered.sort((a, b) => {
      // First sort by organization name
      const orgCompare = a.organization_name.localeCompare(b.organization_name);
      if (orgCompare !== 0) return orgCompare;
      
      // Then by the selected field
      if (sortField === "name") {
        return sortDirection === 'asc' 
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      } else if (sortField === "asset_count") {
        return sortDirection === 'asc'
          ? a.asset_count - b.asset_count
          : b.asset_count - a.asset_count;
      } else if (sortField === "created_at") {
        return sortDirection === 'asc'
          ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return 0;
    });
    
    return filtered;
  }, [mothershipTypes, searchTerm, sortField, sortDirection]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleColorChange = (color: string) => {
    setFormData(prev => ({ ...prev, color }));
  };

  const handleBarcodeSettingsChange = (settings: {
    enabled: boolean;
    type: string;
    prefix?: string;
  }) => {
    setBarcodeSettings({
      enabled: settings.enabled,
      type: settings.type,
      prefix: settings.prefix || "",
    });
  };

  const handleAddEdit = async () => {
    if (!currentOrganization?.id) {
      toast({
        title: "Error",
        description: "No organization selected",
        variant: "destructive"
      });
      return;
    }

    if (formData.name.trim() === "") {
      toast({
        title: "Error",
        description: "Asset type name is required",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      if (editingAssetType) {
        // Update existing asset type
        const result = await updateAssetType(supabase, editingAssetType.id, {
          name: formData.name,
          description: formData.description,
          color: formData.color,
          enable_barcodes: barcodeSettings.enabled,
          barcode_type: barcodeSettings.type,
          barcode_prefix: barcodeSettings.prefix,
          updated_at: new Date().toISOString()
        });
        
        if (result) {
          toast({
            title: "Asset Type Updated",
            description: `${formData.name} has been updated successfully.`
          });
          // Refresh data
          fetchAssetTypes();
        }
      } else {
        // Add new asset type
        const result = await createAssetType(supabase, {
          name: formData.name,
          description: formData.description,
          organization_id: currentOrganization.id,
          color: formData.color,
          enable_barcodes: barcodeSettings.enabled,
          barcode_type: barcodeSettings.type,
          barcode_prefix: barcodeSettings.prefix
        });
        
        if (result) {
          // Create default forms for this asset type
          try {
            await createDefaultFormsForAssetType(supabase, result.id);
            toast({
              title: "Asset Type Added",
              description: `${formData.name} has been added with default forms.`
            });
          } catch (formError) {
            console.error("Error creating default forms:", formError);
            toast({
              title: "Asset Type Added",
              description: `${formData.name} has been added, but default forms could not be created.`,
              variant: "default"
            });
          }
          
          // Refresh data
          fetchAssetTypes();
        }
      }
      
      // Reset form and close dialog
      resetForm();
    } catch (error) {
      console.error("Error saving asset type:", error);
      toast({
        title: "Error",
        description: "Failed to save asset type",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloneAssetType = async () => {
    if (!cloningAssetType || !targetOrgId || !user?.id) {
      toast({
        title: "Error",
        description: "Please select a target organization",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      const newTypeId = await cloneAssetType(supabase, cloningAssetType.id, targetOrgId, user.id);
      
      if (newTypeId) {
        toast({
          title: "Asset Type Cloned",
          description: `${cloningAssetType.name} has been cloned to the selected organization.`
        });
        // Refresh mothership data
        fetchMothershipAssetTypes();
      } else {
        throw new Error("Failed to clone asset type");
      }
      
      // Reset form and close dialog
      setIsCloneDialogOpen(false);
      setCloningAssetType(null);
      setTargetOrgId("");
    } catch (error: any) {
      console.error("Error cloning asset type:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to clone asset type"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleEdit = (assetType: AssetTypeWithCount) => {
    setEditingAssetType(assetType);
    setFormData({
      name: assetType.name,
      description: assetType.description || "",
      color: assetType.color || "#6E56CF"
    });
    // Set barcode settings if they exist
    setBarcodeSettings({
      enabled: assetType.enable_barcodes || false,
      type: assetType.barcode_type || "qr",
      prefix: assetType.barcode_prefix || "",
    });
    setIsFormOpen(true);
  };

  const handleClone = (assetType: MothershipAssetType) => {
    setCloningAssetType(assetType);
    setTargetOrgId("");
    setIsCloneDialogOpen(true);
  };
  
  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      try {
        await deleteAssetType(supabase, id);
        
        toast({
          title: "Asset Type Deleted",
          description: `${name} has been deleted successfully.`
        });
        
        if (activeView === "normal") {
          fetchAssetTypes();
        } else {
          fetchMothershipAssetTypes();
        }
      } catch (error) {
        console.error("Error deleting asset type:", error);
        toast({
          title: "Error",
          description: "Failed to delete asset type",
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
      // Refresh mapped forms for the asset type being edited
      getAssetTypeForms(editingAssetType.id, currentOrganization.id).then(setFormsForAssetType);
    }
  }, [formsModalOpen, editingAssetType, currentOrganization]);

  // Fetch all forms for the organization when dialog opens
  useEffect(() => {
    if (isFormOpen && currentOrganization?.id) {
      (async () => {
        try {
          // Get ALL forms from the organization, not just those linked to this asset type
          const forms = await getForms(currentOrganization.id);
          setAllForms(forms || []);
        } catch (e) {
          console.error("Error fetching all forms:", e);
          setAllForms([]);
        }
      })();
    }
  }, [isFormOpen, currentOrganization]);

  // Function to suggest the most appropriate purpose for a form based on its name
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
    
    // Default to intake if no match
    return 'intake';
  };

  // Add this new useEffect after the existing useEffects
  useEffect(() => {
    const loadFormsForAllAssetTypes = async () => {
      if (!currentOrganization?.id || assetTypes.length === 0) return;
      
      const formsMap: { [assetTypeId: string]: any[] } = {};
      
      // Load forms for each asset type in parallel
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

  if (!currentOrganization && activeView === "normal") {
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
      </div>

      <Card>
        <CardContent className="p-4">
          <Tabs value={activeView} onValueChange={(value) => setActiveView(value as "normal" | "mothership")}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                {/* View toggle */}
                <TabsList>
                  <TabsTrigger value="normal">Organization View</TabsTrigger>
                  <TabsTrigger value="mothership">Mothership View</TabsTrigger>
                </TabsList>
                
                {/* "Add Asset Type" button - only shown in normal view */}
                {activeView === "normal" && (
                  <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={() => {
                        resetForm();
                        setIsFormOpen(true);
                      }}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Asset Type
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>
                          {editingAssetType ? "Edit Asset Type" : "Add New Asset Type"}
                        </DialogTitle>
                        <DialogDescription>
                          {editingAssetType 
                            ? "Update the details of this asset type." 
                            : "Create a new asset type to categorize inventory items."}
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto">
                        <div className="space-y-2">
                          <Label htmlFor="name">Asset Type Name*</Label>
                          <Input
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            placeholder="Enter asset type name"
                            required
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            id="description"
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                            placeholder="Enter a description for this asset type"
                            rows={3}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Color</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button 
                                variant="outline" 
                                className="w-full flex justify-between items-center"
                              >
                                <div className="flex items-center">
                                  <div 
                                    className="w-4 h-4 rounded-full mr-2" 
                                    style={{ backgroundColor: formData.color }}
                                  />
                                  <span>Select Color</span>
                                </div>
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64">
                              <div className="grid grid-cols-5 gap-2">
                                {colorOptions.map(color => (
                                  <button
                                    key={color}
                                    className={`w-8 h-8 rounded-full ${formData.color === color ? 'ring-2 ring-offset-2 ring-primary' : ''}`}
                                    style={{ backgroundColor: color }}
                                    onClick={() => handleColorChange(color)}
                                    type="button"
                                  />
                                ))}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                        
                        {/* Barcode Settings */}
                        <Separator className="my-4" />
                        <h3 className="text-lg font-medium">Barcode Settings</h3>
                        <BarcodeToggle
                          enabled={barcodeSettings.enabled}
                          type={barcodeSettings.type}
                          prefix={barcodeSettings.prefix}
                          onBarcodeSettingsChange={handleBarcodeSettingsChange}
                        />

                        <Separator className="my-4" />
                        <h3 className="text-lg font-medium mb-2">Mapped Forms</h3>
                        {editingAssetType && (
                          <div className="space-y-2">
                            {["intake", "inventory", "adjustment", "transfer"].map((purpose) => {
                              const linkedForm = formsForAssetType.find(f => f.purpose === purpose);
                              return (
                                <div key={purpose} className="flex flex-row items-center gap-2 py-1 border-b last:border-b-0">
                                  <div className="w-32 font-medium capitalize">{purpose} Form</div>
                                  <div className="flex-1">
                                    {linkedForm ? (
                                      <span className="font-semibold text-primary">{linkedForm.name}</span>
                                    ) : (
                                      <span className="text-muted-foreground italic">No form linked</span>
                                    )}
                                  </div>
                                  <div className="flex flex-row gap-2">
                                    {linkedForm ? (
                                      <>
                                        <Button size="sm" variant="outline" onClick={() => navigate(`/forms/${linkedForm.id}`)}>View/Edit</Button>
                                        <Button size="sm" variant="outline" onClick={async () => {
                                          await removeAssetTypeFormLink(editingAssetType.id, linkedForm.id, purpose, editingAssetType.organization_id);
                                          await openFormsModal(editingAssetType);
                                        }}>Unlink</Button>
                                      </>
                                    ) : (
                                      <>
                                        <Button size="sm" variant="default" onClick={() => navigate(`/forms/new?assetType=${editingAssetType.id}&purpose=${purpose}`)}>
                                          + Create {purpose.charAt(0).toUpperCase() + purpose.slice(1)} Form
                                        </Button>
                                        <Select onValueChange={async (formId) => {
                                          const form = allForms.find(f => f.id === formId);
                                          // Automatically set the purpose based on the form name if it's not already set
                                          const suggestedPurpose = form ? suggestFormPurpose(form.name) : purpose;
                                          await addAssetTypeFormLink(editingAssetType.id, formId, suggestedPurpose, editingAssetType.organization_id);
                                          await openFormsModal(editingAssetType);
                                        }}>
                                          <SelectTrigger className="w-48">
                                            <SelectValue placeholder="Link Existing Form" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {allForms.map(f => {
                                              const linked = formsForAssetType.find(lf => lf.id === f.id);
                                              const isLinkedElsewhere = linked && linked.purpose !== purpose;
                                              return (
                                                <SelectItem key={f.id} value={f.id} disabled={isLinkedElsewhere}>
                                                  <span className="flex items-center gap-2">
                                                    {f.name}
                                                    {linked && (
                                                      <span className="text-green-600 ml-2">✔</span>
                                                    )}
                                                  </span>
                                                </SelectItem>
                                              );
                                            })}
                                          </SelectContent>
                                        </Select>
                                      </>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      
                      <DialogFooter>
                        <Button variant="outline" onClick={resetForm} disabled={isSubmitting}>Cancel</Button>
                        <Button onClick={handleAddEdit} disabled={isSubmitting}>
                          {isSubmitting ? (
                            <span>Processing...</span>
                          ) : (
                            editingAssetType ? "Save Changes" : "Add Asset Type"
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}

                {/* Search box */}
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
                {/* Refresh button */}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    console.log('Refresh clicked, current loading states:', { isLoading, isMothershpLoading });
                    // Force loading states to false before starting a new fetch
                    setIsLoading(false);
                    setIsMothershipLoading(false);
                    // Short timeout to ensure states are updated before starting new fetch
                    setTimeout(() => {
                      activeView === "normal" ? fetchAssetTypes() : fetchMothershipAssetTypes();
                    }, 50);
                  }}
                  disabled={isLoading || isMothershpLoading}
                >
                  {/* Replace conditional animation with static icon */}
                  <RefreshCw className="h-4 w-4" />
                  <span className="sr-only">Refresh</span>
                </Button>

                {/* Filter dropdown */}
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

                {/* Sort dropdown */}
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
            
            {/* Organization View TabsContent */}
            <TabsContent value="normal" className="mt-0 p-0">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Items</TableHead>
                      <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-6">
                          <div className="flex justify-center items-center">
                            {/* Replace spinning loader with static text */}
                            <Loader2 className="h-6 w-6 mr-2" />
                            Loading asset types...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredAssetTypes.length > 0 ? (
                      filteredAssetTypes.map((assetType) => (
                        <TableRow key={assetType.id}>
                          <TableCell
                            className="cursor-pointer hover:bg-accent/30 transition"
                            onClick={() => handleEdit(assetType)}
                          >
                            <div className="flex items-center">
                              <div 
                                className="w-5 h-5 rounded-full mr-2"
                                style={{ backgroundColor: assetType.color || '#6E56CF' }}
                              />
                              <span className="font-medium">{assetType.name}</span>
                            </div>
                          </TableCell>
                          <TableCell
                            className="cursor-pointer hover:bg-accent/30 transition"
                            onClick={() => handleEdit(assetType)}
                          >
                            {assetType.description}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant={assetType.asset_count > 0 ? "default" : "outline"}>
                              {assetType.asset_count}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-1 justify-end" onClick={e => e.stopPropagation()}>
                              <TooltipProvider>
                                {/* View Details */}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      aria-label="View Asset Type Details"
                                      title="View Asset Type Details"
                                      onClick={() => navigate(`/asset-types/${assetType.id}`)}
                                    >
                                      <Package className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>View Asset Type Details</TooltipContent>
                                </Tooltip>
                                {/* Forms Button with Count */}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      aria-label="View All Forms"
                                      title="View All Forms"
                                      onClick={() => openFormsModal(assetType)}
                                    >
                                      <FileStack className="h-4 w-4" />
                                      {/* Show badge with count if available */}
                                      {((formsModalOpen && selectedAssetType?.id === assetType.id && formsForAssetType.length > 0) || 
                                        // Use a fallback value of 0 since form_count is not on the type
                                        (assetType.intake_form_id ? 1 : 0) + (assetType.inventory_form_id ? 1 : 0) > 0) && (
                                        <span className="ml-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-blue-500 rounded-full">
                                          {formsModalOpen && selectedAssetType?.id === assetType.id 
                                            ? formsForAssetType.length 
                                            : (assetType.intake_form_id ? 1 : 0) + (assetType.inventory_form_id ? 1 : 0)}
                                        </span>
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>View All Forms for this Asset Type</TooltipContent>
                                </Tooltip>
                                {/* Forms Dialog - Now separate from the tooltip */}
                                <Dialog open={formsModalOpen && selectedAssetType?.id === assetType.id} onOpenChange={setFormsModalOpen}>
                                  <DialogContent className="max-w-lg">
                                    <DialogHeader>
                                      <DialogTitle>Forms for {selectedAssetType?.name}</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-2">
                                      {formsForAssetType.length === 0 ? (
                                        <div className="text-muted-foreground text-sm">No forms linked to this asset type yet.</div>
                                      ) : (
                                        formsForAssetType.map(form => (
                                          <div key={form.id} className="flex items-center justify-between border rounded p-2">
                                            <div>
                                              <div className="font-medium">{form.name}</div>
                                              <div className="text-xs text-muted-foreground">{form.purpose || form.type || 'Custom'}</div>
                                            </div>
                                            <Button size="sm" variant="outline" onClick={() => navigate(`/forms/${form.id}`)}>View/Edit</Button>
                                          </div>
                                        ))
                                      )}
                                    </div>
                                    <DialogFooter>
                                      <Button onClick={() => navigate('/forms/new')}>+ Create New Form</Button>
                                    </DialogFooter>
                                  </DialogContent>
                                </Dialog>
                                {/* Intake Form */}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      aria-label="Intake Form"
                                      title="Intake Form"
                                      className={assetTypeForms[assetType.id]?.some(f => f.purpose === 'intake') ? "text-primary" : "text-muted-foreground"}
                                      onClick={() => {
                                        const intakeForm = assetTypeForms[assetType.id]?.find(f => f.purpose === 'intake');
                                        if (intakeForm) {
                                          navigate(`/forms/${intakeForm.id}`);
                                        } else {
                                          openFormsModal(assetType);
                                        }
                                      }}
                                    >
                                      <FileText className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {assetTypeForms[assetType.id]?.some(f => f.purpose === 'intake')
                                      ? "View Intake Form"
                                      : "No Intake Form linked. Click to add or link one."}
                                  </TooltipContent>
                                </Tooltip>
                                {/* Inventory Form */}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      aria-label="Inventory Form"
                                      title="Inventory Form"
                                      className={assetTypeForms[assetType.id]?.some(f => f.purpose === 'inventory') ? "text-primary" : "text-muted-foreground"}
                                      onClick={() => {
                                        const inventoryForm = assetTypeForms[assetType.id]?.find(f => f.purpose === 'inventory');
                                        if (inventoryForm) {
                                          navigate(`/forms/${inventoryForm.id}`);
                                        } else {
                                          openFormsModal(assetType);
                                        }
                                      }}
                                    >
                                      <ListCheck className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {assetTypeForms[assetType.id]?.some(f => f.purpose === 'inventory')
                                      ? "View Inventory Form"
                                      : "No Inventory Form linked. Click to add or link one."}
                                  </TooltipContent>
                                </Tooltip>
                                {/* Edit */}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      aria-label="Edit Asset Type"
                                      title="Edit Asset Type"
                                      onClick={() => handleEdit(assetType)}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Edit Asset Type</TooltipContent>
                                </Tooltip>
                                {/* Delete */}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-destructive"
                                      aria-label="Delete Asset Type"
                                      title="Delete Asset Type"
                                      onClick={() => handleDelete(assetType.id, assetType.name)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Delete Asset Type</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-6">
                          {searchTerm ? "No matching asset types found." : "No asset types have been created yet."}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Mothership View TabsContent */}
            <TabsContent value="mothership" className="mt-0 p-0">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organization</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Items</TableHead>
                      <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isMothershpLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6">
                          <div className="flex justify-center items-center">
                            {/* Replace spinning loader with static text */}
                            <Loader2 className="h-6 w-6 mr-2" />
                            Loading mothership asset types...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredMothershipTypes.length > 0 ? (
                      filteredMothershipTypes.map((assetType) => (
                        <TableRow key={assetType.id}>
                          <TableCell>
                            <Badge variant="outline">{assetType.organization_name}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <div 
                                className="w-5 h-5 rounded-full mr-2"
                                style={{ backgroundColor: assetType.color || '#6E56CF' }}
                              />
                              <span className="font-medium">{assetType.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>{assetType.description}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={assetType.asset_count > 0 ? "default" : "outline"}>
                              {assetType.asset_count}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-1 justify-end">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleClone(assetType)}
                                title="Clone to another organization"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive"
                                onClick={() => handleDelete(assetType.id, assetType.name)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6">
                          {searchTerm ? "No matching asset types found." : "No asset types available in mothership view."}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Clone Dialog */}
            <Dialog open={isCloneDialogOpen} onOpenChange={setIsCloneDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Clone Asset Type</DialogTitle>
                  <DialogDescription>
                    Clone "{cloningAssetType?.name}" to another organization
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="target-org">Target Organization</Label>
                    <Select value={targetOrgId} onValueChange={setTargetOrgId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select organization" />
                      </SelectTrigger>
                      <SelectContent>
                        {organizations.map(org => (
                          <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsCloneDialogOpen(false);
                      setCloningAssetType(null);
                    }} 
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCloneAssetType} 
                    disabled={isSubmitting || !targetOrgId}
                  >
                    {isSubmitting ? (
                      <span>Processing...</span>
                    ) : (
                      "Clone Asset Type"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </Tabs>
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
                <li>Mothership view for administrators to manage across organizations</li>
                <li>Clone asset types between organizations</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AssetTypes;

