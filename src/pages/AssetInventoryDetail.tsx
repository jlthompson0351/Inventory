/**
 * Asset Inventory Detail Page
 * 
 * Main inventory management page for a specific asset
 * Shows current status, recent history, and action buttons
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { 
  ArrowLeft, 
  Calendar, 
  History, 
  Plus, 
  Edit, 
  MapPin, 
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getAssetWithInventory, getAssetInventoryHistory } from '@/services/assetInventoryService';
import { format } from 'date-fns';

export default function AssetInventoryDetail() {
  const { assetId } = useParams<{ assetId: string }>();
  const navigate = useNavigate();
  
  const [asset, setAsset] = useState<any>(null);
  const [recentHistory, setRecentHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!assetId) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Get asset info
        const assetData = await getAssetWithInventory(assetId);
        if (!assetData) {
          setError('Asset not found');
          return;
        }
        setAsset(assetData);
        
        // Get recent history (last 10 events)
        const historyData = await getAssetInventoryHistory(assetId);
        setRecentHistory(historyData.slice(0, 10));
        
      } catch (err) {
        console.error('Error loading asset inventory:', err);
        setError('Failed to load inventory data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [assetId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
        <span className="ml-2">Loading inventory details...</span>
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

  const getStockLevel = (quantity: number): 'out' | 'low' | 'normal' | 'high' => {
    if (quantity === 0) return 'out';
    if (quantity <= 10) return 'low';
    if (quantity >= 50) return 'high';
    return 'normal';
  };

  const stockLevel = getStockLevel(asset.current_quantity);

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button 
          variant="ghost" 
          onClick={() => navigate(`/assets/${assetId}`)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Asset
        </Button>
        
        <div className="flex gap-2">
          {asset.has_inventory ? (
            <Button onClick={() => navigate(`/assets/${assetId}/inventory/check`)}>
              <Calendar className="mr-2 h-4 w-4" />
              Record Check
            </Button>
          ) : (
            <Button onClick={() => navigate(`/assets/${assetId}/inventory/create`)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Inventory
            </Button>
          )}
        </div>
      </div>

      {/* Asset Overview */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {asset.asset_name}
          </CardTitle>
          <CardDescription>
            {asset.asset_type_name} • Inventory Management
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Current Stock</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{asset.current_quantity}</span>
                {stockLevel === 'out' && <AlertTriangle className="h-4 w-4 text-red-500" />}
                {stockLevel === 'low' && <TrendingDown className="h-4 w-4 text-orange-500" />}
                {stockLevel === 'high' && <TrendingUp className="h-4 w-4 text-green-500" />}
              </div>
              <Badge 
                variant="outline" 
                className={`text-xs mt-1 ${
                  stockLevel === 'out' ? 'border-red-300 text-red-700' :
                  stockLevel === 'low' ? 'border-orange-300 text-orange-700' :
                  stockLevel === 'high' ? 'border-green-300 text-green-700' :
                  'border-blue-300 text-blue-700'
                }`}
              >
                {stockLevel === 'out' ? 'Out of Stock' :
                 stockLevel === 'low' ? 'Low Stock' :
                 stockLevel === 'high' ? 'High Stock' : 'Normal'}
              </Badge>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="font-semibold">{asset.inventory_status || asset.asset_status || 'Active'}</p>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground">Location</p>
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3 text-muted-foreground" />
                <span className="font-semibold">{asset.asset_location || 'Not specified'}</span>
              </div>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground">Last Updated</p>
              <p className="font-semibold">
                {asset.last_check_date ? format(new Date(asset.last_check_date), 'MMM d, yyyy') : 'Never'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Latest inventory events for this asset
              </CardDescription>
            </div>
            <Button 
              variant="outline"
              onClick={() => navigate(`/assets/${assetId}/inventory/history`)}
            >
              <History className="mr-2 h-4 w-4" />
              View All History
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!asset.has_inventory ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium mb-2">No Inventory Setup</p>
              <p className="text-muted-foreground mb-4">
                This asset doesn't have inventory tracking enabled yet.
              </p>
              <Button onClick={() => navigate(`/assets/${assetId}/inventory/create`)}>
                <Plus className="mr-2 h-4 w-4" />
                Set Up Inventory
              </Button>
            </div>
          ) : recentHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>No recent activity</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentHistory.map((event) => (
                <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={getEventColor(event.event_type)}>
                      {event.event_type}
                    </Badge>
                    <div>
                      <p className="text-sm font-medium">
                        Quantity: {event.quantity} units
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {event.notes || `${event.check_type} check`}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {format(new Date(event.check_date), 'MMM d')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {event.created_by_user?.raw_user_meta_data?.full_name || 
                       event.created_by_user?.email || 
                       'Unknown'}
                    </p>
                  </div>
                </div>
              ))}
              
              {recentHistory.length >= 10 && (
                <div className="text-center pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => navigate(`/assets/${assetId}/inventory/history`)}
                  >
                    View All {recentHistory.length}+ Events
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

