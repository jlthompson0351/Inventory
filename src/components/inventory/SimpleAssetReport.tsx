import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Download, RefreshCw, FileText, Clock, Users, Settings, Eye, EyeOff, Save, FolderOpen, CalendarDays, Filter, History, Target, Plus, BarChart3, ChevronUp, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

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
  // Enhanced field types for visual and calculated columns
  fieldType?: 'data' | 'color_fill' | 'calculated';
  color?: string; // For color_fill columns
  formula?: string; // For calculated columns
  sourceColumns?: string[]; // For calculated columns
  width?: string; // For custom column widths
}

interface ReportTemplate {
  id?: string;
  name: string;
  description: string;
  asset_type_filter: string;
  selected_fields: FormField[];
  date_range_type: 'current_month' | 'last_month' | 'last_week' | 'last_3_months' | 'all_time' | 'custom';
  custom_start_date?: string;
  custom_end_date?: string;
  view_mode: 'latest' | 'history' | 'comparison';
  created_at?: string;
}

interface DateRange {
  type: 'current_month' | 'last_month' | 'last_week' | 'last_3_months' | 'all_time' | 'custom';
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
    case 'current_month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end.setTime(now.getTime()); // End is today
      break;
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
  const [dateRangeType, setDateRangeType] = useState<'current_month' | 'last_month' | 'last_week' | 'last_3_months' | 'all_time' | 'custom'>('current_month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [viewMode, setViewMode] = useState<'latest' | 'history' | 'comparison'>('latest');
  const [selectedAssetForHistory, setSelectedAssetForHistory] = useState<string>('');

  // Color column builder state
  const [showColorColumnBuilder, setShowColorColumnBuilder] = useState(false);
  const [newColorColumnName, setNewColorColumnName] = useState('');
  const [newColorColumnColor, setNewColorColumnColor] = useState('#3B82F6');

  // Load asset types and templates
  useEffect(() => {
    if (currentOrganization?.id) {
      loadAssetTypes();
      loadSavedTemplates();
    }
  }, [currentOrganization?.id]);



  const loadAssetTypes = async () => {
    try {
      // @ts-ignore - Temporary workaround for TypeScript deep instantiation issue
      const result = await supabase
        .from('asset_types')
        .select('id, name, color')
        .eq('organization_id', currentOrganization!.id)
        .eq('is_deleted', false)
        .order('name');

      if (result.error) throw result.error;
      const typedData: AssetType[] = result.data || [];
      setAssetTypes(typedData);
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
      selected_fields: formFields, // Save all fields including color columns
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

  // Add color column to report
  const addColorColumn = () => {
    if (!newColorColumnName.trim()) {
      toast.error('Please enter a column name');
      return;
    }

    const colorColumn: FormField = {
      id: `color_${Date.now()}`,
      label: newColorColumnName.trim(),
      type: 'color',
      fieldType: 'color_fill',
      color: newColorColumnColor,
      selected: true,
      order: 1, // Add to top, user can reorder
      width: '80px' // Wider for better visibility as separator
    };

    // Add to main formFields array and reorder everything
    setFormFields(prev => {
      const newFields = [colorColumn, ...prev];
      return newFields.map((field, index) => ({
        ...field,
        order: field.selected ? index + 1 : undefined
      }));
    });

    setNewColorColumnName('');
    setNewColorColumnColor('#3B82F6');
    setShowColorColumnBuilder(false);
    toast.success(`Color column "${colorColumn.label}" added! Use arrows to reorder.`);
  };

  // Simplified column reordering
  const moveColumn = (columnId: string, direction: 'up' | 'down') => {
    const allSelectedColumns = getSelectedFields();
    const currentIndex = allSelectedColumns.findIndex(col => col.id === columnId);
    
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= allSelectedColumns.length) return;

    // Swap order numbers
    const currentColumn = allSelectedColumns[currentIndex];
    const targetColumn = allSelectedColumns[newIndex];
    const tempOrder = currentColumn.order;
    
    setFormFields(prev => prev.map(field => 
      field.id === columnId ? { ...field, order: targetColumn.order } :
      field.id === targetColumn.id ? { ...field, order: tempOrder } :
      field
    ));
  };

  const deleteColumn = (columnId: string) => {
    setFormFields(prev => {
      const filtered = prev.filter(f => f.id !== columnId);
      // Reorder remaining selected columns
      const selected = filtered.filter(f => f.selected).sort((a, b) => (a.order || 0) - (b.order || 0));
      return filtered.map(field => {
        if (!field.selected) return field;
        const newOrder = selected.findIndex(f => f.id === field.id) + 1;
        return { ...field, order: newOrder };
      });
    });
    toast.success('Column removed');
  };

  const generateReport = async () => {
    if (!currentOrganization?.id) {
      toast.error('No organization selected');
      return;
    }
    
    setIsLoading(true);
    try {
          // Generating report

      // Get date range
      const { start: startDate, end: endDate } = getDateRange(dateRangeType, customStartDate, customEndDate);
      // Date range set

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
        .eq('is_deleted', false);

      // Apply additional filters after the base query
      let filteredData = data;
      
      if (filteredData && !selectedAssetTypes.includes('all') && selectedAssetTypes.length > 0) {
        filteredData = filteredData.filter((asset: any) => 
          selectedAssetTypes.includes(asset.asset_type_id)
        );
      }

      // Sort form submissions by created_at DESC and filter out deleted ones
      // Optimize: Only keep the 3 most recent submissions per asset for performance
      if (filteredData) {
        filteredData = filteredData.map((asset: any) => ({
          ...asset,
          form_submissions: asset.form_submissions
            ?.filter((sub: any) => !sub.is_deleted)
            ?.sort((a: any, b: any) => 
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )
            ?.slice(0, 3) || [] // Only keep 3 most recent for performance
        }));
      }

      // Apply date filtering for submissions (already sorted above)
      if (filteredData && viewMode !== 'latest') {
        filteredData = filteredData.map((asset: any) => ({
          ...asset,
          form_submissions: asset.form_submissions?.filter((submission: any) => {
            const submissionDate = new Date(submission.created_at);
            return submissionDate >= startDate && submissionDate <= endDate;
          })
        }));
      }
      
      if (error) {
        console.error('Query error:', error);
        toast.error(`Database query failed: ${error.message || 'Unknown error'}`);
        throw error;
      }

      // Query returned data

      if (!filteredData || filteredData.length === 0) {
        toast.error('No assets found. Make sure you have assets created with the selected criteria.');
        setReportData([]);
        setFormFields([]);
        setIsLoading(false);
        return;
      }

      // Get price data for all assets in the report
      const assetIds = filteredData.map((asset: any) => asset.id);
      let priceDataMap: Record<string, any> = {};
      
      try {
        // Query price data for the date range
        const { data: priceData, error: priceError } = await supabase
          .from('assets')
          .select(`
            id,
            inventory_items!inner(
              id,
              current_price,
              currency,
              inventory_price_history(
                price,
                currency,
                unit_type,
                effective_date
              )
            )
          `)
          .in('id', assetIds)
          .eq('inventory_items.is_deleted', false);

        if (priceError) {
          console.warn('Price data query error:', priceError);
        } else if (priceData) {
          // Process price data into lookup map
          priceData.forEach((asset: any) => {
            if (asset.inventory_items && asset.inventory_items.length > 0) {
              const inventoryItem = asset.inventory_items[0]; // Use first inventory item
              let effectivePrice = inventoryItem.current_price || '0.00';
              let effectiveCurrency = inventoryItem.currency || 'USD';
              let effectiveUnitType = 'each';
              
              // Find the most appropriate price for the date range
              if (inventoryItem.inventory_price_history && inventoryItem.inventory_price_history.length > 0) {
                // Filter price history by date range
                const relevantPrices = inventoryItem.inventory_price_history.filter((ph: any) => {
                  const effectiveDate = new Date(ph.effective_date);
                  return effectiveDate <= endDate;
                }).sort((a: any, b: any) => 
                  new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime()
                );
                
                if (relevantPrices.length > 0) {
                  const mostRecentPrice = relevantPrices[0];
                  effectivePrice = mostRecentPrice.price || '0.00';
                  effectiveCurrency = mostRecentPrice.currency || 'USD';
                  effectiveUnitType = mostRecentPrice.unit_type || 'each';
                }
              }
              
              priceDataMap[asset.id] = {
                price: effectivePrice,
                currency: effectiveCurrency,
                unit_type: effectiveUnitType,
                formatted_price: `$${parseFloat(effectivePrice).toFixed(2)}`
              };
            }
          });
        }
      } catch (error) {
        console.warn('Failed to load price data:', error);
        // Continue without price data
      }

      // Get form schemas to map field IDs to labels
      const formIds = Array.from(new Set(filteredData?.map((asset: any) => asset.asset_types?.inventory_form_id).filter(Boolean)));
              // Form IDs found
      
      const formSchemas: Record<string, FormField[]> = {};
      if (formIds.length > 0) {
        const { data: forms, error: formError } = await supabase
          .from('forms')
          .select('id, form_data')
          .in('id', formIds);

        if (formError) {
          console.error('Form schema error:', formError);
          toast.warning('Could not load form schemas. Column labels may be generic.');
        } else {
          // Form schemas loaded
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

      // Add price fields to field definitions
      fieldSet.add('asset_current_price');
      fieldSet.add('asset_unit_type');
      fieldSet.add('asset_price_display');
      fieldLabelMap['asset_current_price'] = 'Current Price';
      fieldLabelMap['asset_unit_type'] = 'Unit Type';
      fieldLabelMap['asset_price_display'] = 'Price per Unit';

      // Calculate date range for last month total (always needed)
      const now = new Date();
      const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDayLastMonth = new Date(firstDayThisMonth.getTime() - 1);
      const firstDayLastMonth = new Date(lastDayLastMonth.getFullYear(), lastDayLastMonth.getMonth(), 1);

      filteredData?.forEach((asset: any) => {
        const formId = asset.asset_types?.inventory_form_id;
        const formFieldsForAsset = formSchemas[formId] || [];

        // Build field label map and ADD ALL FORM FIELDS to fieldSet (even if empty)
        formFieldsForAsset.forEach((field: FormField) => {
          fieldLabelMap[field.id] = field.label;
          // IMPORTANT: Add all defined form fields to fieldSet, regardless of whether they have data
          fieldSet.add(field.id);
        });

        if (viewMode === 'history' && selectedAssetForHistory && asset.id !== selectedAssetForHistory) {
          return; // Skip if we're in history mode and this isn't the selected asset
        }

        if (viewMode === 'latest') {
          // Latest submission mode (original behavior)
          // Find the most recent complete submission
          // A complete submission should have at least 5 key fields including field_13 (total)
          const latestSubmission = asset.form_submissions?.find(sub => {
            if (!sub.submission_data) return false;
            const data = sub.submission_data;
            // Check for key indicators of a complete submission
            const hasMultipleFields = Object.keys(data).filter(key => 
              key.startsWith('field_') && data[key] !== '' && data[key] !== null && data[key] !== undefined
            ).length >= 5;
            const hasTotal = data.field_13 !== undefined && data.field_13 !== '' && data.field_13 !== null;
            return hasMultipleFields && hasTotal;
          }) || asset.form_submissions?.[0]; // Fallback to first available
          
          if (!latestSubmission) {
            console.warn('No form submissions found for asset:', asset.name);
            return; // Skip this asset if no submissions
          }
          
          // ENHANCED: Improved last month total calculation with better fallback logic
          let lastMonthTotal = '';
          
          // Method 1: Find last month's submission (original logic)
          const lastMonthSubmission = asset.form_submissions?.find((submission: any) => {
            const submissionDate = new Date(submission.created_at);
            return submissionDate >= firstDayLastMonth && submissionDate <= lastDayLastMonth;
          });

          if (lastMonthSubmission) {
            const submissionData = lastMonthSubmission.submission_data || {};
            // Enhanced field detection - look for more field patterns
            const totalField = Object.keys(submissionData).find(key => {
              const lowerKey = key.toLowerCase();
              return lowerKey.includes('total') || 
                     lowerKey.includes('ending') || 
                     lowerKey.includes('balance') ||
                     key === 'field_13' || // Known paint total field
                     lowerKey.includes('gallons') && lowerKey.includes('total');
            });
            
            if (totalField) {
              lastMonthTotal = renderFieldValue(submissionData[totalField]);
            }
          }
          
          // Method 2: If no last month submission, try to find any recent submission with total field
          if (!lastMonthTotal && asset.form_submissions?.length > 0) {
            for (const submission of asset.form_submissions) {
              const submissionData = submission.submission_data || {};
              const totalField = Object.keys(submissionData).find(key => {
                const lowerKey = key.toLowerCase();
                return lowerKey.includes('total') || 
                       lowerKey.includes('ending') || 
                       lowerKey.includes('balance') ||
                       key === 'field_13';
              });
              
              if (totalField && submissionData[totalField]) {
                lastMonthTotal = renderFieldValue(submissionData[totalField]);
                break; // Use first found total from available data
              }
            }
          }
          
          if (latestSubmission) {
            Object.keys(latestSubmission.submission_data || {}).forEach(key => {
              fieldSet.add(key);
            });

            // Get price data for this asset
            const assetPriceData = priceDataMap[asset.id] || {
              price: '0.00',
              currency: 'USD',
              unit_type: 'each',
              formatted_price: '$0.00'
            };

            // Merge submission data with price data and ensure all form fields are present
            const baseSubmissionData = latestSubmission.submission_data || {};
            const enrichedSubmissionData = {
              ...baseSubmissionData,
              asset_current_price: assetPriceData.price,
              asset_unit_type: assetPriceData.unit_type,
              asset_price_display: `${assetPriceData.formatted_price} per ${assetPriceData.unit_type}`
            };
            
            // Production logging (only log issues, not all data)
            const fieldCount = Object.keys(baseSubmissionData).filter(k => k.startsWith('field_')).length;
            if (fieldCount < 5) {
              console.warn(`Asset "${asset.name}" has incomplete submission (${fieldCount} fields). Using anyway.`);
            }
            
            // Ensure all form fields are present in the data (with empty string if no value)
            formFieldsForAsset.forEach((field: FormField) => {
              if (!(field.id in enrichedSubmissionData)) {
                // Check if the field exists in the raw submission data
                const rawValue = latestSubmission.submission_data?.[field.id];
                enrichedSubmissionData[field.id] = rawValue !== undefined ? rawValue : '';
              }
            });

            processedData.push({
              asset_name: asset.name,
              asset_type: asset.asset_types.name,
              latest_submission: enrichedSubmissionData,
              submission_date: latestSubmission.created_at,
              last_month_total: lastMonthTotal
            });
          } else {
            // Get price data for this asset even if no submission
            const assetPriceData = priceDataMap[asset.id] || {
              price: '0.00',
              currency: 'USD',
              unit_type: 'each',
              formatted_price: '$0.00'
            };

            const emptySubmissionData = {
              asset_current_price: assetPriceData.price,
              asset_unit_type: assetPriceData.unit_type,
              asset_price_display: `${assetPriceData.formatted_price} per ${assetPriceData.unit_type}`
            };
            
            // Add empty form fields for this asset type
            formFieldsForAsset.forEach((field: FormField) => {
              emptySubmissionData[field.id] = '';
            });

            processedData.push({
              asset_name: asset.name,
              asset_type: asset.asset_types.name,
              latest_submission: emptySubmissionData,
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

              // Get price data for this asset (for the submission date)
              const assetPriceData = priceDataMap[asset.id] || {
                price: '0.00',
                currency: 'USD',
                unit_type: 'each',
                formatted_price: '$0.00'
              };

              // Merge submission data with price data and ensure all form fields are present
              const baseSubmissionData = submission.submission_data || {};
              const enrichedSubmissionData = {
                ...baseSubmissionData,
                asset_current_price: assetPriceData.price,
                asset_unit_type: assetPriceData.unit_type,
                asset_price_display: `${assetPriceData.formatted_price} per ${assetPriceData.unit_type}`
              };
              
              // Ensure all form fields are present in history data too
              formFieldsForAsset.forEach((field: FormField) => {
                if (!(field.id in enrichedSubmissionData)) {
                  // Check if the field exists in the raw submission data
                  const rawValue = submission.submission_data?.[field.id];
                  enrichedSubmissionData[field.id] = rawValue !== undefined ? rawValue : '';
                }
              });

              processedData.push({
                asset_name: asset.name,
                asset_type: asset.asset_types.name,
                latest_submission: enrichedSubmissionData,
                submission_date: submission.created_at,
                all_submissions: relevantSubmissions
              });
            });
          }
        }
      });

      // Processed data
      
      // Convert field set to sorted array with labels - only if no template is loaded
      if (!currentTemplate || formFields.length === 0) {
        // Filter out system fields that we handle specially - LESS aggressive filtering
        const systemFields = ['asset_type', 'asset_name', 'last_updated', 'last_month_total'];
        const filteredFieldSet = Array.from(fieldSet).filter(fieldId => {
          const lowerFieldId = fieldId.toLowerCase();
          
          // Filter out exact matches for known system fields
          if (systemFields.includes(lowerFieldId)) return false;
          
          // Filter out pricing fields we handle separately
          if (fieldId.startsWith('asset_current_price') || fieldId.startsWith('asset_unit_type') || fieldId.startsWith('asset_price_display')) return false;
          
          // Only filter out obvious system metadata fields, not form data fields
          if (lowerFieldId.includes('updated') && (lowerFieldId.includes('_at') || lowerFieldId.includes('timestamp'))) return false;
          if (lowerFieldId.includes('created') && (lowerFieldId.includes('_at') || lowerFieldId.includes('timestamp'))) return false;
          
          // Don't filter out form fields that might contain "asset" or "type" in their labels
          // Only filter if it's clearly a system field like "asset_type_id" 
          if (fieldId === 'asset_type_id' || fieldId === 'asset_name' || fieldId === 'assettype' || fieldId === 'assetname') return false;
          
          return true;
        });

        // Field set filtered

        const fieldsWithLabels = filteredFieldSet
          .sort()
          .map((fieldId, index) => ({
            id: fieldId,
            label: fieldLabelMap[fieldId] || fieldId.replace('field_', 'Field ').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            type: 'unknown',
            selected: true,
            order: index + 4 // Start after the 3 special fields
          }));

        // Add special selectable fields (these are the only system fields we want as columns)
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
              // System fields filtered out
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

  const getSelectedFields = () => {
    return formFields.filter(f => f.selected).sort((a, b) => (a.order || 0) - (b.order || 0));
  };

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
          if (field.fieldType === 'color_fill') {
            return `--- ${field.label} ---`; // Text separator for CSV
          } else if (field.id === 'asset_type') {
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
      
      link.download = `Monthly_Inventory_${assetTypeName}_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();

      toast.success('CSV exported successfully!');
    } catch (error: any) {
      toast.error('Failed to export CSV: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  const exportToExcel = async () => {
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
      // Prepare data for Excel - simpler approach first
      const headers = ['Asset Name', ...selectedFields.map(f => f.label)];
      const excelData = [headers];
      
      // Add rows
      reportData.forEach(row => {
        const excelRow = [
          row.asset_name,
          ...selectedFields.map(field => {
            if (field.fieldType === 'color_fill') {
              return `[${field.label}]`; // Text label for color columns in Excel
            } else if (field.id === 'asset_type') {
              return row.asset_type;
            } else if (field.id === 'last_updated') {
              return row.submission_date ? new Date(row.submission_date).toLocaleDateString() : 'No data';
            } else if (field.id === 'last_month_total') {
              return row.last_month_total || 'No data';
            } else {
              return renderFieldValue(row.latest_submission[field.id]);
            }
          })
        ];
        excelData.push(excelRow);
      });

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet(excelData);

      // Set column widths for better visibility
      const colWidths = headers.map((header, index) => {
        const field = selectedFields[index - 1]; // -1 because first column is Asset Name
        if (field?.fieldType === 'color_fill') {
          return { wch: 15 }; // Wider for color columns
        }
        return { wch: 20 }; // Standard width
      });
      worksheet['!cols'] = [{ wch: 25 }, ...colWidths]; // Asset Name gets 25 width

      // Note: Color styling removed for stability - colors show in web interface only

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');

      // Generate filename
      const assetTypeName = selectedAssetTypes.length > 1 ? 'Multiple_Assets' : selectedAssetTypes[0] === 'all' ? 'All_Assets' : 
        assetTypes.find(t => t.id === selectedAssetTypes[0])?.name || 'Assets';
      const filename = `Monthly_Inventory_${assetTypeName}_${new Date().toISOString().split('T')[0]}.xlsx`;

      // Save file with styling support
      XLSX.writeFile(workbook, filename);

      const colorColumnCount = selectedFields.filter(f => f.fieldType === 'color_fill').length;
      toast.success(`Excel exported successfully! ${colorColumnCount > 0 ? `(${colorColumnCount} color columns show as text)` : ''}`);
    } catch (error: any) {
      console.error('Excel export error:', error);
      toast.error('Failed to export Excel: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  const selectedFields = getSelectedFields();
  const previewData = showPreview ? reportData.slice(0, 3) : reportData; // Limit to 3 for preview

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
          <div className="flex-1">
            <h2 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Advanced Asset Reporting
            </h2>
            <p className="text-gray-600 text-base lg:text-lg leading-relaxed">
              Complete reporting system with templates, flexible date ranges, and asset history analysis
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Real-time Data</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Export Ready</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Template Support</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 min-w-fit">
            {savedTemplates.length > 0 && (
              <Select value="" onValueChange={(value) => {
                const template = savedTemplates.find(t => t.id === value);
                if (template) loadTemplate(template);
              }}>
                <SelectTrigger className="w-56 h-11 bg-white/80 backdrop-blur-sm border-2 border-blue-200 hover:border-blue-300 transition-colors">
                  <SelectValue placeholder="📋 Load Template..." />
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
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowSaveTemplate(!showSaveTemplate)}
                  variant="outline"
                  className="h-11 bg-white/80 backdrop-blur-sm border-2 border-green-200 hover:border-green-300 hover:bg-green-50 transition-all duration-200 flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  Save Template
                </Button>
                <Button
                  onClick={() => setShowColumnSelector(!showColumnSelector)}
                  variant="outline"
                  className="h-11 bg-white/80 backdrop-blur-sm border-2 border-orange-200 hover:border-orange-300 hover:bg-orange-50 transition-all duration-200 flex items-center gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Columns ({selectedFields.length}/{formFields.length})
                </Button>
              </div>
            )}
            
            <div className="flex gap-2">
            <Button
              onClick={exportToCSV}
              disabled={isExporting || reportData.length === 0 || selectedFields.length === 0}
                variant="outline"
                className="h-11 bg-white border-2 border-purple-300 hover:border-purple-400 hover:bg-purple-50 transition-all duration-200 flex items-center gap-2"
            >
              {isExporting ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Export CSV
            </Button>
              <Button
                onClick={exportToExcel}
                disabled={isExporting || reportData.length === 0 || selectedFields.length === 0}
                className="h-11 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2"
              >
                {isExporting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Export Excel
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Save Template Modal */}
      {showSaveTemplate && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6">
            <div className="flex items-center gap-3">
              <Save className="h-6 w-6 text-white" />
              <h3 className="text-xl font-bold text-white">Save Report Template</h3>
            </div>
            <p className="text-green-100 mt-2">Save your current configuration for future use</p>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="space-y-3">
              <Label htmlFor="template-name" className="text-base font-semibold text-gray-800">Template Name *</Label>
              <Input
                id="template-name"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="e.g., Monthly Paint Inventory"
                className="h-12 border-2 border-gray-200 focus:border-green-400"
              />
            </div>
            <div className="space-y-3">
              <Label htmlFor="template-description" className="text-base font-semibold text-gray-800">Description (Optional)</Label>
              <Input
                id="template-description"
                value={newTemplateDescription}
                onChange={(e) => setNewTemplateDescription(e.target.value)}
                placeholder="e.g., Standard monthly report for paint assets"
                className="h-12 border-2 border-gray-200 focus:border-green-400"
              />
            </div>
            <div className="flex gap-4 pt-4">
              <Button 
                onClick={saveTemplate} 
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Template
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowSaveTemplate(false)}
                className="px-8 py-3 rounded-xl border-2 border-gray-300 hover:border-gray-400"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Color Column Builder Modal */}
      {showColorColumnBuilder && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6">
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 bg-white rounded"></div>
              <h3 className="text-xl font-bold text-white">Create Color Separator</h3>
            </div>
            <p className="text-purple-100 mt-2">Add a visual column to break up your report data</p>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="space-y-3">
              <Label htmlFor="color-column-name" className="text-base font-semibold text-gray-800">Column Name *</Label>
              <Input
                id="color-column-name"
                value={newColorColumnName}
                onChange={(e) => setNewColorColumnName(e.target.value)}
                placeholder="e.g., Section Break, Divider"
                className="h-12 border-2 border-gray-200 focus:border-purple-400"
              />
            </div>
            <div className="space-y-3">
              <Label htmlFor="color-picker" className="text-base font-semibold text-gray-800">Color</Label>
              <div className="flex items-center gap-4">
                <input
                  id="color-picker"
                  type="color"
                  value={newColorColumnColor}
                  onChange={(e) => setNewColorColumnColor(e.target.value)}
                  className="h-12 w-20 border-2 border-gray-200 rounded cursor-pointer"
                />
                <div className="flex gap-2">
                  {['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'].map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewColorColumnColor(color)}
                      className="w-8 h-8 rounded border-2 border-gray-200 hover:border-gray-400 transition-colors"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button 
                onClick={addColorColumn}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Column
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowColorColumnBuilder(false)}
                className="px-8 py-3 rounded-xl border-2 border-gray-300 hover:border-gray-400"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Configuration Section */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6">
          <div className="flex items-center gap-3">
            <Target className="h-6 w-6 text-white" />
            <h3 className="text-xl font-bold text-white">Report Configuration</h3>
          </div>
          <p className="text-purple-100 mt-2">Configure your report parameters for customized data analysis</p>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Primary Controls Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-3">
              <Label className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <FileText className="h-4 w-4 text-purple-600" />
                View Mode
              </Label>
              <Select value={viewMode} onValueChange={(value: 'latest' | 'history' | 'comparison') => setViewMode(value)}>
                <SelectTrigger className="h-12 bg-white border-2 border-gray-200 hover:border-purple-300 transition-colors">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="latest">
                    <span className="flex items-center gap-3 py-1">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <div>
                        <p className="font-medium">Latest Submissions</p>
                        <p className="text-xs text-gray-500">Most recent data per asset</p>
                      </div>
                    </span>
                  </SelectItem>
                  <SelectItem value="history">
                    <span className="flex items-center gap-3 py-1">
                      <History className="h-4 w-4 text-orange-600" />
                      <div>
                        <p className="font-medium">Historical View</p>
                        <p className="text-xs text-gray-500">Timeline of all submissions</p>
                      </div>
                    </span>
                  </SelectItem>
                  <SelectItem value="comparison">
                    <span className="flex items-center gap-3 py-1">
                      <CalendarDays className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="font-medium">Period Comparison</p>
                        <p className="text-xs text-gray-500">Compare across time periods</p>
                      </div>
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-purple-600" />
                Date Range
              </Label>
              <Select value={dateRangeType} onValueChange={(value: typeof dateRangeType) => setDateRangeType(value)}>
                <SelectTrigger className="h-12 bg-white border-2 border-gray-200 hover:border-purple-300 transition-colors">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current_month">📅 Current Month</SelectItem>
                  <SelectItem value="last_week">🗓️ Last 7 Days</SelectItem>
                  <SelectItem value="last_month">📆 Last Month</SelectItem>
                  <SelectItem value="last_3_months">🗓️ Last 3 Months</SelectItem>
                  <SelectItem value="all_time">⏰ All Time</SelectItem>
                  <SelectItem value="custom">🎯 Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <Filter className="h-4 w-4 text-purple-600" />
                Asset Types
              </Label>
              <Select value={selectedAssetTypes[0] || 'all'} onValueChange={(value) => setSelectedAssetTypes([value])}>
                <SelectTrigger className="h-12 bg-white border-2 border-gray-200 hover:border-purple-300 transition-colors">
                  <SelectValue placeholder="Select asset type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <span className="flex items-center gap-3 py-1">
                      <div className="w-4 h-4 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"></div>
                      <div>
                        <p className="font-medium">All Asset Types</p>
                        <p className="text-xs text-gray-500">Include all available types</p>
                      </div>
                    </span>
                  </SelectItem>
                  {assetTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      <span className="flex items-center gap-3 py-1">
                        <div 
                          className="w-4 h-4 rounded-full shadow-sm" 
                          style={{ backgroundColor: type.color }}
                        ></div>
                        <div>
                          <p className="font-medium">{type.name}</p>
                          <p className="text-xs text-gray-500">Filter by this type</p>
                        </div>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {assetTypes.length === 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-600 font-medium">
                    ⚠️ No asset types found. Please create asset types first.
                  </p>
                </div>
              )}
              {assetTypes.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                  <p className="text-sm text-green-700">
                    ✅ Found {assetTypes.length} asset types available
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Custom Date Range */}
          {dateRangeType === 'custom' && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <CalendarDays className="h-5 w-5 text-blue-600" />
                <h4 className="text-lg font-semibold text-blue-800">Custom Date Range</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="start-date" className="text-base font-medium text-gray-700">Start Date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="h-12 border-2 border-blue-200 focus:border-blue-400"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-date" className="text-base font-medium text-gray-700">End Date</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="h-12 border-2 border-blue-200 focus:border-blue-400"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Asset Selector for History Mode */}
          {viewMode === 'history' && (
            <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <History className="h-5 w-5 text-orange-600" />
                <h4 className="text-lg font-semibold text-orange-800">Asset Selection for History View</h4>
              </div>
              <div className="space-y-2">
                <Label className="text-base font-medium text-gray-700">
                  Select Asset for History View
                </Label>
                <Select value={selectedAssetForHistory} onValueChange={setSelectedAssetForHistory}>
                  <SelectTrigger className="h-12 border-2 border-orange-200 focus:border-orange-400">
                    <SelectValue placeholder="Choose an asset to view its history..." />
                  </SelectTrigger>
                  <SelectContent>
                    {reportData.map((asset, index) => (
                      <SelectItem key={index} value={asset.asset_name}>
                        <span className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                          {asset.asset_name} ({asset.asset_type})
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Enhanced Generate Button Section */}
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-xl p-8">
            <div className="text-center space-y-4">
              <h4 className="text-xl font-bold text-gray-800">Ready to Generate Your Report?</h4>
              <p className="text-gray-600">Click the button below to create your customized inventory report</p>
              
              <Button 
                onClick={generateReport}
                disabled={isLoading || !currentOrganization?.id}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200 px-16 py-4 text-lg font-semibold rounded-xl"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="mr-3 h-6 w-6 animate-spin" />
                    Generating Report...
                  </>
                ) : (
                  <>
                    <Target className="mr-3 h-6 w-6" />
                    Generate {viewMode === 'history' ? 'History' : viewMode === 'comparison' ? 'Comparison' : 'Report'}
                  </>
                )}
              </Button>
            </div>
          </div>
          
          {/* System Status Info */}
          {currentOrganization && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Settings className="h-4 w-4 text-gray-600" />
                <span className="font-medium text-gray-700">System Status</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Organization:</span>
                  <p className="font-medium text-gray-800">{currentOrganization.name}</p>
                </div>
                <div>
                  <span className="text-gray-500">Asset Types:</span>
                  <p className="font-medium text-gray-800">{assetTypes.length} available</p>
                </div>
                <div>
                  <span className="text-gray-500">View Mode:</span>
                  <p className="font-medium text-gray-800 capitalize">{viewMode}</p>
                </div>
                <div>
                  <span className="text-gray-500">Date Range:</span>
                  <p className="font-medium text-gray-800">{dateRangeType.replace('_', ' ')}</p>
                </div>
              </div>
              {currentTemplate && (
                <div className="mt-3 p-2 bg-blue-100 rounded-lg">
                  <span className="text-blue-700 font-medium">📋 Template: {currentTemplate.name}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Column Selector */}
      {showColumnSelector && formFields.length > 0 && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 overflow-hidden">
          <div className="bg-gradient-to-r from-orange-600 to-yellow-600 p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-3">
                <Settings className="h-6 w-6 text-white" />
                <div>
                  <h3 className="text-xl font-bold text-white">Column Selection</h3>
                  <p className="text-orange-100">Choose which data columns to include in your report</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                <Checkbox
                  id="select-all"
                  checked={selectedFields.length === formFields.length}
                  onCheckedChange={toggleAllColumns}
                  className="border-white"
                />
                <label htmlFor="select-all" className="text-white font-medium cursor-pointer">
                  Select All Data ({formFields.length} columns)
                </label>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            {/* All Columns Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-800">📊 Report Columns</h4>
                  <span className="text-sm text-gray-500">({formFields.filter(f => f.selected).length} selected)</span>
                </div>
                {/* Temporarily hidden - Add Color Column functionality not yet complete */}
                {/* <Button
                  onClick={() => setShowColorColumnBuilder(true)}
                  variant="outline"
                  size="sm"
                  className="bg-purple-50 border-purple-300 hover:bg-purple-100 text-purple-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Color Column
                </Button> */}
              </div>


            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {formFields.map((field, index) => (
                  <div key={field.id} className={`bg-white rounded-xl border-2 ${field.fieldType === 'color_fill' ? 'border-purple-200 hover:border-purple-300' : 'border-gray-200 hover:border-orange-300'} p-4 transition-all duration-200 hover:shadow-md`}>
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id={field.id}
                      checked={field.selected}
                      onCheckedChange={() => toggleColumn(field.id)}
                      className="w-5 h-5"
                    />
                    {field.selected && field.order && (
                        <span className={`flex items-center justify-center w-7 h-7 ${field.fieldType === 'color_fill' ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-gradient-to-r from-blue-500 to-purple-500'} text-white text-sm font-bold rounded-full shadow-md`}>
                        {field.order}
                      </span>
                    )}
                      {field.fieldType === 'color_fill' && (
                        <div 
                          className="w-4 h-4 rounded border shadow-sm"
                          style={{ backgroundColor: field.color }}
                        ></div>
                      )}
                    <label
                      htmlFor={field.id}
                      className="text-sm font-medium text-gray-800 cursor-pointer flex-1 leading-relaxed"
                      onClick={() => toggleColumn(field.id)}
                    >
                        {field.label} {field.fieldType === 'color_fill' && <span className="text-purple-600 text-xs">(Color)</span>}
                    </label>
                      {field.selected && (
                        <div className="flex flex-col">
                          <Button
                            onClick={() => moveColumn(field.id, 'up')}
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 hover:bg-blue-50"
                            title="Move up"
                          >
                            <ChevronUp className="h-3 w-3 text-blue-600" />
                          </Button>
                          <Button
                            onClick={() => moveColumn(field.id, 'down')}
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 hover:bg-blue-50"
                            title="Move down"
                          >
                            <ChevronDown className="h-3 w-3 text-blue-600" />
                          </Button>
                        </div>
                      )}
                      {field.fieldType === 'color_fill' && (
                        <Button
                          onClick={() => deleteColumn(field.id)}
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 hover:bg-red-50 hover:text-red-600"
                          title="Delete color column"
                        >
                          ×
                        </Button>
                      )}
                  </div>
                </div>
              ))}
              </div>
            </div>
            
            <div className="mt-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-4 bg-orange-50 rounded-xl border border-orange-200">
              <div className="space-y-1">
                <p className="text-sm font-medium text-orange-800">
                  📊 Selected: {selectedFields.length} columns total ({formFields.filter(f => f.selected && f.fieldType !== 'color_fill').length} data + {formFields.filter(f => f.selected && f.fieldType === 'color_fill').length} color)
                </p>
                <p className="text-xs text-orange-600">
                  Use checkboxes to select columns. Use ⬆️⬇️ arrows to reorder. Numbers show final order.
                </p>
              </div>
              <Button
                onClick={() => setShowPreview(!showPreview)}
                variant="outline"
                className="bg-white border-2 border-orange-300 hover:border-orange-400 hover:bg-orange-50 transition-all duration-200"
              >
                {showPreview ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                {showPreview ? 'Show All Data' : 'Show Preview Only'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Report Results */}
      {reportData.length > 0 && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-green-600 p-6">
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                  {viewMode === 'history' ? (
                    <History className="h-6 w-6 text-white" />
                  ) : viewMode === 'comparison' ? (
                    <CalendarDays className="h-6 w-6 text-white" />
                  ) : (
                    <Calendar className="h-6 w-6 text-white" />
                  )}
                </div>
                <div>
                  <h3 className="text-xl lg:text-2xl font-bold text-white">
                    {viewMode === 'history' ? 'Asset History Report' : 
                     viewMode === 'comparison' ? 'Period Comparison Report' : 
                     'Asset Inventory Report'}
                  </h3>
                  <p className="text-blue-100">
                    Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
                  </p>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-4">
                <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-white" />
                    <span className="text-white font-medium">
                      {reportData.length} {viewMode === 'history' ? 'submissions' : 'assets'}
                    </span>
                  </div>
                </div>
                
                {showPreview && reportData.length > 3 && (
                  <Badge className="bg-yellow-500 text-yellow-900 border-0">
                    Preview: {previewData.length} of {reportData.length}
                  </Badge>
                )}
                
                {viewMode === 'history' && selectedAssetForHistory && (
                  <Badge className="bg-orange-500 text-orange-900 border-0">
                    Viewing: {selectedAssetForHistory}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          <div className="p-6">
            {/* Enhanced Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-gray-50 to-blue-50 border-b-2 border-gray-200">
                      <th className="text-left p-4 font-bold text-gray-800 text-sm">Asset Name</th>
                      {viewMode === 'history' && (
                        <th className="text-left p-4 font-bold text-gray-800 text-sm">Submission Date</th>
                      )}
                      {selectedFields.map((field) => (
                        <th 
                          key={field.id} 
                          className={field.fieldType === 'color_fill' ? "text-center p-0 font-bold text-sm" : "text-left p-4 font-bold text-gray-800 text-sm"}
                          style={{ 
                            width: field.width,
                            backgroundColor: field.fieldType === 'color_fill' ? field.color : 'transparent'
                          }}
                        >
                          {field.fieldType === 'color_fill' ? (
                            <div 
                              className="h-full w-full py-3 px-2 flex items-center justify-center text-white text-xs font-bold"
                              style={{ 
                                backgroundColor: field.color,
                                textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
                              }}
                            >
                          {field.label}
                            </div>
                          ) : (
                            field.label
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, index) => (
                      <tr key={index} className="border-b border-gray-100 hover:bg-blue-50/50 transition-colors duration-150 min-h-[60px]">
                        <td className="p-4 font-semibold text-blue-700 align-middle">{row.asset_name}</td>
                        {viewMode === 'history' && (
                          <td className="p-4 text-gray-600 align-middle">
                            {row.submission_date ? 
                              new Date(row.submission_date).toLocaleString() : 
                              <span className="text-red-500 font-medium">No data</span>
                            }
                          </td>
                        )}
                        {selectedFields.map((field) => (
                          <td 
                            key={field.id} 
                            className={field.fieldType === 'color_fill' ? "p-0 relative align-middle" : "p-4 align-middle"}
                            style={{ 
                              width: field.width,
                              backgroundColor: field.fieldType === 'color_fill' ? field.color : 'transparent'
                            }}
                          >
                            {field.fieldType === 'color_fill' ? (
                              <div 
                                className="h-full w-full min-h-[60px] flex items-center justify-center text-white text-xs font-medium text-shadow"
                                style={{ 
                                  backgroundColor: field.color,
                                  textShadow: '1px 1px 2px rgba(0,0,0,0.7)'
                                }}
                                title={field.label}
                              >
                                {field.label}
                              </div>
                            ) : field.id === 'asset_type' ? (
                              <Badge variant="outline" className="bg-purple-50 border-purple-200 text-purple-700">
                                {row.asset_type}
                              </Badge>
                            ) : field.id === 'last_updated' ? (
                              <span className="text-gray-600">
                                {row.submission_date ? 
                                  new Date(row.submission_date).toLocaleDateString() : 
                                  <span className="text-red-500">No data</span>
                                }
                              </span>
                            ) : field.id === 'last_month_total' ? (
                              <span className="font-medium text-green-700">
                                {row.last_month_total || <span className="text-gray-400">No data</span>}
                              </span>
                            ) : (
                              <span className="text-gray-700">
                                {renderFieldValue(row.latest_submission[field.id]) || 
                                <span className="text-gray-400">-</span>}
                              </span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Enhanced Preview Notice */}
            {showPreview && reportData.length > 3 && (
              <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <Eye className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-blue-800">
                      Preview Mode Active
                    </p>
                    <p className="text-sm text-blue-600">
                      Showing first {previewData.length} of {reportData.length} {viewMode === 'history' ? 'submissions' : 'assets'}. 
                      Use "Show All Data" button above or export CSV for complete results.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Enhanced View Mode Info */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`p-4 rounded-xl border-2 ${viewMode === 'latest' ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-800">Latest Mode</span>
                </div>
                <p className="text-xs text-green-700">
                  Most recent submission per asset. Ideal for current inventory status.
                </p>
              </div>
              
              <div className={`p-4 rounded-xl border-2 ${viewMode === 'history' ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <History className="h-4 w-4 text-orange-600" />
                  <span className="font-medium text-orange-800">History Mode</span>
                </div>
                <p className="text-xs text-orange-700">
                  All submissions for selected asset(s) within date range. Each row = one submission.
                </p>
              </div>
              
              <div className={`p-4 rounded-xl border-2 ${viewMode === 'comparison' ? 'bg-purple-50 border-purple-200' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <CalendarDays className="h-4 w-4 text-purple-600" />
                  <span className="font-medium text-purple-800">Comparison Mode</span>
                </div>
                <p className="text-xs text-purple-700">
                  Compare values across different time periods for trend analysis.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Empty State */}
      {!isLoading && reportData.length === 0 && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border-2 border-dashed border-gray-300 overflow-hidden">
          <div className="bg-gradient-to-r from-gray-100 to-blue-100 p-6 text-center">
            <div className="max-w-2xl mx-auto">
              <div className="mb-6">
                {viewMode === 'history' ? (
                  <div className="p-4 bg-orange-500 rounded-full inline-block mb-4">
                    <History className="h-12 w-12 text-white" />
                  </div>
                ) : viewMode === 'comparison' ? (
                  <div className="p-4 bg-purple-500 rounded-full inline-block mb-4">
                    <CalendarDays className="h-12 w-12 text-white" />
                  </div>
                ) : (
                  <div className="p-4 bg-blue-500 rounded-full inline-block mb-4">
                    <FileText className="h-12 w-12 text-white" />
                  </div>
                )}
              </div>
              
              <h3 className="text-2xl font-bold text-gray-800 mb-4">
                No {viewMode === 'history' ? 'History Data' : viewMode === 'comparison' ? 'Comparison Data' : 'Report'} Generated Yet
              </h3>
              
              <div className="space-y-3 text-gray-600">
                {viewMode === 'history' ? (
                  <>
                    <p className="text-lg">Ready to explore your asset history?</p>
                    <p>Select an asset and date range above to view its submission timeline and track changes over time.</p>
                  </>
                ) : viewMode === 'comparison' ? (
                  <>
                    <p className="text-lg">Ready to compare time periods?</p>
                    <p>Configure your comparison settings and date ranges above to analyze trends and patterns in your data.</p>
                  </>
                ) : (
                  <>
                    <p className="text-lg">Ready to generate your first report?</p>
                    <p>Configure your report settings above and click the "Generate Report" button to see your asset data in action.</p>
                  </>
                )}
              </div>
              
              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-white font-bold">1</span>
                  </div>
                  <p className="font-medium text-gray-800">Configure Settings</p>
                  <p className="text-gray-600">Choose view mode, date range, and asset types</p>
                </div>
                <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4">
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-white font-bold">2</span>
                  </div>
                  <p className="font-medium text-gray-800">Generate Report</p>
                  <p className="text-gray-600">Click the generate button to create your report</p>
                </div>
                <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-white font-bold">3</span>
                  </div>
                  <p className="font-medium text-gray-800">Analyze & Export</p>
                  <p className="text-gray-600">Review data and export to CSV if needed</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleAssetReport; 