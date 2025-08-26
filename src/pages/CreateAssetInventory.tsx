/**
 * Create Asset Inventory Page
 * 
 * For assets that don't have inventory tracking yet
 * Simple form to set up initial inventory with quantity and location
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { ArrowLeft, Package, Save } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { getAssetWithInventory, createInventoryForAsset } from '@/services/assetInventoryService';

export default function CreateAssetInventory() {
  const { assetId } = useParams<{ assetId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    quantity: 0,
    location: '',
    status: 'active',
    notes: ''
  });

  useEffect(() => {
    const loadAsset = async () => {
      if (!assetId) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const assetData = await getAssetWithInventory(assetId);
        if (!assetData) {
          setError('Asset not found');
          return;
        }
        
        if (assetData.has_inventory) {
          // Already has inventory - redirect to inventory detail
          navigate(`/assets/${assetId}/inventory`);
          return;
        }
        
        setAsset(assetData);
        
        // Pre-fill with asset data
        setFormData(prev => ({
          ...prev,
          location: assetData.asset_location || '',
          status: assetData.asset_status || 'active'
        }));
        
      } catch (err) {
        console.error('Error loading asset:', err);
        setError('Failed to load asset data');
      } finally {
        setLoading(false);
      }
    };

    loadAsset();
  }, [assetId, navigate]);

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!assetId) return;
    
    try {
      setSaving(true);
      
      const result = await createInventoryForAsset(assetId, formData);
      
      if (result.success) {
        toast({
          title: "Success",
          description: "Inventory created successfully",
        });
        
        // Navigate to the new inventory detail page
        navigate(`/assets/${assetId}/inventory`);
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to create inventory",
          variant: "destructive"
        });
      }
      
    } catch (err) {
      console.error('Error creating inventory:', err);
      toast({
        title: "Error",
        description: "Failed to create inventory",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
        <span className="ml-2">Loading asset data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="container mx-auto p-4">
        <Alert>
          <AlertDescription>Asset not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      {/* Header */}
      <Button 
        variant="ghost" 
        onClick={() => navigate(`/assets/${assetId}`)}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Asset
      </Button>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Set Up Inventory: {asset.asset_name}
          </CardTitle>
          <CardDescription>
            Create initial inventory tracking for this {asset.asset_type_name?.toLowerCase() || 'asset'}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Current Asset Info */}
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-medium mb-2">Asset Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Type:</span>
                  <span className="ml-2 font-medium">{asset.asset_type_name || 'Unknown'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <span className="ml-2 font-medium">{asset.asset_status || 'Active'}</span>
                </div>
              </div>
            </div>

            {/* Initial Quantity */}
            <div className="space-y-2">
              <Label htmlFor="quantity">Initial Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                min="0"
                value={formData.quantity}
                onChange={(e) => handleInputChange('quantity', parseInt(e.target.value) || 0)}
                placeholder="Enter current quantity on hand"
                required
              />
              <p className="text-xs text-muted-foreground">
                How many units do you currently have of this asset?
              </p>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location">Storage Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="Where is this asset stored?"
              />
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Inventory Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value) => handleInputChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="maintenance">Under Maintenance</SelectItem>
                  <SelectItem value="reserved">Reserved</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Initial Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Any notes about the initial inventory setup..."
                rows={3}
              />
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-2 pt-4">
              <Button 
                type="button"
                variant="outline" 
                onClick={() => navigate(`/assets/${assetId}`)}
                disabled={saving}
              >
                Cancel
              </Button>
              
              <Button 
                type="submit"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Create Inventory
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

