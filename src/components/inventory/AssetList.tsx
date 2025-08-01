import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Eye, Edit, Trash2, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { softDeleteAsset } from "@/services/assetService";

// Define Asset type interface properly
interface Asset {
  id: string;
  name: string;
  description?: string;
  status?: string;
  serial_number?: string;
  acquisition_date?: string;
  asset_type?: {
    id: string;
    name: string;
    color: string;
    deleted_at?: string | null;
  };
  // Add inventory information
  has_inventory?: boolean;
  initial_inventory_created?: boolean;
  inventory_quantity?: number;
  inventory_items?: Array<{ id: string; quantity: number; created_at: string }> | null;
  inventory_created_at?: string;
}

// Interface for raw asset data from Supabase
interface RawAssetData {
  id: string;
  name: string;
  description?: string;
  status?: string;
  serial_number?: string;
  acquisition_date?: string;
  asset_type: any; // This can be an array or object depending on query
  inventory_items?: Array<{ id: string; quantity: number; created_at: string }> | null;
}

interface AssetListProps {
  organizationId?: string;
  assetTypeId?: string;
  onEdit?: (asset: Asset) => void;
  onDelete?: (asset: Asset) => void;
  onView?: (asset: Asset) => void;
}

// Global cache for asset data to prevent redundant fetches
const assetsCache = new Map<string, { assets: Asset[]; timestamp: number }>();

// Function to clear cache for all organizations/asset types (for inventory updates)
export const clearAssetCache = () => {
      // Clearing all asset cache
  assetsCache.clear();
};

// Function to clear cache for specific organization (more targeted)
export const clearAssetCacheForOrg = (organizationId: string) => {
      // Clearing asset cache for org
  for (const [key] of assetsCache) {
    if (key.includes(`org:${organizationId}`)) {
      assetsCache.delete(key);
    }
  }
};

// Create a cache key from the parameters
const createCacheKey = (orgId?: string, typeId?: string) => 
  `org:${orgId || 'none'}_type:${typeId || 'none'}`;

// Process raw data from Supabase into proper Asset type
const processAssetData = (rawData: RawAssetData[]): Asset[] => {
  return rawData.map(item => {
    // Handle nested asset_type format from Supabase
    let assetType;
    if (Array.isArray(item.asset_type) && item.asset_type.length > 0) {
      // If asset_type is an array, take the first item
      assetType = {
        id: item.asset_type[0]?.id,
        name: item.asset_type[0]?.name || 'Unknown',
        color: item.asset_type[0]?.color || '#888888',
        deleted_at: item.asset_type[0]?.deleted_at
      };
    } else if (item.asset_type && typeof item.asset_type === 'object' && item.asset_type.id) {
      // If asset_type is an object
      assetType = {
        id: item.asset_type.id,
        name: item.asset_type?.name || 'Unknown',
        color: item.asset_type?.color || '#888888',
        deleted_at: item.asset_type?.deleted_at
      };
    }
    
    return {
      id: item.id,
      name: item.name || 'Unnamed Asset',
      description: item.description,
      status: item.status,
      serial_number: item.serial_number,
      acquisition_date: item.acquisition_date,
      asset_type: assetType,
      // Add inventory information from joined data
      has_inventory: Boolean(item.inventory_items && item.inventory_items.length > 0),
      initial_inventory_created: Boolean(item.inventory_items && item.inventory_items.length > 0), // If inventory exists, it was initially created
      inventory_quantity: item.inventory_items && item.inventory_items.length > 0 ? item.inventory_items[0].quantity : undefined,
      inventory_items: item.inventory_items,
      inventory_created_at: item.inventory_items && item.inventory_items.length > 0 ? item.inventory_items[0].created_at : undefined
    };
  });
};

export default function AssetList({
  organizationId,
  assetTypeId,
  onEdit,
  onDelete,
  onView,
}: AssetListProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [buttonLoading, setButtonLoading] = useState<string | null>(null); // Track which button is loading
  const navigate = useNavigate();
  
  // Track mount state to prevent state updates after unmount
  const isMounted = useRef(true);
  // Create a cache key for this component instance
  const cacheKey = useMemo(() => createCacheKey(organizationId, assetTypeId), 
    [organizationId, assetTypeId]);
  // Track if we've already fetched for this component instance
  const hasFetched = useRef(false);
  // Track the fetch request to cancel multiple concurrent requests
  const currentFetchId = useRef(0);
  
  // Debounce timer for rapid state changes
  const debounceTimerRef = useRef<number | null>(null);
  
  // Create a memoized fetch function
  const fetchAssets = useCallback(async (force = false) => {
    // Skip if missing required parameters
    if (!organizationId) {
      // No organizationId provided, skipping fetch
      setAssets([]);
      hasFetched.current = true;
      return;
    }
    
    // Check cache first unless forced refresh
    if (!force) {
      const cached = assetsCache.get(cacheKey);
      // Use cache if it's less than 10 seconds old (reduced from 2 minutes for real-time inventory)
      if (cached && (Date.now() - cached.timestamp < 10000)) {
        // Using cached assets data
        setAssets(cached.assets);
        hasFetched.current = true;
        return;
      }
    }
    
    // Cancel any previous fetches in progress
    const fetchId = ++currentFetchId.current;
    
    // Only show loading if we don't have data yet
    if (assets.length === 0) {
      setLoading(true);
    }
    
    // Fetching assets
    
    try {
      let query = supabase
        .from('assets')
        .select(`
          id,
          name,
          description,
          status,
          serial_number,
          acquisition_date,
          asset_type:asset_types(id, name, color, deleted_at),
          inventory_items!left(id, quantity, created_at)
        `)
        .eq('organization_id', organizationId)
        .is('deleted_at', null);
      
      if (assetTypeId) {
        query = query.eq('asset_type_id', assetTypeId);
      }
      
      const { data, error } = await query.order('name', { ascending: true });
      
      // If another fetch was started after this one, discard these results
      if (fetchId !== currentFetchId.current) {
        // Fetch was superseded, discarding results
        return;
      }
      
      if (error) {
        console.error("[AssetList] Supabase error fetching assets:", error);
        throw error;
      }
      
      // Make sure component is still mounted before updating state
      if (isMounted.current) {
        // Fetched assets
        
        // Process the raw data into the proper Asset format
        const processedData = processAssetData(data || []);
        
        // Update the cache
        assetsCache.set(cacheKey, {
          assets: processedData,
          timestamp: Date.now()
        });
        
        setAssets(processedData);
        setError(null);
        hasFetched.current = true;
      }
    } catch (err) {
      // Only update error state if component is still mounted
      if (isMounted.current) {
        console.error("[AssetList] Error fetching assets:", err);
        setError("Failed to load assets. Please try again.");
        setAssets([]);
      }
    } finally {
      // Only update loading state if component is still mounted
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [organizationId, assetTypeId, cacheKey, assets.length]);

  // Debounced fetch function to prevent rapid consecutive fetches
  const debouncedFetch = useCallback((force = false) => {
    // Clear any existing timer
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
    }
    
    // Set a new timer
    debounceTimerRef.current = window.setTimeout(() => {
      fetchAssets(force);
      debounceTimerRef.current = null;
    }, 100); // 100ms debounce
  }, [fetchAssets]);

  // Effect to fetch assets when parameters change
  useEffect(() => {
    // If we haven't fetched yet, or if we have a forced refresh, fetch the data
    if (!hasFetched.current) {
      debouncedFetch();
    }
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted.current = false;
      // Clear any pending debounce timer
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, [organizationId, assetTypeId, debouncedFetch]);

  // Effect to clear loading states after navigation
  useEffect(() => {
    const clearLoadingStates = () => {
      setButtonLoading(null);
    };
    
    // Clear loading states when component re-mounts (user navigated back)
    return clearLoadingStates;
  }, [assets]); // Reset when assets change

  // Simplified handler for asset edit - goes to comprehensive asset detail page
  const handleEdit = useCallback((asset: Asset) => {
    try {
      setButtonLoading(`edit-${asset.id}`);
      if (onEdit) {
        onEdit(asset);
      } else {
        // Navigate to comprehensive asset detail page
        navigate(`/assets/${asset.id}`);
      }
    } catch (err) {
      console.error("[AssetList] Error navigating to asset detail:", err);
      setError("Failed to navigate to asset detail page");
      setButtonLoading(null);
    }
  }, [navigate, onEdit]);

  const handleDelete = useCallback((asset: Asset) => {
    try {
      if (onDelete) {
        onDelete(asset);
      } else {
        // Use Dialog component to confirm deletion
        // This is an example, you might need a more robust confirmation
        if (window.confirm(`Are you sure you want to delete ${asset.name}?`)) {
          // Attempting to delete asset
          softDeleteAsset(asset.id).then(success => {
            // softDeleteAsset success
            if (success) {
              // Clear the cache for this specific key before refreshing
              assetsCache.delete(cacheKey);
              // Refresh the list after deletion
              fetchAssets(true); 
            } else {
              console.error(`[AssetList] Failed to delete asset from service: ${asset.id}`);
              setError("Failed to delete asset.");
            }
          }).catch(err => {
            console.error(`[AssetList] Error in softDeleteAsset promise for asset: ${asset.id}:`, err);
            setError("Error during asset deletion process.");
          });
        }
      }
    } catch (err) {
      console.error("[AssetList] Error in handleDelete function:", err);
      setError("Failed to delete asset");
    }
  }, [onDelete, fetchAssets, cacheKey]);

  const handleView = useCallback((asset: Asset) => {
    try {
      setButtonLoading(`view-${asset.id}`);
      if (onView) {
        onView(asset);
      } else {
        // NEW: View inventory/intake history instead of asset detail
        if (asset.has_inventory && asset.inventory_items && asset.inventory_items.length > 0) {
          const inventoryId = asset.inventory_items[0].id;
          // Navigate to inventory item detail which shows history
          navigate(`/inventory/item/${inventoryId}?tab=history`);
        } else {
          // No inventory yet - show asset detail with option to create inventory
          navigate(`/assets/${asset.id}?focus=inventory`);
        }
      }
    } catch (err) {
      console.error("[AssetList] Error navigating to view inventory history:", err);
      setError("Failed to navigate to inventory history page");
      setButtonLoading(null);
    }
  }, [navigate, onView]);

  // If we have cached data, show it immediately while loading in background
  const cachedData = useMemo(() => assetsCache.get(cacheKey)?.assets, [cacheKey]);
  const displayAssets = assets.length > 0 ? assets : cachedData || [];

  // Only show loading indicator if there's no data to display
  if (loading && displayAssets.length === 0) {
    return (
      <div className="flex justify-center items-center h-48">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error && !displayAssets.length) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (displayAssets.length === 0) {
    return (
      <div className="border border-dashed rounded-md p-8 text-center text-muted-foreground">
        No assets found. Add assets to get started.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {displayAssets.map((asset) => (
        <Card key={asset.id} className="overflow-hidden hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  {asset.name || "Unnamed Asset"}
                  {asset.has_inventory && (
                    <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 border-green-300">
                      📦 Inventory
                    </Badge>
                  )}
                </CardTitle>
                <div className="text-sm text-muted-foreground mt-1">
                  {asset.serial_number && (
                    <p className="font-mono">SN: {asset.serial_number}</p>
                  )}
                  {asset.has_inventory && asset.inventory_quantity !== undefined && (
                    <div className="flex items-center gap-2">
                      <p className="text-green-700 font-medium">
                        Current Stock: {asset.inventory_quantity} units
                      </p>
                      {/* Stock status indicator */}
                      {(() => {
                        if (asset.inventory_quantity === 0) {
                          return <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 font-medium">🚨 Out of Stock</span>;
                        } else if (asset.inventory_quantity < 10) {
                          return <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 font-medium">⚠️ Low Stock</span>;
                        }
                        return null;
                      })()}
                      {/* Freshness indicator */}
                      {asset.inventory_created_at && (
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                          {(() => {
                            const hoursAgo = Math.floor((Date.now() - new Date(asset.inventory_created_at).getTime()) / (1000 * 60 * 60));
                            if (hoursAgo < 24) return `🟢 ${hoursAgo}h ago`;
                            if (hoursAgo < 168) return `🟡 ${Math.floor(hoursAgo / 24)}d ago`;
                            return `🔴 ${Math.floor(hoursAgo / 168)}w ago`;
                          })()}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {asset.status && (
                  <Badge
                    variant={
                      asset.status === "active"
                        ? "default"
                        : asset.status === "maintenance"
                        ? "secondary"
                        : "destructive"
                    }
                  >
                    {asset.status}
                  </Badge>
                )}
                {asset.asset_type && (
                  <Badge
                    variant="outline"
                    style={{
                      borderColor: asset.asset_type.color || "#888",
                      color: asset.asset_type.color || "#888",
                      opacity: asset.asset_type.deleted_at ? 0.6 : 1,
                    }}
                  >
                    {asset.asset_type.name || "Unknown Type"}
                    {asset.asset_type.deleted_at ? " (Archived)" : ""}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div className="text-sm">
                {asset.description && <p>{asset.description}</p>}
                {asset.acquisition_date && (
                  <p className="text-muted-foreground mt-1">
                    Acquired: {new Date(asset.acquisition_date).toLocaleDateString()}
                  </p>
                )}
                {asset.has_inventory && asset.initial_inventory_created && (
                  <p className="text-green-600 text-xs mt-1 flex items-center gap-1">
                    ✓ Initial inventory created {asset.inventory_created_at ? 
                      `on ${new Date(asset.inventory_created_at).toLocaleDateString()}` : 
                      'during asset setup'}
                  </p>
                )}
              </div>
              <div className="flex items-center">
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => handleEdit(asset)}
                  disabled={buttonLoading === `edit-${asset.id}`}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  title="Edit asset details, manage inventory, forms, and QR codes"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  {buttonLoading === `edit-${asset.id}` ? "Loading..." : "Edit"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      
      {/* Show subtle loading indicator if refreshing with existing data */}
      {loading && displayAssets.length > 0 && (
        <div className="text-center py-2 text-sm text-muted-foreground">
          Refreshing assets...
        </div>
      )}
    </div>
  );
} 