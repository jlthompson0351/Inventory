/**
 * Monthly Snapshot History Component
 * 
 * Displays monthly inventory snapshots with filtering and export capabilities
 * Can be used for single asset or multiple assets
 */

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calendar, 
  Download, 
  Filter, 
  TrendingUp, 
  TrendingDown,
  Package,
  MapPin,
  DollarSign,
  Clock,
  BarChart3
} from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface MonthlySnapshot {
  month_year: string;
  item_name: string;
  quantity: number;
  location: string | null;
  status: string | null;
  current_price: number;
  currency: string;
  snapshot_date: string;
  created_at: string;
}

interface MonthlySnapshotHistoryProps {
  assetIds?: string[]; // For multiple assets
  assetName?: string; // For single asset
  organizationId: string;
  showAssetFilter?: boolean;
  showDateRange?: boolean;
  maxMonths?: number;
}

export default function MonthlySnapshotHistory({
  assetIds = [],
  assetName,
  organizationId,
  showAssetFilter = false,
  showDateRange = true,
  maxMonths = 24
}: MonthlySnapshotHistoryProps) {
  const [snapshots, setSnapshots] = useState<MonthlySnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [selectedAssetTypes, setSelectedAssetTypes] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{
    start: string;
    end: string;
  }>({
    start: '2020-01-01', // Start from 2020 to capture all historical data
    end: format(new Date(), 'yyyy-MM-dd')
  });
  
  // Data states
  const [availableAssets, setAvailableAssets] = useState<any[]>([]);
  const [assetTypes, setAssetTypes] = useState<any[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  
  // Asset selection UI states
  const [assetSearchTerm, setAssetSearchTerm] = useState('');
  const [showAssetSelector, setShowAssetSelector] = useState(false);
  const [assetPage, setAssetPage] = useState(1);
  const [assetsPerPage] = useState(20);

  // Load asset types and available assets
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load asset types
        const { data: typesData } = await supabase
          .from('asset_types')
          .select('id, name, color')
          .eq('organization_id', organizationId)
          .eq('is_deleted', false)
          .order('name');

        setAssetTypes(typesData || []);

        // Load available assets if showing asset filter
        if (showAssetFilter) {
          const { data: assetsData } = await supabase
            .from('assets')
            .select(`
              id,
              name,
              asset_type_id,
              asset_types!inner(id, name, color)
            `)
            .eq('organization_id', organizationId)
            .eq('is_deleted', false)
            .order('name');

          setAvailableAssets(assetsData || []);
        }
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load asset data');
      }
    };

    loadData();
  }, [organizationId, showAssetFilter]);

  // Load monthly snapshots
  const loadSnapshots = async () => {
    if (!organizationId || loading) return; // Prevent multiple simultaneous requests

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('monthly_inventory_snapshots')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_deleted', false)
        .order('snapshot_date', { ascending: false });

      // Apply date range filters only if both dates are provided
      if (dateRange.start && dateRange.end) {
        query = query
          .gte('snapshot_date', dateRange.start)
          .lte('snapshot_date', dateRange.end);
      }

      // Filter by specific assets if provided
      if (assetIds.length > 0) {
        query = query.in('asset_id', assetIds);
      } else if (selectedAssets.length > 0) {
        query = query.in('asset_id', selectedAssets);
      } else if (assetName) {
        query = query.eq('asset_name', assetName);
      }

      // Filter by asset types if selected
      if (selectedAssetTypes.length > 0) {
        const { data: assetsOfType } = await supabase
          .from('assets')
          .select('id')
          .eq('organization_id', organizationId)
          .in('asset_type_id', selectedAssetTypes)
          .eq('is_deleted', false);

        if (assetsOfType) {
          const assetIdsOfType = assetsOfType.map(a => a.id);
          query = query.in('asset_id', assetIdsOfType);
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error('Supabase query error:', error);
        throw error;
      }
      
      setSnapshots(data || []);
    } catch (err) {
      console.error('Error loading monthly snapshots:', err);
      setError('Failed to load monthly snapshots');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSnapshots();
  }, [
    organizationId, 
    assetName, 
    dateRange.start, 
    dateRange.end,
    assetIds.join(','), // Convert array to string for stable comparison
    selectedAssets.join(','), // Convert array to string for stable comparison
    selectedAssetTypes.join(',') // Convert array to string for stable comparison
  ]);

  // Filter and paginate assets for selection
  const filteredAssets = useMemo(() => {
    return availableAssets.filter(asset => 
      asset.name.toLowerCase().includes(assetSearchTerm.toLowerCase()) ||
      asset.asset_types?.name.toLowerCase().includes(assetSearchTerm.toLowerCase())
    );
  }, [availableAssets, assetSearchTerm]);

  const paginatedAssets = useMemo(() => {
    const startIndex = (assetPage - 1) * assetsPerPage;
    return filteredAssets.slice(startIndex, startIndex + assetsPerPage);
  }, [filteredAssets, assetPage, assetsPerPage]);

  const totalPages = Math.ceil(filteredAssets.length / assetsPerPage);

  // Group snapshots by month for better display
  const groupedSnapshots = useMemo(() => {
    const groups: { [key: string]: MonthlySnapshot[] } = {};
    
    snapshots.forEach(snapshot => {
      const monthKey = snapshot.month_year;
      if (!groups[monthKey]) {
        groups[monthKey] = [];
      }
      groups[monthKey].push(snapshot);
    });

    return groups;
  }, [snapshots]);

  // Calculate trends
  const calculateTrend = (snapshots: MonthlySnapshot[], field: 'quantity' | 'current_price') => {
    if (snapshots.length < 2) return null;
    
    const sorted = snapshots.sort((a, b) => new Date(a.snapshot_date).getTime() - new Date(b.snapshot_date).getTime());
    const first = sorted[0][field];
    const last = sorted[sorted.length - 1][field];
    
    if (first === last) return 'stable';
    return first < last ? 'up' : 'down';
  };

  const handleExport = () => {
    const csvContent = [
      ['Month', 'Asset Name', 'Quantity', 'Location', 'Status', 'Price', 'Currency', 'Snapshot Date'],
      ...snapshots.map(s => [
        s.month_year,
        s.item_name,
        s.quantity.toString(),
        s.location || '',
        s.status || '',
        s.current_price.toString(),
        s.currency,
        s.snapshot_date
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monthly-snapshots-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleAssetTypeToggle = (typeId: string) => {
    setSelectedAssetTypes(prev => 
      prev.includes(typeId) 
        ? prev.filter(id => id !== typeId)
        : [...prev, typeId]
    );
  };

  const handleAssetToggle = (assetId: string) => {
    setSelectedAssets(prev => 
      prev.includes(assetId) 
        ? prev.filter(id => id !== assetId)
        : [...prev, assetId]
    );
  };

  const handleSelectAllVisible = () => {
    const visibleAssetIds = paginatedAssets.map(asset => asset.id);
    const allVisibleSelected = visibleAssetIds.every(id => selectedAssets.includes(id));
    
    if (allVisibleSelected) {
      // Deselect all visible
      setSelectedAssets(prev => prev.filter(id => !visibleAssetIds.includes(id)));
    } else {
      // Select all visible
      setSelectedAssets(prev => [...new Set([...prev, ...visibleAssetIds])]);
    }
  };

  const handleSelectAllFiltered = () => {
    const filteredAssetIds = filteredAssets.map(asset => asset.id);
    const allFilteredSelected = filteredAssetIds.every(id => selectedAssets.includes(id));
    
    if (allFilteredSelected) {
      // Deselect all filtered
      setSelectedAssets(prev => prev.filter(id => !filteredAssetIds.includes(id)));
    } else {
      // Select all filtered
      setSelectedAssets(prev => [...new Set([...prev, ...filteredAssetIds])]);
    }
  };

  const handleClearSelection = () => {
    setSelectedAssets([]);
  };

  if (loading && snapshots.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Spinner size="lg" />
            <span className="ml-2">Loading monthly snapshots...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Monthly Snapshot History
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Asset Type Filter */}
          {showAssetFilter && assetTypes.length > 0 && (
            <div>
              <Label className="text-sm font-medium">Filter by Asset Type</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {assetTypes.map(type => (
                  <div key={type.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`type-${type.id}`}
                      checked={selectedAssetTypes.includes(type.id)}
                      onCheckedChange={() => handleAssetTypeToggle(type.id)}
                    />
                    <Label 
                      htmlFor={`type-${type.id}`}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: type.color }}
                      />
                      {type.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Advanced Asset Selection */}
          {showAssetFilter && availableAssets.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">
                  Select Assets ({selectedAssets.length} selected)
                </Label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAssetSelector(!showAssetSelector)}
                  >
                    {showAssetSelector ? 'Hide' : 'Show'} Asset Selector
                  </Button>
                  {selectedAssets.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearSelection}
                    >
                      Clear All
                    </Button>
                  )}
                </div>
              </div>

              {/* Selected Assets Summary */}
              {selectedAssets.length > 0 && (
                <div className="mb-3 p-2 bg-blue-50 rounded-md">
                  <div className="text-sm text-blue-800">
                    <strong>{selectedAssets.length}</strong> asset{selectedAssets.length !== 1 ? 's' : ''} selected
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    {selectedAssets.slice(0, 3).map(id => {
                      const asset = availableAssets.find(a => a.id === id);
                      return asset?.name;
                    }).join(', ')}
                    {selectedAssets.length > 3 && ` and ${selectedAssets.length - 3} more...`}
                  </div>
                </div>
              )}

              {/* Asset Selector Modal */}
              {showAssetSelector && (
                <div className="border rounded-md p-4 bg-gray-50">
                  {/* Search and Controls */}
                  <div className="mb-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Search assets by name or type..."
                        value={assetSearchTerm}
                        onChange={(e) => {
                          setAssetSearchTerm(e.target.value);
                          setAssetPage(1); // Reset to first page when searching
                        }}
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSelectAllFiltered}
                      >
                        {filteredAssets.every(asset => selectedAssets.includes(asset.id)) 
                          ? 'Deselect All' 
                          : 'Select All Filtered'
                        }
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>
                        Showing {paginatedAssets.length} of {filteredAssets.length} assets
                      </span>
                      <span>
                        Page {assetPage} of {totalPages}
                      </span>
                    </div>
                  </div>

                  {/* Asset List */}
                  <div className="max-h-60 overflow-y-auto border rounded-md bg-white">
                    {paginatedAssets.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        No assets found matching "{assetSearchTerm}"
                      </div>
                    ) : (
                      <>
                        {/* Select All Visible Button */}
                        <div className="p-2 border-b bg-gray-50">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleSelectAllVisible}
                            className="w-full justify-start"
                          >
                            {paginatedAssets.every(asset => selectedAssets.includes(asset.id))
                              ? 'Deselect All Visible'
                              : 'Select All Visible'
                            }
                          </Button>
                        </div>

                        {/* Asset List */}
                        {paginatedAssets.map(asset => (
                          <div key={asset.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50">
                            <Checkbox
                              id={`asset-${asset.id}`}
                              checked={selectedAssets.includes(asset.id)}
                              onCheckedChange={() => handleAssetToggle(asset.id)}
                            />
                            <Label 
                              htmlFor={`asset-${asset.id}`}
                              className="flex items-center gap-2 text-sm cursor-pointer flex-1"
                            >
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: asset.asset_types?.color || '#6B7280' }}
                              />
                              <span className="font-medium">{asset.name}</span>
                              <span className="text-gray-500 text-xs">
                                ({asset.asset_types?.name || 'Unknown Type'})
                              </span>
                            </Label>
                          </div>
                        ))}
                      </>
                    )}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAssetPage(prev => Math.max(1, prev - 1))}
                        disabled={assetPage === 1}
                      >
                        Previous
                      </Button>
                      
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          const pageNum = Math.max(1, Math.min(totalPages - 4, assetPage - 2)) + i;
                          if (pageNum > totalPages) return null;
                          
                          return (
                            <Button
                              key={pageNum}
                              variant={pageNum === assetPage ? "default" : "outline"}
                              size="sm"
                              onClick={() => setAssetPage(pageNum)}
                              className="w-8 h-8 p-0"
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAssetPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={assetPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Month Range Picker */}
          {showDateRange && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDateRange({
                    start: '2020-01-01',
                    end: format(new Date(), 'yyyy-MM-dd')
                  })}
                >
                  Show All Data
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDateRange({
                    start: format(subMonths(new Date(), 12), 'yyyy-MM-dd'),
                    end: format(new Date(), 'yyyy-MM-dd')
                  })}
                >
                  Last 12 Months
                </Button>
                {showAssetFilter && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedAssets(availableAssets.map(a => a.id))}
                  >
                    Select All Assets
                  </Button>
                )}
              </div>
              
              {/* Simple Month/Year Pickers */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">From Month</Label>
                  <div className="flex gap-2 mt-1">
                    <Select 
                      value={format(new Date(dateRange.start), 'MM')} 
                      onValueChange={(month) => {
                        const year = format(new Date(dateRange.start), 'yyyy');
                        setDateRange(prev => ({ 
                          ...prev, 
                          start: `${year}-${month.padStart(2, '0')}-01` 
                        }));
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Month" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="01">January</SelectItem>
                        <SelectItem value="02">February</SelectItem>
                        <SelectItem value="03">March</SelectItem>
                        <SelectItem value="04">April</SelectItem>
                        <SelectItem value="05">May</SelectItem>
                        <SelectItem value="06">June</SelectItem>
                        <SelectItem value="07">July</SelectItem>
                        <SelectItem value="08">August</SelectItem>
                        <SelectItem value="09">September</SelectItem>
                        <SelectItem value="10">October</SelectItem>
                        <SelectItem value="11">November</SelectItem>
                        <SelectItem value="12">December</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select 
                      value={format(new Date(dateRange.start), 'yyyy')} 
                      onValueChange={(year) => {
                        const month = format(new Date(dateRange.start), 'MM');
                        setDateRange(prev => ({ 
                          ...prev, 
                          start: `${year}-${month}-01` 
                        }));
                      }}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue placeholder="Year" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 15 }, (_, i) => {
                          const year = new Date().getFullYear() - i;
                          return (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">To Month</Label>
                  <div className="flex gap-2 mt-1">
                    <Select 
                      value={format(new Date(dateRange.end), 'MM')} 
                      onValueChange={(month) => {
                        const year = format(new Date(dateRange.end), 'yyyy');
                        const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
                        setDateRange(prev => ({ 
                          ...prev, 
                          end: `${year}-${month.padStart(2, '0')}-${daysInMonth.toString().padStart(2, '0')}` 
                        }));
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Month" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="01">January</SelectItem>
                        <SelectItem value="02">February</SelectItem>
                        <SelectItem value="03">March</SelectItem>
                        <SelectItem value="04">April</SelectItem>
                        <SelectItem value="05">May</SelectItem>
                        <SelectItem value="06">June</SelectItem>
                        <SelectItem value="07">July</SelectItem>
                        <SelectItem value="08">August</SelectItem>
                        <SelectItem value="09">September</SelectItem>
                        <SelectItem value="10">October</SelectItem>
                        <SelectItem value="11">November</SelectItem>
                        <SelectItem value="12">December</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select 
                      value={format(new Date(dateRange.end), 'yyyy')} 
                      onValueChange={(year) => {
                        const month = format(new Date(dateRange.end), 'MM');
                        const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
                        setDateRange(prev => ({ 
                          ...prev, 
                          end: `${year}-${month}-${daysInMonth.toString().padStart(2, '0')}` 
                        }));
                      }}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue placeholder="Year" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 15 }, (_, i) => {
                          const year = new Date().getFullYear() - i;
                          return (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button 
              onClick={loadSnapshots} 
              variant="outline" 
              size="sm"
              disabled={loading}
            >
              <Filter className="h-4 w-4 mr-2" />
              {loading ? 'Loading...' : 'Apply Filters'}
            </Button>
            <Button 
              onClick={handleExport} 
              variant="outline" 
              size="sm"
              disabled={snapshots.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Snapshots Display */}
      {Object.keys(groupedSnapshots).length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Monthly Snapshots Found</h3>
            <p className="text-gray-500">
              No monthly snapshots found for the selected criteria. 
              Snapshots are automatically created at the end of each month.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedSnapshots)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([month, monthSnapshots]) => (
              <Card key={month}>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {format(new Date(month + '-01'), 'MMMM yyyy')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {monthSnapshots.map((snapshot, index) => {
                      const quantityTrend = calculateTrend(monthSnapshots, 'quantity');
                      const priceTrend = calculateTrend(monthSnapshots, 'current_price');
                      
                      return (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">{snapshot.item_name}</h4>
                              <Badge variant="outline">{snapshot.status || 'Active'}</Badge>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <Package className="h-4 w-4" />
                                <span className="font-medium">{snapshot.quantity}</span>
                                {quantityTrend && (
                                  quantityTrend === 'up' ? 
                                    <TrendingUp className="h-3 w-3 text-green-500" /> :
                                    quantityTrend === 'down' ?
                                    <TrendingDown className="h-3 w-3 text-red-500" /> :
                                    null
                                )}
                              </div>
                              {snapshot.location && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-4 w-4" />
                                  <span>{snapshot.location}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-4 w-4" />
                                <span>{snapshot.current_price} {snapshot.currency}</span>
                                {priceTrend && (
                                  priceTrend === 'up' ? 
                                    <TrendingUp className="h-3 w-3 text-green-500" /> :
                                    priceTrend === 'down' ?
                                    <TrendingDown className="h-3 w-3 text-red-500" /> :
                                    null
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                <span>{format(new Date(snapshot.snapshot_date), 'MMM dd')}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}
