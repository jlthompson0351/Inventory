import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft,
  Save,
  Download,
  Plus,
  Settings,
  Trash2,
  Table as TableIcon,
  FileSpreadsheet,
  MoveVertical,
  Filter,
  SortAsc,
  Trash,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { getAssetTypes } from "@/services/assetTypeService";
import { ReportConfig, createReport, updateReport, getReport, executeReport } from "@/services/reportService";
import { supabase } from "@/integrations/supabase/client";
import { getMappedFieldsForReporting, getAllMappedFieldsForAssetType } from '@/services/mappedFieldService';
import { createForm, updateForm, getFormById } from "@/services/formService";
import { Badge } from "@/components/ui/badge";
import { addAssetTypeFormLink, getFormAssetTypeLinks } from '@/services/assetTypeService';
import VisualFormulaBuilder from '@/components/forms/VisualFormulaBuilder';

// Available data sources for reports (MaintainX style)
const availableDataSources = [
  {
    id: "assets",
    name: "Assets",
    description: "Asset information and details",
    icon: "📦"
  },
  {
    id: "asset_types",
    name: "Asset Types",
    description: "Asset type configurations and settings",
    icon: "🏷️"
  },
  {
    id: "inventory_items",
    name: "Inventory Items",
    description: "Current inventory levels and data",
    icon: "📋"
  },
  {
    id: "intake_forms",
    name: "Intake Forms",
    description: "Intake form submissions and data",
    icon: "📥"
  },
  {
    id: "inventory_forms",
    name: "Inventory Forms",
    description: "Inventory form submissions and data",
    icon: "📊"
  },
  {
    id: "mapping_forms",
    name: "Mapping Forms",
    description: "Mapping form submissions and conversions",
    icon: "🔗"
  },
  {
    id: "form_submissions",
    name: "All Form Submissions",
    description: "All form submission data across types",
    icon: "📄"
  }
];

// 🎯 SMART REPORT TEMPLATES
const reportTemplates = [
  {
    id: 'asset_inventory',
    name: '📦 Asset Inventory Report',
    description: 'Complete overview of all assets with status and details',
    icon: '📦',
    dataSources: ['assets', 'asset_types'],
    suggestedColumns: ['assets.name', 'assets.status', 'assets.serial_number', 'asset_types.name', 'assets.acquisition_date'],
    assetTypes: [],
    category: 'Assets'
  },
  {
    id: 'inventory_valuation',
    name: '💰 Inventory Valuation Report',
    description: 'Financial overview of inventory with calculations',
    icon: '💰',
    dataSources: ['inventory_items', 'asset_types'],
    suggestedColumns: ['inventory_items.name', 'inventory_items.quantity', 'inventory_items.current_price', 'calculated.total_value'],
    assetTypes: [],
    category: 'Financial'
  },
  {
    id: 'asset_type_analysis',
    name: '🏷️ Asset Type Analysis',
    description: 'Detailed breakdown by asset type with relationships',
    icon: '🏷️',
    dataSources: ['asset_types', 'assets'],
    suggestedColumns: ['asset_types.name', 'asset_types.description', 'asset_types.color'],
    assetTypes: [],
    category: 'Analysis'
  },
  {
    id: 'form_submission_summary',
    name: '📝 Form Submission Summary',
    description: 'Overview of all form submissions and responses',
    icon: '📝',
    dataSources: ['form_submissions'],
    suggestedColumns: [],
    assetTypes: [],
    category: 'Forms'
  },
  {
    id: 'usage_analytics',
    name: '📊 Usage Analytics Report',
    description: 'Track inventory usage patterns and trends',
    icon: '📊',
    dataSources: ['inventory_items'],
    suggestedColumns: ['inventory_items.name', 'calculated.usage', 'calculated.turnover_rate'],
    assetTypes: [],
    category: 'Analytics'
  }
];

// 🎯 DYNAMIC SUBJECT DETECTION - No more manual selection!
const detectPrimarySubject = (dataSources: string[]) => {
  if (dataSources.includes('inventory_items')) return 'inventory_items';
  if (dataSources.includes('assets')) return 'assets';
  if (dataSources.includes('form_submissions')) return 'form_submissions';
  return 'inventory_items'; // Default
};

const ReportBuilder = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [reportName, setReportName] = useState("New Report");
  const [description, setDescription] = useState("");
  const [selectedDataSources, setSelectedDataSources] = useState<string[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [selectedAssetTypes, setSelectedAssetTypes] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("templates");
  const [filterRules, setFilterRules] = useState<any[]>([]);
  const [sortRules, setSortRules] = useState<any[]>([]);
  const [assetTypes, setAssetTypes] = useState<any[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [formFields, setFormFields] = useState<any[]>([]);
  const [availableColumns, setAvailableColumns] = useState<any[]>([]);
  const [fieldSearch, setFieldSearch] = useState("");
  const [isLoadingAssetTypes, setIsLoadingAssetTypes] = useState(false);
  const [isFieldsLoading, setIsFieldsLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(true);

  // 🎯 DYNAMIC SUBJECT - No more manual selection needed!
  const subject = detectPrimarySubject(selectedDataSources);

  useEffect(() => {
    const fetchAssetTypes = async () => {
      if (!currentOrganization) return;
      setIsLoadingAssetTypes(true);
      try {
        const data = await getAssetTypes(currentOrganization.id);
        setAssetTypes(data || []);
      } catch (error) {
        console.error("Failed to fetch asset types:", error);
        toast({
          title: "Error",
          description: "Failed to load asset types. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingAssetTypes(false);
      }
    };

    fetchAssetTypes();
  }, [currentOrganization?.id, toast]);

  useEffect(() => {
    // If editing an existing report, load report data
    const fetchReportData = async () => {
      if (!id) return;

      setIsLoading(true);
      try {
        const report = await getReport(id);
        if (report) {
          setReportName(report.name);
          setDescription(report.description || "");
          setSelectedDataSources(report.report_config.dataSources || []);
          setSelectedColumns(report.report_config.columns || []);
          setFilterRules(report.report_config.filters || []);
          setSortRules(report.report_config.sorts || []);
          setSelectedAssetTypes(report.report_config.assetTypes || []);
          
          if (report.report_config.columns && report.report_config.columns.length > 0) {
            const previewResults = await executeReport(report, 10);
            setPreviewData(previewResults);
          }
        }
      } catch (error) {
        console.error("Failed to fetch report:", error);
        toast({
          title: "Error",
          description: "Failed to load report. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchReportData();
  }, [id, toast]);

  useEffect(() => {
    const fetchAllAvailableFields = async () => {
      if (!currentOrganization?.id) return;

      setIsFieldsLoading(true);
      try {
        // First, get any form fields that might be available
        const formFieldsData = await getMappedFieldsForReporting(currentOrganization.id);
        
        // Always include static columns based on selected data sources
        const staticColumns: any[] = [];

        // Add record source field if any data source is selected
        if (selectedDataSources.length > 0) {
          staticColumns.push({
            id: 'record_source',
            field_label: 'Record Source',
            field_type: 'text',
            form_name: 'System Fields',
            description: 'Identifies which table this record comes from'
          });
        }

        selectedDataSources.forEach(sourceId => {
          if (sourceId === 'assets') {
            staticColumns.push(
              { id: 'assets.id', field_label: 'Asset ID', field_type: 'text', form_name: 'Assets', description: 'Unique asset identifier' },
              { id: 'assets.name', field_label: 'Asset Name', field_type: 'text', form_name: 'Assets', description: 'Name of the asset' },
              { id: 'assets.description', field_label: 'Asset Description', field_type: 'text', form_name: 'Assets', description: 'Asset description' },
              { id: 'assets.status', field_label: 'Asset Status', field_type: 'text', form_name: 'Assets', description: 'Current status of asset' },
              { id: 'assets.serial_number', field_label: 'Serial Number', field_type: 'text', form_name: 'Assets', description: 'Asset serial number' },
              { id: 'assets.barcode', field_label: 'Barcode', field_type: 'text', form_name: 'Assets', description: 'Asset barcode' },
              { id: 'assets.acquisition_date', field_label: 'Acquisition Date', field_type: 'date', form_name: 'Assets', description: 'Date asset was acquired' },
              { id: 'assets.created_at', field_label: 'Created Date', field_type: 'date', form_name: 'Assets', description: 'Date asset record was created' },
              { id: 'assets.updated_at', field_label: 'Updated Date', field_type: 'date', form_name: 'Assets', description: 'Date asset record was last updated' }
            );
          }
          if (sourceId === 'asset_types') {
            staticColumns.push(
              { id: 'asset_types.id', field_label: 'Asset Type ID', field_type: 'text', form_name: 'Asset Types', description: 'Unique asset type identifier' },
              { id: 'asset_types.name', field_label: 'Asset Type Name', field_type: 'text', form_name: 'Asset Types', description: 'Name of the asset type' },
              { id: 'asset_types.description', field_label: 'Asset Type Description', field_type: 'text', form_name: 'Asset Types', description: 'Description of asset type' },
              { id: 'asset_types.color', field_label: 'Asset Type Color', field_type: 'text', form_name: 'Asset Types', description: 'Display color for asset type' }
            );
          }
          if (sourceId === 'inventory_items') {
            staticColumns.push(
              { id: 'inventory_items.id', field_label: 'Inventory ID', field_type: 'text', form_name: 'Inventory Items', description: 'Unique inventory item identifier' },
              { id: 'inventory_items.name', field_label: 'Item Name', field_type: 'text', form_name: 'Inventory Items', description: 'Name of inventory item' },
              { id: 'inventory_items.sku', field_label: 'SKU', field_type: 'text', form_name: 'Inventory Items', description: 'Stock keeping unit' },
              { id: 'inventory_items.quantity', field_label: 'Quantity', field_type: 'number', form_name: 'Inventory Items', description: 'Current quantity in stock' },
              { id: 'inventory_items.current_price', field_label: 'Current Price', field_type: 'number', form_name: 'Inventory Items', description: 'Current price per unit' },
              { id: 'inventory_items.created_at', field_label: 'Created Date', field_type: 'date', form_name: 'Inventory Items', description: 'Date inventory item was created' },
              { id: 'inventory_items.updated_at', field_label: 'Updated Date', field_type: 'date', form_name: 'Inventory Items', description: 'Date inventory item was last updated' }
            );
          }
          if (sourceId === 'form_submissions') {
            staticColumns.push(
              { id: 'form_submissions.id', field_label: 'Submission ID', field_type: 'text', form_name: 'Form Submissions', description: 'Unique form submission identifier' },
              { id: 'form_submissions.form_id', field_label: 'Form ID', field_type: 'text', form_name: 'Form Submissions', description: 'ID of the submitted form' },
              { id: 'form_submissions.created_at', field_label: 'Submitted Date', field_type: 'date', form_name: 'Form Submissions', description: 'When form was submitted' },
              { id: 'form_submissions.updated_at', field_label: 'Updated Date', field_type: 'date', form_name: 'Form Submissions', description: 'When submission was last updated' }
            );
          }
          if (sourceId === 'intake_forms') {
            staticColumns.push(
              { id: 'form_submissions.id', field_label: 'Intake Submission ID', field_type: 'text', form_name: 'Intake Forms', description: 'Unique intake form submission identifier' },
              { id: 'form_submissions.created_at', field_label: 'Intake Date', field_type: 'date', form_name: 'Intake Forms', description: 'When intake form was submitted' },
              { id: 'forms.name', field_label: 'Intake Form Name', field_type: 'text', form_name: 'Intake Forms', description: 'Name of the intake form' }
            );
          }
          if (sourceId === 'inventory_forms') {
            staticColumns.push(
              { id: 'form_submissions.id', field_label: 'Inventory Submission ID', field_type: 'text', form_name: 'Inventory Forms', description: 'Unique inventory form submission identifier' },
              { id: 'form_submissions.created_at', field_label: 'Inventory Check Date', field_type: 'date', form_name: 'Inventory Forms', description: 'When inventory form was submitted' },
              { id: 'forms.name', field_label: 'Inventory Form Name', field_type: 'text', form_name: 'Inventory Forms', description: 'Name of the inventory form' }
            );
          }
          if (sourceId === 'mapping_forms') {
            staticColumns.push(
              { id: 'form_submissions.id', field_label: 'Mapping Submission ID', field_type: 'text', form_name: 'Mapping Forms', description: 'Unique mapping form submission identifier' },
              { id: 'form_submissions.created_at', field_label: 'Mapping Date', field_type: 'date', form_name: 'Mapping Forms', description: 'When mapping form was submitted' },
              { id: 'forms.name', field_label: 'Mapping Form Name', field_type: 'text', form_name: 'Mapping Forms', description: 'Name of the mapping form' }
            );
          }
        });

        // 🎯 AUTOMATICALLY LOAD ALL ASSET TYPE FIELDS - No manual selection required!
        const allAssetTypeFields: any[] = [];
        
        // If any data source that relates to asset types is selected, load ALL asset type fields
        if (selectedDataSources.some(ds => ['assets', 'asset_types', 'inventory_items', 'form_submissions', 'intake_forms', 'inventory_forms', 'mapping_forms'].includes(ds))) {
          console.log('🔍 Auto-discovering ALL asset type fields...');
          
          // Get ALL asset types for this organization
          const allAssetTypesData = await getAssetTypes(currentOrganization.id);
          
          for (const assetType of allAssetTypesData || []) {
            console.log(`🔍 Processing asset type: ${assetType.name} (${assetType.id})`);
            
            // Add conversion fields from asset type configuration
            if (assetType.conversion_fields && Array.isArray(assetType.conversion_fields)) {
              assetType.conversion_fields.forEach((field: any) => {
                allAssetTypeFields.push({
                  id: `conversion.${assetType.id}.${field.field_name}`,
                  field_label: `${field.label || field.field_name} (${assetType.name})`,
                  field_type: field.type || 'text',
                  form_name: `🧮 Conversion Fields (${assetType.name})`,
                  description: field.description || `Conversion field: ${field.field_name}`,
                  source: 'conversion',
                  asset_type_id: assetType.id
                });
                console.log(`✅ Added conversion field: ${field.field_name} for ${assetType.name}`);
              });
            }
            
            // Get form mapped fields for this asset type
            try {
              const assetTypeSpecificFields = await getAllMappedFieldsForAssetType(assetType.id, currentOrganization.id);
              
              // Add form mapped fields
              assetTypeSpecificFields.formMappedFields?.forEach(field => {
                allAssetTypeFields.push({
                  id: `form_field.${field.form_id}.${field.field_id}`,
                  field_label: `${field.field_label} (${assetType.name})`,
                  field_type: field.field_type,
                  form_name: `📝 ${field.form_name} (${assetType.name})`,
                  description: field.description || `Form field from ${field.form_name}`,
                  source: 'form',
                  form_id: field.form_id,
                  asset_type_id: assetType.id
                });
                console.log(`✅ Added form field: ${field.field_label} for ${assetType.name}`);
              });
            } catch (error) {
              console.warn(`⚠️ Could not get mapped fields for asset type ${assetType.name}:`, error);
            }
          }
        }

        // Also include any fields from manually selected asset types (for additional specificity)
        const manualAssetTypeFields: any[] = [];
        if (selectedAssetTypes.length > 0 && currentOrganization?.id) {
          for (const assetTypeId of selectedAssetTypes) {
            const assetTypeSpecificFields = await getAllMappedFieldsForAssetType(assetTypeId, currentOrganization.id);
            
            // Add conversion fields
            assetTypeSpecificFields.conversionFields?.forEach(field => {
              manualAssetTypeFields.push({
                id: `conversion.${assetTypeId}.${field.field_name}`,
                field_label: field.label || field.field_name,
                field_type: field.type || 'text',
                form_name: `🧮 Conversion Fields (${assetTypes.find(at => at.id === assetTypeId)?.name || 'Asset Type'})`,
                description: field.description || `Conversion field: ${field.field_name}`,
                source: 'conversion',
                asset_type_id: assetTypeId
              });
            });
            
            // Add form mapped fields
            assetTypeSpecificFields.formMappedFields?.forEach(field => {
              manualAssetTypeFields.push({
                id: `form_field.${field.form_id}.${field.field_id}`,
                field_label: field.field_label,
                field_type: field.field_type,
                form_name: `📝 ${field.form_name} (${assetTypes.find(at => at.id === assetTypeId)?.name || 'Asset Type'})`,
                description: field.description || `Form field from ${field.form_name}`,
                source: 'form',
                form_id: field.form_id,
                asset_type_id: assetTypeId
              });
            });
          }
        }
        
        // Combine all fields, with static columns first
        const allDiscoveredFields = [
          ...staticColumns,
          ...formFieldsData.map(field => ({
            ...field,
            form_name: field.form_name || 'Custom Forms'
          })),
          ...allAssetTypeFields,
          ...manualAssetTypeFields,
        ];
        
        // Remove duplicates based on field ID
        const uniqueFields = allDiscoveredFields.filter((field, index, self) =>
          index === self.findIndex(f => f.id === field.id)
        );
        
        console.log(`🎉 Discovered ${uniqueFields.length} total fields (${staticColumns.length} static, ${formFieldsData.length} form mapped, ${allAssetTypeFields.length} auto asset type, ${manualAssetTypeFields.length} manual asset type)`);
        
        setFormFields(uniqueFields);

      } catch (error) {
        console.error('Error in field discovery:', error);
        toast({
          title: "Error",
          description: "Failed to load available fields",
          variant: "destructive",
        });
      } finally {
        setIsFieldsLoading(false);
      }
    };

    fetchAllAvailableFields();
  }, [currentOrganization?.id, selectedDataSources, selectedAssetTypes, toast, assetTypes]);

  const fieldsByForm = formFields.reduce((acc, field) => {
    const formName = field.form_name || "Other Fields";
    if (!acc[formName]) acc[formName] = [];
    acc[formName].push(field);
    return acc;
  }, {} as Record<string, any[]>);

  const handleColumnToggle = (columnId: string) => {
    setSelectedColumns(prev =>
      prev.includes(columnId) ? prev.filter(id => id !== columnId) : [...prev, columnId]
    );
  };

  const handleDataSourceToggle = (sourceId: string) => {
    setSelectedDataSources(prev =>
      prev.includes(sourceId) ? prev.filter(id => id !== sourceId) : [...prev, sourceId]
    );
    // When data sources change, clear selected columns as they might no longer be valid
    setSelectedColumns([]);
    // Don't clear formFields here - let the useEffect handle refreshing them
  };

  const handleAssetTypeToggle = (typeId: string) => {
    setSelectedAssetTypes(prev =>
      prev.includes(typeId) ? prev.filter(id => id !== typeId) : [...prev, typeId]
    );
    // When asset types change, we don't clear selected columns anymore
    // The useEffect will handle updating available fields
  };
  
  const addFilterRule = () => setFilterRules(prev => [...prev, { id: Date.now().toString(), field: "", operator: "equals", value: "" }]);
  const updateFilterRule = (id: string, key: string, value: any) => {
    setFilterRules(prev => prev.map(rule => rule.id === id ? { ...rule, [key]: value } : rule));
  };
  const removeFilterRule = (id: string) => setFilterRules(prev => prev.filter(rule => rule.id !== id));

  const addSortRule = () => setSortRules(prev => [...prev, { id: Date.now().toString(), field: "", direction: "asc" }]);
  const updateSortRule = (id: string, key: string, value: any) => {
    setSortRules(prev => prev.map(rule => rule.id === id ? { ...rule, [key]: value } : rule));
  };
  const removeSortRule = (id: string) => setSortRules(prev => prev.filter(rule => rule.id !== id));
  const moveSortRule = (id: string, direction: "up" | "down") => {
    setSortRules(prevRules => {
      const rules = [...prevRules];
      const index = rules.findIndex(rule => rule.id === id);
      if (index === -1) return rules;
      const newIndex = direction === "up" ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= rules.length) return rules;
      [rules[index], rules[newIndex]] = [rules[newIndex], rules[index]];
      return rules;
    });
  };

  const saveReport = async () => {
    if (!currentOrganization?.id || !reportName) {
      toast({ title: "Error", description: "Report name and organization are required.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    const reportConfig: ReportConfig = {
      subject: subject,
      dataSources: selectedDataSources,
      columns: selectedColumns,
      filters: filterRules.map(({ id, ...rest }) => rest), // Remove temporary UI id
      sorts: sortRules.map(({ id, ...rest }) => rest),  // Remove temporary UI id
      assetTypes: selectedAssetTypes,
    };
    try {
      if (id) {
        await updateReport(id, { name: reportName, description, report_config: reportConfig });
        toast({ title: "Report Updated", description: "Your report has been updated successfully." });
      } else {
        await createReport({ name: reportName, description, report_config: reportConfig, organization_id: currentOrganization.id });
        toast({ title: "Report Created", description: "Your report has been created successfully." });
      }
      navigate('/reports');
    } catch (error) {
      console.error("Failed to save report:", error);
      toast({ title: "Error", description: "Failed to save report. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const generatePreview = async () => {
    if (!currentOrganization?.id || selectedColumns.length === 0) {
        toast({title: "Cannot Generate Preview", description: "Please select at least one column.", variant: "destructive"});
        return;
    }
    setIsLoading(true);
    const tempReport = {
      id: id || 'preview',
      name: reportName,
      description,
      report_config: {
        subject,
        dataSources: selectedDataSources,
        columns: selectedColumns,
        filters: filterRules.map(({ id, ...rest }) => rest),
        sorts: sortRules.map(({ id, ...rest }) => rest),
        assetTypes: selectedAssetTypes
      },
      organization_id: currentOrganization.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    try {
      const results = await executeReport(tempReport, 20); // Increased preview limit
      setPreviewData(results);
      if(results.length === 0) {
        toast({title: "No Data", description: "The preview query returned no results based on your current configuration.", variant: "default"});
      }
    } catch (error) {
      console.error("Failed to generate preview:", error);
      toast({ title: "Error Generating Preview", description: String(error), variant: "destructive" });
      setPreviewData([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const exportCsv = async () => {
    if (!currentOrganization?.id || selectedColumns.length === 0) {
       toast({title: "Cannot Export", description: "Please select at least one column for the export.", variant: "destructive"});
      return;
    }
    toast({ title: "Preparing Export", description: "Please wait..." });
    setIsLoading(true);
     const tempReport = {
      id: id || 'export',
      name: reportName,
      description,
      report_config: {
        subject,
        dataSources: selectedDataSources,
        columns: selectedColumns,
        filters: filterRules.map(({ id, ...rest }) => rest),
        sorts: sortRules.map(({ id, ...rest }) => rest),
        assetTypes: selectedAssetTypes
      },
      organization_id: currentOrganization.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    try {
      const results = await executeReport(tempReport); // Full export, no limit
      if (results.length === 0) {
        toast({title: "No Data to Export", description: "Your report configuration resulted in no data.", variant: "default"});
        return;
      }
      const headers = selectedColumns.map(colId => formFields.find(f => f.id === colId)?.field_label || colId);
      const data = results.map(item => selectedColumns.map(colId => {
        let value = item[colId];
         if (colId.includes('.')) {
            const parts = colId.split('.');
            value = item[parts[0]]?.[parts[1]];
        }
        return value !== null && value !== undefined ? String(value) : '';
      }));
      const csvContent = [headers.join(","), ...data.map(row => row.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.setAttribute("href", URL.createObjectURL(blob));
      link.setAttribute("download", `${reportName.replace(/\s+/g, "_") || "report"}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: "Export Complete", description: "Your report has been downloaded." });
    } catch (error) {
      console.error("Error exporting CSV:", error);
      toast({ title: "Export Error", description: String(error), variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  };
  
  useEffect(() => {
    const autoPreview = async () => {
        if (selectedDataSources.length > 0 && selectedColumns.length > 0 && selectedColumns.length <=10 && activeTab === 'preview') {
            await generatePreview();
        }
    }
    autoPreview();
  }, [selectedColumns, selectedDataSources, activeTab]);


  const applyTemplate = (template: typeof reportTemplates[0]) => {
    setSelectedTemplate(template.id);
    setReportName(template.name);
    setDescription(template.description);
    setSelectedDataSources(template.dataSources);
    setSelectedAssetTypes(template.assetTypes || []);
    // Automatically select suggested columns if available in the discovered formFields
    const availableFieldIds = formFields.map(f => f.id);
    const suggestedAndAvailable = template.suggestedColumns?.filter(sc => availableFieldIds.includes(sc)) || [];
    setSelectedColumns(suggestedAndAvailable);
    
    setActiveTab("data-sources");
    toast({
      title: "Template Applied! 🎉",
      description: `${template.name} configured. Review data sources and columns.`,
    });
  };

  const startCustomReport = () => {
    setSelectedTemplate(null);
    setReportName("New Custom Report");
    setDescription("");
    setSelectedDataSources([]);
    setSelectedAssetTypes([]);
    setSelectedColumns([]);
    setFilterRules([]);
    setSortRules([]);
    setPreviewData([]);
    setActiveTab("data-sources");
    toast({
      title: "Custom Report Started 🛠️",
      description: "Build your report by selecting data sources and columns.",
    });
  };

  return (
    <div className="animate-fade-in p-4 md:p-6 lg:p-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild className="mr-1 flex-shrink-0">
            <Link to="/reports">
              <ChevronLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex-grow min-w-0">
            <Input
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
              className="text-xl md:text-2xl font-bold h-auto p-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent truncate"
              placeholder="Enter Report Name"
            />
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Report description (optional)"
              className="text-xs md:text-sm text-muted-foreground h-auto p-1 mt-0.5 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent truncate"
            />
          </div>
        </div>
        <div className="flex space-x-2 flex-shrink-0 self-start md:self-center">
          <Button variant="outline" onClick={exportCsv} disabled={isLoading || selectedColumns.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={saveReport} disabled={isLoading}>
            <Save className="mr-2 h-4 w-4" />
            {id ? 'Save Changes' : 'Save Report'}
          </Button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Pane: Tabs */}
        <div className="lg:col-span-8 xl:col-span-9">
          <Card>
            <CardContent className="p-4 md:p-6">
              <Tabs defaultValue="templates" value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4 grid grid-cols-3 sm:grid-cols-6 w-full h-auto">
                  <TabsTrigger value="templates">Templates</TabsTrigger>
                  <TabsTrigger value="data-sources">Sources</TabsTrigger>
                  <TabsTrigger value="columns">Columns</TabsTrigger>
                  <TabsTrigger value="filters">Filters</TabsTrigger>
                  <TabsTrigger value="sorting">Sorting</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>

                {/* Templates Tab */}
                <TabsContent value="templates" className="mt-0">
                  <div className="space-y-4">
                    <div className="text-center mb-6">
                      <h2 className="text-xl font-semibold mb-1">🚀 Report Templates</h2>
                      <p className="text-sm text-muted-foreground">
                        Start with a pre-built template or build a custom report from scratch.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                      {reportTemplates.map((template) => (
                        <Card
                          key={template.id}
                          className={`cursor-pointer transition-all duration-150 hover:shadow-lg hover:scale-[1.02] flex flex-col ${selectedTemplate === template.id ? 'ring-2 ring-primary shadow-xl' : 'hover:shadow-md'}`}
                          onClick={() => applyTemplate(template)}
                        >
                          <CardContent className="p-4 flex flex-col items-center text-center flex-grow">
                            <div className="text-3xl mb-2">{template.icon}</div>
                            <h3 className="font-semibold text-base mb-1">{template.name}</h3>
                            <p className="text-xs text-muted-foreground mb-3 line-clamp-2 flex-grow">{template.description}</p>
                            <div className="space-y-1 text-xs w-full">
                              <div className="flex items-center justify-center space-x-1.5">
                                <Badge variant="secondary" className="text-xs px-1.5 py-0.5">{template.category}</Badge>
                                <Badge variant="secondary" className="text-xs px-1.5 py-0.5">{template.dataSources.length} sources</Badge>
                              </div>
                            </div>
                            {selectedTemplate === template.id && (
                              <div className="mt-2 p-1 bg-primary/10 rounded-md w-full">
                                <div className="text-primary text-xs font-medium">✓ Selected</div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                      <Card
                        className="cursor-pointer transition-all duration-150 hover:shadow-lg hover:scale-[1.02] border-dashed border-2 flex flex-col"
                        onClick={startCustomReport}
                      >
                        <CardContent className="p-4 flex flex-col items-center text-center flex-grow justify-center">
                          <div className="text-3xl mb-2">🛠️</div>
                          <h3 className="font-semibold text-base mb-1">Custom Report</h3>
                          <p className="text-xs text-muted-foreground flex-grow">Build your own report from scratch.</p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </TabsContent>

                {/* Data Sources Tab */}
                <TabsContent value="data-sources" className="mt-0">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-xl font-semibold">📊 Select Data Sources</h2>
                      <Badge variant="outline">{selectedDataSources.length} selected</Badge>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                      {availableDataSources.map((source) => (
                        <Card
                          key={source.id}
                          className={`cursor-pointer transition-all duration-150 hover:shadow-md flex ${selectedDataSources.includes(source.id) ? 'ring-2 ring-primary shadow-md' : 'hover:shadow-sm'}`}
                          onClick={() => handleDataSourceToggle(source.id)}
                        >
                          <CardContent className="p-3 flex items-start space-x-2.5 w-full">
                            <Checkbox
                              checked={selectedDataSources.includes(source.id)}
                              onCheckedChange={() => handleDataSourceToggle(source.id)}
                              className="mt-0.5 flex-shrink-0"
                              aria-labelledby={`ds-label-${source.id}`}
                            />
                            <div className="flex-grow min-w-0">
                              <div className="flex items-center space-x-1.5 mb-0.5">
                                <span className="text-lg">{source.icon}</span>
                                <h3 id={`ds-label-${source.id}`} className="font-medium text-sm truncate">{source.name}</h3>
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2">{source.description}</p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                {/* Columns Tab */}
                <TabsContent value="columns" className="mt-0">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-xl font-semibold">🎯 Column Selection</h2>
                      <Badge variant="outline">{selectedColumns.length} / {formFields.length} selected</Badge>
                    </div>
                    <Input
                      placeholder="🔍 Search available fields..."
                      value={fieldSearch}
                      onChange={e => setFieldSearch(e.target.value)}
                      className="w-full mb-3"
                    />
                    {isFieldsLoading ? (
                      <div className="text-center py-10 text-muted-foreground">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                        Discovering fields...
                      </div>
                    ) : formFields.length === 0 ? (
                         <div className="text-center py-10 text-muted-foreground">
                            <p>No fields available for the selected data sources.</p>
                            <p className="text-xs mt-1">Try selecting different data sources.</p>
                        </div>
                    ) : (
                      <div className="border rounded-md max-h-[500px] overflow-y-auto divide-y divide-slate-100">
                        {Object.entries(fieldsByForm).filter(([formName, fields]) => 
                            (fields as any[]).some((f: any) => 
                                f.field_label.toLowerCase().includes(fieldSearch.toLowerCase()) ||
                                (f.description || '').toLowerCase().includes(fieldSearch.toLowerCase())
                            )
                        ).map(([formName, fields]) => {
                          const filteredFields = (fields as any[]).filter((f: any) => 
                                f.field_label.toLowerCase().includes(fieldSearch.toLowerCase()) ||
                                (f.description || '').toLowerCase().includes(fieldSearch.toLowerCase())
                          );
                          if (filteredFields.length === 0) return null;
                          return (
                            <div key={formName} className="p-3">
                              <h4 className="font-semibold text-sm mb-1.5 text-primary">{formName}</h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.5">
                                {filteredFields.map((field: any) => (
                                  <div key={field.id} className="flex items-center space-x-2 py-0.5">
                                    <Checkbox
                                      id={`column-${field.id}`}
                                      checked={selectedColumns.includes(field.id)}
                                      onCheckedChange={() => handleColumnToggle(field.id)}
                                      aria-labelledby={`label-column-${field.id}`}
                                    />
                                    <Label htmlFor={`column-${field.id}`} id={`label-column-${field.id}`} className="text-xs font-normal cursor-pointer hover:text-primary flex-grow min-w-0">
                                      <span className="truncate" title={field.field_label}>{field.field_label}</span>
                                      <span className="text-slate-400 ml-1">({field.field_type})</span>
                                       {field.description && <p className="text-xs text-slate-500 mt-0.5 truncate" title={field.description}>{field.description}</p>}
                                    </Label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                        {Object.keys(fieldsByForm).length === 0 && !isFieldsLoading && (
                            <div className="text-center py-10 text-muted-foreground">No fields found matching your search.</div>
                        )}
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Filters Tab */}
                <TabsContent value="filters" className="mt-0">
                  <div className="flex justify-between items-center mb-3">
                    <h2 className="text-xl font-semibold">Filter Criteria</h2>
                    <Button onClick={addFilterRule} size="sm" variant="outline"><Plus className="mr-1.5 h-4 w-4" />Add Filter</Button>
                  </div>
                  {filterRules.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-8">No filters applied. Click "Add Filter" to get started.</p>
                  ) : (
                    <div className="space-y-3">
                      {filterRules.map((rule) => (
                        <div key={rule.id} className="border rounded-md p-3 bg-slate-50">
                          <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
                            <div className="space-y-1">
                                <Label htmlFor={`filter-field-${rule.id}`} className="text-xs">Field</Label>
                                <Select value={rule.field} onValueChange={(value) => updateFilterRule(rule.id, "field", value)}>
                                <SelectTrigger id={`filter-field-${rule.id}`} className="h-9 text-xs"><SelectValue placeholder="Select field" /></SelectTrigger>
                                <SelectContent>{formFields.filter(f => f.id !== 'record_source').map(f => <SelectItem key={f.id} value={f.id} className="text-xs">{f.field_label}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                               <Label htmlFor={`filter-operator-${rule.id}`} className="text-xs">Operator</Label>
                                <Select value={rule.operator} onValueChange={(value) => updateFilterRule(rule.id, "operator", value)}>
                                <SelectTrigger id={`filter-operator-${rule.id}`} className="h-9 text-xs"><SelectValue placeholder="Operator" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="equals" className="text-xs">Equals</SelectItem>
                                  <SelectItem value="not_equals" className="text-xs">Not Equals</SelectItem>
                                  <SelectItem value="contains" className="text-xs">Contains</SelectItem>
                                  <SelectItem value="greater_than" className="text-xs">Greater Than</SelectItem>
                                  <SelectItem value="less_than" className="text-xs">Less Than</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                           <div className="space-y-1">
                                <Label htmlFor={`filter-value-${rule.id}`} className="text-xs">Value</Label>
                                <Input id={`filter-value-${rule.id}`} className="h-9 text-xs" value={rule.value} onChange={(e) => updateFilterRule(rule.id, "value", e.target.value)} placeholder="Enter value" />
                           </div>
                            <Button variant="ghost" size="icon" className="h-9 w-9 mt-auto" onClick={() => removeFilterRule(rule.id)}><Trash className="h-4 w-4 text-destructive" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Sorting Tab */}
                <TabsContent value="sorting" className="mt-0">
                   <div className="flex justify-between items-center mb-3">
                    <h2 className="text-xl font-semibold">Sort Options</h2>
                    <Button onClick={addSortRule} size="sm" variant="outline"><Plus className="mr-1.5 h-4 w-4" />Add Sort Rule</Button>
                  </div>
                   {sortRules.length === 0 ? (
                     <p className="text-muted-foreground text-sm text-center py-8">No sort rules applied. Click "Add Sort Rule" to define sorting.</p>
                   ) : (
                    <div className="space-y-3">
                      {sortRules.map((rule, index) => (
                        <div key={rule.id} className="border rounded-md p-3 bg-slate-50">
                          <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto_auto] gap-2 items-end">
                           <div className="space-y-1">
                                <Label htmlFor={`sort-field-${rule.id}`} className="text-xs">Field</Label>
                                <Select value={rule.field} onValueChange={(value) => updateSortRule(rule.id, "field", value)}>
                                <SelectTrigger id={`sort-field-${rule.id}`} className="h-9 text-xs"><SelectValue placeholder="Select field" /></SelectTrigger>
                                <SelectContent>{formFields.filter(f => f.id !== 'record_source').map(f => <SelectItem key={f.id} value={f.id} className="text-xs">{f.field_label}</SelectItem>)}</SelectContent>
                              </Select>
                           </div>
                            <div className="space-y-1">
                                <Label htmlFor={`sort-direction-${rule.id}`} className="text-xs">Direction</Label>
                                <Select value={rule.direction} onValueChange={(value) => updateSortRule(rule.id, "direction", value)}>
                                <SelectTrigger id={`sort-direction-${rule.id}`} className="h-9 text-xs"><SelectValue placeholder="Direction" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="asc" className="text-xs">Ascending</SelectItem>
                                  <SelectItem value="desc" className="text-xs">Descending</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex space-x-1 items-center self-end">
                              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => moveSortRule(rule.id, "up")} disabled={index === 0}><ArrowUp className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => moveSortRule(rule.id, "down")} disabled={index === sortRules.length - 1}><ArrowDown className="h-4 w-4" /></Button>
                            </div>
                            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => removeSortRule(rule.id)}><Trash className="h-4 w-4 text-destructive" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                   )}
                </TabsContent>

                {/* Preview Tab */}
                <TabsContent value="preview" className="mt-0">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-xl font-semibold">🔍 Live Data Preview</h2>
                      <Button onClick={generatePreview} disabled={isLoading || selectedColumns.length === 0} variant="outline" size="sm">
                        {isLoading ? (
                            <><div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary mr-1.5"></div>Refreshing...</>
                        ) : (<>🔄 Refresh Preview</>)}
                      </Button>
                    </div>
                    {selectedColumns.length === 0 ? (
                      <div className="text-center py-10 text-muted-foreground text-sm">
                        <p>No columns selected. Please go to the "Columns" tab to select fields for your report.</p>
                      </div>
                    ) : isLoading && previewData.length === 0 ? (
                         <div className="text-center py-10 text-muted-foreground text-sm">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                            Generating preview...
                        </div>
                    ): previewData.length === 0 && !isLoading ? (
                        <div className="text-center py-10 text-muted-foreground text-sm">
                            <p>No data found for the current configuration.</p>
                            <p className="text-xs mt-1">Try adjusting your data sources, columns, or filters.</p>
                        </div>
                    ) : (
                      <div className="border rounded-md overflow-x-auto max-h-[600px]">
                        <Table className="min-w-full">
                          <TableHeader className="sticky top-0 bg-slate-50 z-10">
                            <TableRow>
                              {selectedColumns.map(colId => {
                                const field = formFields.find(f => f.id === colId);
                                return <TableHead key={colId} className="text-xs whitespace-nowrap px-2 py-1.5">{field?.field_label || colId}</TableHead>;
                              })}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {previewData.map((row, rowIndex) => (
                              <TableRow key={rowIndex} className="text-xs">
                                {selectedColumns.map(colId => {
                                  const field = formFields.find(f => f.id === colId);
                                  let value = row[colId]; // Default for custom/dynamic fields
                                  // Handle direct table fields (e.g. assets.name)
                                  if (field && field.id.includes('.')) { 
                                      const parts = field.id.split('.');
                                      value = row[parts[0]]?.[parts[1]];
                                  } else if (field && row.hasOwnProperty(field.id)) { // Check if property exists directly
                                       value = row[field.id];
                                  } else if (row.submission_data && row.submission_data[colId]) { // For form_submission data
                                      value = row.submission_data[colId];
                                  }


                                  let displayValue = value;
                                  if (typeof value === 'boolean') {
                                    displayValue = value ? 'Yes' : 'No';
                                  } else if (field?.field_type === 'date' && value) {
                                    displayValue = new Date(value).toLocaleDateString();
                                  } else if (value === null || value === undefined || value === '') {
                                    displayValue = '—';
                                  }
                                  
                                  return (
                                    <TableCell key={colId} className="whitespace-nowrap px-2 py-1">
                                      <span className="truncate block max-w-[150px]" title={String(displayValue)}>{String(displayValue)}</span>
                                    </TableCell>
                                  );
                                })}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Right Pane: Smart Insights & Quick Actions */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-6">
          <Card className="border-primary/20 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2.5">
                <h2 className="text-base font-semibold flex items-center">
                  <span className="text-xl mr-1.5">🎯</span>
                  Smart Report Insights
                </h2>
                <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">Live</Badge>
              </div>
              <div className="space-y-3">
                <div className="p-3 bg-slate-50 rounded-md border">
                  <h3 className="font-medium text-xs text-slate-600 mb-1">📊 Overview</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="font-semibold text-slate-800">{selectedDataSources.length}</span> Sources</div>
                    <div><span className="font-semibold text-slate-800">{selectedColumns.length}</span> Columns</div>
                    <div><span className="font-semibold text-slate-800">{formFields.length}</span> Available</div>
                    <div><span className="font-semibold text-slate-800">{previewData.length}</span> Preview Rows</div>
                  </div>
                </div>
                 {/* Smart suggestions based on current state */}
                 { selectedDataSources.length > 0 && selectedColumns.length === 0 && formFields.length > 0 && (
                    <div className="p-2.5 bg-blue-50 rounded-md border border-blue-200 text-xs text-blue-700">
                        💡 <strong>{formFields.length} fields discovered!</strong> Go to the "Columns" tab to select which data to include in your report.
                    </div>
                 )}
                 { selectedColumns.length > 0 && selectedColumns.length < 3 && formFields.length > selectedColumns.length && (
                    <div className="p-2.5 bg-green-50 rounded-md border border-green-200 text-xs text-green-700">
                        ✨ Consider adding more columns for a richer report. <strong>{formFields.length - selectedColumns.length}</strong> more fields available.
                    </div>
                 )}
                 { selectedDataSources.length === 0 && (
                     <div className="p-2.5 bg-yellow-50 rounded-md border border-yellow-200 text-xs text-yellow-700">
                        🚀 Start by selecting data sources in the "Sources" tab, then choose columns to include.
                    </div>
                 )}
                 { selectedColumns.length > 0 && previewData.length === 0 && !isLoading && (
                     <div className="p-2.5 bg-orange-50 rounded-md border border-orange-200 text-xs text-orange-700">
                        ⚠️ No data found with current filters. Try adjusting your configuration or removing filters.
                    </div>
                 )}
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-md">
            <CardContent className="p-4">
              <h3 className="font-semibold text-base mb-2.5 flex items-center"><span className="text-xl mr-1.5">⚡</span>Quick Actions</h3>
              <div className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start" onClick={exportCsv} disabled={isLoading || selectedColumns.length === 0}>
                    <Download className="mr-2 h-3.5 w-3.5" />Export as CSV
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start" onClick={generatePreview} disabled={isLoading || selectedColumns.length === 0}>
                    <Save className="mr-2 h-3.5 w-3.5" />Refresh Preview
                </Button>
                 <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => setActiveTab("columns")}>
                    <TableIcon className="mr-2 h-3.5 w-3.5" />Manage Columns
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ReportBuilder;