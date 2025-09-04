import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Plus } from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
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
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { DatePicker } from "@/components/ui/date-picker";
import { useToast } from "@/components/ui/use-toast";
import { useOrganization } from "@/hooks/useOrganization";
import { supabase } from "@/integrations/supabase/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Checkbox } from "@/components/ui/checkbox";
import { generateAssetBarcode, createInventoryCheck, createAssetAndInitialInventory } from "@/services/inventoryService";
import { getAssetTypeForms } from '@/services/assetTypeService';
import { getFormById } from '@/services/formService';

// Dynamic form component
import DynamicForm from "@/components/forms/DynamicForm";
import { Spinner } from "@/components/ui/spinner";

interface AssetType {
  id: string;
  name: string;
  description?: string;
  color: string;
  intake_form_id?: string | null;
  enable_barcodes?: boolean;
  barcode_type?: string;
  barcode_prefix?: string;
  deleted_at?: string | null;
  mapping_form_id?: string | null;
  conversion_fields?: any;
}

interface Asset {
  id: string;
  name: string;
  asset_type_id: string;
}

export default function NewAsset() {
  const { currentOrganization } = useOrganization();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { id } = useParams<{ id: string }>();  // Get id parameter from URL
  const isEditMode = !!id;  // If id exists, we're in edit mode
  
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(isEditMode); // Start loading if in edit mode
  const [selectedAssetType, setSelectedAssetType] = useState<AssetType | null>(null);
  const [showNewTypeDialog, setShowNewTypeDialog] = useState(false);
  const [loadingIntakeForm, setLoadingIntakeForm] = useState(false);
  const [intakeForm, setIntakeForm] = useState<any>(null);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [intakeFormError, setIntakeFormError] = useState<string | null>(null);
  const [intakeFormSchemaJson, setIntakeFormSchemaJson] = useState<any | null>(null);

  // Initialize form validation schema
  const formSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    status: z.string().default("active"),
    asset_type_id: z.string().min(1, "Asset type is required"),
    serial_number: z.string().optional(),
    acquisition_date: z.date().optional(),
    parent_asset_id: z.string().optional(),
    location: z.string().optional(),
    location_details: z.string().optional(),
    cost: z.number().default(0),
    unit_type: z.string().optional(),
    current_inventory: z.number().default(0),
    distributor: z.string().optional(),
  });

  // Initialize form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      status: "active",
      asset_type_id: "",
      serial_number: "",
      parent_asset_id: "",
      location: "",
      location_details: "",
      cost: 0,
      unit_type: "",
      current_inventory: 0,
      distributor: "",
    },
  });

  // New asset type form
  const newTypeFormSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    color: z.string().default("#6E56CF"),
  });

  const newTypeForm = useForm<z.infer<typeof newTypeFormSchema>>({
    resolver: zodResolver(newTypeFormSchema),
    defaultValues: {
      name: "",
      description: "",
      color: "#6E56CF",
    },
  });

  // Load asset types and assets on mount
  useEffect(() => {
    if (currentOrganization) {
      fetchAssetTypes();
      fetchAssets();
      
      // If in edit mode, fetch the asset data
      if (isEditMode && id) {
        fetchAssetData(id);
      }
    }
  }, [currentOrganization, id, isEditMode]);

  // Filter out deleted asset types
  const filteredAssetTypes = assetTypes.filter(type => !type.deleted_at);

  // Watch for asset type selection changes
  useEffect(() => {
    if (form.watch && filteredAssetTypes.length > 0) {
      const subscription = form.watch(async (value, { name }) => {
        if (name === "asset_type_id" && value.asset_type_id) {
          const assetType = filteredAssetTypes.find(type => type.id === value.asset_type_id);
          setSelectedAssetType(assetType);
          if (assetType && currentOrganization?.id) {
            setLoadingIntakeForm(true);
            try {
              // Load conversion fields directly from asset type
              const conversionFields = Array.isArray(assetType.conversion_fields) 
                ? assetType.conversion_fields 
                : (typeof assetType.conversion_fields === 'string' 
                    ? JSON.parse(assetType.conversion_fields) 
                    : []);
              
              if (conversionFields && Array.isArray(conversionFields) && conversionFields.length > 0) {
                // Create a mock form structure from conversion fields
                const conversionForm = {
                  id: 'conversion_fields',
                  name: 'Conversion Fields',
                  form_data: {
                    fields: conversionFields.map((field: any) => ({
                      id: field.field_name,
                      label: field.label,
                      type: field.type,
                      required: field.required || false,
                      mappable: field.mappable || true,
                      description: field.description,
                      placeholder: field.placeholder,
                      options: field.options || []
                    }))
                  }
                };
                
                setIntakeForm(conversionForm);
                setIntakeFormSchemaJson(conversionForm.form_data);
              } else {
                setIntakeForm(null);
                setIntakeFormSchemaJson(null);
              }
            } catch (error) {
              console.error('Error loading conversion fields:', error);
              setIntakeForm(null);
              setIntakeFormSchemaJson(null);
            } finally {
              setLoadingIntakeForm(false);
            }
          } else {
            setIntakeForm(null);
            setIntakeFormSchemaJson(null);
          }
        }
      });
      return () => subscription.unsubscribe();
    }
  }, [form, filteredAssetTypes, currentOrganization]);

  const fetchAssetTypes = async () => {
    if (!currentOrganization) return;
    
    try {
      const { data, error } = await supabase
        .from('asset_types')
        .select('*, intake_form_id, enable_barcodes, barcode_type, barcode_prefix, conversion_fields')
        .eq('organization_id', currentOrganization.id)
        .order('name');
      
      if (error) {
        throw error;
      }
      
      setAssetTypes(data || []);
    } catch (error) {
      console.error("Error fetching asset types:", error);
      toast({
        title: "Error",
        description: "Failed to load asset types",
        variant: "destructive",
      });
    }
  };

  const fetchIntakeForm = async (formId: string) => {
    try {
      setLoadingIntakeForm(true);
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .eq('id', formId)
        .single();
      
      if (error) {
        throw error;
      }
      
                // Form data loaded
      if (data.form_data && typeof data.form_data === 'string') {
        try {
          data.form_data = JSON.parse(data.form_data);
        } catch (e) {
          console.error('Error parsing form data:', e);
          data.form_data = null;
        }
      }
      
      setIntakeForm(data);
      setIntakeFormSchemaJson(data?.form_data || null);
    } catch (error) {
      console.error("Error fetching intake form:", error);
      toast({
        title: "Error",
        description: "Failed to load intake form",
        variant: "destructive",
      });
      setIntakeForm(null);
      setIntakeFormSchemaJson(null);
    } finally {
      setLoadingIntakeForm(false);
    }
  };

  const fetchAssets = async () => {
    if (!currentOrganization) return;
    
    try {
      setLoadingAssets(true);
      const { data, error } = await supabase
        .from('assets')
        .select('id, name, asset_type_id')
        .eq('organization_id', currentOrganization.id)
        .eq('is_deleted', false)
        .order('name');
      
      if (error) {
        throw error;
      }
      
      setAssets(data || []);
    } catch (error) {
      console.error("Error fetching assets:", error);
      toast({
        title: "Error",
        description: "Failed to load assets",
        variant: "destructive",
      });
    } finally {
      setLoadingAssets(false);
    }
  };

  const createNewAssetType = async (values: z.infer<typeof newTypeFormSchema>) => {
    if (!currentOrganization) return;
    
    try {
      const { data, error } = await supabase
        .from('asset_types')
        .insert({
          name: values.name,
          description: values.description,
          color: values.color,
          organization_id: currentOrganization.id,
          enable_barcodes: false, // Default to false
          barcode_type: 'qr',    // Default to 'qr'
          barcode_prefix: null   // Default to null
        })
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      // Add new asset type to state
      setAssetTypes(prev => [...prev, data]);
      
      // Select the newly created asset type
      form.setValue('asset_type_id', data.id);
      setSelectedAssetType(data);
      
      // Close dialog
      setShowNewTypeDialog(false);
      
      // Reset form
      newTypeForm.reset();
      
      toast({
        title: "Success",
        description: "Asset type created successfully",
      });
    } catch (error) {
      console.error("Error creating asset type:", error);
      toast({
        title: "Error",
        description: "Failed to create asset type",
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!currentOrganization) return;
    
    try {
      setLoading(true);
      
      // Structure metadata from the form values
      const metadata: Record<string, any> = {};
      
      // Add location information to metadata
      if (values.location) {
        metadata.location = values.location;
      }
      
      if (values.location_details) {
        metadata.location_details = values.location_details;
      }
      
      // Add cost and unit type to metadata
      if (values.cost > 0) {
        metadata.cost = values.cost;
      } else {
        metadata.cost = 0; // Always include cost, default to 0
      }
      
      if (values.unit_type) {
        metadata.unit_type = values.unit_type;
      }
      
      // Add current inventory to metadata
      if (values.current_inventory !== undefined) {
        metadata.current_inventory = values.current_inventory;
      }
      
      // Add distributor to metadata
      if (values.distributor) {
        metadata.distributor = values.distributor;
      }
      
      // Add all conversion field values from the dynamic form to metadata
      // This ensures conversion values are saved when editing an asset
      if (Object.keys(formValues).length > 0) {
        Object.assign(metadata, formValues);
      }
      
      // Prepare asset data
      const assetData: any = {
        name: values.name,
        description: values.description,
        asset_type_id: values.asset_type_id,
        organization_id: currentOrganization.id,
        status: values.status,
        serial_number: values.serial_number,
        acquisition_date: values.acquisition_date ? values.acquisition_date.toISOString() : null,
        parent_asset_id: values.parent_asset_id === 'none' ? null : values.parent_asset_id || null,
        metadata: Object.keys(metadata).length > 0 ? metadata : null,
      };
      
      let data;
      let error;
      
      if (isEditMode && id) {
        // Update existing asset
        const response = await supabase
          .from('assets')
          .update(assetData)
          .eq('id', id)
          .select()
          .single();
          
        data = response.data;
        error = response.error;
      } else {
        // For new assets, use the integrated createAssetAndInitialInventory function
        // which creates the asset, inventory item, and history record in one operation
        try {
          // Prepare the intake form data
          const intakeFormData = {
            quantity: values.current_inventory || 0,
            location: values.location,
            notes: "Initial intake created with asset",
            status: values.status,
            // Include the full dynamic form values as response_data
            response_data: Object.keys(formValues).length > 0 ? formValues : null
          };
          
          const result = await createAssetAndInitialInventory(
            assetData,
            values.asset_type_id,
            currentOrganization.id,
            intakeFormData,
            intakeFormSchemaJson
          );
          
          data = result.asset;
          
        } catch (createError) {
          console.error("Error creating asset and inventory:", createError);
          throw createError;
        }
      }
      
      if (error) {
        throw error;
      }
      
      // Check if the asset type has barcode generation enabled and generate barcode if needed
      // Only for new assets, not when editing
      if (!isEditMode && data) {
        const assetType = assetTypes.find(type => type.id === values.asset_type_id);
        if (assetType?.enable_barcodes) {
          try {
            // Generate barcode for the new asset
            const barcode = await generateAssetBarcode(
              supabase, 
              data.id, 
              assetType.barcode_type || 'qr'
            );
            
            if (barcode) {
              // Update the asset with the generated barcode
              await supabase
                .from('assets')
                .update({ barcode })
                .eq('id', data.id);
                
              // Barcode generated for asset
            }
          } catch (barcodeError) {
            console.error("Error generating barcode:", barcodeError);
            // Don't throw, allow asset creation to succeed even if barcode generation fails
          }
        }
      }

      toast({
        title: "Success",
        description: isEditMode 
          ? "Asset updated successfully" 
          : "Asset created successfully with initial inventory record",
      });
      
      // Navigate to the asset detail page
      navigate(`/assets/${data.id}`);
    } catch (error) {
      console.error(isEditMode ? "Error updating asset:" : "Error creating asset:", error);
      toast({
        title: "Error",
        description: isEditMode ? "Failed to update asset" : "Failed to create asset",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFormValuesChange = (values: Record<string, any>) => {
    setFormValues(values);
  };

  // Fetch asset data for editing
  const fetchAssetData = async (assetId: string) => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('assets')
        .select(`
          *,
          asset_type:asset_types(id, name, color, intake_form_id, conversion_fields)
        `)
        .eq('id', assetId)
        .single();
      
      if (error) {
        throw error;
      }
      
      if (!data) {
        toast({
          title: "Error",
          description: "Asset not found",
          variant: "destructive",
        });
        navigate('/assets');
        return;
      }
      
      // Parse metadata first
      let metadataObject: Record<string, any> = {};
      if (data.metadata) {
        if (typeof data.metadata === 'string') {
          try {
            metadataObject = JSON.parse(data.metadata);
          } catch (e) {
            console.error('Error parsing metadata JSON:', e);
            metadataObject = {};
          }
        } else if (typeof data.metadata === 'object' && !Array.isArray(data.metadata)) {
          metadataObject = data.metadata as Record<string, any>;
        }
      }

      // Set form values from asset data
      form.reset({
        name: data.name,
        description: data.description || "",
        status: data.status || "active",
        asset_type_id: data.asset_type_id,
        serial_number: data.serial_number || "",
        acquisition_date: data.acquisition_date ? new Date(data.acquisition_date) : undefined,
        parent_asset_id: data.parent_asset_id || "",
        location: metadataObject.location || "",
        location_details: metadataObject.location_details || "",
        cost: metadataObject.cost || 0,
        unit_type: metadataObject.unit_type || "",
        current_inventory: metadataObject.current_inventory || 0,
        distributor: metadataObject.distributor || "",
      });
      
      // Set selected asset type
      if (data.asset_type) {
        setSelectedAssetType(data.asset_type);
        
        // Load conversion fields directly from asset type
        const conversionFields = Array.isArray(data.asset_type.conversion_fields) 
          ? data.asset_type.conversion_fields 
          : (typeof data.asset_type.conversion_fields === 'string' 
              ? JSON.parse(data.asset_type.conversion_fields) 
              : []);
        
        if (conversionFields && Array.isArray(conversionFields) && conversionFields.length > 0) {
          setLoadingIntakeForm(true);
          try {
            // Create a mock form structure from conversion fields
            const conversionForm = {
              id: 'conversion_fields',
              name: 'Conversion Fields',
              form_data: {
                fields: conversionFields.map((field: any) => ({
                  id: field.field_name,
                  label: field.label,
                  type: field.type,
                  required: field.required || false,
                  mappable: field.mappable || true,
                  description: field.description,
                  placeholder: field.placeholder,
                  options: field.options || []
                }))
              }
            };
            
            setIntakeForm(conversionForm);
            setIntakeFormSchemaJson(conversionForm.form_data);
          } catch (error) {
            console.error('Error loading conversion fields for existing asset:', error);
            setIntakeForm(null);
            setIntakeFormSchemaJson(null);
          } finally {
            setLoadingIntakeForm(false);
          }
        } else {
          // Fetch the intake form if available and no conversion fields
          if (data.asset_type.intake_form_id) {
            fetchIntakeForm(data.asset_type.intake_form_id);
          } else {
            setIntakeForm(null);
            setIntakeFormSchemaJson(null);
          }
        }
      }
      
      // Set dynamic form values from metadata (metadataObject already parsed above)
      if (Object.keys(metadataObject).length > 0) {
        form.setValue('location', metadataObject.location || "");
        form.setValue('location_details', metadataObject.location_details || "");
        form.setValue('cost', metadataObject.cost || 0);
        form.setValue('unit_type', metadataObject.unit_type || "");
        form.setValue('current_inventory', metadataObject.current_inventory || 0);
        form.setValue('distributor', metadataObject.distributor || "");

        const dynamicFormValues = { ...metadataObject };
        // Remove fields we handle separately
        delete dynamicFormValues.location;
        delete dynamicFormValues.location_details;
        delete dynamicFormValues.cost;
        delete dynamicFormValues.unit_type;
        delete dynamicFormValues.current_inventory;
        delete dynamicFormValues.distributor;
        
        // The conversion field values are already included in metadataObject
        // so they'll be in dynamicFormValues by default
        
        setFormValues(dynamicFormValues);
      } else {
        // If metadata is not an object or is null, set defaults for form values
        form.setValue('location', "");
        form.setValue('location_details', "");
        form.setValue('cost', 0);
        form.setValue('unit_type', "");
        form.setValue('current_inventory', 0);
        form.setValue('distributor', "");
        setFormValues({});
      }
      
    } catch (error) {
      console.error("Error fetching asset:", error);
      toast({
        title: "Error",
        description: "Failed to load asset data",
        variant: "destructive",
      });
      navigate('/assets');
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentOrganization) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-muted-foreground">
          Please select an organization to add assets.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate('/assets')}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">{isEditMode ? "Edit Asset" : "Add New Asset"}</h1>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-48">
          <Spinner size="lg" />
          <span className="ml-2">Loading asset data...</span>
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Initial Card with Name and Asset Type */}
            <Card>
              <CardHeader>
                <CardTitle>Asset Information</CardTitle>
                <CardDescription>
                  Enter name and select asset type
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name*</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter asset name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="asset_type_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Asset Type*</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select an asset type" />
                            </SelectTrigger>
                            <SelectContent className="z-[200]">
                              <SelectGroup>
                                <SelectLabel>Asset Types</SelectLabel>
                                {filteredAssetTypes.map(type => (
                                  <SelectItem 
                                    key={type.id} 
                                    value={type.id}
                                  >
                                    <div className="flex items-center gap-2">
                                      <div
                                        className="w-2 h-2 rounded-full"
                                        style={{ backgroundColor: type.color }}
                                      />
                                      {type.name}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <Dialog open={showNewTypeDialog} onOpenChange={setShowNewTypeDialog}>
                          <DialogTrigger asChild>
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="icon"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Create New Asset Type</DialogTitle>
                              <DialogDescription>
                                Add a new asset type to categorize your assets
                              </DialogDescription>
                            </DialogHeader>
                            <Form {...newTypeForm}>
                              <form 
                                onSubmit={newTypeForm.handleSubmit(createNewAssetType)} 
                                className="space-y-4"
                              >
                                <FormField
                                  control={newTypeForm.control}
                                  name="name"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Name*</FormLabel>
                                      <FormControl>
                                        <Input placeholder="Enter asset type name" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                
                                <FormField
                                  control={newTypeForm.control}
                                  name="description"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Description</FormLabel>
                                      <FormControl>
                                        <Textarea 
                                          placeholder="Enter asset type description" 
                                          {...field} 
                                          value={field.value || ""}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                
                                <FormField
                                  control={newTypeForm.control}
                                  name="color"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Color</FormLabel>
                                      <FormControl>
                                        <div className="flex gap-2 items-center">
                                          <Input
                                            type="color"
                                            {...field}
                                            className="w-12 h-8 p-1"
                                          />
                                          <span className="text-sm text-muted-foreground">
                                            {field.value}
                                          </span>
                                        </div>
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                
                                <DialogFooter>
                                  <Button 
                                    type="button" 
                                    variant="outline" 
                                    onClick={() => setShowNewTypeDialog(false)}
                                  >
                                    Cancel
                                  </Button>
                                  <Button type="submit">Create Asset Type</Button>
                                </DialogFooter>
                              </form>
                            </Form>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
            
            {/* Only show additional fields and intake form if an asset type is selected */}
            {selectedAssetType && (
              <>
                {/* Mapping Form - Show this first when a type is selected */}
                {intakeForm ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>Conversion Values for {selectedAssetType.name}</CardTitle>
                      <CardDescription>
                        Set the conversion rates and mapped field values for this specific {selectedAssetType.name}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {loadingIntakeForm ? (
                        <div className="text-center py-4">Loading mapping form...</div>
                      ) : (
                        <>
                          {intakeFormError && (
                            <div className="text-red-600 font-medium mb-2">{intakeFormError}</div>
                          )}
                          {intakeForm.form_data ? (
                            <DynamicForm
                              formSchema={intakeForm.form_data}
                              initialValues={formValues}
                              onChange={handleFormValuesChange}
                            />
                          ) : (
                            <div className="text-red-600 font-medium">Form schema is missing or invalid. Please contact your administrator.</div>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    No mapping form available for this asset type. You can create one in the Asset Type settings.
                  </div>
                )}
                
                {/* Asset Relationships & Location */}
                <Card>
                  <CardHeader>
                    <CardTitle>Relationships & Location</CardTitle>
                    <CardDescription>
                      Specify parent asset and location information
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="parent_asset_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Parent Asset</FormLabel>
                          <FormControl>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select a parent asset (optional)" />
                              </SelectTrigger>
                              <SelectContent className="z-[200]">
                                <SelectItem value="none">None</SelectItem>
                                {assets.map(asset => (
                                  <SelectItem 
                                    key={asset.id} 
                                    value={asset.id}
                                  >
                                    {asset.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormDescription>
                            Only needed if this asset is a component or part of another asset. Most assets should select "None" as they are standalone or top-level assets. Example: A printer cartridge might be a component of a printer.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location</FormLabel>
                          <FormControl>
                            <Input placeholder="Building, Room or Area" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormDescription>
                            General location identifier (Building, Room, Area)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="location_details"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location Details</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Specific location details" 
                              {...field} 
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormDescription>
                            Specific details about the location (shelf, cabinet, coordinates, etc.)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
                
                {/* Additional Asset Details */}
                <Card>
                  <CardHeader>
                    <CardTitle>Additional Details</CardTitle>
                    <CardDescription>
                      Enter optional information about the asset
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Enter asset description" 
                              {...field} 
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="cost"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cost</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="Enter cost" 
                                {...field}
                                value={field.value || ''}
                                onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                              />
                            </FormControl>
                            <FormDescription>
                              Purchase price of the asset
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="unit_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Unit Type</FormLabel>
                            <FormControl>
                              <Select
                                value={field.value}
                                onValueChange={field.onChange}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select unit type" />
                                </SelectTrigger>
                                <SelectContent className="z-[200]">
                                  <SelectItem value="each">Each</SelectItem>
                                  <SelectItem value="gallon">Gallon</SelectItem>
                                  <SelectItem value="bucket">Bucket</SelectItem>
                                  <SelectItem value="part">Part</SelectItem>
                                  <SelectItem value="linear_foot">Linear Foot</SelectItem>
                                  <SelectItem value="square_foot">Square Foot</SelectItem>
                                  <SelectItem value="pound">Pound</SelectItem>
                                  <SelectItem value="kilogram">Kilogram</SelectItem>
                                  <SelectItem value="box">Box</SelectItem>
                                  <SelectItem value="case">Case</SelectItem>
                                  <SelectItem value="set">Set</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormDescription>
                              Unit of measurement for this asset
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="current_inventory"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Current Inventory</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="Enter current inventory count" 
                                {...field}
                                value={field.value === undefined ? '0' : field.value}
                                onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                              />
                            </FormControl>
                            <FormDescription>
                              Initial inventory count - this will be the baseline for tracking
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="distributor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Distributor</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter distributor name" 
                                {...field} 
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormDescription>
                              Name of the distributor or vendor for this asset
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                          <FormItem>
                            <FormLabel>Status</FormLabel>
                            <FormControl>
                              <Select
                                value={field.value}
                                onValueChange={field.onChange}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent className="z-[200]">
                                  <SelectItem value="active">Active</SelectItem>
                                  <SelectItem value="maintenance">Maintenance</SelectItem>
                                  <SelectItem value="retired">Retired</SelectItem>
                                  <SelectItem value="stored">Stored</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="serial_number"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Serial Number</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter serial number" {...field} value={field.value || ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="acquisition_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Acquisition Date</FormLabel>
                            <FormControl>
                              <DatePicker
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => date > new Date()}
                                captionLayout="dropdown-buttons"
                                fromYear={1970}
                                toYear={new Date().getFullYear()}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
            
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/assets')}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (isEditMode ? "Updating..." : "Creating...") : (isEditMode ? "Update Asset" : "Create Asset")}
              </Button>
            </div>
          </form>
        </Form>
      )}
    </div>
  );
} 