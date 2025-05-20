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
import { createInventoryCheck } from '@/services/inventoryService';

const conditionOptions = [
  { value: 'excellent', label: 'Excellent' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'unusable', label: 'Unusable' }
];

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
      
      // Pre-fill form with current inventory value from asset metadata
      if (assetData.metadata?.current_inventory !== undefined) {
        setFormData(prev => ({
          ...prev,
          quantity: assetData.metadata.current_inventory
        }));
      }
      
      if (assetData.location) {
        setFormData(prev => ({
          ...prev,
          location: assetData.location
        }));
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
        
        // Pre-fill form with last inventory values if not already set
        setFormData(prev => ({
          quantity: prev.quantity || inventoryData.quantity || 0,
          condition: prev.condition || inventoryData.metadata?.condition || '',
          location: prev.location || inventoryData.location || '',
          notes: prev.notes
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
      
      // Create the inventory check record
      await createInventoryCheck(
        assetId,
        asset.asset_type_id,
        currentOrganization.id,
        {
          quantity: Number(formData.quantity),
          condition: formData.condition,
          location: formData.location,
          notes: formData.notes,
          status: asset.status,
          checkType: 'periodic'
        }
      );
      
      // Update the asset's metadata with the new inventory count
      const updatedMetadata = {
        ...(asset.metadata || {}),
        current_inventory: Number(formData.quantity),
        last_inventory_check: new Date().toISOString()
      };
      
      await supabase
        .from('assets')
        .update({ 
          metadata: updatedMetadata,
          location: formData.location || asset.location
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
            Record the current inventory status for this asset
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              {/* Last inventory record display */}
              {lastInventory && (
                <div className="p-4 bg-muted rounded-md mb-6">
                  <h3 className="text-sm font-medium mb-2">Last Inventory Check</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Quantity: <span className="font-medium">{lastInventory.quantity}</span></div>
                    {lastInventory.metadata?.condition && (
                      <div>Condition: <span className="font-medium capitalize">{lastInventory.metadata.condition}</span></div>
                    )}
                    <div>Date: <span className="font-medium">{new Date(lastInventory.created_at).toLocaleDateString()}</span></div>
                    {lastInventory.location && (
                      <div>Location: <span className="font-medium">{lastInventory.location}</span></div>
                    )}
                  </div>
                </div>
              )}
            
              {/* Quantity */}
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
              
              {/* Condition */}
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
              
              {/* Location */}
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
              
              {/* Notes */}
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
            
            <div className="flex justify-end mt-6">
              <Button 
                type="submit" 
                disabled={submitting}
                className="flex items-center"
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {submitting ? 'Saving...' : 'Complete Inventory Check'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryCheck; 