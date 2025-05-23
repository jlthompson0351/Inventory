import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, ArrowLeft, Clipboard, ClipboardCheck } from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';
import { supabase } from '@/integrations/supabase/client';
import { getAssetById } from '@/services/assetService';
import { recordNewInventoryCheck } from '@/services/inventoryService';
import { getFormById } from '@/services/formService';
import DynamicForm from '@/components/forms/DynamicForm';

const conditionOptions = [
  { value: 'excellent', label: 'Excellent' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'unusable', label: 'Unusable' }
];

// Helper function copied from inventoryService.ts (or should be imported if made available)
function computeNewInventoryQuantity(
  baseQuantity: number, 
  formSchema: any, // { fields: [{id, inventory_action, type}, ...] }
  formValues: any  // { field_id: value, ... }
) {
  let newQuantity = baseQuantity;
  let foundAction = false;
  
  if (!formSchema || !formSchema.fields || !formValues) {
    return { newQuantity: baseQuantity, foundAction: false };
  }

  const setActionField = formSchema.fields.find(
    (field: any) => field.inventory_action === 'set' && typeof formValues[field.id] === 'number'
  );

  if (setActionField) {
    newQuantity = formValues[setActionField.id];
    foundAction = true;
  } else { // Only process add/subtract if no 'set' action took definitive control
    for (const field of formSchema.fields) {
      const action = field.inventory_action;
      const value = formValues[field.id];

      if (typeof value === 'number') {
        if (action === 'add') {
          newQuantity += value;
          foundAction = true;
        } else if (action === 'subtract') {
          newQuantity -= value;
          foundAction = true;
        }
      }
    }
  }
  return { newQuantity, foundAction };
}

const InventoryCheck = () => {
  const { assetId } = useParams<{ assetId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();
  
  const [asset, setAsset] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    quantity: 0,
    condition: '',
    location: '',
    notes: '',
  });
  const [lastInventory, setLastInventory] = useState<any | null>(null);
  const [inventoryFormSchema, setInventoryFormSchema] = useState<any | null>(null);
  const [dynamicFormValues, setDynamicFormValues] = useState<Record<string, any>>({});
  
  useEffect(() => {
    if (assetId && currentOrganization) {
      fetchAssetData();
    }
  }, [assetId, currentOrganization]);
  
  const fetchAssetData = async () => {
    try {
      setLoading(true);
      
      // Fetch asset data
      const assetData = await getAssetById(assetId!);
      if (!assetData) {
        toast({
          title: "Error",
          description: "Asset not found",
          variant: "destructive",
        });
        navigate('/assets');
        return;
      }
      
      setAsset(assetData);
      
      // Set initial location, notes, condition from asset if available
      let initialLocation = '';
      let initialNotes = '';
      let initialCondition = '';
      let initialStaticQuantity = 0;

      if (assetData.metadata && typeof assetData.metadata === 'object' && !Array.isArray(assetData.metadata)) {
        const meta = assetData.metadata as Record<string, any>;
        initialLocation = meta.location || '';
        initialNotes = meta.notes || '';
        initialCondition = meta.condition || '';
        initialStaticQuantity = typeof meta.current_inventory === 'number' ? meta.current_inventory : 0;
      }
      initialLocation = assetData.location || initialLocation; // asset.location can override metadata.location

      setFormData(prev => ({
        ...prev,
        quantity: initialStaticQuantity, // For static fallback form
        location: initialLocation,
        notes: initialNotes,
        condition: initialCondition
      }));

      // Fetch the asset type to get the inventory_form_id
      if (assetData.asset_type_id) {
        const { data: assetTypeData, error: assetTypeError } = await supabase
          .from('asset_types')
          .select('inventory_form_id')
          .eq('id', assetData.asset_type_id)
          .single();

        if (assetTypeError) {
          console.error('Error fetching asset type:', assetTypeError);
          toast({ title: "Error", description: "Could not load asset type details.", variant: "destructive" });
        } else if (assetTypeData && assetTypeData.inventory_form_id) {
          const formDef = await getFormById(assetTypeData.inventory_form_id);
          if (formDef && formDef.form_data) {
            try {
              const schema = typeof formDef.form_data === 'string' ? JSON.parse(formDef.form_data) : formDef.form_data;
              setInventoryFormSchema(schema);
            } catch (e) {
              console.error("Error parsing inventory form schema", e);
              toast({ title: "Error", description: "Could not parse inventory form.", variant: "destructive" });
            }
          }
        } else {
          toast({ title: "Info", description: "No specific inventory form linked to this asset type.", variant: "default" });
        }
      }
      
      // Fetch the most recent inventory record for reference
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('asset_id', assetId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
        
      if (inventoryError) {
        console.error('Error fetching inventory data:', inventoryError);
      } else if (inventoryData) {
        setLastInventory(inventoryData);
        
        // Pre-fill static form data further from lastInventory, if not already better set by assetData
        setFormData(prev => ({
          quantity: prev.quantity || inventoryData.quantity || 0,
          condition: prev.condition || (inventoryData.metadata && typeof inventoryData.metadata === 'object' && !Array.isArray(inventoryData.metadata) && (inventoryData.metadata as Record<string,any>).condition as string) || '',
          location: prev.location || inventoryData.location || '',
          notes: prev.notes // Notes are generally new per check, so don't override from last inventory unless prev.notes is empty
        }));
      }
    } catch (error) {
      console.error('Error fetching asset data:', error);
      toast({
        title: "Error",
        description: "Failed to load asset data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleDynamicFormChange = (values: Record<string, any>) => {
    setDynamicFormValues(values);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!assetId || !currentOrganization || !asset) {
      toast({
        title: "Error",
        description: "Missing required data",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setSubmitting(true);
      
      let finalQuantity = 0;
      let notes = formData.notes; 
      let location = formData.location; 
      let condition = formData.condition; 
      let status = asset.status;
      let responseData = { ...dynamicFormValues }; // Start with dynamic form values

      if (inventoryFormSchema && Object.keys(dynamicFormValues).length > 0) {
        const { newQuantity, foundAction } = computeNewInventoryQuantity(
          lastInventory?.quantity || (asset.metadata && typeof asset.metadata === 'object' && (asset.metadata as Record<string,any>).current_inventory) || 0, // Base quantity
          inventoryFormSchema,
          dynamicFormValues
        );
        finalQuantity = newQuantity;

        // If dynamic form has fields for these, they are already in dynamicFormValues / responseData
        // If not, the static formData values will be used for notes, location, condition for the history record.
        // We can ensure they are part of responseData if not already overridden by a dynamic field.
        if (dynamicFormValues.notes === undefined) responseData.notes = notes;
        if (dynamicFormValues.location === undefined) responseData.location = location;
        if (dynamicFormValues.condition === undefined) responseData.condition = condition;

      } else {
        finalQuantity = Number(formData.quantity);
        // If using static form, ensure static fields are in responseData for logging
        responseData.quantity = finalQuantity;
        responseData.notes = notes;
        responseData.location = location;
        responseData.condition = condition;
      }
      
      await recordNewInventoryCheck(
        assetId,
        {
          quantity: finalQuantity, // This is the key field for inventory_items update
          // location, notes, status are taken from response_data or inventoryItem by recordNewInventoryCheck
          status: status, // Pass overall asset status
          check_date: new Date(), 
          response_data: responseData, 
          form_schema: inventoryFormSchema 
        }
      );
      
      // Update the asset's metadata (current_inventory and last_inventory_check)
      // This might be redundant if recordNewInventoryCheck already updates inventory_items.quantity
      // and assets.metadata.current_inventory is just a denormalized view of that.
      // For now, keeping it as it was, but this could be reviewed.
      const updatedMetadata = {
        ...(asset.metadata || {}),
        current_inventory: finalQuantity, // Update with the computed/submitted quantity
        last_inventory_check: new Date().toISOString(),
        // Persist other dynamic form values to asset metadata if needed (optional)
        // ...dynamicFormValues 
      };
      
      await supabase
        .from('assets')
        .update({ 
          metadata: updatedMetadata,
          location: location || asset.location // Update asset location if changed
        })
        .eq('id', assetId);
      
      toast({
        title: "Success",
        description: "Inventory check completed successfully",
      });
      
      navigate(`/assets/${assetId}`);
    } catch (error) {
      console.error('Error saving inventory check:', error);
      toast({
        title: "Error",
        description: "Failed to save inventory check",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin mr-2" />
        <span>Loading asset data...</span>
      </div>
    );
  }
  
  if (!asset) {
    return (
      <div className="container mx-auto p-4">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Asset Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p>The requested asset could not be found.</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => navigate('/assets')}>Return to Assets</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <Button 
        variant="ghost" 
        onClick={() => navigate(`/assets/${assetId}`)} 
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Asset
      </Button>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ClipboardCheck className="mr-2 h-5 w-5 text-primary" />
            Inventory Check: {asset.name}
          </CardTitle>
          <CardDescription>
            {inventoryFormSchema 
              ? `Complete the inventory form for this ${asset.asset_type?.name || 'asset'}.` 
              : "Record the current inventory status for this asset"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Last inventory record display - can be kept or adapted */}
          {lastInventory && (
            <div className="p-4 bg-muted rounded-md mb-6">
              <h3 className="text-sm font-medium mb-2">Last Known Inventory State</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Quantity: <span className="font-medium">{lastInventory.quantity}</span></div>
                {lastInventory.metadata?.condition && (
                  <div>Condition: <span className="font-medium capitalize">{lastInventory.metadata.condition}</span></div>
                )}
                 {lastInventory.location && (
                  <div>Location: <span className="font-medium">{lastInventory.location}</span></div>
                )}
                <div>Date: <span className="font-medium">{new Date(lastInventory.created_at).toLocaleDateString()}</span></div>
              </div>
            </div>
          )}

          {inventoryFormSchema ? (
            <DynamicForm 
              formSchema={inventoryFormSchema} 
              initialValues={dynamicFormValues} 
              onChange={handleDynamicFormChange} 
            />
          ) : (
            // Fallback to static form if no dynamic schema
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Current Quantity</Label>
                  <Input
                    id="quantity"
                    name="quantity"
                    type="number"
                    value={formData.quantity}
                    onChange={handleChange}
                    min={0}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="condition">Condition</Label>
                  <Select
                    value={formData.condition}
                    onValueChange={(value) => handleSelectChange('condition', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                    <SelectContent>
                      {conditionOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="Where is this asset currently located?"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    placeholder="Add any notes about the current inventory status"
                    rows={3}
                  />
                </div>
              </div>
            </form>
          )}
            
          <div className="flex justify-end mt-6">
            <Button 
              type="button" // Changed from submit if form is outside
              onClick={handleSubmit} // Centralized submit logic
              disabled={submitting}
              className="flex items-center"
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {submitting ? 'Saving...' : 'Complete Inventory Check'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryCheck; 