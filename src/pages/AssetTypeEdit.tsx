import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useOrganization } from "@/hooks/useOrganization";
import { 
  AssetType, 
  getAssetType, 
  updateAssetType
} from "@/services/assetTypeService";
import { supabase } from "@/integrations/supabase/client";
import { BarcodeToggle } from "@/components/inventory/BarcodeToggle";

export default function AssetTypeEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();
  
  const [assetType, setAssetType] = useState<AssetType | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedTab, setSelectedTab] = useState("basic");
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#6E56CF"
  });
  
  const [barcodeSettings, setBarcodeSettings] = useState({
    enabled: false,
    type: "qr",
    prefix: "",
  });

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
            setFormData({
              name: data.name,
              description: data.description || "",
              color: data.color || "#6E56CF"
            });
            setBarcodeSettings({
              enabled: data.enable_barcodes || false,
              type: data.barcode_type || 'qr',
              prefix: data.barcode_prefix || '',
            });
          } else {
            setAssetType(null);
            toast({ title: 'Error', description: 'Asset type not found', variant: 'destructive' });
          }
        }
      } catch (error) {
        if (!canceled) {
          console.error('Error loading asset type:', error);
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, color: e.target.value }));
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
  };

  const handleSave = async () => {
    if (!assetType?.id) return;
    
    if (formData.name.trim() === "") {
      toast({
        title: "Error",
        description: "Asset type name is required",
        variant: "destructive"
      });
      return;
    }
    
    setIsSaving(true);
    try {
      const result = await updateAssetType(supabase, assetType.id, {
        name: formData.name,
        description: formData.description,
        color: formData.color,
        enable_barcodes: barcodeSettings.enabled,
        barcode_type: barcodeSettings.type,
        barcode_prefix: barcodeSettings.prefix,
        updated_at: new Date().toISOString()
      });
      
      if (result) {
        toast({
          title: "Success",
          description: "Asset type updated successfully"
        });
        navigate(`/asset-types/${assetType.id}`);
      }
    } catch (error) {
      console.error('Error updating asset type:', error);
      toast({
        title: 'Error',
        description: 'Failed to update asset type',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
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
            <h1 className="text-3xl font-bold">Edit Asset Type</h1>
            <p className="text-muted-foreground">
              Make changes to {assetType.name}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button 
            onClick={handleSave}
            disabled={isSaving}
          >
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="basic">Basic Information</TabsTrigger>
          <TabsTrigger value="barcodes">Barcode Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="basic">
          <Card>
            <CardHeader>
              <CardTitle>Asset Type Information</CardTitle>
              <CardDescription>
                Edit the basic details of this asset type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g., Laptops, Chairs, Tools"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Briefly describe this asset type"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="color">Color</Label>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full border"
                      style={{ backgroundColor: formData.color }}
                    />
                    <Input
                      id="color"
                      name="color"
                      type="color"
                      value={formData.color}
                      onChange={handleColorChange}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="barcodes">
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
                isSaving={isSaving}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 