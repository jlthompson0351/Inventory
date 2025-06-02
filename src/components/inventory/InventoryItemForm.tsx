import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FormRenderer } from "@/components/ui/form-renderer";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { Form, FormItem, FormLabel, FormControl, FormMessage, FormField } from "@/components/ui/form";

import { supabase } from "@/integrations/supabase/client";
import { 
  AssetType, 
  getAssetTypes 
} from "@/services/assetTypeService";
import {
  createInventoryItem,
  updateInventoryItem,
  getInventoryItem,
  generateBarcode,
  getInventoryCategories,
  upsertMonthlyInventoryHistory,
  getInventoryHistoryForMonth
} from "@/services/inventoryService";
import {
  getFormById,
  getFormWithRelatedData
} from "@/services/formService";
import { useOrganization } from "@/hooks/useOrganization";
import { Calculator, Eye, EyeOff } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

// Form schema with validation
const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  quantity: z.coerce.number().default(0),
  location: z.string().optional(),
  category: z.string().optional(),
  asset_type_id: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface InventoryItemFormProps {
  itemId?: string;
  initialData?: any;
  onSuccess?: (data: any) => void;
  selectedMonth?: string;
  isAdmin?: boolean;
}

export function InventoryItemForm({ 
  itemId, 
  initialData, 
  onSuccess, 
  selectedMonth, 
  isAdmin 
}: InventoryItemFormProps) {
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);
  const [selectedAssetType, setSelectedAssetType] = useState<AssetType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState("basic");
  const [formTemplate, setFormTemplate] = useState<any>(null);
  const [validationRules, setValidationRules] = useState<any[]>([]);
  const [fieldDependencies, setFieldDependencies] = useState<any[]>([]);
  const [dynamicFormData, setDynamicFormData] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [currentMonthHistory, setCurrentMonthHistory] = useState<any[]>([]);
  const [eventType, setEventType] = useState<'intake' | 'addition' | 'audit' | 'adjustment' | 'removal' | 'transfer' | 'disposal' | 'deleted' | 'check'>('intake');
  const [showCalculatedFields, setShowCalculatedFields] = useState(false);
  
  // Initialize form with default values or data from an existing item
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      sku: initialData?.sku || "",
      barcode: initialData?.barcode || "",
      quantity: initialData?.quantity || 0,
      location: initialData?.location || "",
      category: initialData?.category || "",
      asset_type_id: initialData?.asset_type_id || "",
    },
  });
  
  useEffect(() => {
    if (currentOrganization?.id) {
      loadAssetTypes();
      
      if (itemId) {
        loadInventoryItem();
      } else {
        setIsLoading(false);
      }
    }
  }, [currentOrganization, itemId]);
  
  useEffect(() => {
    const assetTypeId = form.watch("asset_type_id");
    if (assetTypeId && assetTypes.length > 0) {
      const assetType = assetTypes.find(at => at.id === assetTypeId);
      if (assetType) {
        setSelectedAssetType(assetType);
        if (assetType.intake_form_id) {
          loadForm(assetType.intake_form_id);
        }
      }
    }
  }, [form, assetTypes]);
  
  useEffect(() => {
    if (currentOrganization) {
      loadCategories();
    }
  }, [currentOrganization]);
  
  useEffect(() => {
    const fetchMonthHistory = async () => {
      if (itemId && selectedMonth) {
        try {
          const history = await getInventoryHistoryForMonth(itemId, selectedMonth);
          setCurrentMonthHistory(Array.isArray(history) ? history : history ? [history] : []);
        } catch (e) {
          setCurrentMonthHistory([]);
        }
      } else {
        setCurrentMonthHistory([]);
      }
    };
    fetchMonthHistory();
  }, [itemId, selectedMonth]);
  
  const loadAssetTypes = async () => {
    if (!currentOrganization?.id) return;
    
    try {
      const data = await getAssetTypes(currentOrganization.id);
      setAssetTypes(data);
    } catch (error) {
      console.error("Error loading asset types:", error);
      toast({
        title: "Error",
        description: "Failed to load asset types",
        variant: "destructive",
      });
    }
  };
  
  const loadInventoryItem = async () => {
    if (!itemId || !currentOrganization?.id) return;
    
    setIsLoading(true);
    try {
      const data = await getInventoryItem(itemId);
      if (data) {
        form.reset({
          name: data.name,
          description: data.description,
          sku: data.sku,
          barcode: data.barcode,
          quantity: data.quantity,
          location: data.location,
          category: data.category,
          asset_type_id: data.asset_type_id,
          current_price: data.current_price,
          currency: data.currency,
          ...(data.metadata || {})
        });
        
        if (data.metadata) {
          setDynamicFormData(data.metadata);
        }
      }
    } catch (error) {
      console.error("Error loading inventory item:", error);
      toast({
        title: "Error",
        description: "Failed to load inventory item",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const loadForm = async (formId: string) => {
    try {
      const formData = await getFormWithRelatedData(formId);
      setFormTemplate(formData.form);
      setValidationRules(formData.validationRules);
      setFieldDependencies(formData.fieldDependencies);
    } catch (error) {
      console.error("Error loading form:", error);
    }
  };
  
  const loadCategories = async () => {
    if (!currentOrganization) return;
    try {
      const categoriesData = await getInventoryCategories(supabase, currentOrganization.id);
      if (categoriesData) {
        setCategories(categoriesData);
      }
    } catch (error) {
      console.error("Error loading categories:", error);
    }
  };
  
  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    
    try {
      // Handle custom category
      if (showNewCategory && newCategory.trim()) {
        values.category = newCategory.trim();
      }
      
      let result;
      let inventoryItemId = itemId;
      
      if (itemId) {
        // Update existing inventory item
        result = await updateInventoryItem(itemId, values);
        inventoryItemId = itemId;
        toast({
          title: "Success",
          description: "Inventory item updated successfully",
        });
      } else {
        // Create new inventory item
        result = await createInventoryItem({
          ...values,
          name: values.name || "",
          organization_id: currentOrganization.id,
          event_type: eventType,
        });
        inventoryItemId = result?.id;
        toast({
          title: "Success",
          description: "Inventory item created successfully",
        });
      }
      
      // Upsert inventory_history for the selected month
      if (inventoryItemId && currentOrganization?.id) {
        const user = await supabase.auth.getUser();
        const userId = user.data.user?.id;
        const checkDate = selectedMonth ? new Date(selectedMonth + "-01") : new Date();
        await upsertMonthlyInventoryHistory({
          organization_id: currentOrganization.id,
          inventory_item_id: inventoryItemId,
          location: values.location || "",
          quantity: values.quantity,
          check_type: "periodic",
          notes: isAdmin ? `Admin edit by ${userId} at ${new Date().toISOString()}` : "",
          status: "active",
          check_date: checkDate,
          user_id: userId,
          event_type: eventType,
        });
      }
      
      if (onSuccess && result) {
        onSuccess(result);
      }
    } catch (error) {
      console.error("Error saving inventory item:", error);
      toast({
        title: "Error",
        description: "Failed to save inventory item",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Add a helper to check if only initial inventory exists for the month
  const hasOnlyInitialInventory = (history) => {
    if (!history || !Array.isArray(history)) return false;
    return history.length === 1 && history[0].check_type === 'initial';
  };
  
  // Add a helper to get a display label for event_type
  const getEventTypeLabel = (eventType) => {
    if (eventType === 'intake') return 'Intake';
    if (eventType === 'check') return 'Inventory Check';
    if (eventType === 'adjustment') return 'Adjustment';
    return eventType.charAt(0).toUpperCase() + eventType.slice(1);
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return (
    <div>
      <Tabs value={currentTab} onValueChange={setCurrentTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="basic">Basic Information</TabsTrigger>
          {formTemplate && <TabsTrigger value="dynamic">Asset Type Form</TabsTrigger>}
        </TabsList>
        
        <TabsContent value="basic">
          <Card>
            <CardHeader>
              <CardTitle>{itemId ? "Edit Inventory Item" : "Add New Inventory Item"}</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Show message if only initial intake exists for the month */}
              {selectedMonth && hasOnlyInitialInventory(currentMonthHistory) && (
                <div className="mb-4 p-2 bg-amber-50 border border-amber-200 rounded">
                  <span className="text-amber-700 font-semibold">This is the initial intake record. You can add a real inventory check for this month.</span>
                </div>
              )}
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name*</FormLabel>
                          <FormControl>
                            <Input placeholder="Item name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantity</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="sku"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SKU</FormLabel>
                          <FormControl>
                            <Input placeholder="Stock keeping unit" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="barcode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Barcode</FormLabel>
                          <FormControl>
                            <Input placeholder="Item barcode" {...field} />
                          </FormControl>
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
                            <Input placeholder="Storage location" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <FormControl>
                            {showNewCategory ? (
                              <div className="flex space-x-2">
                                <Input
                                  placeholder="New category"
                                  value={newCategory}
                                  onChange={(e) => setNewCategory(e.target.value)}
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => setShowNewCategory(false)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <div className="flex space-x-2">
                                <Select
                                  value={field.value || ""}
                                  onValueChange={field.onChange}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select category" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {categories.map((category) => (
                                      <SelectItem key={category} value={category}>
                                        {category}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={() => setShowNewCategory(true)}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Enter a description of the item" 
                            className="min-h-[120px]" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="event_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Event Type</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select event type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="intake">Intake</SelectItem>
                              <SelectItem value="addition">Addition</SelectItem>
                              <SelectItem value="audit">Audit</SelectItem>
                              <SelectItem value="adjustment">Adjustment</SelectItem>
                              <SelectItem value="removal">Removal</SelectItem>
                              <SelectItem value="transfer">Transfer</SelectItem>
                              <SelectItem value="disposal">Disposal</SelectItem>
                              <SelectItem value="deleted">Deleted</SelectItem>
                              <SelectItem value="check">Inventory Check</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end">
                    <Button type="submit" disabled={loading}>
                      {loading && <Spinner className="mr-2" />}
                      {itemId ? "Update Item" : "Create Item"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        
        {formTemplate && (
          <TabsContent value="dynamic">
            <Card>
              <CardHeader>
                <CardTitle>{formTemplate.name}</CardTitle>
                {formTemplate.description && (
                  <p className="text-sm text-muted-foreground">{formTemplate.description}</p>
                )}
              </CardHeader>
              <CardContent>
                {/* Toggle for showing calculated fields and formulas */}
                {formTemplate?.form_data && (formTemplate.form_data as any).fields && 
                 (formTemplate.form_data as any).fields.some((field: any) => field.type === 'calculated') && (
                  <div className="flex items-center justify-between mb-4 p-3 bg-muted/30 rounded-lg border">
                    <div className="flex items-center gap-2">
                      <Calculator className="h-4 w-4 text-primary" />
                      <Label htmlFor="show-formulas-inventory" className="text-sm font-medium">
                        Show Conversion & Formula Fields
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="show-formulas-inventory"
                        checked={showCalculatedFields}
                        onCheckedChange={setShowCalculatedFields}
                      />
                      {showCalculatedFields ? (
                        <Eye className="h-4 w-4 text-primary" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                )}
                
                {formTemplate?.fields && Array.isArray(formTemplate.fields) && formTemplate.fields.length > 0 ? (
                  <FormRenderer
                    form={formTemplate}
                    validationRules={validationRules}
                    fieldDependencies={fieldDependencies}
                    onSubmit={setDynamicFormData}
                    initialData={dynamicFormData}
                    showCalculatedFields={showCalculatedFields}
                  />
                ) : (
                  <div className="text-center p-4 border border-dashed rounded-md text-muted-foreground">
                    No form schema is configured or the schema is invalid for this asset type.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
} 