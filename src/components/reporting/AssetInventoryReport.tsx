import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../ui/table';
import { 
  Download, 
  Filter, 
  RefreshCw, 
  Calendar,
  BarChart3,
  FileText,
  Search
} from 'lucide-react';
import { supabase } from '../../integrations/supabase/client';
import { getAssetInventoryReport, AssetInventoryReportData } from '../../services/reportService';

interface AssetType {
  id: string;
  name: string;
  color: string;
  icon: string;
}

interface AssetInventoryReportProps {
  className?: string;
}

// Simple date formatter to avoid deep instantiation issues
const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: '2-digit', 
      day: '2-digit', 
      year: 'numeric' 
    });
  } catch {
    return 'Invalid Date';
  }
};

export const AssetInventoryReport: React.FC<AssetInventoryReportProps> = ({ className }) => {
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);
  const [selectedAssetType, setSelectedAssetType] = useState<string>('');
  const [reportData, setReportData] = useState<AssetInventoryReportData[]>([]);
  const [loading, setLoading] = useState(false);
  const [includeIntake, setIncludeIntake] = useState(false);
  const [monthFilter, setMonthFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  // For now, we'll get org ID from localStorage or similar
  // You can replace this with your actual auth context
  const organizationId = 'd1c96b17-879d-4aa5-b6d4-ff3aea68aced'; // Replace with actual auth

  // Load asset types
  useEffect(() => {
    const loadAssetTypes = async () => {
      if (!organizationId) return;

      try {
        const { data, error } = await supabase
          .from('asset_types')
          .select('id, name, color, icon')
          .eq('organization_id', organizationId)
          .eq('is_deleted', false)
          .order('name');

        if (error) throw error;
        setAssetTypes(data || []);
        
        // Auto-select first asset type
        if (data && data.length > 0) {
          setSelectedAssetType(data[0].id);
        }
      } catch (error) {
        console.error('Error loading asset types:', error);
      }
    };

    loadAssetTypes();
  }, [organizationId]);

  // Load report data when asset type changes
  useEffect(() => {
    if (selectedAssetType && organizationId) {
      loadReportData();
    }
  }, [selectedAssetType, organizationId, includeIntake, monthFilter]);

  const loadReportData = async () => {
    if (!selectedAssetType || !organizationId) return;

    setLoading(true);
    try {
      const data = await getAssetInventoryReport(
        organizationId,
        selectedAssetType,
        {
          includeIntake,
          monthFilter: monthFilter || undefined
        }
      );
      setReportData(data);
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm) return reportData;
    
    return reportData.filter(item =>
      item.asset_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.asset_barcode.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [reportData, searchTerm]);

  // Get dynamic field labels from form data
  const getFieldLabels = () => {
    const labels: Record<string, string> = {
      field_1: 'Full Drums',
      field_2: 'Coating Amount (inches)',
      field_3: 'Partial Drums (inches)', 
      field_4: 'Tank Amount',
      field_5: 'Dip/Spin WMV',
      field_6: 'WMV RackSpin',
      field_7: 'Field 7',
      field_8: 'Field 8',
      field_10: 'Field 10',
      field_12: 'Field 12',
      field_13: 'Total (Gallons)'
    };

    return labels;
  };

  const fieldLabels = getFieldLabels();

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      'Asset Name',
      'Barcode',
      ...Object.values(fieldLabels),
      'Total Converted',
      'Last Audit',
      'Has Recent Data'
    ];

    const csvData = filteredData.map(item => [
      item.asset_name,
      item.asset_barcode,
      item.field_1,
      item.field_2,
      item.field_3,
      item.field_4,
      item.field_5,
      item.field_6,
      item.field_7,
      item.field_8,
      item.field_10,
      item.field_12,
      item.field_13,
      item.total_converted,
      item.last_audit_date ? formatDate(item.last_audit_date) : '',
      item.has_recent_data ? 'Yes' : 'No'
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `asset-inventory-${selectedAssetType}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const selectedAssetTypeName = assetTypes.find(at => at.id === selectedAssetType)?.name || 'Asset';

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Asset Inventory Report</h1>
          <p className="text-muted-foreground">
            Latest inventory data by asset type with form field columns
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={loadReportData} 
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button 
            onClick={exportToCSV}
            disabled={filteredData.length === 0}
            variant="outline"
            size="sm"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            {/* Asset Type Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Asset Type</label>
              <Select value={selectedAssetType} onValueChange={setSelectedAssetType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select asset type" />
                </SelectTrigger>
                <SelectContent>
                  {assetTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      <div className="flex items-center gap-2">
                        <span>{type.icon}</span>
                        <span>{type.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Month Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Month Filter</label>
              <Input
                type="month"
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                placeholder="Filter by month"
              />
            </div>

            {/* Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Search Assets</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name or barcode"
                  className="pl-10"
                />
              </div>
            </div>

            {/* Include Intake */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Options</label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-intake"
                  checked={includeIntake}
                  onCheckedChange={(checked) => setIncludeIntake(checked === true)}
                />
                <label htmlFor="include-intake" className="text-sm">
                  Include intake data
                </label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Assets</p>
                <p className="text-2xl font-bold">{filteredData.length}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">With Recent Data</p>
                <p className="text-2xl font-bold">
                  {filteredData.filter(item => item.has_recent_data).length}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Converted</p>
                <p className="text-2xl font-bold">
                  {filteredData.reduce((sum, item) => sum + (item.total_converted || 0), 0).toLocaleString()}
                </p>
              </div>
              <FileText className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Asset Type</p>
                <p className="text-lg font-bold">{selectedAssetTypeName}</p>
              </div>
              <div className="w-8 h-8 flex items-center justify-center text-2xl">
                {assetTypes.find(at => at.id === selectedAssetType)?.icon || '📦'}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{selectedAssetTypeName} Inventory Report</span>
            <Badge variant="secondary">{filteredData.length} assets</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-40">Asset Name</TableHead>
                  <TableHead className="w-32">Barcode</TableHead>
                  {Object.entries(fieldLabels).map(([key, label]) => (
                    <TableHead key={key} className="text-center min-w-24">
                      {label}
                    </TableHead>
                  ))}
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Last Audit</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  {includeIntake && <TableHead className="text-center">Intake Date</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={13 + (includeIntake ? 1 : 0)} className="text-center py-8">
                      <div className="flex items-center justify-center space-x-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Loading report data...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={13 + (includeIntake ? 1 : 0)} className="text-center py-8">
                      No data available for selected filters
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((item) => (
                    <TableRow key={item.asset_id}>
                      <TableCell className="font-medium">{item.asset_name}</TableCell>
                      <TableCell className="font-mono text-sm">{item.asset_barcode}</TableCell>
                      <TableCell className="text-center">{item.field_1}</TableCell>
                      <TableCell className="text-center">{item.field_2}</TableCell>
                      <TableCell className="text-center">{item.field_3}</TableCell>
                      <TableCell className="text-center">{item.field_4}</TableCell>
                      <TableCell className="text-center">{item.field_5}</TableCell>
                      <TableCell className="text-center">{item.field_6}</TableCell>
                      <TableCell className="text-center">{item.field_7}</TableCell>
                      <TableCell className="text-center">{item.field_8}</TableCell>
                      <TableCell className="text-center">{item.field_10}</TableCell>
                      <TableCell className="text-center">{item.field_12}</TableCell>
                      <TableCell className="text-center font-semibold">{item.field_13}</TableCell>
                      <TableCell className="text-center font-bold">
                        {item.total_converted?.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {item.last_audit_date ? 
                          formatDate(item.last_audit_date) : 
                          'No data'
                        }
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={item.has_recent_data ? 'default' : 'secondary'}>
                          {item.has_recent_data ? 'Recent' : 'Outdated'}
                        </Badge>
                      </TableCell>
                      {includeIntake && (
                        <TableCell className="text-center text-sm">
                          {item.intake_date ? 
                            formatDate(item.intake_date) : 
                            'N/A'
                          }
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 