import { useState, useEffect } from "react";
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
  createDefaultFormsForAssetType,
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
import AssetTypeFormulaMappingsForm from "@/components/forms/AssetTypeFormulaMappingsForm";

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
  const [isCreatingForms, setIsCreatingForms] = useState(false);
  const [inventoryCount, setInventoryCount] = useState(0);
  const [barcodeSettings, setBarcodeSettings] = useState({
    enabled: assetType?.enable_barcodes || false,
    type: assetType?.barcode_type || 'qr',
    prefix: assetType?.barcode_prefix || '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [assetTypeForms, setAssetTypeForms] = useState<any[]>([]);
  const [newFormPurpose, setNewFormPurpose] = useState('adjustment');
  const [newFormId, setNewFormId] = useState('');
  const [isLinkingForm, setIsLinkingForm] = useState(false);

  useEffect(() => {
    if (id && currentOrganization) {
      loadAssetType();
    }
  }, [id, currentOrganization]);

  useEffect(() => {
    if (assetType) {
      loadForms();
      loadInventoryCount();
      loadRecommendedForms();
      loadAssetTypeForms();
      setBarcodeSettings({
        enabled: assetType.enable_barcodes || false,
        type: assetType.barcode_type || 'qr',
        prefix: assetType.barcode_prefix || '',
      });
    }
  }, [assetType]);

  const loadAssetType = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const data = await getAssetType(supabase, id);
      if (data) {
        setAssetType(data);
      } else {
        toast({
          title: "Error",
          description: "Asset type not found",
          variant: "destructive",
        });
        navigate("/asset-types");
      }
    } catch (error) {
      console.error("Error loading asset type:", error);
      toast({
        title: "Error",
        description: "Failed to load asset type",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadForms = async () => {
    if (!assetType?.organization_id) return;
    
    setIsFormsLoading(true);
    try {
      // Load available forms
      const forms = await getForms(assetType.organization_id);
      setAvailableForms(forms);

      // Load linked forms if they exist
      if (assetType.intake_form_id) {
        const intakeFormData = await getFormById(assetType.intake_form_id);
        setIntakeForm(intakeFormData);
      }

      if (assetType.inventory_form_id) {
        const inventoryFormData = await getFormById(assetType.inventory_form_id);
        setInventoryForm(inventoryFormData);
      }
    } catch (error) {
      console.error("Error loading forms:", error);
      toast({
        title: "Error",
        description: "Failed to load forms",
        variant: "destructive",
      });
    } finally {
      setIsFormsLoading(false);
    }
  };

  const loadInventoryCount = async () => {
    if (!assetType?.id) return;
    
    try {
      const { count, error } = await supabase
        .from('inventory_items')
        .select('id', { count: 'exact', head: true })
        .eq('asset_type_id', assetType.id);

      if (error) {
        console.error("Error counting inventory items:", error);
      } else {
        setInventoryCount(count || 0);
      }
    } catch (error) {
      console.error("Error counting inventory items:", error);
    }
  };

  const loadRecommendedForms = async () => {
    if (!assetType?.id) return;
    
    try {
      const recommended = await getRecommendedFormsForAssetType(supabase, assetType.id);
      if (recommended) {
        setRecommendedForms(recommended);
      }
    } catch (error) {
      console.error("Error loading recommended forms:", error);
    }
  };

  const loadAssetTypeForms = async () => {
    if (!assetType?.id || !assetType.organization_id) return;
    try {
      const forms = await getAssetTypeForms(assetType.id, assetType.organization_id);
      setAssetTypeForms(forms || []);
    } catch (error) {
      console.error('Error loading asset type forms:', error);
    }
  };

  const handleCreateDefaultForms = async () => {
    if (!assetType?.id) return;
    
    setIsCreatingForms(true);
    try {
      const result = await createDefaultFormsForAssetType(supabase, assetType.id);
      if (result) {
        toast({
          title: "Forms Created",
          description: "Default forms have been created and linked to this asset type",
        });
        // Reload the asset type to get the updated form IDs
        await loadAssetType();
      }
    } catch (error) {
      console.error("Error creating default forms:", error);
      toast({
        title: "Error",
        description: "Failed to create default forms",
        variant: "destructive",
      });
    } finally {
      setIsCreatingForms(false);
    }
  };

  const handleSelectForm = async () => {
    if (!assetType?.id || !selectedFormId || !assetType.organization_id) return;
    try {
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
        // Reload the asset type
        await loadAssetType();
        setIsFormDialogOpen(false);
      }
    } catch (error) {
      console.error("Error linking form:", error);
      toast({
        title: "Error",
        description: "Failed to link form",
        variant: "destructive",
      });
    }
  };

  const openFormDialog = (type: "intake" | "inventory") => {
    setFormDialogType(type);
    setSelectedFormId("");
    setIsFormDialogOpen(true);
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
      
      // Update local state
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
      let formId = formType === "intake" ? assetType.intake_form_id : assetType.inventory_form_id;
      if (!formId) return;
      await removeAssetTypeFormLink(assetType.id, formId, formType, assetType.organization_id);
      toast({
        title: "Form Unlinked",
        description: `The ${formType} form has been unlinked from this asset type`,
      });
      // Update local state
      if (formType === "intake") {
        setIntakeForm(null);
      } else {
        setInventoryForm(null);
      }
      // Reload the asset type
      await loadAssetType();
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
      await loadAssetTypeForms();
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
      await loadAssetTypeForms();
      toast({ title: 'Form Unlinked', description: 'Form unlinked from asset type.' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to unlink form', variant: 'destructive' });
    }
  };

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Intake Form Card */}
            <Card>
              <CardHeader>
                <CardTitle>Intake Form</CardTitle>
                <CardDescription>
                  Used when adding new items of this asset type
                </CardDescription>
              </CardHeader>
              <CardContent>
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
                        Unlink Form
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="text-center p-6 border border-dashed rounded-lg">
                      <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                      <h3 className="text-lg font-medium mb-1">No Intake Form</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        This asset type doesn't have an intake form yet.
                      </p>
                      
                      <div className="flex flex-col space-y-2">
                        <Button onClick={() => openFormDialog("intake")}>
                          <Plus className="mr-2 h-4 w-4" />
                          Select Existing Form
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={handleCreateDefaultForms}
                          disabled={isCreatingForms}
                        >
                          Create Default Forms
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Inventory Form Card */}
            <Card>
              <CardHeader>
                <CardTitle>Inventory Form</CardTitle>
                <CardDescription>
                  Used when tracking inventory of this asset type
                </CardDescription>
              </CardHeader>
              <CardContent>
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
                        Unlink Form
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="text-center p-6 border border-dashed rounded-lg">
                      <ListCheck className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                      <h3 className="text-lg font-medium mb-1">No Inventory Form</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        This asset type doesn't have an inventory form yet.
                      </p>
                      
                      <div className="flex flex-col space-y-2">
                        <Button onClick={() => openFormDialog("inventory")}>
                          <Plus className="mr-2 h-4 w-4" />
                          Select Existing Form
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={handleCreateDefaultForms}
                          disabled={isCreatingForms}
                        >
                          Create Default Forms
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recommended Forms Card - only shown if there are recommended forms */}
            {recommendedForms.length > 0 && (
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Recommended Forms</CardTitle>
                  <CardDescription>
                    Forms that might be relevant for this asset type
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recommendedForms.slice(0, 5).map((form) => (
                      <div 
                        key={form.form_id} 
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <div className="font-medium">{form.form_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {form.form_description || "No description"}
                          </div>
                          <div className="text-xs">
                            Type: <span className="capitalize">{form.form_type}</span>
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
                          Use This Form
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="md:col-span-2 mt-6">
              <CardHeader>
                <CardTitle>Other Linked Forms</CardTitle>
                <CardDescription>Forms linked to this asset type for other purposes (e.g., adjustment, transfer, etc.)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="flex gap-2 items-end">
                    <div className="w-40">
                      <Select value={newFormPurpose} onValueChange={setNewFormPurpose}>
                        <SelectTrigger><SelectValue placeholder="Purpose" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="adjustment">Adjustment</SelectItem>
                          <SelectItem value="transfer">Transfer</SelectItem>
                          <SelectItem value="audit">Audit</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-60">
                      <Select value={newFormId} onValueChange={setNewFormId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a form" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableForms.map((form) => (
                            <SelectItem key={form.id} value={form.id}>{form.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleLinkOtherForm} disabled={!newFormId || isLinkingForm}>
                      Link Form
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  {assetTypeForms.length === 0 && <div className="text-muted-foreground">No other forms linked.</div>}
                  {assetTypeForms.filter(f => f.purpose !== 'intake' && f.purpose !== 'inventory').map((f) => (
                    <div key={f.form_id + f.purpose} className="flex items-center justify-between border rounded p-2">
                      <div>
                        <div className="font-medium">{f.forms?.name || 'Unknown Form'}</div>
                        <div className="text-xs text-muted-foreground">Purpose: {f.purpose}</div>
                        <div className="text-xs text-muted-foreground">{f.forms?.description}</div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => handleUnlinkOtherForm(f.form_id, f.purpose)}>
                        Unlink
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
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

            {assetType?.id && (
              <AssetTypeFormulaMappingsForm assetTypeId={assetType.id} />
            )}
            
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
                    initialFormulas={assetType.calculation_formulas || {}}
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
                  {availableForms.map((form) => (
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