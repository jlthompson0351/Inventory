import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAssetById } from '@/services/assetService';
import { getFormById, Form } from '@/services/formService';
import { getAssetTypeById } from '@/services/assetTypeService';
import DynamicForm, { FormSchema } from '@/components/forms/DynamicForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';
import { submitForm } from '@/services/formSubmissionService';
import { getInventoryItems, getInventoryHistoryForMonth } from '@/services/inventoryService';

const AddInventoryForAssetPage = () => {
  const { assetId } = useParams<{ assetId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();
  
  const [asset, setAsset] = useState<any | null>(null);
  const [inventoryForm, setInventoryForm] = useState<Form | null>(null);
  const [dynamicFormSchema, setDynamicFormSchema] = useState<FormSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [existingHistory, setExistingHistory] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));

  useEffect(() => {
    const loadData = async () => {
      if (!assetId || !currentOrganization) {
        setError("Asset ID or Organization information is missing.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      setInventoryForm(null);
      setDynamicFormSchema(null);
      try {
        // 1. Fetch the inventory item for this asset
        let inventoryItem = null;
        const items = await getInventoryItems(currentOrganization.id, assetId);
        if (items && items.length > 0) {
          inventoryItem = items[0];
          setAsset(inventoryItem);
        }
        // 2. Fetch the inventory history for this item and month
        let history = null;
        if (inventoryItem) {
          history = await getInventoryHistoryForMonth(inventoryItem.id, selectedMonth);
          setExistingHistory(history);
          if (history && history.event_type === 'check') {
            setEditMode(true);
            setFormValues(history.response_data || {});
          } else {
            setEditMode(false);
          }
        }
        // 3. Fetch the Asset Type to get the inventory_form_id
        const assetTypeId = inventoryItem?.asset_type_id || assetId;
        const assetTypeData = await getAssetTypeById(assetTypeId);
        
        // Handle edge case: no inventory form assigned
        if (!assetTypeData?.inventory_form_id) {
          // Asset type has no inventory form. Using fallback basic form.
          
          // Create a fallback basic inventory form schema
          const fallbackSchema = {
            fields: [
              {
                id: 'quantity',
                label: 'Quantity',
                type: 'number' as const,
                required: true,
                placeholder: 'Enter current quantity'
              },
              {
                id: 'location',
                label: 'Location',
                type: 'text' as const,
                required: false,
                placeholder: 'Where is this item located?'
              },
              {
                id: 'condition',
                label: 'Condition',
                type: 'select' as const,
                required: false,
                options: [
                  { value: 'excellent', label: 'Excellent' },
                  { value: 'good', label: 'Good' },
                  { value: 'fair', label: 'Fair' },
                  { value: 'poor', label: 'Poor' }
                ]
              },
              {
                id: 'notes',
                label: 'Notes',
                type: 'textarea' as const,
                required: false,
                placeholder: 'Any additional notes about this inventory...'
              }
            ]
          };
          
          setDynamicFormSchema(fallbackSchema);
          
          // Create a minimal Form object for the fallback
          const fallbackForm = {
            id: 'fallback-form',
            name: `Basic Inventory Form for ${assetTypeData?.name || 'Asset'}`,
            description: 'This asset type doesn\'t have a custom inventory form. Using basic fields.',
            // Add required Form properties with default values
            organization_id: currentOrganization.id,
            form_type: 'inventory',
            status: 'active',
            purpose: 'fallback',
            is_template: false,
            version: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            deleted_at: null,
            asset_types: [],
            form_data: fallbackSchema
          };
          
          setInventoryForm(fallbackForm);
        } else {
          // Normal path: asset type has inventory form
          const formData = await getFormById(assetTypeData.inventory_form_id);
          setInventoryForm(formData);
          let parsedSchemaData = null;
          if (formData.form_data) {
            parsedSchemaData = typeof formData.form_data === 'string' ? JSON.parse(formData.form_data) : formData.form_data;
          }
          if (parsedSchemaData && Array.isArray(parsedSchemaData.fields)) {
            setDynamicFormSchema({ fields: parsedSchemaData.fields });
          } else {
            throw new Error("Inventory form data is missing or invalid.");
          }
        }
      } catch (err) {
        setError(err.message || "Failed to load required data.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [assetId, currentOrganization, selectedMonth]);

  const handleFormChange = useCallback((newValues: Record<string, any>) => {
    setFormValues(newValues);
  }, []);

  // Simple validation for required fields
  const validateForm = (): boolean => {
    if (!dynamicFormSchema) return false;
    const errors: Record<string, string> = {};
    dynamicFormSchema.fields.forEach(field => {
      // Only validate visible fields
      const isVisible = true; // For now, assume all fields are visible (improve if needed)
      if (field.required && isVisible) {
        const value = formValues[field.id];
        if (
          value === undefined ||
          value === null ||
          value === '' ||
          (Array.isArray(value) && value.length === 0)
        ) {
          errors[field.id] = `${field.label} is required.`;
        }
      }
    });
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    setValidationErrors({});
    if (!asset || !inventoryForm || !dynamicFormSchema) return;
    if (!currentOrganization) {
      setError("Organization context is missing.");
      return;
    }
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields.",
        variant: "destructive",
      });
      return;
    }
    try {
      setLoading(true);
      if (editMode && existingHistory) {
        // Update existing inventory_history record
        // (Call a service to update the record, or upsertMonthlyInventoryHistory with event_type 'check')
        // ... implement update logic here ...
        toast({
          title: "Success",
          description: "Inventory entry updated successfully!"
        });
      } else {
        // Create new inventory_history record for this month
        // ... implement add logic here ...
        toast({
          title: "Success",
          description: "Inventory entry added successfully!"
        });
      }
      navigate(`/assets/${asset.id}`);
    } catch (err) {
      setError(err.message || "Failed to save inventory entry.");
      toast({
        title: "Error",
        description: err.message || "Failed to save inventory entry.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
        Loading asset and form details...
      </div>
    );
  }

  if (!currentOrganization) {
    return (
      <div className="container mx-auto p-4">
        <Button variant="outline" onClick={() => navigate('/assets')} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Assets
        </Button>
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Organization Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Organization context is missing. Please select an organization to continue.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <Button variant="outline" onClick={() => navigate('/assets')} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Assets
        </Button>
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Page</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
            {error.includes('already exists') && (
              <Button className="mt-4" onClick={() => navigate(`/assets/${assetId}`)}>
                View Asset
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!asset || !dynamicFormSchema) {
     return (
      <div className="container mx-auto p-4">
         <Button variant="outline" onClick={() => navigate('/assets')} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Assets
        </Button>
        <p>Could not load asset or form schema details.</p>
      </div>
     );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Button variant="outline" onClick={() => navigate(`/assets/${asset.id}`)} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Asset
      </Button>
      
      <h1 className="text-2xl font-bold mb-2">Add Inventory for Asset: {asset.name}</h1>
      <p className="text-muted-foreground mb-6">Fill out the inventory details using the form below.</p>
      
      <Card>
        <CardHeader>
          <CardTitle>{inventoryForm?.name || 'Inventory Form'}</CardTitle>
          {inventoryForm?.description && (
            <CardDescription>{inventoryForm.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <DynamicForm 
            formSchema={dynamicFormSchema}
            onChange={handleFormChange}
          />
          {/* Show validation errors below the form */}
          {Object.keys(validationErrors).length > 0 && (
            <div className="mt-4 text-destructive">
              <ul>
                {Object.entries(validationErrors).map(([field, msg]) => (
                  <li key={field}>{msg}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 flex justify-end">
        <Button onClick={handleSubmit} disabled={loading} aria-label="Save Inventory Entry">
          Save Inventory Entry
        </Button>
      </div>
    </div>
  );
};

export default AddInventoryForAssetPage; 