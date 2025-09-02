/**
 * Inventory History Correction Page
 * 
 * Allows users to correct historical inventory data properly:
 * - Shows original vs corrected values side-by-side
 * - Handles soft-deleted assets gracefully
 * - Creates correction records (doesn't edit originals)
 * - Maintains full audit trail
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/use-toast';
import { 
  ArrowLeft, 
  AlertTriangle, 
  Save, 
  RotateCcw,
  Package,
  Calendar,
  FileText,
  Eye
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  getHistoryWithAssetStatus, 
  applyInventoryCorrection, 
  temporaryRestoreAsset,
  type CorrectionFormData 
} from '@/services/inventoryCorrectionService';
import { format } from 'date-fns';

export default function InventoryHistoryCorrection() {
  const { assetId, historyId } = useParams<{ assetId: string; historyId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [originalData, setOriginalData] = useState<any>(null);
  const [assetIsDeleted, setAssetIsDeleted] = useState(false);
  const [assetName, setAssetName] = useState<string>('');
  const [priceData, setPriceData] = useState<{
    captured_price: number;
    captured_currency: string;
    captured_unit_type: string;
    current_asset_price: string;
    current_asset_unit_type: string;
    current_asset_currency: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<CorrectionFormData>({
    quantity: 0,
    location: '',
    notes: '',
    reason: '',
    price: 0
  });

  useEffect(() => {
    const loadData = async () => {
      if (!historyId) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const historyWithStatus = await getHistoryWithAssetStatus(historyId);
        
        if (!historyWithStatus) {
          setError('History record not found');
          return;
        }
        
        const { 
          history_record, 
          asset_is_deleted, 
          asset_name,
          captured_price,
          captured_currency,
          captured_unit_type,
          current_asset_price,
          current_asset_unit_type,
          current_asset_currency
        } = historyWithStatus;
        
        setOriginalData(history_record);
        setAssetIsDeleted(asset_is_deleted);
        setAssetName(asset_name);
        setPriceData({
          captured_price,
          captured_currency,
          captured_unit_type,
          current_asset_price,
          current_asset_unit_type,
          current_asset_currency
        });
        
        // Pre-fill form with original values
        setFormData({
          quantity: history_record.quantity || 0,
          location: history_record.location || '',
          notes: history_record.notes || '',
          reason: '', // User must provide correction reason
          price: parseFloat(captured_price) || 0  // Safe string-to-number conversion
        });
        
      } catch (err) {
        console.error('Error loading correction data:', err);
        setError('Failed to load correction data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [historyId]);

  const handleInputChange = (field: keyof CorrectionFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleRestoreAsset = async () => {
    if (!assetId) return;
    
    try {
      setRestoring(true);
      const result = await temporaryRestoreAsset(assetId);
      
      if (result.success) {
        setAssetIsDeleted(false);
        toast({
          title: "Asset Restored",
          description: "Asset temporarily restored for correction workflow",
        });
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error restoring asset:', error);
      toast({
        title: "Error",
        description: "Failed to restore asset",
        variant: "destructive"
      });
    } finally {
      setRestoring(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!historyId || !formData.reason.trim()) {
      toast({
        title: "Error",
        description: "Correction reason is required",
        variant: "destructive"
      });
      return;
    }
    
    // Validate price if provided
    if (formData.price !== undefined && formData.price < 0) {
      toast({
        title: "Error",
        description: "Price cannot be negative",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setSaving(true);
      
      // Pass price context to preserve original currency/unit type
      const priceContext = priceData ? {
        currency: priceData.captured_currency,
        unit_type: priceData.captured_unit_type
      } : undefined;
      
      const result = await applyInventoryCorrection(historyId, formData, priceContext);
      
      if (result.success) {
        toast({
          title: "Success",
          description: "Correction applied successfully",
        });
        
        // Navigate back to history page
        navigate(`/assets/${assetId}/inventory/history`);
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive"
        });
      }
      
    } catch (error) {
      console.error('Error applying correction:', error);
      toast({
        title: "Error",
        description: "Failed to apply correction",
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
        <span className="ml-2">Loading correction form...</span>
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

  if (!originalData) {
    return (
      <div className="container mx-auto p-4">
        <Alert>
          <AlertDescription>History record not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button 
          variant="ghost" 
          onClick={() => navigate(`/assets/${assetId}/inventory/history`)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to History
        </Button>
        
        <Badge variant="outline" className="text-xs">
          <FileText className="h-3 w-3 mr-1" />
          Correction Mode
        </Badge>
      </div>

      {/* Soft-deleted asset warning */}
      {assetIsDeleted && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Asset Deleted</AlertTitle>
          <AlertDescription className="mt-2">
            The asset "{assetName}" was soft-deleted. You can temporarily restore it to make corrections.
            <div className="mt-3">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleRestoreAsset}
                disabled={restoring}
              >
                {restoring ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Restoring...
                  </>
                ) : (
                  <>
                    <RotateCcw className="mr-2 h-3 w-3" />
                    Temporarily Restore Asset
                  </>
                )}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Correction Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Original Data (Read-Only) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Original Data
            </CardTitle>
            <CardDescription>
              {format(new Date(originalData.check_date), 'MMM d, yyyy • h:mm a')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-3">Event Details</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Event Type:</span>
                  <Badge variant="outline">{originalData.event_type}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Check Type:</span>
                  <span>{originalData.check_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Quantity:</span>
                  <span className="font-semibold">{originalData.quantity}</span>
                </div>
                {priceData && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Price:</span>
                    <span className="font-semibold">
                      {priceData.captured_currency} {parseFloat(priceData.captured_price).toFixed(2)} per {priceData.captured_unit_type}
                    </span>
                  </div>
                )}
                {originalData.location && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Location:</span>
                    <span>{originalData.location}</span>
                  </div>
                )}
              </div>
            </div>
            
            {originalData.notes && (
              <div>
                <Label>Original Notes</Label>
                <div className="p-3 bg-muted rounded text-sm">
                  {originalData.notes}
                </div>
              </div>
            )}
            
            {originalData.response_data && Object.keys(originalData.response_data).length > 0 && (
              <div>
                <Label>Original Form Data</Label>
                <div className="p-3 bg-muted rounded text-xs font-mono max-h-48 overflow-auto">
                  {JSON.stringify(originalData.response_data, null, 2)}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Correction Form (Editable) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Corrected Data
            </CardTitle>
            <CardDescription>
              Make corrections and provide a reason
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Correction Reason - Required */}
              <div className="space-y-2">
                <Label htmlFor="reason" className="text-red-600">
                  Correction Reason * (Required)
                </Label>
                <Textarea
                  id="reason"
                  value={formData.reason}
                  onChange={(e) => handleInputChange('reason', e.target.value)}
                  placeholder="Explain why this correction is needed..."
                  rows={2}
                  required
                  className="border-red-200 focus:border-red-400"
                />
                <p className="text-xs text-muted-foreground">
                  This will be recorded in the audit trail
                </p>
              </div>

              {/* Corrected Quantity */}
              <div className="space-y-2">
                <Label htmlFor="quantity">Corrected Quantity</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="quantity"
                    type="number"
                    min="0"
                    value={formData.quantity}
                    onChange={(e) => handleInputChange('quantity', parseInt(e.target.value) || 0)}
                    className={originalData.quantity !== formData.quantity ? 'border-yellow-400 bg-yellow-50' : ''}
                  />
                  {originalData.quantity !== formData.quantity && (
                    <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-800">
                      Changed: {originalData.quantity} → {formData.quantity}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Corrected Price */}
              {priceData && (
                <div className="space-y-2">
                  <Label htmlFor="price">Corrected Price per {priceData.captured_unit_type}</Label>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-muted-foreground">{priceData.captured_currency}</span>
                      <Input
                        id="price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => {
                          const newPrice = parseFloat(e.target.value) || 0;
                          handleInputChange('price', newPrice);
                          
                          // Show toast notification about updating asset price if price changed
                          const originalPrice = parseFloat(priceData.captured_price);
                          if (newPrice !== originalPrice && newPrice > 0) {
                            setTimeout(() => {
                              toast({
                                title: "💡 Price Update Reminder",
                                description: `Current asset price is ${priceData.current_asset_currency} ${priceData.current_asset_price} per ${priceData.current_asset_unit_type}. Consider updating the asset's price setting if this correction should be the new standard price.`,
                                duration: 8000
                              });
                            }, 1000);
                          }
                        }}
                        className={parseFloat(priceData.captured_price) !== formData.price ? 'border-yellow-400 bg-yellow-50' : ''}
                      />
                    </div>
                    {parseFloat(priceData.captured_price) !== formData.price && (
                      <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-800">
                        Changed: {parseFloat(priceData.captured_price).toFixed(2)} → {formData.price?.toFixed(2) || '0.00'}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Current asset price: {priceData.current_asset_currency} {priceData.current_asset_price} per {priceData.current_asset_unit_type}
                  </p>
                </div>
              )}

              {/* Corrected Location */}
              <div className="space-y-2">
                <Label htmlFor="location">Corrected Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  placeholder="Storage location"
                  className={originalData.location !== formData.location ? 'border-yellow-400 bg-yellow-50' : ''}
                />
              </div>

              {/* Corrected Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Corrected Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Updated notes for this record"
                  rows={3}
                  className={originalData.notes !== formData.notes ? 'border-yellow-400 bg-yellow-50' : ''}
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={() => navigate(`/assets/${assetId}/inventory/history`)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                
                <Button 
                  type="submit"
                  disabled={saving || !formData.reason.trim()}
                >
                  {saving ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      Applying...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Apply Correction
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* What This Does - Educational */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-sm">📋 How Corrections Work</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-2">
          <p>• <strong>Original record is preserved</strong> - We never edit historical data</p>
          <p>• <strong>Correction record is created</strong> - Shows what changed and why</p>
          <p>• <strong>Current inventory is updated</strong> - Reflects the corrected values</p>
          <p>• <strong>Full audit trail maintained</strong> - Both original and correction visible in history</p>
          <p>• <strong>Compliance friendly</strong> - Meets industry standards for data integrity</p>
        </CardContent>
      </Card>
    </div>
  );
}

