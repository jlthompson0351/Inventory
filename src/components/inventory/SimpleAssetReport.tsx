import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, Download, RefreshCw, FileText, Clock, Users, Settings, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from 'sonner';

interface AssetReportData {
  asset_name: string;
  asset_type: string;
  latest_submission: any;
  submission_date: string;
}

interface AssetType {
  id: string;
  name: string;
  color: string;
}

interface FormField {
  id: string;
  label: string;
  type: string;
  selected: boolean;
}

// Helper function to safely render form field values
const renderFieldValue = (value: any): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    // If it's an object, try to extract a meaningful value or stringify it
    if (value.value !== undefined) return String(value.value);
    if (value.amount !== undefined) return String(value.amount);
    if (value.quantity !== undefined) return String(value.quantity);
    // For complex objects, return a readable string
    return JSON.stringify(value);
  }
  return String(value);
};

const SimpleAssetReport: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);
  const [selectedAssetType, setSelectedAssetType] = useState<string>('all');
  const [reportData, setReportData] = useState<AssetReportData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  // Load asset types
  useEffect(() => {
    if (currentOrganization?.id) {
      loadAssetTypes();
    }
  }, [currentOrganization?.id]);

  const loadAssetTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('asset_types')
        .select('id, name, color')
        .eq('organization_id', currentOrganization!.id)
        .eq('is_deleted', false)
        .order('name');

      if (error) throw error;
      setAssetTypes(data || []);
    } catch (error: any) {
      toast.error('Failed to load asset types: ' + error.message);
    }
  };

  const generateReport = async () => {
    if (!currentOrganization?.id) {
      toast.error('No organization selected');
      return;
    }
    
    setIsLoading(true);
    try {
      console.log('Generating report for organization:', currentOrganization.id);
      console.log('Selected asset type:', selectedAssetType);

      // Build query based on selected asset type
      let query = supabase
        .from('assets')
        .select(`
          id,
          name,
          asset_type_id,
          asset_types!inner(id, name, color, inventory_form_id),
          form_submissions(
            submission_data,
            created_at
          )
        `)
        .eq('organization_id', currentOrganization.id)
        .eq('is_deleted', false)
        .order('created_at', { foreignTable: 'form_submissions', ascending: false });

      if (selectedAssetType !== 'all') {
        query = query.eq('asset_type_id', selectedAssetType);
        console.log('Filtering by asset type ID:', selectedAssetType);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Query error:', error);
        throw error;
      }

      console.log('Query returned data:', data);

      if (!data || data.length === 0) {
        toast.error('No assets found. Make sure you have assets created with the selected asset type.');
        setReportData([]);
        setFormFields([]);
        setIsLoading(false);
        return;
      }

      // Get form schemas to map field IDs to labels
      const formIds = Array.from(new Set(data?.map((asset: any) => asset.asset_types?.inventory_form_id).filter(Boolean)));
      console.log('Form IDs found:', formIds);
      
      let formSchemas: Record<string, FormField[]> = {};
      if (formIds.length > 0) {
        const { data: forms, error: formError } = await supabase
          .from('forms')
          .select('id, form_data')
          .in('id', formIds);

        if (formError) {
          console.error('Form schema error:', formError);
        } else {
          console.log('Form schemas:', forms);
          forms?.forEach((form: any) => {
            const fields = form.form_data?.fields || [];
            formSchemas[form.id] = fields.map((field: any) => ({
              id: field.id,
              label: field.label || field.id.replace('field_', 'Field '),
              type: field.type,
              selected: true
            }));
          });
        }
      }

      // Process data to get latest submission per asset
      const processedData: AssetReportData[] = [];
      const fieldSet = new Set<string>();
      const fieldLabelMap: Record<string, string> = {};

      data?.forEach((asset: any) => {
        const latestSubmission = asset.form_submissions?.[0];
        const formId = asset.asset_types?.inventory_form_id;
        const formFieldsForAsset = formSchemas[formId] || [];

        // Build field label map
        formFieldsForAsset.forEach((field: FormField) => {
          fieldLabelMap[field.id] = field.label;
        });
        
        if (latestSubmission) {
          // Collect all field keys to determine columns
          Object.keys(latestSubmission.submission_data || {}).forEach(key => {
            fieldSet.add(key);
          });

          processedData.push({
            asset_name: asset.name,
            asset_type: asset.asset_types.name,
            latest_submission: latestSubmission.submission_data || {},
            submission_date: latestSubmission.created_at
          });
        } else {
          // Asset with no submissions
          processedData.push({
            asset_name: asset.name,
            asset_type: asset.asset_types.name,
            latest_submission: {},
            submission_date: ''
          });
        }
      });

      console.log('Processed data:', processedData);
      console.log('Field set:', Array.from(fieldSet));

      // Convert field set to sorted array with labels
      const fieldsWithLabels = Array.from(fieldSet)
        .sort()
        .map(fieldId => ({
          id: fieldId,
          label: fieldLabelMap[fieldId] || fieldId.replace('field_', 'Field ').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          type: 'unknown',
          selected: true
        }));

      setFormFields(fieldsWithLabels);
      setReportData(processedData);
      setShowColumnSelector(true); // Show column selector after generating report

      toast.success(`Report generated! Found ${processedData.length} assets with ${fieldsWithLabels.length} form fields. Select columns below.`);

    } catch (error: any) {
      console.error('Report generation error:', error);
      toast.error('Failed to generate report: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleColumn = (fieldId: string) => {
    setFormFields(prev => 
      prev.map(field => 
        field.id === fieldId 
          ? { ...field, selected: !field.selected }
          : field
      )
    );
  };

  const toggleAllColumns = (checked: boolean) => {
    setFormFields(prev => 
      prev.map(field => ({ ...field, selected: checked }))
    );
  };

  const getSelectedFields = () => formFields.filter(f => f.selected);

  const exportToCSV = () => {
    if (reportData.length === 0) {
      toast.error('No data to export');
      return;
    }

    const selectedFields = getSelectedFields();
    if (selectedFields.length === 0) {
      toast.error('Please select at least one column to export');
      return;
    }

    setIsExporting(true);
    try {
      // Build CSV headers
      const headers = ['Asset Name', 'Asset Type', 'Last Updated', ...selectedFields.map(f => f.label)];
      
      // Build CSV rows
      const rows = reportData.map(row => [
        row.asset_name,
        row.asset_type,
        row.submission_date ? new Date(row.submission_date).toLocaleDateString() : 'No data',
        ...selectedFields.map(field => renderFieldValue(row.latest_submission[field.id]))
      ]);

      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      
      const assetTypeName = selectedAssetType === 'all' ? 'All_Assets' : 
        assetTypes.find(t => t.id === selectedAssetType)?.name || 'Assets';
      
      link.download = `📊_Monthly_Inventory_${assetTypeName}_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();

      toast.success('Report exported successfully!');
    } catch (error: any) {
      toast.error('Failed to export report: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  const selectedFields = getSelectedFields();
  const previewData = showPreview ? reportData.slice(0, 3) : reportData; // Limit to 3 for preview

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            📊 Monthly Asset Inventory
          </h1>
          <p className="text-gray-600 mt-1">
            Simple, asset-centric reporting - each row is an asset with latest form data
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {formFields.length > 0 && (
            <Button
              onClick={() => setShowColumnSelector(!showColumnSelector)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Select Columns ({selectedFields.length}/{formFields.length})
            </Button>
          )}
          <Button
            onClick={exportToCSV}
            disabled={isExporting || reportData.length === 0 || selectedFields.length === 0}
            variant="outline"
            className="flex items-center gap-2"
          >
            {isExporting ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Export CSV
          </Button>
        </div>
      </div>

      {/* Simple Controls */}
      <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Generate Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Asset Type Filter
              </label>
              <Select value={selectedAssetType} onValueChange={setSelectedAssetType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select asset type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"></div>
                      All Asset Types
                    </span>
                  </SelectItem>
                  {assetTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      <span className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: type.color }}
                        ></div>
                        {type.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {assetTypes.length === 0 && (
                <p className="text-xs text-red-500 mt-1">
                  No asset types found. Please create asset types first.
                </p>
              )}
              {assetTypes.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Found {assetTypes.length} asset types
                </p>
              )}
            </div>

            <Button 
              onClick={generateReport}
              disabled={isLoading || !currentOrganization?.id}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-8"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Generate Report
                </>
              )}
            </Button>
          </div>
          
          {/* Debug Info */}
          {currentOrganization && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
              <strong>Debug Info:</strong> Org: {currentOrganization.name} | Asset Types: {assetTypes.length} | Selected: {selectedAssetType}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Column Selector */}
      {showColumnSelector && formFields.length > 0 && (
        <Card className="border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-orange-600" />
                Select Columns to Include
              </span>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="select-all"
                  checked={selectedFields.length === formFields.length}
                  onCheckedChange={toggleAllColumns}
                />
                <label htmlFor="select-all" className="text-sm font-normal">
                  Select All ({formFields.length})
                </label>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {formFields.map((field) => (
                <div key={field.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={field.id}
                    checked={field.selected}
                    onCheckedChange={() => toggleColumn(field.id)}
                  />
                  <label
                    htmlFor={field.id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {field.label}
                  </label>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-orange-600">
                ✨ Selected columns: {selectedFields.length} | Preview shows first 3 assets
              </p>
              <Button
                onClick={() => setShowPreview(!showPreview)}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showPreview ? 'Show All' : 'Show Preview'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report Results */}
      {reportData.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-green-600" />
                Asset Inventory Report
                {showPreview && reportData.length > 3 && (
                  <Badge variant="outline" className="ml-2">
                    Preview: {previewData.length} of {reportData.length} assets
                  </Badge>
                )}
              </CardTitle>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {reportData.length} assets
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Generated {new Date().toLocaleString()}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left p-3 font-semibold bg-gray-50">Asset Name</th>
                    <th className="text-left p-3 font-semibold bg-gray-50">Type</th>
                    <th className="text-left p-3 font-semibold bg-gray-50">Last Updated</th>
                    {selectedFields.map((field) => (
                      <th key={field.id} className="text-left p-3 font-semibold bg-gray-50">
                        {field.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="p-3 font-medium text-blue-600">{row.asset_name}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-xs">
                          {row.asset_type}
                        </Badge>
                      </td>
                      <td className="p-3 text-sm text-gray-500">
                        {row.submission_date ? 
                          new Date(row.submission_date).toLocaleDateString() : 
                          <span className="text-red-500">No data</span>
                        }
                      </td>
                      {selectedFields.map((field) => (
                        <td key={field.id} className="p-3 text-sm">
                          {renderFieldValue(row.latest_submission[field.id]) || 
                            <span className="text-gray-400">-</span>
                          }
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {showPreview && reportData.length > 3 && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg text-center">
                <p className="text-sm text-blue-700">
                  📋 Showing preview of first 3 assets. Click "Show All" above to see all {reportData.length} assets, or export CSV for complete data.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && reportData.length === 0 && (
        <Card className="border-dashed border-2 border-gray-300">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              No Report Generated
            </h3>
            <p className="text-gray-500 text-center max-w-md">
              Select an asset type and click "Generate Report" to see your monthly inventory data with assets as rows and form fields as columns.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SimpleAssetReport; 