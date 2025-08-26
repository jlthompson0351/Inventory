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
import { getAssetWithInventory, recordAssetInventoryCheck } from '@/services/assetInventoryService';
import { getFormById } from '@/services/formService';
import { getAssetTypeById } from '@/services/assetTypeService';
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
      
      // Use new asset-centric service
      const assetData = await getAssetWithInventory(assetId!);
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
      
      // Pre-fill form with current data
      setFormData(prev => ({
        ...prev,
        quantity: assetData.current_quantity || 0,
        location: assetData.asset_location || '',
        condition: '',
        notes: ''
      }));

      // Load inventory form if asset type has one
      if (assetData.asset_type_id) {
        const assetTypeData = await getAssetTypeById(assetData.asset_type_id);
        
        if (assetTypeData?.inventory_form_id) {
          const formDef = await getFormById(assetTypeData.inventory_form_id);
          if (formDef?.form_data) {
            try {
              const schema = typeof formDef.form_data === 'string' ? JSON.parse(formDef.form_data) : formDef.form_data;
              setInventoryFormSchema(schema);
            } catch (e) {
              console.error("Error parsing inventory form schema", e);
              toast({ 
                title: "Error", 
                description: "Could not parse inventory form.", 
                variant: "destructive" 
              });
            }
          }
        }
      }
      
      // Set last inventory reference for display
      if (assetData.has_inventory) {
        setLastInventory({
          quantity: assetData.current_quantity,
          location: assetData.asset_location,
          created_at: assetData.last_check_date,
          metadata: { condition: assetData.inventory_status }
        });
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
    
    if (!assetId) {
      toast({
        title: "Error",
        description: "Missing asset ID",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setSubmitting(true);
      
      // Prepare check data
      const checkData = {
        quantity: Number(formData.quantity),
        location: formData.location,
        condition: formData.condition,
        notes: formData.notes,
        status: formData.status || 'active',
        response_data: Object.keys(dynamicFormValues).length > 0 ? {
          ...dynamicFormValues,
          // Include static form data as fallback
          _static_quantity: formData.quantity,
          _static_location: formData.location,
          _static_condition: formData.condition,
          _static_notes: formData.notes
        } : {
          quantity: formData.quantity,
          location: formData.location,
          condition: formData.condition,
          notes: formData.notes
        },
        form_schema: inventoryFormSchema
      };
      
      // Use new asset-centric service
      const result = await recordAssetInventoryCheck(assetId, checkData);
      
      if (result.success) {
        toast({
          title: "Success",
          description: result.message,
        });
        
        // Navigate back to asset detail page
        navigate(`/assets/${assetId}`);
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        });
      }
      
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
            Inventory Check: {asset.asset_name}
          </CardTitle>
          <CardDescription>
            {inventoryFormSchema 
              ? `Complete the inventory form for this ${asset.asset_type_name || 'asset'}.` 
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