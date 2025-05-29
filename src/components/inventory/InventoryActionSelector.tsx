import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Package, ClipboardCheck, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { useOrganization } from "@/hooks/useOrganization";
import { getAssetById, Asset } from "@/services/assetService";
import { getAssetTypeById, AssetType } from "@/services/assetTypeService";
import { getFormById, Form } from "@/services/formService";

export function InventoryActionSelector() {
  const { assetId } = useParams<{ assetId: string }>();
  const navigate = useNavigate();
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();
  
  const [asset, setAsset] = useState<Asset | null>(null);
  const [assetType, setAssetType] = useState<AssetType | null>(null);
  const [intakeForm, setIntakeForm] = useState<Form | null>(null);
  const [inventoryForm, setInventoryForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentOrganization?.id && assetId) {
      loadAssetData();
    }
  }, [currentOrganization?.id, assetId]);

  const loadAssetData = async () => {
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
        
        // Load the linked forms
        if (typeData?.intake_form_id) {
          try {
            const intakeFormData = await getFormById(typeData.intake_form_id);
            setIntakeForm(intakeFormData);
          } catch (error) {
            console.error("Error loading intake form:", error);
          }
        }
        
        if (typeData?.inventory_form_id) {
          try {
            const inventoryFormData = await getFormById(typeData.inventory_form_id);
            setInventoryForm(inventoryFormData);
          } catch (error) {
            console.error("Error loading inventory form:", error);
          }
        }
      }
    } catch (error) {
      console.error("Error loading asset data:", error);
      toast({
        title: "Error",
        description: "Failed to load asset details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleIntakeAction = () => {
    // Navigate to intake form (for adding new items)
    if (assetType?.intake_form_id) {
      navigate(`/forms/submit/${assetType.intake_form_id}?asset_id=${assetId}&type=intake`, {
        state: {
          assetId: assetId,
          assetName: asset?.name,
          assetTypeId: asset?.asset_type_id,
          formType: 'intake'
        }
      });
    } else {
      toast({
        title: "No Intake Form",
        description: "This asset type doesn't have an intake form configured. Please contact an administrator.",
        variant: "destructive",
      });
    }
  };

  const handleInventoryCheck = () => {
    // Navigate to inventory check form (for counting existing items)
    if (assetType?.inventory_form_id) {
      navigate(`/forms/submit/${assetType.inventory_form_id}?asset_id=${assetId}&type=inventory`, {
        state: {
          assetId: assetId,
          assetName: asset?.name,
          assetTypeId: asset?.asset_type_id,
          formType: 'inventory'
        }
      });
    } else {
      // Fallback to basic inventory form
      navigate(`/inventory/add-for-asset/${assetId}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
        <p>Loading asset details...</p>
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
            Choose Action for {asset.name}
          </h1>
          <p className="text-muted-foreground">
            Asset Type: {assetType.name}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Intake Action */}
        <Card 
          className="cursor-pointer hover:border-primary transition-colors"
          onClick={handleIntakeAction}
        >
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Package className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-xl">Add New Items</CardTitle>
            <CardDescription>
              Record new inventory coming into the system (intake)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>Use this when you want to:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Record newly received items</li>
                <li>Add items from a purchase order</li>
                <li>Log items found during audits</li>
                <li>Add items to inventory totals</li>
              </ul>
            </div>
            <Button className="w-full mt-4" variant="outline">
              Start Intake <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            {intakeForm ? (
              <p className="text-xs text-green-600 mt-2">
                ✓ Using: {intakeForm.name}
              </p>
            ) : (
              <p className="text-xs text-orange-600 mt-2">
                ⚠️ No intake form configured - contact admin
              </p>
            )}
          </CardContent>
        </Card>

        {/* Inventory Check Action */}
        <Card 
          className="cursor-pointer hover:border-primary transition-colors"
          onClick={handleInventoryCheck}
        >
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <ClipboardCheck className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle className="text-xl">Monthly Inventory</CardTitle>
            <CardDescription>
              Update inventory quantities to match actual physical counts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>Use this when you want to:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Count what you actually have on hand</li>
                <li>Update system quantities to match reality</li>
                <li>Record usage and consumption since last count</li>
                <li>Perform monthly inventory reconciliation</li>
              </ul>
            </div>
            <Button className="w-full mt-4" variant="outline">
              Start Count <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            {inventoryForm ? (
              <p className="text-xs text-blue-600 mt-2">
                ✓ Using: {inventoryForm.name}
              </p>
            ) : (
              <p className="text-xs text-orange-600 mt-2">
                ⚠️ Using basic inventory form
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="bg-muted/50 p-4 rounded-lg">
        <h3 className="font-medium mb-2">Need help choosing?</h3>
        <div className="text-sm text-muted-foreground space-y-2">
          <p><strong>Intake:</strong> Increases inventory quantities - use when adding new stock</p>
          <p><strong>Monthly Inventory:</strong> Updates quantities to match actual counts - records usage and consumption</p>
        </div>
      </div>
    </div>
  );
} 