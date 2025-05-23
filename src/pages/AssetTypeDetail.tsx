import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, Edit, FileText, ListCheck, Plus, Settings, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

import { useOrganization } from "@/hooks/useOrganization";
import { 
  AssetType, 
  getAssetType, 
  getRecommendedFormsForAssetType,
  updateAssetType,
  getAssetTypeForms,
  addAssetTypeFormLink,
  removeAssetTypeFormLink
} from "@/services/assetTypeService";
import { Form, getForms, getFormById } from "@/services/formService";
import { supabase } from "@/integrations/supabase/client";
import { BarcodeToggle } from "@/components/inventory/BarcodeToggle";
import { AssetCalculationManager } from "@/components/inventory/AssetCalculationManager";
import ConversionFieldBuilder, { ConversionField } from "@/components/forms/ConversionFieldBuilder";

// Extend Window interface for timeout
declare global {
  interface Window {
    conversionFieldsTimeout?: NodeJS.Timeout;
  }
}

export default function AssetTypeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();
  
  const [assetType, setAssetType] = useState<AssetType | null>(null);
  const [intakeForm, setIntakeForm] = useState<Form | null>(null);
  const [inventoryForm, setInventoryForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFormsLoading, setIsFormsLoading] = useState(true);
  const [availableForms, setAvailableForms] = useState<Form[]>([]);
  const [recommendedForms, setRecommendedForms] = useState<any[]>([]);
  const [selectedTab, setSelectedTab] = useState("details");
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [formDialogType, setFormDialogType] = useState<"intake" | "inventory">("intake");
  const [selectedFormId, setSelectedFormId] = useState("");
  const [inventoryCount, setInventoryCount] = useState(0);
  const [barcodeSettings, setBarcodeSettings] = useState({
    enabled: false,
    type: 'qr',
    prefix: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [assetTypeForms, setAssetTypeForms] = useState<any[]>([]);
  const [newFormPurpose, setNewFormPurpose] = useState<string>('adjustment');
  const [newFormId, setNewFormId] = useState<string>('');
  const [isLinkingForm, setIsLinkingForm] = useState(false);

  // Memoize formIds and initialFormulas to prevent unnecessary re-renders of child components
  const memoizedFormIds = useMemo(() => ({
    intakeFormId: assetType?.intake_form_id,
    inventoryFormId: assetType?.inventory_form_id,
  }), [assetType?.intake_form_id, assetType?.inventory_form_id]);

  const memoizedCalculationFormulas = useMemo(() => {
    const formulas = assetType?.calculation_formulas;
    if (typeof formulas === 'object' && formulas !== null && !Array.isArray(formulas)) {
      return formulas as Record<string, any>; // Assert if it's an object
    }
    return {}; // Default to empty object if not a suitable object
  }, [assetType?.calculation_formulas]);

  // Helper function to load all data based on the current asset type 
  const loadAllData = async (assetTypeData: AssetType) => {
    if (!assetTypeData || !currentOrganization?.id) return;
    
    setIsFormsLoading(true);
    try {
      // Load all related data in parallel
      const [formsList, recommended, linked, inventoryItems] = await Promise.all([
        getForms(currentOrganization.id),
        getRecommendedFormsForAssetType(supabase, assetTypeData.id),
        getAssetTypeForms(assetTypeData.id, currentOrganization.id),
        supabase.from('inventory_items')
          .select('id', { count: 'exact', head: true })
          .eq('asset_type_id', assetTypeData.id)
      ]);
      
      // Extract intake and inventory forms from the linked forms
      const intakeFormLink = linked?.find(link => link.purpose === 'intake');
      const inventoryFormLink = linked?.find(link => link.purpose === 'inventory');
      
      // Load the actual form objects if they exist
      const [intake, inventory] = await Promise.all([
        intakeFormLink?.form_id ? getFormById(intakeFormLink.form_id) : Promise.resolve(null),
        inventoryFormLink?.form_id ? getFormById(inventoryFormLink.form_id) : Promise.resolve(null),
      ]);
      
      // Update all state at once to minimize renders
      setAvailableForms(formsList || []);
      setIntakeForm(intake);
      setInventoryForm(inventory);
      setRecommendedForms(recommended || []);
      setAssetTypeForms(linked || []);
      setInventoryCount(inventoryItems.count || 0);
      
      // Update barcode settings
      setBarcodeSettings({
        enabled: assetTypeData.enable_barcodes || false,
        type: assetTypeData.barcode_type || 'qr',
        prefix: assetTypeData.barcode_prefix || '',
      });

      // Handle calculation_formulas for any components expecting a Record<string, any>
      const calculationFormulasForMappings = typeof assetTypeData.calculation_formulas === 'object' && 
                                           assetTypeData.calculation_formulas !== null && 
                                           !Array.isArray(assetTypeData.calculation_formulas)
        ? assetTypeData.calculation_formulas as Record<string, any>
        : {};
    } catch (error) {
      console.error('Error loading related data:', error);
      toast({
        title: 'Error',
        description: 'Failed to refresh data',
        variant: 'destructive',
      });
    } finally {
      setIsFormsLoading(false);
    }
  };

  useEffect(() => {
    let canceled = false;
    async function init() {
      if (!id || !currentOrganization) {
        setAssetType(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const data = await getAssetType(supabase, id);
        if (!canceled) {
          if (data) {
            setAssetType(data);
            setIsFormsLoading(true);
            const [formsList, recommended, linked] = await Promise.all([
              getForms(currentOrganization.id),
              getRecommendedFormsForAssetType(supabase, data.id),
              getAssetTypeForms(data.id, currentOrganization.id),
            ]);
            
            // Extract intake and inventory forms from the linked forms
            const intakeFormLink = linked?.find(link => link.purpose === 'intake');
            const inventoryFormLink = linked?.find(link => link.purpose === 'inventory');
            
            // Load the actual form objects if they exist
            const [intake, inventory] = await Promise.all([
              intakeFormLink?.form_id ? getFormById(intakeFormLink.form_id) : Promise.resolve(null),
              inventoryFormLink?.form_id ? getFormById(inventoryFormLink.form_id) : Promise.resolve(null),
            ]);
            
            setAvailableForms(formsList || []);
            setIntakeForm(intake);
            setInventoryForm(inventory);
            setRecommendedForms(recommended || []);
            setAssetTypeForms(linked || []);
            const { count } = await supabase.from('inventory_items').select('id', { count: 'exact', head: true }).eq('asset_type_id', data.id);
            setInventoryCount(count || 0);
            setBarcodeSettings({
              enabled: data.enable_barcodes || false,
              type: data.barcode_type || 'qr',
              prefix: data.barcode_prefix || '',
            });
            setIsFormsLoading(false);
          } else {
            setAssetType(null);
            toast({ title: 'Error', description: 'Asset type not found', variant: 'destructive' });
          }
        }
      } catch (error) {
        if (!canceled) {
          console.error('Error loading asset type or related data:', error);
          toast({ title: 'Error', description: 'Failed to load asset type', variant: 'destructive' });
          setAssetType(null);
        }
      } finally {
        if (!canceled) setLoading(false);
      }
    }
    init();
    return () => { canceled = true; };
  }, [id, currentOrganization]);

  const openFormDialog = (type: "intake" | "inventory") => {
    setFormDialogType(type);
    setSelectedFormId("");
    setIsFormDialogOpen(true);
  };

  const handleSelectForm = async () => {
    if (!assetType?.id || !selectedFormId || !assetType.organization_id) return;
    
    try {
      // For intake and inventory forms, use the existing link system
      const result = await addAssetTypeFormLink(
        assetType.id,
        selectedFormId,
        formDialogType,
        assetType.organization_id
      );
      if (result) {
        toast({
          title: "Form Linked",
          description: `The ${formDialogType} form has been linked to this asset type`,
        });
      }
      
      // Refresh the asset type data completely
      const updatedAssetType = await getAssetType(supabase, assetType.id);
      if (updatedAssetType) {
        setAssetType(updatedAssetType);
        await loadAllData(updatedAssetType);
      }
      
      setIsFormDialogOpen(false);
    } catch (error) {
      console.error("Error linking form:", error);
      toast({
        title: "Error",
        description: "Failed to link form",
        variant: "destructive",
      });
    }
  };

  const handleBarcodeSettingsChange = (settings: {
    enabled: boolean;
    type: string;
    prefix?: string;
  }) => {
    setBarcodeSettings({
      enabled: settings.enabled,
      type: settings.type,
      prefix: settings.prefix || '',
    });
    
    if (assetType) {
      setIsSaving(true);
      updateAssetType(supabase, assetType.id, {
        enable_barcodes: settings.enabled,
        barcode_type: settings.type,
        barcode_prefix: settings.prefix,
      })
        .then(() => {
          toast({
            title: "Settings Saved",
            description: "Barcode settings have been updated",
          });
        })
        .catch((error) => {
          toast({
            title: "Error",
            description: "Failed to save barcode settings",
            variant: "destructive",
          });
          console.error("Error saving barcode settings:", error);
        })
        .finally(() => {
          setIsSaving(false);
        });
    }
  };

  const handleSaveBarcodeSettings = async () => {
    if (!assetType?.id) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('asset_types')
        .update({
          enable_barcodes: barcodeSettings.enabled,
          barcode_type: barcodeSettings.type,
          barcode_prefix: barcodeSettings.prefix,
          updated_at: new Date().toISOString()
        })
        .eq('id', assetType.id);
        
      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Barcode settings saved successfully'
      });
      
      setAssetType(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          enable_barcodes: barcodeSettings.enabled,
          barcode_type: barcodeSettings.type,
          barcode_prefix: barcodeSettings.prefix
        };
      });
    } catch (error) {
      console.error('Error saving barcode settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save barcode settings',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUnlinkForm = async (formType: "intake" | "inventory") => {
    if (!assetType?.id || !assetType.organization_id) return;
    
    try {
      // Get the form ID from the actual form objects instead of asset type properties
      let formId: string | null = null;
      
      if (formType === "intake" && intakeForm) {
        formId = intakeForm.id;
      } else if (formType === "inventory" && inventoryForm) {
        formId = inventoryForm.id;
      }
      
      if (!formId) {
        toast({
          title: "Error",
          description: `No ${formType} form is currently linked`,
          variant: "destructive",
        });
        return;
      }
      
      await removeAssetTypeFormLink(assetType.id, formId, formType, assetType.organization_id);
      toast({
        title: "Form Unlinked",
        description: `The ${formType} form has been unlinked from this asset type`,
      });
      
      // Update local state immediately for better UX
      if (formType === "intake") {
        setIntakeForm(null);
      } else {
        setInventoryForm(null);
      }
      
      // Refresh the asset type data completely
      const updatedAssetType = await getAssetType(supabase, assetType.id);
      if (updatedAssetType) {
        setAssetType(updatedAssetType);
        await loadAllData(updatedAssetType);
      }
    } catch (error) {
      console.error("Error unlinking form:", error);
      toast({
        title: "Error",
        description: "Failed to unlink form",
        variant: "destructive",
      });
    }
  };

  const handleLinkOtherForm = async () => {
    if (!assetType?.id || !newFormId || !newFormPurpose || !assetType.organization_id) return;
    setIsLinkingForm(true);
    try {
      await addAssetTypeFormLink(assetType.id, newFormId, newFormPurpose, assetType.organization_id);
      setNewFormId('');
      setNewFormPurpose('adjustment');
      
      // Refresh the asset type data completely
      const updatedAssetType = await getAssetType(supabase, assetType.id);
      if (updatedAssetType) {
        setAssetType(updatedAssetType);
        await loadAllData(updatedAssetType);
      }
      
      toast({ title: 'Form Linked', description: 'Form linked to asset type.' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to link form', variant: 'destructive' });
    } finally {
      setIsLinkingForm(false);
    }
  };

  const handleUnlinkOtherForm = async (formId: string, purpose: string) => {
    if (!assetType?.id || !assetType.organization_id) return;
    try {
      await removeAssetTypeFormLink(assetType.id, formId, purpose, assetType.organization_id);
      
      // Refresh the asset type data completely
      const updatedAssetType = await getAssetType(supabase, assetType.id);
      if (updatedAssetType) {
        setAssetType(updatedAssetType);
        await loadAllData(updatedAssetType);
      }
      
      toast({ title: 'Form Unlinked', description: 'Form unlinked from asset type.' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to unlink form', variant: 'destructive' });
    }
  };

  const handleConversionFieldsChange = useCallback(async (fields: ConversionField[]) => {
    if (!assetType?.id) return;
    
    // Debounce the save operation to prevent spam
    clearTimeout(window.conversionFieldsTimeout);
    window.conversionFieldsTimeout = setTimeout(async () => {
      try {
        await updateAssetType(supabase, assetType.id, {
          conversion_fields: fields as any
        });
        
        // Update local state
        setAssetType(prev => prev ? { ...prev, conversion_fields: fields as any } : prev);
        
        toast({
          title: "Conversion Fields Updated",
          description: "Conversion fields have been saved successfully",
        });
      } catch (error) {
        console.error("Error updating conversion fields:", error);
        toast({
          title: "Error",
          description: "Failed to save conversion fields",
          variant: "destructive",
        });
      }
    }, 1000); // 1 second debounce
  }, [assetType?.id, toast]);

  // Filter forms based on dialog type
  const getFilteredForms = () => {
    // For now, return all forms since form_type might not be available in the current schema
    // This can be enhanced later when form_type is properly implemented in the form structure
    return availableForms;
  };

  const filteredForms = getFilteredForms();

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="flex items-start space-x-4 mb-6">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mt-0.5">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="space-y-3">
            <Skeleton className="h-8 w-72" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-4 w-full mb-3" />
            <Skeleton className="h-4 w-3/4 mb-3" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!assetType) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <h2 className="text-xl font-bold mb-2">Asset Type Not Found</h2>
        <p className="text-muted-foreground mb-4">
          The requested asset type could not be found.
        </p>
        <Button onClick={() => navigate("/asset-types")}>Return to Asset Types</Button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div className="flex items-start space-x-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)} 
            className="mt-0.5"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: assetType.color || "#6E56CF" }}
              />
              <h1 className="text-3xl font-bold">{assetType.name}</h1>
            </div>
            <p className="text-muted-foreground">
              {assetType.description || "No description provided"}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            onClick={() => navigate(`/asset-types/edit/${assetType.id}`)}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit Asset Type
          </Button>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="forms">Forms</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Asset Type Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Name
                    </div>
                    <div>{assetType.name}</div>
                  </div>
                  
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Description
                    </div>
                    <div>{assetType.description || "No description provided"}</div>
                  </div>
                  
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Color
                    </div>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: assetType.color || "#6E56CF" }}
                      />
                      {assetType.color || "#6E56CF"}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Barcode Generation
                    </div>
                    <div>
                      {assetType.enable_barcodes ? (
                        <div className="space-y-1">
                          <Badge variant="secondary" className="bg-green-100 text-green-800">Enabled</Badge>
                          <div className="text-sm">
                            <div>Type: {assetType.barcode_type === 'qr' ? 'QR Code' : 'Barcode'}</div>
                            {assetType.barcode_prefix && (
                              <div>Prefix: {assetType.barcode_prefix}</div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <Badge variant="outline">Disabled</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Inventory Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Total Inventory Items
                    </div>
                    <div className="text-2xl font-bold">{inventoryCount}</div>
                  </div>
                  
                  <div className="pt-4">
                    <Button 
                      onClick={() => navigate(`/inventory?assetType=${assetType.id}`)}
                      className="w-full"
                    >
                      View Inventory Items
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="forms">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Form Management</CardTitle>
              <CardDescription>
                Configure the forms used for this asset type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div>
                <p className="text-sm text-muted-foreground mb-4">
                  Each asset type uses three types of forms: an <strong>Intake Form</strong> for adding new inventory (simple and fast for QR scanning), 
                  an <strong>Inventory Form</strong> for monthly inventory tracking, and an optional <strong>Mapping Form</strong> for defining 
                  conversion rates and field mappings separately from intake operations.
                </p>
                
                {!intakeForm && !inventoryForm && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Getting Started with Forms</h4>
                    <p className="text-sm text-blue-800 mb-3">
                      This asset type doesn't have any forms linked yet. To get started:
                    </p>
                    <ol className="text-sm text-blue-800 list-decimal list-inside space-y-1">
                      <li>Go to the <strong>Forms</strong> tab to create new forms</li>
                      <li>Return here to link those forms to this asset type</li>
                      <li>Or use the "Link Existing Form" buttons below if you already have forms</li>
                    </ol>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Intake Form Card */}
            <Card>
              <CardHeader className="bg-muted/30">
                <CardTitle>Intake Form</CardTitle>
                <CardDescription>
                  Used when adding new items of this asset type
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {isFormsLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ) : intakeForm ? (
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-1">
                        Form Name
                      </div>
                      <div>{intakeForm.name}</div>
                    </div>
                    
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-1">
                        Description
                      </div>
                      <div>{intakeForm.description || "No description provided"}</div>
                    </div>
                    
                    <div className="pt-2 flex flex-wrap gap-2">
                      <Button 
                        variant="outline" 
                        onClick={() => navigate(`/forms/${intakeForm.id}`)}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        View Form
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => navigate(`/forms/edit/${intakeForm.id}`)}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Form
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => handleUnlinkForm("intake")}
                      >
                        <Unlink className="mr-2 h-4 w-4" />
                        Unlink
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-center p-6 border border-dashed rounded-lg">
                      <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                      <h3 className="text-lg font-medium mb-1">No Intake Form</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        This asset type doesn't have an intake form linked yet.
                      </p>
                      
                      <div className="space-y-2">
                        <Button onClick={() => openFormDialog("intake")}>
                          <Plus className="mr-2 h-4 w-4" />
                          Link Existing Form
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          Need to create a new form? Go to the Forms tab to build one first.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Inventory Form Card */}
            <Card>
              <CardHeader className="bg-muted/30">
                <CardTitle>Inventory Form</CardTitle>
                <CardDescription>
                  Used when tracking inventory of this asset type
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {isFormsLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ) : inventoryForm ? (
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-1">
                        Form Name
                      </div>
                      <div>{inventoryForm.name}</div>
                    </div>
                    
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-1">
                        Description
                      </div>
                      <div>{inventoryForm.description || "No description provided"}</div>
                    </div>
                    
                    <div className="pt-2 flex flex-wrap gap-2">
                      <Button 
                        variant="outline" 
                        onClick={() => navigate(`/forms/${inventoryForm.id}`)}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        View Form
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => navigate(`/forms/edit/${inventoryForm.id}`)}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Form
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => handleUnlinkForm("inventory")}
                      >
                        <Unlink className="mr-2 h-4 w-4" />
                        Unlink
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-6 border border-dashed rounded-lg">
                    <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                    <h3 className="text-lg font-medium mb-1">No Inventory Form</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      This asset type doesn't have an inventory form linked yet.
                    </p>
                    
                    <div className="space-y-2">
                      <Button onClick={() => openFormDialog("inventory")}>
                        <Plus className="mr-2 h-4 w-4" />
                        Link Existing Form
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        Need to create a new form? Go to the Forms tab to build one first.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Mapping Form Card */}
            <Card>
              <CardHeader className="bg-muted/30">
                <CardTitle>Conversion Fields</CardTitle>
                <CardDescription>
                  Define conversion rate fields that will be available when creating assets of this type
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <ConversionFieldBuilder 
                  assetTypeId={assetType?.id || ''}
                  initialFields={assetType?.conversion_fields as any || []}
                  onFieldsChange={handleConversionFieldsChange}
                />
              </CardContent>
            </Card>

            {/* Additional Forms Card */}
            <Card className="md:col-span-2 mt-4">
              <CardHeader className="bg-muted/30">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Additional Forms</CardTitle>
                    <CardDescription>
                      Other forms linked to this asset type for specialized purposes
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={newFormPurpose} onValueChange={setNewFormPurpose}>
                      <SelectTrigger className="w-36">
                        <SelectValue placeholder="Purpose" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="adjustment">Adjustment</SelectItem>
                        <SelectItem value="transfer">Transfer</SelectItem>
                        <SelectItem value="audit">Audit</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={newFormId} onValueChange={setNewFormId}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Select a form" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableForms.map((form) => (
                          <SelectItem key={form.id} value={form.id}>{form.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      size="sm" 
                      onClick={handleLinkOtherForm} 
                      disabled={!newFormId || isLinkingForm}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Link Form
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {assetTypeForms.filter(f => f.purpose !== 'intake' && f.purpose !== 'inventory').length === 0 ? (
                    <div className="text-center p-6 border border-dashed rounded-lg">
                      <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                      <h3 className="text-lg font-medium mb-1">No Additional Forms</h3>
                      <p className="text-sm text-muted-foreground">
                        You haven't linked any additional forms to this asset type yet.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {assetTypeForms.filter(f => f.purpose !== 'intake' && f.purpose !== 'inventory').map((f) => (
                        <div key={f.form_id + f.purpose} className="flex items-center justify-between border rounded p-3">
                          <div>
                            <div className="font-medium">{f.forms?.name || 'Unknown Form'}</div>
                            <div className="text-xs text-muted-foreground">
                              <span className="capitalize font-medium">{f.purpose}</span> - 
                              {f.forms?.description || 'No description'}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => navigate(`/forms/${f.form_id}`)}
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => navigate(`/forms/edit/${f.form_id}`)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleUnlinkOtherForm(f.form_id, f.purpose)}
                            >
                              <Unlink className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recommended Forms Card - only shown if there are recommended forms */}
            {recommendedForms.length > 0 && (
              <Card className="md:col-span-2 mt-4">
                <CardHeader className="bg-muted/30">
                  <CardTitle>Recommended Forms</CardTitle>
                  <CardDescription>
                    Forms that might be relevant for this asset type
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {recommendedForms.slice(0, 4).map((form) => (
                      <div 
                        key={form.form_id} 
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <div className="font-medium">{form.form_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {form.form_description || "No description"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Recommended for: <span className="capitalize">{form.form_type}</span>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setFormDialogType(form.form_type as "intake" | "inventory");
                            setSelectedFormId(form.form_id);
                            handleSelectForm();
                          }}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Use This Form
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Barcode Settings</CardTitle>
                <CardDescription>
                  Configure barcode settings for assets of this type
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BarcodeToggle
                  initialSettings={barcodeSettings}
                  onSettingsChange={handleBarcodeSettingsChange}
                  onSave={handleSaveBarcodeSettings}
                  isSaving={isSaving}
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Calculation Formulas</CardTitle>
                <CardDescription>
                  Configure calculation formulas for this asset type
                </CardDescription>
              </CardHeader>
              <CardContent>
                {assetType && (
                  <AssetCalculationManager
                    assetTypeId={assetType.id}
                    organizationId={assetType.organization_id}
                    initialFormulas={memoizedCalculationFormulas}
                    formIds={memoizedFormIds}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Form Selection Dialog */}
      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Select {formDialogType === "intake" ? "Intake" : "Inventory"} Form
            </DialogTitle>
            <DialogDescription>
              Choose a form to use for {formDialogType === "intake" ? "adding new items" : "tracking inventory"} of this asset type.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 py-2">
            <label className="text-sm font-medium">
              Select a Form
            </label>
            <div className="w-60">
              <Select value={selectedFormId} onValueChange={setSelectedFormId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a form" />
                </SelectTrigger>
                <SelectContent>
                  {filteredForms.map((form) => (
                    <SelectItem key={form.id} value={form.id}>
                      {form.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedFormId && (
              <div className="text-sm text-muted-foreground">
                This will link the selected form to the asset type as the {formDialogType} form.
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSelectForm}
              disabled={!selectedFormId}
            >
              Link Form
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 