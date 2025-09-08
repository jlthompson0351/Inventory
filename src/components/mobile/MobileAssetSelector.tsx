import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Package, MapPin, Clock, QrCode, ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

// Constants
const SEARCH_DEBOUNCE_DELAY = 300;
const MAX_SEARCH_RESULTS = 50;
const DEFAULT_LOCATION_TEXT = 'No location';

// Error messages
const ERROR_MESSAGES = {
  FETCH_FAILED: 'Unable to load assets. Please check your connection and try again.',
  NO_ORGANIZATION: 'Organization not found. Please contact support.',
  DATABASE_ERROR: 'Database connection error. Please try again in a moment.',
  NETWORK_ERROR: 'Network error. Please check your internet connection.',
} as const;

// Types

interface Asset {
  id: string;
  name: string;
  description?: string;
  serial_number?: string;
  asset_type?: {
    id: string;
    name: string;
    color?: string;
  };
  location?: string;
  last_inventory_date?: string;
  barcode?: string;
}

interface AuthSession {
  user_id: string;
  organization_id: string;
  full_name: string;
  role: string;
}

interface MobileAssetSelectorProps {
  organizationId: string;
  currentAssetTypeId?: string;
  onAssetSelect: (asset: Asset) => void;
  onCancel: () => void;
  authSession: AuthSession;
  recentAssets?: Asset[];
}

// Custom hook for debounced search
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function MobileAssetSelector({
  organizationId,
  currentAssetTypeId,
  onAssetSelect,
  onCancel,
  authSession,
  recentAssets = []
}: MobileAssetSelectorProps) {
  // Input validation
  if (!organizationId) {
    console.error('MobileAssetSelector: organizationId is required');
    return (
      <div className="fixed inset-0 z-50 bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 text-center">
          <p className="text-red-600 mb-4">{ERROR_MESSAGES.NO_ORGANIZATION}</p>
          <Button onClick={onCancel} variant="outline">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  if (!authSession) {
    console.error('MobileAssetSelector: authSession is required');
    return (
      <div className="fixed inset-0 z-50 bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 text-center">
          <p className="text-red-600 mb-4">Authentication required. Please try again.</p>
          <Button onClick={onCancel} variant="outline">
            Go Back
          </Button>
        </div>
      </div>
    );
  }
  const [searchTerm, setSearchTerm] = useState('');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRecentOnly, setShowRecentOnly] = useState(true);

  // Debounce search term to avoid excessive API calls
  const debouncedSearchTerm = useDebounce(searchTerm, SEARCH_DEBOUNCE_DELAY);

  // Fetch assets based on search term
  const fetchAssets = useCallback(async (searchQuery: string) => {
    if (!organizationId) return;

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('assets')
        .select(`
          id,
          name,
          description,
          serial_number,
          barcode,
          metadata,
          asset_type:asset_types(id, name, color),
          inventory_items!left(
            id,
            created_at,
            inventory_history!left(created_at)
          )
        `)
        .eq('organization_id', organizationId)
        .eq('is_deleted', false)
        .order('name', { ascending: true });

      // Add asset type filter if specified
      if (currentAssetTypeId) {
        query = query.eq('asset_type_id', currentAssetTypeId);
      }

      // Add search filter if search term exists
      if (searchQuery.trim()) {
        query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,serial_number.ilike.%${searchQuery}%`);
      }

      const { data, error: fetchError } = await query.limit(MAX_SEARCH_RESULTS);

      if (fetchError) {
        throw fetchError;
      }

      // Process assets with last inventory date
      const processedAssets = data?.map(asset => {
        const lastInventory = asset.inventory_items?.[0]?.inventory_history?.[0]?.created_at;
        return {
          id: asset.id,
          name: asset.name,
          description: asset.description,
          serial_number: asset.serial_number,
          barcode: asset.barcode,
          location: asset.metadata?.location || DEFAULT_LOCATION_TEXT,
          asset_type: asset.asset_type,
          last_inventory_date: lastInventory
        };
      }) || [];

      setAssets(processedAssets);
    } catch (err) {
      console.error('Error fetching assets:', err);
      
      // Provide specific error messages based on error type
      let errorMessage = ERROR_MESSAGES.FETCH_FAILED;
      
      if (err && typeof err === 'object' && 'code' in err) {
        switch ((err as any).code) {
          case '42703':
            errorMessage = ERROR_MESSAGES.DATABASE_ERROR;
            break;
          case 'PGRST301':
            errorMessage = ERROR_MESSAGES.NO_ORGANIZATION;
            break;
          default:
            errorMessage = ERROR_MESSAGES.FETCH_FAILED;
        }
      } else if (err instanceof TypeError) {
        errorMessage = ERROR_MESSAGES.NETWORK_ERROR;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [organizationId, currentAssetTypeId]);

  // Fetch assets when search term changes
  useEffect(() => {
    if (debouncedSearchTerm.trim()) {
      fetchAssets(debouncedSearchTerm);
      setShowRecentOnly(false);
    } else {
      setAssets([]);
      setShowRecentOnly(true);
    }
  }, [debouncedSearchTerm, fetchAssets]);

  // Filter and sort assets
  const filteredAssets = useMemo(() => {
    if (showRecentOnly) {
      return recentAssets.slice(0, 10);
    }

    return assets.sort((a, b) => {
      // Sort by last inventory date (most recent first)
      if (a.last_inventory_date && b.last_inventory_date) {
        return new Date(b.last_inventory_date).getTime() - new Date(a.last_inventory_date).getTime();
      }
      if (a.last_inventory_date) return -1;
      if (b.last_inventory_date) return 1;
      return 0;
    });
  }, [assets, recentAssets, showRecentOnly]);

  // Handle asset selection
  const handleAssetSelect = (asset: Asset) => {
    onAssetSelect(asset);
  };

  // Handle barcode scan (placeholder for future implementation)
  const handleBarcodeScan = () => {
    // TODO: Implement barcode scanning
    console.log('Barcode scan not implemented yet');
  };

  // Format last inventory date
  const formatLastInventory = (dateString?: string) => {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-200 flex flex-col max-h-[80vh]">
        {/* Header - Mobile Card Style */}
        <div className="bg-white rounded-t-2xl border-b border-gray-200 px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="p-2 h-10 w-10 rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold text-gray-900 flex-1 text-center">
              Select Next Asset
            </h1>
            <div className="w-10"></div> {/* Spacer for centering */}
          </div>

          {/* Search Bar - Mobile Card Style */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search assets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 h-12 text-base rounded-xl border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Quick Actions - Mobile Card Style */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBarcodeScan}
              className="flex-1 h-10 rounded-xl"
            >
              <QrCode className="h-4 w-4 mr-2" />
              Scan QR Code
            </Button>
            {currentAssetTypeId && (
              <Badge variant="secondary" className="px-3 py-2">
                Filtered
              </Badge>
            )}
          </div>
        </div>

        {/* Content - Mobile Card Style */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2 text-gray-500">
                <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                <span>Searching assets...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4">
              <div className="border border-red-200 bg-red-50 rounded-xl p-4">
                <p className="text-red-600 text-center mb-3">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchAssets(debouncedSearchTerm)}
                  className="w-full rounded-xl"
                >
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {!loading && !error && (
            <div className="px-4 py-2 space-y-3">
              {showRecentOnly && recentAssets.length > 0 && (
                <div className="mb-3">
                  <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Recent Assets
                  </h3>
                </div>
              )}

              {filteredAssets.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg font-medium mb-2">
                    {searchTerm ? 'No assets found' : 'No recent assets'}
                  </p>
                  <p className="text-gray-400 text-sm">
                    Try searching or scanning a QR code
                  </p>
                </div>
              ) : (
                filteredAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className="bg-gray-50 border border-gray-200 rounded-xl p-4 cursor-pointer hover:shadow-md transition-all duration-200 active:scale-98 touch-manipulation hover:bg-blue-50 hover:border-blue-300"
                    onClick={() => handleAssetSelect(asset)}
                  >
                    <div className="flex items-center gap-3">
                      {/* Asset Type Color Indicator */}
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ 
                          backgroundColor: asset.asset_type?.color || '#6b7280' 
                        }}
                      />
                      
                      {/* Asset Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-base leading-tight mb-1">
                          {asset.name}
                        </h3>
                        
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          {asset.asset_type && (
                            <span className="flex items-center gap-1">
                              <Package className="h-3 w-3" />
                              {asset.asset_type.name}
                            </span>
                          )}
                          
                          {asset.location && asset.location !== DEFAULT_LOCATION_TEXT && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {asset.location}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Selection Indicator */}
                      <div className="flex-shrink-0">
                        <ArrowRight className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer - Mobile Card Style */}
        <div className="bg-gray-50 border-t border-gray-200 px-4 py-3 rounded-b-2xl">
          <p className="text-sm text-gray-500 text-center">
            {showRecentOnly 
              ? `${recentAssets.length} recent assets available`
              : `${filteredAssets.length} assets found`
            }
          </p>
        </div>
      </div>
    </div>
  );
}

export default MobileAssetSelector;
