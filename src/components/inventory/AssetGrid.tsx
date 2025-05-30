import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import AssetCard from "./AssetCard";
import { AlertCircle } from "lucide-react";

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
  asset_type: any;
  inventory_items?: Array<{ id: string; quantity: number; created_at: string }> | null;
}

interface AssetGridProps {
  organizationId?: string;
  assetTypeId?: string;
  searchTerm?: string;
  onEdit?: (asset: Asset) => void;
  onDelete?: (asset: Asset) => void;
  onGenerateQR?: (asset: Asset) => void;
}

// Global cache for asset data to prevent redundant fetches
const assetsCache = new Map<string, { assets: Asset[]; timestamp: number }>();

// Function to clear cache for all organizations/asset types
export const clearAssetCache = () => {
  console.log("[AssetGrid] Clearing all asset cache");
  assetsCache.clear();
};

// Function to clear cache for specific organization
export const clearAssetCacheForOrg = (organizationId: string) => {
  console.log(`[AssetGrid] Clearing asset cache for org: ${organizationId}`);
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
      assetType = {
        id: item.asset_type[0]?.id,
        name: item.asset_type[0]?.name || 'Unknown',
        color: item.asset_type[0]?.color || '#888888',
        deleted_at: item.asset_type[0]?.deleted_at
      };
    } else if (item.asset_type && typeof item.asset_type === 'object' && item.asset_type.id) {
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
      has_inventory: Boolean(item.inventory_items && item.inventory_items.length > 0),
      initial_inventory_created: Boolean(item.inventory_items && item.inventory_items.length > 0),
      inventory_quantity: item.inventory_items && item.inventory_items.length > 0 ? item.inventory_items[0].quantity : undefined,
      inventory_items: item.inventory_items,
      inventory_created_at: item.inventory_items && item.inventory_items.length > 0 ? item.inventory_items[0].created_at : undefined
    };
  });
};

export default function AssetGrid({
  organizationId,
  assetTypeId,
  searchTerm = "",
  onEdit,
  onDelete,
  onGenerateQR,
}: AssetGridProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Track mount state to prevent state updates after unmount
  const isMounted = useRef(true);
  const cacheKey = useMemo(() => createCacheKey(organizationId, assetTypeId), 
    [organizationId, assetTypeId]);
  const hasFetched = useRef(false);
  const currentFetchId = useRef(0);

  // Filter assets based on search term
  const filteredAssets = useMemo(() => {
    if (!searchTerm) return assets;
    
    const term = searchTerm.toLowerCase();
    return assets.filter(asset => 
      asset.name.toLowerCase().includes(term) ||
      asset.description?.toLowerCase().includes(term) ||
      asset.serial_number?.toLowerCase().includes(term) ||
      asset.asset_type?.name.toLowerCase().includes(term)
    );
  }, [assets, searchTerm]);

  // Create a memoized fetch function
  const fetchAssets = useCallback(async (force = false) => {
    if (!organizationId) {
      console.log("[AssetGrid] No organizationId provided, skipping fetch");
      setAssets([]);
      hasFetched.current = true;
      return;
    }
    
    // Check cache first unless forced refresh
    if (!force) {
      const cached = assetsCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp < 10000)) {
        console.log("[AssetGrid] Using cached assets data");
        setAssets(cached.assets);
        hasFetched.current = true;
        return;
      }
    }
    
    const fetchId = ++currentFetchId.current;
    
    if (assets.length === 0) {
      setLoading(true);
    }
    
    console.log(`[AssetGrid] Fetching assets with organizationId: ${organizationId}`);
    
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
      
      if (fetchId !== currentFetchId.current) {
        console.log(`[AssetGrid] Fetch ${fetchId} was superseded, discarding results`);
        return;
      }
      
      if (error) {
        console.error('[AssetGrid] Error fetching assets:', error);
        if (isMounted.current) {
          setError(error.message);
          setLoading(false);
        }
        return;
      }
      
      if (!data) {
        console.log('[AssetGrid] No asset data returned');
        if (isMounted.current) {
          setAssets([]);
          setLoading(false);
        }
        return;
      }
      
      const processedAssets = processAssetData(data);
      console.log(`[AssetGrid] Processed ${processedAssets.length} assets`);
      
      // Cache the results
      assetsCache.set(cacheKey, { 
        assets: processedAssets, 
        timestamp: Date.now() 
      });
      
      if (isMounted.current) {
        setAssets(processedAssets);
        setError(null);
        setLoading(false);
        hasFetched.current = true;
      }
    } catch (err) {
      console.error('[AssetGrid] Unexpected error:', err);
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
        setLoading(false);
      }
    }
  }, [organizationId, assetTypeId, cacheKey, assets.length]);

  // Effect for initial fetch
  useEffect(() => {
    if (!hasFetched.current && organizationId) {
      fetchAssets();
    }
    
    return () => {
      isMounted.current = false;
    };
  }, [fetchAssets, organizationId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Spinner className="h-8 w-8" />
        <span className="ml-2">Loading assets...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Error loading assets: {error}
        </AlertDescription>
      </Alert>
    );
  }

  if (filteredAssets.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-muted-foreground">
          {searchTerm ? `No assets found matching "${searchTerm}"` : "No assets found"}
        </div>
        {!searchTerm && (
          <p className="text-sm text-muted-foreground mt-2">
            Start by adding your first asset to get started.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {filteredAssets.map((asset) => (
        <AssetCard
          key={asset.id}
          asset={asset}
          onEdit={onEdit}
          onDelete={onDelete}
          onGenerateQR={onGenerateQR}
        />
      ))}
    </div>
  );
} 