import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Download, RefreshCw, FileText, Clock, Users, Settings, Eye, EyeOff, Save, FolderOpen, CalendarDays, Filter, History, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from 'sonner';

interface AssetReportData {
  asset_name: string;
  asset_type: string;
  latest_submission: any;
  submission_date: string;
  last_month_total?: string;
  all_submissions?: any[];
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
  order?: number;
}

interface ReportTemplate {
  id?: string;
  name: string;
  description: string;
  asset_type_filter: string;
  selected_fields: FormField[];
  date_range_type: 'last_month' | 'last_week' | 'last_3_months' | 'all_time' | 'custom';
  custom_start_date?: string;
  custom_end_date?: string;
  view_mode: 'latest' | 'history' | 'comparison';
  created_at?: string;
}

interface DateRange {
  type: 'last_month' | 'last_week' | 'last_3_months' | 'all_time' | 'custom';
  start_date?: Date;
  end_date?: Date;
  label: string;
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

// Helper function to get date range
const getDateRange = (type: string, customStart?: string, customEnd?: string): { start: Date; end: Date } => {
  const now = new Date();
  const end = new Date();
  let start = new Date();

  switch (type) {
    case 'last_week':
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'last_month':
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end.setTime(new Date(now.getFullYear(), now.getMonth(), 0).getTime());
      break;
    case 'last_3_months':
      start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      break;
    case 'all_time':
      start = new Date(2020, 0, 1); // Arbitrary old date
      break;
    case 'custom':
      if (customStart && customEnd) {
        start = new Date(customStart);
        end.setTime(new Date(customEnd).getTime());
      }
      break;
    default:
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end.setTime(new Date(now.getFullYear(), now.getMonth(), 0).getTime());
  }

  return { start, end };
};

const SimpleAssetReport: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);
  const [selectedAssetTypes, setSelectedAssetTypes] = useState<string[]>(['all']);
  const [reportData, setReportData] = useState<AssetReportData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  
  // New template and advanced features state
  const [savedTemplates, setSavedTemplates] = useState<ReportTemplate[]>([]);
  const [currentTemplate, setCurrentTemplate] = useState<ReportTemplate | null>(null);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDescription, setNewTemplateDescription] = useState('');
  
  // Date range and view mode state
  const [dateRangeType, setDateRangeType] = useState<'last_month' | 'last_week' | 'last_3_months' | 'all_time' | 'custom'>('last_month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [viewMode, setViewMode] = useState<'latest' | 'history' | 'comparison'>('latest');
  const [selectedAssetForHistory, setSelectedAssetForHistory] = useState<string>('');

  // Load asset types and templates
  useEffect(() => {
    if (currentOrganization?.id) {
      loadAssetTypes();
      loadSavedTemplates();
    }
  }, [currentOrganization?.id]);

  const loadAssetTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('asset_types')
        .select('id, name, color')
        .eq('organization_id', currentOrganization!.id)
        .eq('is_deleted', false)
        .order('name') as { data: any[] | null; error: any };

      if (error) throw error;
      setAssetTypes(data || []);
    } catch (error: any) {
      toast.error('Failed to load asset types: ' + error.message);
    }
  };

  const loadSavedTemplates = async () => {
    try {
      // For now, use localStorage until we add templates to database
      const saved = localStorage.getItem(`report_templates_${currentOrganization!.id}`);
      if (saved) {
        setSavedTemplates(JSON.parse(saved));
      }
    } catch (error: any) {
      console.error('Failed to load templates:', error);
    }
  };

  const saveTemplate = async () => {
    if (!newTemplateName.trim()) {
      toast.error('Please enter a template name');
      return;
    }

    const template: ReportTemplate = {
      id: Date.now().toString(),
      name: newTemplateName.trim(),
      description: newTemplateDescription.trim(),
      asset_type_filter: selectedAssetTypes[0] || 'all',
      selected_fields: formFields.filter(f => f.selected),
      date_range_type: dateRangeType,
      custom_start_date: customStartDate,
      custom_end_date: customEndDate,
      view_mode: viewMode,
      created_at: new Date().toISOString()
    };

    try {
      const newTemplates = [...savedTemplates, template];
      setSavedTemplates(newTemplates);
      localStorage.setItem(`report_templates_${currentOrganization!.id}`, JSON.stringify(newTemplates));
      
      setNewTemplateName('');
      setNewTemplateDescription('');
      setShowSaveTemplate(false);
      toast.success(`Template "${template.name}" saved successfully!`);
    } catch (error: any) {
      toast.error('Failed to save template: ' + error.message);
    }
  };

  const loadTemplate = (template: ReportTemplate) => {
    setSelectedAssetTypes([template.asset_type_filter]);
    setFormFields(template.selected_fields);
    setDateRangeType(template.date_range_type);
    setCustomStartDate(template.custom_start_date || '');
    setCustomEndDate(template.custom_end_date || '');
    setViewMode(template.view_mode);
    setCurrentTemplate(template);
    toast.success(`Template "${template.name}" loaded!`);
  };

  const deleteTemplate = (templateId: string) => {
    const newTemplates = savedTemplates.filter(t => t.id !== templateId);
    setSavedTemplates(newTemplates);
    localStorage.setItem(`report_templates_${currentOrganization!.id}`, JSON.stringify(newTemplates));
    toast.success('Template deleted');
  };

  const generateReport = async () => {
    if (!currentOrganization?.id) {
      toast.error('No organization selected');
      return;
    }
    
    setIsLoading(true);
    try {
      console.log('Generating report for organization:', currentOrganization.id);
      console.log('Selected asset types:', selectedAssetTypes);
      console.log('Date range type:', dateRangeType);
      console.log('View mode:', viewMode);

      // Get date range
      const { start: startDate, end: endDate } = getDateRange(dateRangeType, customStartDate, customEndDate);
      console.log('Date range:', startDate, 'to', endDate);

      // Build query based on selected asset types
      const { data, error } = await supabase
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
        .eq('is_deleted', false) as { data: any[] | null; error: any };

      // Apply additional filters after the base query
      let filteredData = data;
      
      if (filteredData && !selectedAssetTypes.includes('all') && selectedAssetTypes.length > 0) {
        filteredData = filteredData.filter((asset: any) => 
          selectedAssetTypes.includes(asset.asset_type_id)
        );
      }

      // Apply date filtering and sorting for submissions
      if (filteredData && viewMode !== 'latest') {
        filteredData = filteredData.map((asset: any) => ({
          ...asset,
          form_submissions: asset.form_submissions?.filter((submission: any) => {
            const submissionDate = new Date(submission.created_at);
            return submissionDate >= startDate && submissionDate <= endDate;
          }).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        }));
      } else if (filteredData) {
        // For latest mode, just sort submissions by date
        filteredData = filteredData.map((asset: any) => ({
          ...asset,
          form_submissions: asset.form_submissions?.sort((a: any, b: any) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )
        }));
      }
      
      if (error) {
        console.error('Query error:', error);
        throw error;
      }

      console.log('Query returned data:', filteredData);

      if (!filteredData || filteredData.length === 0) {
        toast.error('No assets found. Make sure you have assets created with the selected criteria.');
        setReportData([]);
        setFormFields([]);
        setIsLoading(false);
        return;
      }

      // Get form schemas to map field IDs to labels
      const formIds = Array.from(new Set(filteredData?.map((asset: any) => asset.asset_types?.inventory_form_id).filter(Boolean)));
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
            formSchemas[form.id] = fields.map((field: any, index: number) => ({
              id: field.id,
              label: field.label || field.id.replace('field_', 'Field '),
              type: field.type,
              selected: true,
              order: index + 1
            }));
          });
        }
      }

      // Process data based on view mode
      const processedData: AssetReportData[] = [];
      const fieldSet = new Set<string>();
      const fieldLabelMap: Record<string, string> = {};

      // Calculate date range for last month total (always needed)
      const now = new Date();
      const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDayLastMonth = new Date(firstDayThisMonth.getTime() - 1);
      const firstDayLastMonth = new Date(lastDayLastMonth.getFullYear(), lastDayLastMonth.getMonth(), 1);

      filteredData?.forEach((asset: any) => {
        const formId = asset.asset_types?.inventory_form_id;
        const formFieldsForAsset = formSchemas[formId] || [];

        // Build field label map
        formFieldsForAsset.forEach((field: FormField) => {
          fieldLabelMap[field.id] = field.label;
        });

        if (viewMode === 'history' && selectedAssetForHistory && asset.id !== selectedAssetForHistory) {
          return; // Skip if we're in history mode and this isn't the selected asset
        }

        if (viewMode === 'latest') {
          // Latest submission mode (original behavior)
          const latestSubmission = asset.form_submissions?.[0];
          
          // Find last month's submission for comparison
          const lastMonthSubmission = asset.form_submissions?.find((submission: any) => {
            const submissionDate = new Date(submission.created_at);
            return submissionDate >= firstDayLastMonth && submissionDate <= lastDayLastMonth;
          });

          let lastMonthTotal = '';
          if (lastMonthSubmission) {
            const submissionData = lastMonthSubmission.submission_data || {};
            const totalField = Object.keys(submissionData).find(key => 
              key.toLowerCase().includes('total') || 
              key.toLowerCase().includes('ending') ||
              key.toLowerCase().includes('balance')
            );
            if (totalField) {
              lastMonthTotal = renderFieldValue(submissionData[totalField]);
            }
          }
          
          if (latestSubmission) {
            Object.keys(latestSubmission.submission_data || {}).forEach(key => {
              fieldSet.add(key);
            });

            processedData.push({
              asset_name: asset.name,
              asset_type: asset.asset_types.name,
              latest_submission: latestSubmission.submission_data || {},
              submission_date: latestSubmission.created_at,
              last_month_total: lastMonthTotal
            });
          } else {
            processedData.push({
              asset_name: asset.name,
              asset_type: asset.asset_types.name,
              latest_submission: {},
              submission_date: '',
              last_month_total: lastMonthTotal
            });
          }
        } else {
          // History mode - show all submissions for selected date range
          const relevantSubmissions = asset.form_submissions?.filter((submission: any) => {
            const submissionDate = new Date(submission.created_at);
            return submissionDate >= startDate && submissionDate <= endDate;
          }) || [];

          if (relevantSubmissions.length > 0) {
            relevantSubmissions.forEach((submission: any) => {
              Object.keys(submission.submission_data || {}).forEach(key => {
                fieldSet.add(key);
              });

              processedData.push({
                asset_name: asset.name,
                asset_type: asset.asset_types.name,
                latest_submission: submission.submission_data || {},
                submission_date: submission.created_at,
                all_submissions: relevantSubmissions
              });
            });
          }
        }
      });

      console.log('Processed data:', processedData);
      console.log('Field set:', Array.from(fieldSet));

      // Convert field set to sorted array with labels - only if no template is loaded
      if (!currentTemplate || formFields.length === 0) {
        const fieldsWithLabels = Array.from(fieldSet)
          .sort()
          .map((fieldId, index) => ({
            id: fieldId,
            label: fieldLabelMap[fieldId] || fieldId.replace('field_', 'Field ').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            type: 'unknown',
            selected: true,
            order: index + 4 // Start after the 3 special fields
          }));

        // Add special selectable fields
        const specialFields: FormField[] = [
          {
            id: 'asset_type',
            label: 'Asset Type',
            type: 'special',
            selected: true,
            order: 1
          },
          {
            id: 'last_updated',
            label: 'Last Updated',
            type: 'special',
            selected: true,
            order: 2
          },
          {
            id: 'last_month_total',
            label: 'Last Month Total',
            type: 'special',
            selected: true,
            order: 3
          }
        ];

        setFormFields([...specialFields, ...fieldsWithLabels]);
      }

      setReportData(processedData);
      setShowColumnSelector(true);

      toast.success(`Report generated! Found ${processedData.length} ${viewMode === 'history' ? 'submissions' : 'assets'} with ${Array.from(fieldSet).length + 3} form fields.`);

    } catch (error: any) {
      console.error('Report generation error:', error);
      toast.error('Failed to generate report: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleColumn = (fieldId: string) => {
    setFormFields(prev => {
      const field = prev.find(f => f.id === fieldId);
      if (!field) return prev;

      if (field.selected) {
        // If already selected, deselect it and remove from order
        return prev.map(f => 
          f.id === fieldId 
            ? { ...f, selected: false, order: undefined }
            : f.order && field.order && f.order > field.order 
              ? { ...f, order: f.order - 1 } // Shift other columns down
              : f
        );
      } else {
        // If not selected, select it and assign next order number
        const selectedFields = prev.filter(f => f.selected);
        const nextOrder = selectedFields.length + 1;
        return prev.map(f => 
          f.id === fieldId 
            ? { ...f, selected: true, order: nextOrder }
            : f
        );
      }
    });
  };

  const toggleAllColumns = (checked: boolean) => {
    setFormFields(prev => 
      prev.map((field, index) => ({ 
        ...field, 
        selected: checked,
        order: checked ? index + 1 : undefined
      }))
    );
  };

  const getSelectedFields = () => formFields
    .filter(f => f.selected)
    .sort((a, b) => (a.order || 0) - (b.order || 0)); // Sort by order

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
      const headers = ['Asset Name', ...selectedFields.map(f => f.label)];
      
      // Build CSV rows
      const rows = reportData.map(row => [
        row.asset_name,
        ...selectedFields.map(field => {
          if (field.id === 'asset_type') {
            return row.asset_type;
          } else if (field.id === 'last_updated') {
            return row.submission_date ? new Date(row.submission_date).toLocaleDateString() : 'No data';
          } else if (field.id === 'last_month_total') {
            return row.last_month_total || 'No data';
          } else {
            return renderFieldValue(row.latest_submission[field.id]);
          }
        })
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
      
      const assetTypeName = selectedAssetTypes.length > 1 ? 'Multiple_Assets' : selectedAssetTypes[0] === 'all' ? 'All_Assets' : 
        assetTypes.find(t => t.id === selectedAssetTypes[0])?.name || 'Assets';
      
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
            🚀 Advanced Asset Reporting
          </h1>
          <p className="text-gray-600 mt-1">
            Complete reporting system with templates, flexible date ranges, and asset history
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {savedTemplates.length > 0 && (
            <Select value="" onValueChange={(value) => {
              const template = savedTemplates.find(t => t.id === value);
              if (template) loadTemplate(template);
            }}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Load Template..." />
              </SelectTrigger>
              <SelectContent>
                {savedTemplates.map((template) => (
                  <SelectItem key={template.id} value={template.id!}>
                    <div className="flex items-center justify-between w-full">
                      <span>{template.name}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTemplate(template.id!);
                        }}
                        className="h-4 w-4 p-0 ml-2"
                      >
                        ×
                      </Button>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {formFields.length > 0 && (
            <>
              <Button
                onClick={() => setShowSaveTemplate(!showSaveTemplate)}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                Save Template
              </Button>
              <Button
                onClick={() => setShowColumnSelector(!showColumnSelector)}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                Columns ({selectedFields.length}/{formFields.length})
              </Button>
            </>
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

      {/* Save Template Modal */}
      {showSaveTemplate && (
        <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Save className="h-5 w-5 text-green-600" />
              Save Report Template
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="template-name">Template Name *</Label>
              <Input
                id="template-name"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="e.g., Monthly Paint Inventory"
              />
            </div>
            <div>
              <Label htmlFor="template-description">Description</Label>
              <Input
                id="template-description"
                value={newTemplateDescription}
                onChange={(e) => setNewTemplateDescription(e.target.value)}
                placeholder="e.g., Standard monthly report for paint assets"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={saveTemplate} className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                Save Template
              </Button>
              <Button variant="outline" onClick={() => setShowSaveTemplate(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Advanced Controls */}
      <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-purple-600" />
            Report Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* View Mode Selector */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-2">
                View Mode
              </Label>
              <Select value={viewMode} onValueChange={(value: 'latest' | 'history' | 'comparison') => setViewMode(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="latest">
                    <span className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Latest Submissions
                    </span>
                  </SelectItem>
                  <SelectItem value="history">
                    <span className="flex items-center gap-2">
                      <History className="h-4 w-4" />
                      Historical View
                    </span>
                  </SelectItem>
                  <SelectItem value="comparison">
                    <span className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4" />
                      Period Comparison
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-2">
                Date Range
              </Label>
              <Select value={dateRangeType} onValueChange={(value: typeof dateRangeType) => setDateRangeType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last_week">Last 7 Days</SelectItem>
                  <SelectItem value="last_month">Last Month</SelectItem>
                  <SelectItem value="last_3_months">Last 3 Months</SelectItem>
                  <SelectItem value="all_time">All Time</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-2">
                Asset Types
              </Label>
              <Select value={selectedAssetTypes[0]} onValueChange={(value) => setSelectedAssetTypes([value])}>
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
            </div>
          </div>

          {/* Custom Date Range */}
          {dateRangeType === 'custom' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div>
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Asset Selector for History Mode */}
          {viewMode === 'history' && (
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <Label className="block text-sm font-medium text-gray-700 mb-2">
                Select Asset for History View
              </Label>
              <Select value={selectedAssetForHistory} onValueChange={setSelectedAssetForHistory}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an asset to view its history..." />
                </SelectTrigger>
                <SelectContent>
                  {reportData.map((asset, index) => (
                    <SelectItem key={index} value={asset.asset_name}>
                      {asset.asset_name} ({asset.asset_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Generate Button */}
          <div className="flex justify-center">
            <Button 
              onClick={generateReport}
              disabled={isLoading || !currentOrganization?.id}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 px-12 py-3 text-lg"
              size="lg"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Target className="mr-2 h-5 w-5" />
                  Generate {viewMode === 'history' ? 'History' : viewMode === 'comparison' ? 'Comparison' : 'Report'}
                </>
              )}
            </Button>
          </div>
          
          {/* Debug Info */}
          {currentOrganization && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
              <strong>Debug Info:</strong> Org: {currentOrganization.name} | Asset Types: {assetTypes.length} | 
              Selected: {selectedAssetTypes.join(', ')} | View: {viewMode} | Date: {dateRangeType}
              {currentTemplate && <span> | Template: {currentTemplate.name}</span>}
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
                  <div className="flex items-center space-x-2 flex-1">
                    <Checkbox
                      id={field.id}
                      checked={field.selected}
                      onCheckedChange={() => toggleColumn(field.id)}
                    />
                    {field.selected && field.order && (
                      <span className="flex items-center justify-center w-6 h-6 bg-blue-500 text-white text-xs font-bold rounded-full">
                        {field.order}
                      </span>
                    )}
                    <label
                      htmlFor={field.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      onClick={() => toggleColumn(field.id)}
                    >
                      {field.label}
                    </label>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-orange-600">
                ✨ Click columns to select and order them | Preview shows first 3 assets
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
                {viewMode === 'history' ? (
                  <History className="h-5 w-5 text-orange-600" />
                ) : viewMode === 'comparison' ? (
                  <CalendarDays className="h-5 w-5 text-purple-600" />
                ) : (
                  <Calendar className="h-5 w-5 text-green-600" />
                )}
                {viewMode === 'history' ? 'Asset History Report' : 
                 viewMode === 'comparison' ? 'Period Comparison Report' : 
                 'Asset Inventory Report'}
                {showPreview && reportData.length > 3 && (
                  <Badge variant="outline" className="ml-2">
                    Preview: {previewData.length} of {reportData.length} {viewMode === 'history' ? 'submissions' : 'assets'}
                  </Badge>
                )}
              </CardTitle>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {reportData.length} {viewMode === 'history' ? 'submissions' : 'assets'}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Generated {new Date().toLocaleString()}
                </span>
                {viewMode === 'history' && selectedAssetForHistory && (
                  <Badge variant="secondary">
                    Viewing: {selectedAssetForHistory}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left p-3 font-semibold bg-gray-50">Asset Name</th>
                    {viewMode === 'history' && (
                      <th className="text-left p-3 font-semibold bg-gray-50">Submission Date</th>
                    )}
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
                      {viewMode === 'history' && (
                        <td className="p-3 text-sm text-gray-500">
                          {row.submission_date ? 
                            new Date(row.submission_date).toLocaleString() : 
                            <span className="text-red-500">No data</span>
                          }
                        </td>
                      )}
                      {selectedFields.map((field) => (
                        <td key={field.id} className="p-3 text-sm">
                          {field.id === 'asset_type' ? (
                            <Badge variant="outline" className="text-xs">
                              {row.asset_type}
                            </Badge>
                          ) : field.id === 'last_updated' ? (
                            <span className="text-gray-500">
                              {row.submission_date ? 
                                new Date(row.submission_date).toLocaleDateString() : 
                                <span className="text-red-500">No data</span>
                              }
                            </span>
                          ) : field.id === 'last_month_total' ? (
                            row.last_month_total || <span className="text-gray-400">No data</span>
                          ) : (
                            renderFieldValue(row.latest_submission[field.id]) || 
                            <span className="text-gray-400">-</span>
                          )}
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
                  📋 Showing preview of first 3 {viewMode === 'history' ? 'submissions' : 'assets'}. 
                  Click "Show All" above to see all {reportData.length} records, or export CSV for complete data.
                </p>
              </div>
            )}

            {/* View Mode Specific Info */}
            {viewMode === 'history' && (
              <div className="mt-4 p-3 bg-orange-50 rounded-lg">
                <p className="text-sm text-orange-700">
                  🕐 <strong>History Mode:</strong> Showing all submissions for selected asset(s) within the date range. 
                  Each row represents one form submission with its timestamp.
                </p>
              </div>
            )}

            {viewMode === 'comparison' && (
              <div className="mt-4 p-3 bg-purple-50 rounded-lg">
                <p className="text-sm text-purple-700">
                  📊 <strong>Comparison Mode:</strong> Compare values across different time periods. 
                  Perfect for analyzing trends and changes over time.
                </p>
              </div>
            )}

            {viewMode === 'latest' && (
              <div className="mt-4 p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-green-700">
                  ✅ <strong>Latest Mode:</strong> Shows the most recent submission for each asset. 
                  Ideal for current inventory status and monthly reports.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Enhanced Empty State */}
      {!isLoading && reportData.length === 0 && (
        <Card className="border-dashed border-2 border-gray-300">
          <CardContent className="flex flex-col items-center justify-center py-12">
            {viewMode === 'history' ? (
              <History className="h-16 w-16 text-gray-400 mb-4" />
            ) : viewMode === 'comparison' ? (
              <CalendarDays className="h-16 w-16 text-gray-400 mb-4" />
            ) : (
              <FileText className="h-16 w-16 text-gray-400 mb-4" />
            )}
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              No {viewMode === 'history' ? 'History' : viewMode === 'comparison' ? 'Comparison Data' : 'Report'} Generated
            </h3>
            <p className="text-gray-500 text-center max-w-md">
              {viewMode === 'history' 
                ? 'Select an asset and date range to view its submission history over time.'
                : viewMode === 'comparison'
                ? 'Configure your comparison settings and date ranges to analyze trends.'
                : 'Configure your settings and click "Generate Report" to see your asset data.'
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SimpleAssetReport; 