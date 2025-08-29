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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {filteredAssets.map((asset) => {
        const stockLevel = getStockLevel(asset.current_quantity);
        
        // Create dynamic gradient based on asset type color
        const assetTypeColor = asset.asset_type_color;
        const gradientStyle = assetTypeColor ? {
          background: `linear-gradient(135deg, ${assetTypeColor}, ${assetTypeColor}dd, ${assetTypeColor}ee)`
        } : {
          background: 'linear-gradient(135deg, #6E56CF, #6E56CF)'
        };

        // Get quantity display with creative styling
        const getQuantityDisplay = () => {
          if (!asset.has_inventory) {
            return { text: 'No Inventory', icon: '📋', colorClass: 'text-amber-100' };
          }
          
          const quantity = asset.current_quantity;
          const unitType = asset.unit_type || 'units';
          if (stockLevel === 'out') return { text: `${quantity} ${unitType}`, icon: '🔴', colorClass: 'text-red-100' };
          if (stockLevel === 'low') return { text: `${quantity} ${unitType}`, icon: '🟡', colorClass: 'text-orange-100' };
          if (stockLevel === 'high') return { text: `${quantity} ${unitType}`, icon: '🟢', colorClass: 'text-green-100' };
          return { text: `${quantity} ${unitType}`, icon: '📦', colorClass: 'text-blue-100' };
        };

        const quantityDisplay = getQuantityDisplay();
        
        return (
          <div key={asset.asset_id} className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
            {/* Dynamic Gradient Header */}
            <div style={gradientStyle}>
              <div className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded-lg flex-shrink-0">
                      <Package className="h-4 w-4 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-bold text-white leading-tight" title={asset.asset_name}>
                        {asset.asset_name}
                      </h3>
                      {asset.asset_type_name && (
                        <p className="text-white/80 text-xs mt-1">
                          {asset.asset_type_name}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Status Icon */}
                  <div className="flex-shrink-0">
                    {stockLevel === 'out' && (
                      <div className="p-1 bg-red-500/20 rounded-full">
                        <AlertTriangle className="h-4 w-4 text-white" />
                      </div>
                    )}
                    {stockLevel === 'low' && (
                      <div className="p-1 bg-orange-500/20 rounded-full">
                        <TrendingDown className="h-4 w-4 text-white" />
                      </div>
                    )}
                    {stockLevel === 'high' && (
                      <div className="p-1 bg-green-500/20 rounded-full">
                        <TrendingUp className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Quantity Display in Header */}
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-lg px-3 py-2">
                  <span className="text-lg">{quantityDisplay.icon}</span>
                  <span className={`font-bold text-white ${quantityDisplay.colorClass}`}>
                    {quantityDisplay.text}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Enhanced Card Content */}
            <div className="p-4 space-y-4">
              {/* Metadata Section with Enhanced Styling */}
              <div className="grid grid-cols-1 gap-3">
                {asset.asset_location && (
                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                    <div className="p-1 bg-blue-100 rounded">
                      <MapPin className="h-3 w-3 text-blue-600" />
                    </div>
                    <span className="text-sm text-gray-700 truncate">{asset.asset_location}</span>
                  </div>
                )}
                
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  {asset.last_check_date ? (
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3 text-gray-500" />
                      <span className="text-xs text-gray-600">Updated {format(new Date(asset.last_check_date), 'MMM d, yyyy')}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3 text-gray-400" />
                      <span className="text-xs text-gray-400">No updates yet</span>
                    </div>
                  )}
                  
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${
                      asset.asset_status === 'active' 
                        ? 'bg-green-50 text-green-700 border-green-200' 
                        : 'bg-gray-50 text-gray-600 border-gray-200'
                    }`}
                  >
                    {asset.asset_status || 'Active'}
                  </Badge>
                </div>
              </div>
              
              {/* Description with Better Styling */}
              {asset.asset_description && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-800 line-clamp-2" title={asset.asset_description}>
                    {asset.asset_description}
                  </p>
                </div>
              )}
              
              {/* Enhanced Action Buttons */}
              <div className="space-y-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewAsset(asset)}
                  className="w-full h-9 text-sm border-2 border-blue-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Asset
                </Button>
                
                <div className="grid grid-cols-2 gap-2">
                  {asset.has_inventory ? (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleInventoryCheck(asset)}
                        className="h-9 text-sm border-2 border-green-200 hover:border-green-300 hover:bg-green-50 transition-all duration-200"
                      >
                        <Calendar className="h-4 w-4 mr-1" />
                        Check
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleViewHistory(asset)}
                        className="h-9 text-sm border-2 border-purple-200 hover:border-purple-300 hover:bg-purple-50 transition-all duration-200"
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
                      className="h-9 text-sm col-span-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Inventory
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
