/**
 * Monthly Snapshot Table Component - Enhanced
 * 
 * Table view for monthly snapshots with useful filters
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Download, 
  Search,
  Filter,
  MapPin,
  DollarSign,
  Calendar,
  Package,
  RefreshCw,
  Table
} from 'lucide-react';
import { format, subMonths, endOfMonth } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface MonthlySnapshot {
  id: string;
  month_year: string;
  asset_name: string;
  item_name: string;
  quantity: number;
  location: string | null;
  status: string | null;
  current_price: number;
  currency: string;
  snapshot_date: string;
  asset_id: string;
}

interface AssetType {
  id: string;
  name: string;
  color: string;
}

interface MonthlySnapshotTableProps {
  organizationId: string;
}

export default function MonthlySnapshotTable({
  organizationId
}: MonthlySnapshotTableProps) {
  const [snapshots, setSnapshots] = useState<MonthlySnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAssetTypes, setSelectedAssetTypes] = useState<string[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [availableAssetTypes, setAvailableAssetTypes] = useState<AssetType[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  
  // Date range state
  const [dateRange, setDateRange] = useState({
    start: format(subMonths(new Date(), 6), 'yyyy-MM-01'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });

  // Load asset types
  useEffect(() => {
    const loadAssetTypes = async () => {
      if (!organizationId) return;

      try {
        const { data: assetTypesData } = await supabase
          .from('asset_types')
          .select('id, name, color')
          .eq('organization_id', organizationId)
          .eq('is_deleted', false)
          .order('name');

        setAvailableAssetTypes(assetTypesData || []);
      } catch (err) {
        console.error('Error loading asset types:', err);
      }
    };

    loadAssetTypes();
  }, [organizationId]);

  // Load monthly snapshots
  const loadSnapshots = async () => {
    if (!organizationId) return;

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('monthly_inventory_snapshots')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_deleted', false)
        .order('snapshot_date', { ascending: false });

      // Apply date range filters
      if (dateRange.start && dateRange.end) {
        query = query
          .gte('snapshot_date', dateRange.start)
          .lte('snapshot_date', dateRange.end);
      }

      // Apply search filter
      if (searchTerm) {
        query = query.ilike('asset_name', `%${searchTerm}%`);
      }

      // Filter by asset types
      if (selectedAssetTypes.length > 0) {
        const { data: assetsOfType } = await supabase
          .from('assets')
          .select('id')
          .eq('organization_id', organizationId)
          .in('asset_type_id', selectedAssetTypes)
          .eq('is_deleted', false);

        if (assetsOfType && assetsOfType.length > 0) {
          const assetIdsOfType = assetsOfType.map(a => a.id);
          query = query.in('asset_id', assetIdsOfType);
        } else {
          // No assets of this type, return empty
          setSnapshots([]);
          setLoading(false);
          return;
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
  }, [organizationId, searchTerm, selectedAssetTypes.join(','), dateRange.start, dateRange.end]);

  // Handle row selection
  const handleRowSelect = (snapshotId: string, checked: boolean) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(snapshotId);
      } else {
        newSet.delete(snapshotId);
      }
      return newSet;
    });
  };

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(new Set(snapshots.map(s => s.id)));
    } else {
      setSelectedRows(new Set());
    }
  };

  // Get status color
  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'low_stock': return 'bg-yellow-100 text-yellow-800';
      case 'out_of_stock': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Export data
  const exportData = () => {
    const dataToExport = selectedRows.size > 0 
      ? snapshots.filter(s => selectedRows.has(s.id))
      : snapshots;

    if (dataToExport.length === 0) return;

    const csvContent = [
      ['Month', 'Asset Name', 'Quantity', 'Status', 'Location', 'Price', 'Currency', 'Date'],
      ...dataToExport.map(s => [
        s.month_year,
        s.asset_name,
        s.quantity.toString(),
        s.status || '',
        s.location || '',
        s.current_price.toString(),
        s.currency,
        format(new Date(s.snapshot_date), 'yyyy-MM-dd')
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

  const allSelected = snapshots.length > 0 && selectedRows.size === snapshots.length;
  const someSelected = selectedRows.size > 0 && selectedRows.size < snapshots.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Table className="h-5 w-5" />
                Monthly Snapshots
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                {snapshots.length} snapshots found
                {selectedRows.size > 0 && ` • ${selectedRows.size} selected`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                {showFilters ? 'Hide' : 'Show'} Filters
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportData}
                disabled={snapshots.length === 0}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export {selectedRows.size > 0 ? 'Selected' : 'All'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={loadSnapshots}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        
        {/* Filters */}
        {showFilters && (
          <CardContent className="border-t">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="space-y-2">
                <Label htmlFor="search">Search Assets</Label>
                <div className="relative">
                  <Input
                    id="search"
                    placeholder="Search by asset name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                </div>
              </div>

              {/* Asset Types */}
              <div className="space-y-2">
                <Label>Asset Types</Label>
                <Select
                  value={selectedAssetTypes.length > 0 ? selectedAssetTypes[0] : 'all'}
                  onValueChange={(value) => 
                    setSelectedAssetTypes(value === 'all' ? [] : [value])
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {availableAssetTypes.map(type => (
                      <SelectItem key={type.id} value={type.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: type.color }}
                          />
                          {type.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range */}
              <div className="space-y-2">
                <Label>From Month</Label>
                <Input
                  type="month"
                  value={dateRange.start.substring(0, 7)}
                  onChange={(e) => setDateRange(prev => ({
                    ...prev,
                    start: e.target.value + '-01'
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label>To Month</Label>
                <Input
                  type="month"
                  value={dateRange.end.substring(0, 7)}
                  onChange={(e) => {
                    const year = e.target.value.substring(0, 4);
                    const month = e.target.value.substring(5, 7);
                    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
                    setDateRange(prev => ({
                      ...prev,
                      end: `${e.target.value}-${lastDay.toString().padStart(2, '0')}`
                    }));
                  }}
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Bulk Actions */}
      {selectedRows.size > 0 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {selectedRows.size} snapshots selected
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportData}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export Selected
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedRows(new Set())}
                >
                  Clear Selection
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="h-8 w-8" />
              <span className="ml-2">Loading snapshots...</span>
            </div>
          ) : error ? (
            <Alert variant="destructive" className="m-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : snapshots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Package className="h-12 w-12 mb-4" />
              <h3 className="text-lg font-medium">No Snapshots Found</h3>
              <p className="text-sm">No monthly snapshots found for your search criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <Checkbox
                        checked={allSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = someSelected;
                        }}
                        onCheckedChange={handleSelectAll}
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Month
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Asset Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {snapshots.map((snapshot) => (
                    <tr key={snapshot.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Checkbox
                          checked={selectedRows.has(snapshot.id)}
                          onCheckedChange={(checked) => 
                            handleRowSelect(snapshot.id, checked as boolean)
                          }
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {snapshot.month_year}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {snapshot.asset_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {snapshot.item_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {snapshot.quantity}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={getStatusColor(snapshot.status)}>
                          {snapshot.status || 'Unknown'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-sm text-gray-900">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          {snapshot.location || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-sm text-gray-900">
                          <DollarSign className="h-4 w-4 text-gray-400" />
                          {snapshot.current_price} {snapshot.currency}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-sm text-gray-900">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          {format(new Date(snapshot.snapshot_date), 'MMM dd, yyyy')}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}