import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useOrganization } from "@/hooks/useOrganization";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Asset } from "@/pages/Assets";
import AssetRelationship from "@/components/inventory/AssetRelationship";

export default function AssetDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();
  
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [formSubmission, setFormSubmission] = useState<any>(null);
  const [loadingSubmission, setLoadingSubmission] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (id && currentOrganization) {
      fetchAsset(id);
    }
  }, [id, currentOrganization]);

  const fetchAsset = async (assetId: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('assets')
        .select(`
          *,
          asset_types:asset_type_id (
            id,
            name,
            color,
            intake_form_id
          )
        `)
        .eq('id', assetId)
        .eq('organization_id', currentOrganization?.id)
        .single();
      
      if (error) {
        throw error;
      }
      
      // Transform data to match Asset type
      const assetData: Asset = {
        ...data,
        asset_type_id: data.asset_types.id,
        asset_type_name: data.asset_types.name,
        asset_type_color: data.asset_types.color,
      };
      
      setAsset(assetData);
      
      // If there's an intake form, fetch the submission
      if (data.asset_types.intake_form_id) {
        fetchFormSubmission(assetId, data.asset_types.intake_form_id);
      }
    } catch (error) {
      console.error("Error fetching asset:", error);
      toast({
        title: "Error",
        description: "Failed to load asset details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchFormSubmission = async (assetId: string, formId: string) => {
    try {
      setLoadingSubmission(true);
      
      const { data, error } = await supabase
        .from('form_submissions')
        .select('*')
        .eq('asset_id', assetId)
        .eq('form_id', formId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error) {
        if (error.code !== 'PGRST116') { // No rows returned
          throw error;
        }
        return;
      }
      
      setFormSubmission(data);
    } catch (error) {
      console.error("Error fetching form submission:", error);
    } finally {
      setLoadingSubmission(false);
    }
  };

  const handleDeleteAsset = async () => {
    if (!asset) return;
    
    try {
      setDeleteLoading(true);
      
      const { error } = await supabase
        .from('assets')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', asset.id);
      
      if (error) {
        throw error;
      }
      
      toast({
        title: "Success",
        description: "Asset deleted successfully",
      });
      
      navigate('/assets');
    } catch (error) {
      console.error("Error deleting asset:", error);
      toast({
        title: "Error",
        description: "Failed to delete asset",
        variant: "destructive",
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  if (!currentOrganization) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-muted-foreground">
          Please select an organization to view assets.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center gap-2 mb-6">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/assets')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Loading Asset...</h1>
        </div>
        <div className="h-[60vh] flex items-center justify-center">
          <p className="text-muted-foreground">Loading asset details...</p>
        </div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center gap-2 mb-6">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/assets')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Asset Not Found</h1>
        </div>
        <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
          <AlertTriangle className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">The requested asset could not be found.</p>
          <Button onClick={() => navigate('/assets')}>
            Return to Assets
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/assets')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">{asset.name}</h1>
          <div 
            className="w-3 h-3 rounded-full ml-2" 
            style={{ backgroundColor: asset.asset_type_color || "#6E56CF" }} 
          />
          <span className="text-sm text-muted-foreground">
            {asset.asset_type_name}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline"
            onClick={() => navigate(`/assets/${asset.id}/edit`)}
          >
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action will delete the asset "{asset.name}". This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDeleteAsset}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? "Deleting..." : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="form">Intake Form</TabsTrigger>
          <TabsTrigger value="relationships">Relationships</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="details" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Asset Information</CardTitle>
              <CardDescription>
                Detailed information about this asset
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Name</p>
                  <p>{asset.name}</p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <Badge 
                    variant={
                      asset.status === "active" ? "default" :
                      asset.status === "maintenance" ? "secondary" :
                      asset.status === "retired" ? "destructive" :
                      "outline"
                    }
                    className="capitalize"
                  >
                    {asset.status}
                  </Badge>
                </div>
                
                {asset.serial_number && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Serial Number</p>
                    <p>{asset.serial_number}</p>
                  </div>
                )}
                
                {asset.acquisition_date && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Acquisition Date</p>
                    <p>{new Date(asset.acquisition_date).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
              
              {asset.description && (
                <>
                  <Separator />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Description</p>
                    <p className="whitespace-pre-line">{asset.description}</p>
                  </div>
                </>
              )}
              
              {asset.metadata && Object.keys(asset.metadata).length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-muted-foreground">Additional Metadata</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(asset.metadata).map(([key, value]) => (
                        <div key={key} className="space-y-1">
                          <p className="text-sm font-medium capitalize">{key.replace(/_/g, ' ')}</p>
                          <p className="text-sm">{value?.toString() || 'N/A'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
            <CardFooter>
              <div className="w-full flex flex-col gap-1 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Created: {new Date(asset.created_at).toLocaleString()}</span>
                  <span>ID: {asset.id}</span>
                </div>
                {asset.updated_at && new Date(asset.updated_at).getTime() !== new Date(asset.created_at).getTime() && (
                  <div className="flex justify-between">
                    <span>Last Updated: {new Date(asset.updated_at).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="form" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Intake Form Data</CardTitle>
              <CardDescription>
                Information collected via the asset intake form
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingSubmission ? (
                <div className="py-4 text-center">
                  <p className="text-muted-foreground">Loading form submission...</p>
                </div>
              ) : formSubmission ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Object.entries(formSubmission.submission_data).map(([key, value]) => (
                      <div key={key} className="space-y-1">
                        <p className="text-sm font-medium capitalize">{key.replace(/_/g, ' ')}</p>
                        <p>{value?.toString() || 'N/A'}</p>
                      </div>
                    ))}
                  </div>
                  
                  <Separator />
                  
                  <div className="text-xs text-muted-foreground">
                    <p>Submitted: {new Date(formSubmission.created_at).toLocaleString()}</p>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center">
                  <p className="text-muted-foreground">No form submission found for this asset.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="relationships" className="mt-6 space-y-6">
          <AssetRelationship 
            assetId={asset.id} 
            onSelect={(selectedAssetId) => {
              if (selectedAssetId !== asset.id) {
                navigate(`/assets/${selectedAssetId}`);
              }
            }}
          />
        </TabsContent>
        
        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Asset History</CardTitle>
              <CardDescription>
                Timeline of changes and events for this asset
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="py-12 text-center">
                <p className="text-muted-foreground">Asset history tracking coming soon.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 