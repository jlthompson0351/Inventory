import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Eye, Edit, Trash2, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Define Asset type interface properly
interface Asset {
  id: string;
  name: string;
  description?: string;
  status?: string;
  serial_number?: string;
  acquisition_date?: string;
  asset_type?: {
    name: string;
    color: string;
  };
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
}

interface AssetListProps {
  organizationId?: string;
  assetTypeId?: string;
  onEdit?: (asset: Asset) => void;
  onDelete?: (asset: Asset) => void;
  onView?: (asset: Asset) => void;
}

// Global cache to store fetched assets across component instances
// This helps prevent refetches when navigating back to the same page
const assetsCache = new Map<string, { assets: Asset[], timestamp: number }>();

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
        name: item.asset_type[0]?.name || 'Unknown',
        color: item.asset_type[0]?.color || '#888888'
      };
    } else if (item.asset_type && typeof item.asset_type === 'object') {
      // If asset_type is an object
      assetType = {
        name: item.asset_type?.name || 'Unknown',
        color: item.asset_type?.color || '#888888'
      };
    }
    
    return {
      id: item.id,
      name: item.name || 'Unnamed Asset',
      description: item.description,
      status: item.status,
      serial_number: item.serial_number,
      acquisition_date: item.acquisition_date,
      asset_type: assetType
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
      console.log("[AssetList] No organizationId provided, skipping fetch");
      setAssets([]);
      hasFetched.current = true;
      return;
    }
    
    // Check cache first unless forced refresh
    if (!force) {
      const cached = assetsCache.get(cacheKey);
      // Use cache if it's less than 2 minutes old
      if (cached && (Date.now() - cached.timestamp < 120000)) {
        console.log("[AssetList] Using cached assets data");
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
    
    console.log(`[AssetList] Fetching assets with organizationId: ${organizationId}`);
    
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
          asset_type:asset_types(id, name, color)
        `)
        .eq('organization_id', organizationId)
        .is('deleted_at', null);
      
      if (assetTypeId) {
        query = query.eq('asset_type_id', assetTypeId);
      }
      
      const { data, error } = await query.order('name', { ascending: true });
      
      // If another fetch was started after this one, discard these results
      if (fetchId !== currentFetchId.current) {
        console.log(`[AssetList] Fetch ${fetchId} was superseded, discarding results`);
        return;
      }
      
      if (error) {
        console.error("[AssetList] Supabase error fetching assets:", error);
        throw error;
      }
      
      // Make sure component is still mounted before updating state
      if (isMounted.current) {
        console.log(`[AssetList] Fetched ${data?.length || 0} assets`);
        
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

  // Memoized handlers for asset actions to prevent recreation on every render
  const handleEdit = useCallback((asset: Asset) => {
    try {
      if (onEdit) {
        onEdit(asset);
      } else {
        navigate(`/assets/${asset.id}/edit`);
      }
    } catch (err) {
      console.error("[AssetList] Error navigating to edit asset:", err);
      setError("Failed to navigate to edit page");
    }
  }, [navigate, onEdit]);

  const handleDelete = useCallback((asset: Asset) => {
    try {
      if (onDelete) {
        onDelete(asset);
      }
    } catch (err) {
      console.error("[AssetList] Error deleting asset:", err);
      setError("Failed to delete asset");
    }
  }, [onDelete]);

  const handleView = useCallback((asset: Asset) => {
    try {
      if (onView) {
        onView(asset);
      } else {
        navigate(`/assets/${asset.id}`);
      }
    } catch (err) {
      console.error("[AssetList] Error navigating to view asset:", err);
      setError("Failed to navigate to view page");
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
        <Card key={asset.id} className="overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">{asset.name || "Unnamed Asset"}</CardTitle>
                <div className="text-sm text-muted-foreground mt-1">
                  {asset.serial_number && (
                    <p className="font-mono">SN: {asset.serial_number}</p>
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
                    }}
                  >
                    {asset.asset_type.name || "Unknown Type"}
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
              </div>
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleView(asset)}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleEdit(asset)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => handleDelete(asset)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
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