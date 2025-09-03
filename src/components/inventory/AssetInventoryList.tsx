/**
 * Asset-Centric Inventory List Component
 * 
 * This replaces the old InventoryList with a clean asset-centric approach:
 * - All navigation uses asset_id consistently
 * - Shows real data, no mock numbers
 * - Clear visual indicators for inventory status
 * - Predictable button behavior
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { 
  History, 
  Package, 
  MapPin, 
  Calendar, 
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  Plus,
  Eye
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { getOrganizationAssetsWithInventory, type AssetWithInventory } from "@/services/assetInventoryService";
import { format } from "date-fns";

interface AssetInventoryListProps {
  organizationId: string;
  searchTerm?: string;
  categoryFilter?: string;
}

export default function AssetInventoryList({ 
  organizationId, 
  searchTerm = "",
  categoryFilter
}: AssetInventoryListProps) {
  const [assets, setAssets] = useState<AssetWithInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchAssets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await getOrganizationAssetsWithInventory(organizationId);
      setAssets(data);
    } catch (err) {
      console.error("Error fetching assets with inventory:", err);
      setError("Failed to load inventory data");
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    if (organizationId) {
      fetchAssets();
    }
  }, [fetchAssets]);

  // Smart filtering with asset-centric logic
  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      const matchesSearch = !searchTerm || 
        asset.asset_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.asset_description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.asset_type_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.asset_location?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Category filter would need to be mapped to asset_type_name or a category field
      const matchesCategory = !categoryFilter || 
        asset.asset_type_name?.toLowerCase() === categoryFilter.toLowerCase();
      
      return matchesSearch && matchesCategory;
    });
  }, [assets, searchTerm, categoryFilter]);

  const getStockLevel = (quantity: number): 'low' | 'normal' | 'high' | 'out' => {
    if (quantity === 0) return 'out';
    if (quantity <= 10) return 'low';
    if (quantity >= 50) return 'high';
    return 'normal';
  };

  const getStockLevelColor = (level: 'low' | 'normal' | 'high' | 'out') => {
    switch (level) {
      case 'out': return 'bg-red-100 text-red-800 border-red-300';
      case 'low': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'high': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  // Asset-centric navigation functions
  const handleViewAsset = (asset: AssetWithInventory) => {
    navigate(`/assets/${asset.asset_id}`);
  };

  const handleInventoryCheck = (asset: AssetWithInventory) => {
    // Use legacy route for now since InventoryCheck.tsx expects it
    navigate(`/assets/${asset.asset_id}/inventory-check`);
  };

  const handleViewHistory = (asset: AssetWithInventory) => {
    if (asset.has_inventory) {
      navigate(`/assets/${asset.asset_id}/inventory/history`);
    } else {
      // No inventory yet - offer to create it
      navigate(`/assets/${asset.asset_id}/inventory/create`);
    }
  };

  const handleCreateInventory = (asset: AssetWithInventory) => {
    navigate(`/assets/${asset.asset_id}/inventory/create`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (filteredAssets.length === 0) {
    return (
      <div className="border border-dashed rounded-md p-8 text-center text-muted-foreground">
        <Package className="h-12 w-12 mx-auto mb-4 opacity-30" />
        <p className="text-lg font-medium mb-2">No assets found</p>
        <p>Add assets to start tracking inventory.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {filteredAssets.map((asset) => {
        const stockLevel = getStockLevel(asset.current_quantity);
        
        // Get quantity display with subtle color coding
        const getQuantityDisplay = () => {
          if (!asset.has_inventory) {
            return { text: 'No Inventory', colorClass: 'text-amber-600' };
          }
          
          const quantity = asset.current_quantity;
          const unitType = asset.unit_type || 'units';
          if (stockLevel === 'out') return { text: `${quantity} ${unitType}`, colorClass: 'text-red-600' };
          if (stockLevel === 'low') return { text: `${quantity} ${unitType}`, colorClass: 'text-orange-600' };
          if (stockLevel === 'high') return { text: `${quantity} ${unitType}`, colorClass: 'text-green-600' };
          return { text: `${quantity} ${unitType}`, colorClass: 'text-blue-600' };
        };

        const quantityDisplay = getQuantityDisplay();
        
        // Add subtle left border color based on asset type
        const borderColor = asset.asset_type_color 
          ? `border-l-4 border-l-[${asset.asset_type_color}]` 
          : 'border-l-4 border-l-blue-500';

        return (
          <Card key={asset.asset_id} className={`hover:shadow-md transition-shadow ${borderColor}`}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base font-semibold line-clamp-1" title={asset.asset_name}>
                    {asset.asset_name}
                  </CardTitle>
                  {asset.asset_type_name && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {asset.asset_type_name}
                    </p>
                  )}
                </div>
                
                {/* Subtle status indicator */}
                <div className="flex-shrink-0">
                  {stockLevel === 'out' && <AlertTriangle className="h-4 w-4 text-red-500" />}
                  {stockLevel === 'low' && <TrendingDown className="h-4 w-4 text-orange-500" />}
                  {stockLevel === 'high' && <TrendingUp className="h-4 w-4 text-green-500" />}
                </div>
              </div>
              
              {/* Prominent quantity display */}
              <div className="mt-2">
                <Badge 
                  variant="outline"
                  className={`${getStockLevelColor(stockLevel)} w-fit font-semibold`}
                >
                  <Package className="h-3 w-3 mr-1" />
                  {quantityDisplay.text}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0 space-y-3">
              {/* Clean metadata section */}
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">
                    {asset.asset_location && asset.asset_location !== 'Location TBD' 
                      ? asset.asset_location 
                      : 'Location not set'
                    }
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  {asset.last_check_date ? (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span className="text-xs">Updated {format(new Date(asset.last_check_date), 'MMM d')}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span className="text-xs">No updates</span>
                    </div>
                  )}
                  
                  <Badge 
                    variant={asset.asset_status === 'active' ? 'default' : 'secondary'} 
                    className="text-xs"
                  >
                    {asset.asset_status || 'Active'}
                  </Badge>
                </div>
              </div>
              
              {/* Compact description */}
              {asset.asset_description && (
                <p className="text-xs text-muted-foreground line-clamp-2" title={asset.asset_description}>
                  {asset.asset_description}
                </p>
              )}
              
              {/* Streamlined action buttons */}
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewAsset(asset)}
                  className="w-full"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Asset
                </Button>
                
                <div className="flex gap-2">
                  {asset.has_inventory ? (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleInventoryCheck(asset)}
                        className="flex-1"
                      >
                        <Calendar className="h-4 w-4 mr-1" />
                        Check
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleViewHistory(asset)}
                        className="flex-1"
                      >
                        <History className="h-4 w-4 mr-1" />
                        History
                      </Button>
                    </>
                  ) : (
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={() => handleCreateInventory(asset)}
                      className="flex-1"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Inventory
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
