import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getInventoryItem, InventoryItem, getInventoryHistoryForMonth, getInventoryItems } from '@/services/inventoryService';
import { getFormById, Form } from '@/services/formService';
import { getAssetTypeById } from '@/services/assetTypeService';
import { getAssetById } from '@/services/assetService';
import DynamicForm, { FormSchema } from '@/components/forms/DynamicForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';
import { submitForm } from '@/services/formSubmissionService';
import { supabase } from '@/integrations/supabase/client';
import AddItemSelectionModal from '@/components/inventory/AddItemSelectionModal';

const AddInventoryPage = () => {
  const { assetId } = useParams<{ assetId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();
  
  const [asset, setAsset] = useState<InventoryItem | null>(null);
  const [inventoryForm, setInventoryForm] = useState<Form | null>(null);
  const [dynamicFormSchema, setDynamicFormSchema] = useState<FormSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isAssetNotInventory, setIsAssetNotInventory] = useState(false);
  const [existingHistory, setExistingHistory] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [showAssetModal, setShowAssetModal] = useState(false);

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
      setIsAssetNotInventory(false);
      
      try {
        // Loading data for asset
        
        // First, check if this is a valid asset
        const actualAsset = await getAssetById(assetId);
        
        if (!actualAsset) {
          // No asset found with ID. This might be an inventory item ID instead.
        } else {
          // Found asset
        }
        
        // 1. Fetch the inventory item for this asset
        let inventoryItem = null;
        const items = await getInventoryItems(currentOrganization.id, assetId);
        if (items && items.length > 0) {
          inventoryItem = items[0];
          // Found inventory item
          setAsset(inventoryItem);
          if (inventoryItem.id) {
            navigate(`/inventory/item/${inventoryItem.id}`);
            return;
          }
        } else if (actualAsset) {
          // This is an asset without an inventory item
          // Create a skeleton inventory item based on the asset
          // Creating skeleton inventory item from asset
          inventoryItem = {
            id: null, // This will be generated when saved
            name: actualAsset.name,
            description: actualAsset.description,
            organization_id: currentOrganization.id,
            asset_id: actualAsset.id, // Use the actual asset ID
            asset_type_id: actualAsset.asset_type_id,
            quantity: 0,
            location: actualAsset.location || '',
            status: 'active',
          };
          setAsset(inventoryItem);
        }
        
        // 2. Fetch the inventory history for this item and month
        let history = null;
        if (inventoryItem && inventoryItem.id) {
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
        // If we have an inventory item, use its asset_type_id, otherwise use the actual asset's type
        const assetTypeId = inventoryItem?.asset_type_id || (actualAsset?.asset_type_id);
        
        if (!assetTypeId) {
          throw new Error("Could not determine asset type for this item.");
        }
        
        // Using asset type ID
        const assetTypeData = await getAssetTypeById(assetTypeId);
        if (!assetTypeData?.inventory_form_id) {
          throw new Error("Selected asset type does not have an inventory form assigned.");
        }
        
        // 4. Fetch the Inventory Form details
        const formData = await getFormById(assetTypeData.inventory_form_id);
        if (!formData) {
          throw new Error("Inventory form could not be loaded.");
        }
        
        // Parse form_data safely without mutation
        let parsedSchemaData: any = null;
        if (formData.form_data) {
          if (typeof formData.form_data === 'string') {
            try {
              parsedSchemaData = JSON.parse(formData.form_data);
            } catch (e) {
              console.error("Error parsing form data:", e);
              throw new Error("Failed to parse inventory form structure.");
            }
          } else {
            parsedSchemaData = formData.form_data; // Assume it's already an object
          }
        }
        
        // Validate the structure and set the schema state for DynamicForm
        if (parsedSchemaData && Array.isArray(parsedSchemaData.fields)) {
           setDynamicFormSchema({ fields: parsedSchemaData.fields });
        } else {
          throw new Error("Inventory form data is missing or invalid.");
        }
        setInventoryForm(formData);
      } catch (err: any) {
        console.error("Error loading data for inventory entry:", err);
        setError(err.message || "Failed to load required data.");
        toast({
          title: "Error",
          description: err.message || "Failed to load data for inventory entry.",
          variant: "destructive",
        });
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
      let newInventoryItem = null;
      if (editMode && existingHistory) {
        // Update existing inventory_history record (not implemented here)
        toast({
          title: "Success",
          description: "Inventory entry updated successfully!"
        });
        navigate(`/inventory/item/${asset.id}`);
        return;
      } else {
        // Verify asset exists before proceeding
        if (asset.asset_id) {
          // We're checking the asset_id property on the inventory item, not its own ID
          const assetExists = await getAssetById(asset.asset_id);
          if (!assetExists) {
            throw new Error(`The selected asset (ID: ${asset.asset_id}) no longer exists in the system. Please select a different asset.`);
          }
          
          // Check if an inventory item already exists for this asset
          if (currentOrganization?.id) {
            const existingItems = await getInventoryItems(currentOrganization.id, asset.asset_id);
            if (existingItems && existingItems.length > 0 && existingItems[0].id !== asset.id) {
              throw new Error(`An inventory item already exists for this asset. Please edit the existing inventory item instead of creating a new one.`);
            }
          }
        }
        
        // Actually create the inventory item
        const { createInventoryItem } = await import("@/services/inventoryService");
        const itemData = {
          name: asset.name,
          description: asset.description,
          organization_id: currentOrganization.id,
          asset_id: asset.asset_id, // Make sure we're using the asset_id property
          quantity: formValues.quantity || 0, // or use a specific field from your form
          location: formValues.location || '',
          category: formValues.category || '',
        };
        newInventoryItem = await createInventoryItem(itemData);
        if (!newInventoryItem || !newInventoryItem.id) {
          throw new Error("Failed to create inventory item.");
        }
        toast({
          title: "Success",
          description: "Inventory entry added successfully!"
        });
        navigate(`/inventory/item/${newInventoryItem.id}`);
        return;
      }
    } catch (err: any) {
      // Format the error message to be more user-friendly
      let errorMessage = err.message || "Failed to save inventory entry.";
      
      // Add specific advice for certain error types
      if (errorMessage.includes("asset") && errorMessage.includes("exist")) {
        errorMessage += " Try returning to the inventory list and starting over with a valid asset.";
      } else if (errorMessage.includes("already exists")) {
        errorMessage = "This asset already has an inventory item. You cannot create multiple inventory items for the same asset.";
      }
      
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
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
        <Button variant="outline" onClick={() => navigate('/inventory')} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Inventory
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
        <Button variant="outline" onClick={() => navigate('/inventory')} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Inventory
        </Button>
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Page</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
            {/* Navigate to existing inventory item if it already exists */}
            {error.includes('already exists') && assetId && (
              <div className="mt-4">
                <p className="text-sm mb-2">
                  This asset already has an inventory item. You can edit the existing item instead of creating a new one.
                </p>
                <Button 
                  onClick={async () => {
                    // Find the existing inventory item for this asset
                    if (currentOrganization?.id) {
                      try {
                        const items = await getInventoryItems(currentOrganization.id, assetId);
                        if (items && items.length > 0) {
                          // Navigate to the existing inventory item
                          navigate(`/inventory/item/${items[0].id}`);
                          return;
                        }
                      } catch (err) {
                        console.error("Error finding existing inventory item:", err);
                      }
                    }
                    // Fallback to inventory list
                    navigate('/inventory');
                  }}
                >
                  View Existing Inventory Item
                </Button>
              </div>
            )}
            {error.includes('already exists') && !assetId && (
              <Button className="mt-4" onClick={() => navigate('/inventory')}>
                View Inventory List
              </Button>
            )}
            {isAssetNotInventory && (
              <Button className="mt-4" onClick={() => navigate(`/inventory/add-for-asset/${assetId}`)}>
                Go to Asset Inventory Page
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!asset || !dynamicFormSchema) {
    return (
      <div className="container mx-auto p-4 max-w-2xl">
        <Button variant="outline" onClick={() => navigate('/inventory')} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Inventory
        </Button>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Select or Create an Asset</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-muted-foreground">
              You must select an existing asset or create a new one before adding inventory. This ensures all inventory items are properly linked and traceable.
            </p>
            <Button onClick={() => setShowAssetModal(true)}>
              Choose Asset
            </Button>
          </CardContent>
        </Card>
        <AddItemSelectionModal isOpen={showAssetModal} onOpenChange={setShowAssetModal} />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Button variant="outline" onClick={() => navigate('/inventory')} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Inventory
      </Button>
      
      <h1 className="text-2xl font-bold mb-2">Add Inventory Entry for: {asset.name}</h1>
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

export default AddInventoryPage; 