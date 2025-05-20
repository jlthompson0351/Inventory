import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ChevronLeft, 
  Edit, 
  FileText, 
  Clipboard, 
  Calendar, 
  Info,
  AlertCircle,
  QrCode,
  ClipboardCheck
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { useOrganization } from "@/hooks/useOrganization";
import { supabase } from "@/integrations/supabase/client";
import { Asset } from "./Assets";
import { generateAssetBarcode } from "@/services/inventoryService";
import QRCode from "qrcode.react";

interface FormSubmission {
  id: string;
  form_id: string;
  form_name?: string;
  submission_data: Record<string, any>;
  calculation_results: Record<string, any>;
  status: string;
  created_at: string;
  created_by: string;
  created_by_name?: string;
}

export default function AssetDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();
  
  const [asset, setAsset] = useState<Asset | null>(null);
  const [assetType, setAssetType] = useState<any | null>(null);
  const [formSubmissions, setFormSubmissions] = useState<FormSubmission[]>([]);
  const [pendingForms, setPendingForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState("details");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasInventoryItem, setHasInventoryItem] = useState(false);
  
  useEffect(() => {
    if (id && currentOrganization) {
      fetchAssetData();
    }
  }, [id, currentOrganization]);
  
  const fetchAssetData = async () => {
    if (!id || !currentOrganization) return;
    
    try {
      setLoading(true);
      
      // Fetch asset with its type info
      const { data: assetData, error: assetError } = await supabase
        .from('assets')
        .select(`
          id,
          name,
          description,
          status,
          barcode,
          serial_number,
          acquisition_date,
          metadata,
          created_at,
          updated_at,
          organization_id,
          asset_type_id,
          parent_asset_id,
          created_by,
          asset_types:asset_type_id (
            id,
            name,
            description,
            color,
            intake_form_id,
            inventory_form_id
          )
        `)
        .eq('id', id)
        .single();
      
      if (assetError) {
        throw assetError;
      }
      
      // Transform data
      const formattedAsset: Asset = {
        ...assetData,
        asset_type_name: assetData.asset_types?.name || "Unknown Type",
        asset_type_color: assetData.asset_types?.color || "#6E56CF",
      };
      
      setAsset(formattedAsset);
      setAssetType(assetData.asset_types);
      
      // Fetch form submissions for this asset
      await fetchFormSubmissions(id);
      
      // Fetch pending forms
      await fetchPendingForms(id);
      
      // Check if this asset already has an inventory item
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('inventory_items')
        .select('id')
        .eq('asset_id', id)
        .maybeSingle();
        
      if (inventoryError) {
        console.error("Error checking inventory items:", inventoryError);
      } else {
        setHasInventoryItem(!!inventoryData);
      }
      
    } catch (error) {
      console.error("Error fetching asset data:", error);
      toast({
        title: "Error",
        description: "Failed to load asset data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const fetchFormSubmissions = async (assetId: string) => {
    try {
      // Get form submissions
      const { data: submissions, error: submissionsError } = await supabase
        .from('form_submissions')
        .select(`
          id,
          form_id,
          asset_id,
          asset_type_id,
          submission_data,
          calculation_results,
          status,
          created_at,
          submitted_by,
          forms:form_id (
            name
          )
        `)
        .eq('asset_id', assetId)
        .order('created_at', { ascending: false });
      
      if (submissionsError) {
        throw submissionsError;
      }
      
      // Get user information separately
      const userIds = submissions.map(sub => sub.submitted_by).filter(Boolean);
      let userMap = {};
      
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from('users_view')  // Use the view we created
          .select('id, email, full_name')
          .in('id', userIds);
          
        if (users) {
          userMap = users.reduce((map, user) => {
            map[user.id] = user;
            return map;
          }, {});
        }
      }
      
      // Transform data
      const formattedSubmissions: FormSubmission[] = submissions.map(sub => {
        const user = userMap[sub.submitted_by] || {};
        return {
          ...sub,
          form_name: sub.forms?.name || "Unknown Form",
          created_by_name: user.full_name || user.email || "Unknown User"
        };
      });
      
      setFormSubmissions(formattedSubmissions);
    } catch (error) {
      console.error("Error fetching form submissions:", error);
    }
  };
  
  const fetchPendingForms = async (assetId: string) => {
    try {
      // Get user ID for current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Call the function to get pending forms
      const { data, error } = await supabase.rpc(
        'get_pending_forms_for_asset',
        {
          p_asset_id: assetId,
          p_user_id: user.id
        }
      );
      
      if (error) {
        throw error;
      }
      
      setPendingForms(data || []);
    } catch (error) {
      console.error("Error fetching pending forms:", error);
    }
  };
  
  const handleDeleteAsset = async () => {
    if (!asset || !currentOrganization) return;
    
    try {
      setIsDeleting(true);
      
      // Delete the asset
      const { error } = await supabase
        .from('assets')
        .delete()
        .eq('id', asset.id);
      
      if (error) {
        throw error;
      }
      
      toast({
        title: "Success",
        description: "Asset deleted successfully",
      });
      
      // Navigate back to assets page
      navigate('/assets');
    } catch (error) {
      console.error("Error deleting asset:", error);
      toast({
        title: "Error",
        description: "Failed to delete asset",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };
  
  const startNewForm = (formId: string) => {
    // Navigate to the form submission page
    navigate(`/forms/${formId}/submit?assetId=${id}`);
  };
  
  const handleGenerateBarcode = async () => {
    if (!asset || !assetType) return;
    
    try {
      setLoading(true);
      
      // If there's already a barcode string but no QR code, we'll use that
      if (asset.barcode) {
        // Just update the local state to trigger the QR code generation
        setAsset({
          ...asset,
          barcode: asset.barcode // This forces a re-render
        });
        
        toast({
          title: "Success",
          description: "QR code generated from existing barcode",
        });
      } else {
        // No barcode exists, generate a new one
        const barcode = await generateAssetBarcode(
          supabase,
          asset.id,
          'qr' // Force QR code type
        );
        
        if (barcode) {
          // Update the asset with the new barcode
          const { error } = await supabase
            .from('assets')
            .update({ barcode })
            .eq('id', asset.id);
            
          if (error) throw error;
          
          // Update the local state
          setAsset({
            ...asset,
            barcode
          });
          
          toast({
            title: "Success",
            description: "QR code generated successfully",
          });
        }
      }
    } catch (error) {
      console.error("Error generating QR code:", error);
      toast({
        title: "Error",
        description: "Failed to generate QR code",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
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
  
  if (!asset) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <h2 className="text-xl font-bold mb-2">Asset Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The requested asset could not be found.
          </p>
          <Button onClick={() => navigate("/assets")}>Return to Assets</Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div className="flex items-start space-x-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/assets')} 
            className="mt-0.5"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: asset.asset_type_color || "#6E56CF" }}
              />
              <h1 className="text-3xl font-bold">{asset.name}</h1>
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
            <p className="text-muted-foreground flex items-center gap-1">
              <span>Type: {asset.asset_type_name}</span>
              {asset.serial_number && (
                <>
                  <span className="mx-1">•</span>
                  <span>SN: {asset.serial_number}</span>
                </>
              )}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            onClick={() => navigate(`/assets/${asset.id}/edit`)}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit Asset
          </Button>
          
          <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <DialogTrigger asChild>
              <Button variant="destructive">Delete</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Asset</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this asset? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteDialog(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteAsset}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Deleting..." : "Delete Asset"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      {/* QR Code Card - Either display QR code or a message to generate one */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Asset QR Code</CardTitle>
          <CardDescription>
            {asset.barcode 
              ? "Scan this code to quickly access asset information" 
              : "This asset doesn't have a QR code yet"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center flex-col gap-4">
          {asset.barcode ? (
            <>
              <div className="p-4 bg-white rounded-lg border">
                <QRCode 
                  value={asset.barcode} 
                  size={200} 
                  level="H" 
                  includeMargin={true}
                  renderAs="canvas"
                  id="asset-qrcode"
                />
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold mb-1">ID: {asset.id}</p>
                <p className="text-sm text-muted-foreground mb-1">Barcode: {asset.barcode}</p>
                <p className="text-sm text-muted-foreground mb-4">Type: {asset.asset_type_name}</p>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    // Get the canvas element and convert it to a data URL
                    const canvas = document.getElementById('asset-qrcode') as HTMLCanvasElement;
                    if (canvas) {
                      const dataUrl = canvas.toDataURL('image/png');
                      const link = document.createElement('a');
                      link.href = dataUrl;
                      link.download = `${asset.id}-qrcode.png`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }
                  }}
                >
                  Download QR Code
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <div className="mb-4 text-muted-foreground">
                No QR code is available for this asset. QR codes are automatically generated for asset types that have them enabled.
              </div>
              <div className="flex justify-center gap-3">
                <Button
                  variant="default"
                  onClick={handleGenerateBarcode}
                >
                  <QrCode className="h-4 w-4 mr-2" />
                  Generate QR Code
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate(`/assets/${asset.id}/edit`)}
                >
                  Edit Asset
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="forms">Forms</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="details" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Asset Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {asset.description && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Description</h3>
                  <p>{asset.description}</p>
                </div>
              )}
              
              {/* Inventory Section - Show current inventory and add check button */}
              <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-medium text-blue-800">Inventory Management</h3>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="border-blue-300 text-blue-800 hover:bg-blue-100"
                    onClick={() => navigate(`/assets/${asset.id}/inventory-check`)}
                  >
                    <ClipboardCheck className="mr-2 h-4 w-4" />
                    Perform Inventory Check
                  </Button>
                </div>
                
                {asset.metadata?.current_inventory !== undefined ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-lg font-semibold text-blue-900">
                        {asset.metadata.current_inventory} {asset.metadata.unit_type || 'units'}
                      </span>
                      {asset.metadata.last_inventory_check && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Last checked: {new Date(asset.metadata.last_inventory_check).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-blue-700">
                    No inventory records yet. Create one by performing an inventory check.
                  </p>
                )}
              </div>
              
              {/* Add Inventory Button - only show if no inventory item exists */}
              {!hasInventoryItem && assetType?.inventory_form_id && (
                <div className="bg-green-50 p-4 rounded-md border border-green-200 mb-4">
                  <h3 className="text-sm font-medium text-green-800 mb-1">Inventory Record</h3>
                  <div className="flex items-center justify-between">
                    <span className="text-green-900">
                      No inventory record exists for this asset
                    </span>
                    <Button 
                      variant="default" 
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => navigate(`/inventory/add-for-asset/${asset.id}`)}
                    >
                      Add Inventory
                    </Button>
                  </div>
                </div>
              )}
              
              {/* If inventory exists, show a link to view it */}
              {hasInventoryItem && (
                <div className="bg-green-50 p-4 rounded-md border border-green-200 mb-4">
                  <h3 className="text-sm font-medium text-green-800 mb-1">Inventory Record</h3>
                  <div className="flex items-center justify-between">
                    <span className="text-green-900">
                      This asset has an inventory record
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="border-green-300 text-green-800 hover:bg-green-100"
                      onClick={() => navigate(`/inventory?assetId=${asset.id}`)}
                    >
                      View Inventory
                    </Button>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">Basic Details</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Asset Type:</span>
                      <span>{asset.asset_type_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <span className="capitalize">{asset.status}</span>
                    </div>
                    {asset.serial_number && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Serial Number:</span>
                        <span>{asset.serial_number}</span>
                      </div>
                    )}
                    {asset.acquisition_date && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Acquired:</span>
                        <span>{new Date(asset.acquisition_date).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {asset.metadata && Object.keys(asset.metadata).length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">Additional Details</h3>
                    <div className="space-y-2">
                      {Object.entries(asset.metadata).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-muted-foreground capitalize">
                            {key.replace(/_/g, ' ')}:
                          </span>
                          <span>{value?.toString() || 'N/A'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-3">
              <div className="flex justify-between w-full text-xs text-muted-foreground">
                <span>Created: {new Date(asset.created_at).toLocaleDateString()}</span>
                <span>Last Updated: {new Date(asset.updated_at).toLocaleDateString()}</span>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="forms" className="space-y-6">
          {pendingForms.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Pending Forms</CardTitle>
                <CardDescription>
                  Forms that need to be completed for this asset
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {pendingForms.map(form => (
                  <div 
                    key={form.form_id} 
                    className="flex items-center justify-between border-b pb-3 last:border-b-0 last:pb-0"
                  >
                    <div>
                      <div className="font-medium flex items-center gap-1">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {form.form_name}
                        
                        {form.is_overdue && (
                          <Badge variant="destructive" className="ml-2">Overdue</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Due by: {new Date(form.due_date).toLocaleDateString()}
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => startNewForm(form.form_id)}
                    >
                      Complete Form
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          
          <Card>
            <CardHeader>
              <CardTitle>Available Forms</CardTitle>
              <CardDescription>
                Forms you can complete for this asset
              </CardDescription>
            </CardHeader>
            <CardContent>
              {assetType ? (
                <div className="space-y-4">
                  {assetType.intake_form_id && (
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium flex items-center gap-1">
                          <Clipboard className="h-4 w-4 text-muted-foreground" />
                          Intake Form
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Used for asset intake and initial information
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        onClick={() => startNewForm(assetType.intake_form_id)}
                      >
                        Complete Form
                      </Button>
                    </div>
                  )}
                  
                  {assetType.inventory_form_id && (
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium flex items-center gap-1">
                          <Clipboard className="h-4 w-4 text-muted-foreground" />
                          Inventory Form
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Used for regular inventory checks
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        onClick={() => startNewForm(assetType.inventory_form_id)}
                      >
                        Complete Form
                      </Button>
                    </div>
                  )}
                  
                  {!assetType.intake_form_id && !assetType.inventory_form_id && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Info className="h-12 w-12 mx-auto mb-2 opacity-20" />
                      <p>No forms configured for this asset type.</p>
                      <p className="text-sm">
                        Forms can be configured in the asset type settings.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p>Error loading asset type information.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Form Submission History</CardTitle>
              <CardDescription>
                Previous form submissions for this asset
              </CardDescription>
            </CardHeader>
            <CardContent>
              {formSubmissions.length > 0 ? (
                <div className="space-y-4">
                  {formSubmissions.map(submission => (
                    <Card key={submission.id} className="border border-muted">
                      <CardHeader className="py-3 px-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-base flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              {submission.form_name}
                            </CardTitle>
                            <CardDescription>
                              {new Date(submission.created_at).toLocaleString()}
                            </CardDescription>
                          </div>
                          <Badge variant="outline" className="capitalize">
                            {submission.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="py-3 px-4 pt-0">
                        <div className="text-sm">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <h4 className="font-medium">Form Data</h4>
                              {submission.submission_data && 
                               Object.entries(submission.submission_data).length > 0 ? (
                                <div className="space-y-1">
                                  {Object.entries(submission.submission_data).map(([key, value]) => (
                                    <div key={key} className="flex justify-between">
                                      <span className="text-muted-foreground capitalize">
                                        {key.replace(/_/g, ' ')}:
                                      </span>
                                      <span>{value?.toString() || 'N/A'}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-muted-foreground">No form data</div>
                              )}
                            </div>
                            
                            {submission.calculation_results && 
                             Object.entries(submission.calculation_results).length > 0 && (
                              <div className="space-y-2">
                                <h4 className="font-medium">Calculated Values</h4>
                                <div className="space-y-1">
                                  {Object.entries(submission.calculation_results).map(([key, value]) => (
                                    <div key={key} className="flex justify-between">
                                      <span className="text-muted-foreground capitalize">
                                        {key.replace(/_/g, ' ')}:
                                      </span>
                                      <span>{value?.toString() || 'N/A'}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="py-2 px-4 text-xs text-muted-foreground border-t">
                        Submitted by: {submission.created_by_name}
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p>No form submissions yet.</p>
                  <p className="text-sm">
                    Complete a form to see its history here.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 