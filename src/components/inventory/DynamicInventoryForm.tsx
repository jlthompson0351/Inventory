import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { useOrganization } from "@/hooks/useOrganization";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { FormRenderer } from "@/components/ui/form-renderer";
import { 
  getAssetById, 
  Asset 
} from "@/services/assetService";
import {
  getAssetTypeById,
  AssetType
} from "@/services/assetTypeService";
import {
  getFormById
} from "@/services/formService";
import {
  createInventoryItem, 
  InventoryItemInsert
} from "@/services/inventoryService";
import DynamicForm from "@/components/forms/DynamicForm";

export function DynamicInventoryForm() {
  const { assetId } = useParams<{ assetId: string }>();
  const navigate = useNavigate();
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();
  
  const [asset, setAsset] = useState<Asset | null>(null);
  const [assetType, setAssetType] = useState<AssetType | null>(null);
  const [formTemplate, setFormTemplate] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentOrganization?.id && assetId) {
      loadAssetDetails();
    }
  }, [currentOrganization?.id, assetId]);

  const loadAssetDetails = async () => {
    if (!currentOrganization?.id || !assetId) return;
    
    setLoading(true);
    try {
      // Load asset details
      const assetData = await getAssetById(assetId);
      setAsset(assetData);
      
      if (assetData?.asset_type_id) {
        // Load asset type details
        const typeData = await getAssetTypeById(assetData.asset_type_id);
        setAssetType(typeData);
        
        if (typeData?.inventory_form_id) {
          // Load form template
          const formData = await getFormById(typeData.inventory_form_id);
          setFormTemplate(formData);
        }
      }
    } catch (error) {
      console.error("Error loading asset details:", error);
      toast({
        title: "Error",
        description: "Failed to load asset details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (data: Record<string, any>) => {
    setFormData(data);
  };

  const handleSubmit = async () => {
    if (!currentOrganization?.id || !asset || !assetType) {
      toast({
        title: "Error",
        description: "Missing required information",
        variant: "destructive",
      });
      return;
    }
    
    setSaving(true);
    try {
      // Prepare inventory item data
      const itemData: InventoryItemInsert = {
        organization_id: currentOrganization.id,
        asset_id: asset.id,
        asset_type_id: assetType.id,
        name: asset.name,
        description: asset.description || "",
        quantity: formData.quantity ? parseInt(formData.quantity) : 0,
        metadata: formData,
      };
      
      // Create the inventory item
      await createInventoryItem(itemData);
      
      toast({
        title: "Success",
        description: "Inventory item added successfully"
      });
      
      // Navigate back to inventory list
      navigate("/inventory");
    } catch (error) {
      console.error("Error creating inventory item:", error);
      toast({
        title: "Error",
        description: "Failed to create inventory item",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
        <p>Loading form...</p>
      </div>
    );
  }

  if (!asset || !assetType) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold mb-2">Asset Not Found</h2>
        <p className="text-muted-foreground mb-4">
          The asset you're looking for could not be found.
        </p>
        <Button onClick={() => navigate("/inventory/browse-assets")}>
          Browse Asset Types
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate(-1)}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            Add Inventory for {asset.name}
          </h1>
          <p className="text-muted-foreground">
            Asset Type: {assetType.name}
          </p>
        </div>
      </div>

      <Tabs defaultValue="form">
        <TabsList>
          <TabsTrigger value="form">Inventory Form</TabsTrigger>
          <TabsTrigger value="details">Asset Details</TabsTrigger>
        </TabsList>
        
        <TabsContent value="form" className="space-y-4 pt-4">
          {formTemplate ? (
            <Card>
              <CardHeader>
                <CardTitle>{formTemplate.name}</CardTitle>
                <CardDescription>
                  {formTemplate.description || "Fill out the inventory details below"}
                </CardDescription>
              </CardHeader>
              <Separator />
              <CardContent className="pt-6">
                <DynamicForm
                  formSchema={formTemplate.form_data}
                  initialValues={formData}
                  onChange={handleFormChange}
                />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    No custom form template is available for this asset type.
                    Please use the standard inventory form.
                  </p>
                  <Button 
                    variant="outline"
                    onClick={() => navigate(`/inventory/standard/${assetId}`)}
                  >
                    Use Standard Form
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Inventory
                </>
              )}
            </Button>
          </div>
        </TabsContent>
        
        <TabsContent value="details" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Asset Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Asset Name
                  </dt>
                  <dd className="mt-1 text-sm">{asset.name}</dd>
                </div>
                
                {asset.asset_id && (
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">
                      Asset ID
                    </dt>
                    <dd className="mt-1 text-sm">{asset.asset_id}</dd>
                  </div>
                )}
                
                {asset.description && (
                  <div className="col-span-2">
                    <dt className="text-sm font-medium text-muted-foreground">
                      Description
                    </dt>
                    <dd className="mt-1 text-sm">{asset.description}</dd>
                  </div>
                )}
                
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">
                    Asset Type
                  </dt>
                  <dd className="mt-1 text-sm">{assetType.name}</dd>
                </div>
                
                {asset.location && (
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">
                      Location
                    </dt>
                    <dd className="mt-1 text-sm">{asset.location}</dd>
                  </div>
                )}
                
                {asset.created_at && (
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">
                      Created
                    </dt>
                    <dd className="mt-1 text-sm">
                      {new Date(asset.created_at).toLocaleDateString()}
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 