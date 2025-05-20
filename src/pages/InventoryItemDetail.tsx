import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSupabase } from '@/hooks/useSupabase';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertCircle, 
  ArrowLeft, 
  Edit, 
  Trash2, 
  ChevronRight, 
  Box, 
  Tag, 
  Barcode,
  MapPin,
  Hash,
  ShoppingBag,
  DollarSign,
  History,
  LineChart,
  FileText
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { getInventoryItem, deleteInventoryItem, recordNewInventoryCheck } from '@/services/inventoryService';
import { InventoryHistoryViewer } from '@/components/inventory/InventoryHistoryViewer';
import DynamicForm from '@/components/forms/DynamicForm';
import { getFormById } from '@/services/formService';
import { getAssetTypeById } from '@/services/assetTypeService';

export function InventoryItemDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { supabase } = useSupabase();
  const { toast } = useToast();
  
  const [item, setItem] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [recordCheckOpen, setRecordCheckOpen] = useState(false);
  const [checkData, setCheckData] = useState({ quantity: 0, notes: '' });
  const [savingCheck, setSavingCheck] = useState(false);
  const [loadingInventoryForm, setLoadingInventoryForm] = useState(false);
  const [inventoryForm, setInventoryForm] = useState<any>(null);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [assetType, setAssetType] = useState<any>(null);

  useEffect(() => {
    async function loadInventoryItem() {
      if (!id) return;
      
      try {
        setLoading(true);
        const data = await getInventoryItem(id);
        setItem(data);
        
        // Initialize check data with current quantity
        if (data) {
          setCheckData(prev => ({ ...prev, quantity: data.quantity || 0 }));
          
          // Load the asset type and inventory form
          if (data.asset_type_id) {
            await loadAssetTypeAndForm(data.asset_type_id);
          }
        }
      } catch (err) {
        console.error('Error loading inventory item:', err);
        setError('Failed to load inventory item');
      } finally {
        setLoading(false);
      }
    }

    loadInventoryItem();
  }, [id]);

  const loadAssetTypeAndForm = async (assetTypeId: string) => {
    try {
      setLoadingInventoryForm(true);
      
      // Get asset type details
      const typeData = await getAssetTypeById(assetTypeId);
      setAssetType(typeData);
      
      // If the asset type has an inventory form ID, load the form
      if (typeData && typeData.inventory_form_id) {
        const formData = await getFormById(typeData.inventory_form_id);
        
        // Parse form_data if it's a string
        if (formData && formData.form_data && typeof formData.form_data === 'string') {
          try {
            formData.form_data = JSON.parse(formData.form_data);
          } catch (e) {
            console.error('Error parsing form data:', e);
          }
        }
        
        setInventoryForm(formData);
      }
    } catch (err) {
      console.error('Error loading asset type and form:', err);
      toast({
        title: 'Error',
        description: 'Failed to load inventory form',
        variant: 'destructive',
      });
    } finally {
      setLoadingInventoryForm(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    
    try {
      setDeleting(true);
      await deleteInventoryItem(id);
      
      toast({
        title: "Success",
        description: "Inventory item deleted successfully",
      });
      
      navigate('/inventory');
    } catch (err) {
      console.error('Error deleting inventory item:', err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete inventory item",
      });
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleFormValuesChange = (values: Record<string, any>) => {
    setFormValues(values);
    
    // If the form has a 'quantity' field, update the checkData quantity too
    if (values.hasOwnProperty('quantity') && typeof values.quantity === 'number') {
      setCheckData(prev => ({ ...prev, quantity: values.quantity }));
    }
    
    // If the form has a 'notes' field, update the checkData notes too
    if (values.hasOwnProperty('notes') && typeof values.notes === 'string') {
      setCheckData(prev => ({ ...prev, notes: values.notes }));
    }
  };

  const handleRecordCheck = async () => {
    if (!id) return;
    try {
      setSavingCheck(true);
      const usesDynamicForm = inventoryForm && Object.keys(formValues).length > 0;
      const location = formValues.location || item.location;
      await recordNewInventoryCheck(id, {
        quantity: checkData.quantity,
        notes: checkData.notes,
        location: location,
        response_data: usesDynamicForm ? formValues : null
      });
      toast({
        title: "Success",
        description: "Inventory check recorded successfully",
      });
      setRecordCheckOpen(false);
      setFormValues({});
      const updatedItem = await getInventoryItem(id);
      setItem(updatedItem);
    } catch (err) {
      console.error('Error recording inventory check:', err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to record inventory check",
      });
    } finally {
      setSavingCheck(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="md" />
      </div>
    );
  }

  if (error || !item) {
    return (
      <Alert variant="destructive" className="max-w-2xl mx-auto mt-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error || 'Inventory item not found'}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="container py-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/inventory')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Inventory
        </Button>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRecordCheckOpen(true)}
          >
            <History className="h-4 w-4 mr-2" />
            Record Check
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/inventory/edit/${id}`)}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Inventory Item</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete "{item.name}"? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setDeleteDialogOpen(false)}
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <h1 className="text-2xl font-bold mb-6">{item.name}</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="details">
            <Box className="h-4 w-4 mr-2" />
            Details
          </TabsTrigger>
          <TabsTrigger value="history">
            <LineChart className="h-4 w-4 mr-2" />
            History
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="details">
          <Card>
            <CardContent className="pt-6 space-y-4">
              {item.description && (
                <div className="mb-6">
                  <h3 className="text-sm text-gray-500 mb-1">Description</h3>
                  <p className="text-sm">{item.description}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {item.sku && (
                  <div className="flex items-start gap-2">
                    <Hash className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium">SKU</div>
                      <div className="text-sm text-gray-500">{item.sku}</div>
                    </div>
                  </div>
                )}
                
                {item.barcode && (
                  <div className="flex items-start gap-2">
                    <Barcode className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium">Barcode</div>
                      <div className="text-sm text-gray-500">{item.barcode}</div>
                    </div>
                  </div>
                )}
                
                <div className="flex items-start gap-2">
                  <ShoppingBag className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">Current Quantity</div>
                    <div className="text-sm text-gray-500">{item.quantity || 0}</div>
                  </div>
                </div>
                
                {item.location && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium">Location</div>
                      <div className="text-sm text-gray-500">{item.location}</div>
                    </div>
                  </div>
                )}
                
                {item.category && (
                  <div className="flex items-start gap-2">
                    <Tag className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium">Category</div>
                      <div className="text-sm text-gray-500">{item.category}</div>
                    </div>
                  </div>
                )}
                
                {item.current_price && (
                  <div className="flex items-start gap-2">
                    <DollarSign className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium">Current Price</div>
                      <div className="text-sm text-gray-500">
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: item.currency || 'USD'
                        }).format(item.current_price)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mt-6 pt-4 border-t">
                <h3 className="text-sm font-medium mb-2">Additional Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-gray-500">Created</div>
                    <div className="text-sm">
                      {item.created_at ? new Date(item.created_at).toLocaleString() : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Last Updated</div>
                    <div className="text-sm">
                      {item.updated_at ? new Date(item.updated_at).toLocaleString() : 'N/A'}
                    </div>
                  </div>

                  {item.asset_id && (
                    <div>
                      <div className="text-xs text-gray-500">Linked Asset</div>
                      <div className="text-sm">
                        <Button 
                          variant="link" 
                          className="h-auto p-0 text-blue-500"
                          onClick={() => navigate(`/assets/${item.asset_id}`)}
                        >
                          View Asset
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Inventory History</CardTitle>
            </CardHeader>
            <CardContent>
              <InventoryHistoryViewer inventoryItemId={id} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Record Monthly Check Dialog */}
      <Dialog open={recordCheckOpen} onOpenChange={setRecordCheckOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Record Inventory Check</DialogTitle>
            <DialogDescription>
              {inventoryForm 
                ? `Complete the inventory form for this ${assetType?.name || 'asset'}`
                : 'Enter the current quantity and any notes for this inventory check.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {loadingInventoryForm ? (
              <div className="flex justify-center py-4">
                <Spinner size="md" />
                <span className="ml-2">Loading inventory form...</span>
              </div>
            ) : inventoryForm ? (
              <div>
                <div className="mb-4">
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-md flex items-center">
                        <FileText className="h-4 w-4 mr-2" />
                        {inventoryForm.name}
                      </CardTitle>
                      {inventoryForm.description && (
                        <CardDescription>{inventoryForm.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <DynamicForm
                        formSchema={inventoryForm.form_data}
                        initialValues={{
                          quantity: item.quantity || 0,
                          location: item.location || ''
                        }}
                        onChange={handleFormValuesChange}
                      />
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <label htmlFor="quantity" className="text-sm font-medium">
                    Current Quantity
                  </label>
                  <input
                    type="number"
                    id="quantity"
                    min="0"
                    className="w-full p-2 border rounded-md"
                    value={checkData.quantity}
                    onChange={(e) => setCheckData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="notes" className="text-sm font-medium">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    rows={3}
                    className="w-full p-2 border rounded-md"
                    placeholder="Optional notes about this inventory check..."
                    value={checkData.notes}
                    onChange={(e) => setCheckData(prev => ({ ...prev, notes: e.target.value }))}
                  />
                </div>
              </>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setRecordCheckOpen(false);
                setFormValues({});
              }}
              disabled={savingCheck}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleRecordCheck}
              disabled={savingCheck}
            >
              {savingCheck ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Saving...
                </>
              ) : (
                'Save Check'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 