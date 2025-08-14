import { useState, useEffect, useMemo, useCallback } from "react";
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
  Filter,
  SortAsc,
  Loader2,
  Sparkles,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Info,
  Lightbulb,
  BarChart3,
  Eye,
  ChevronRight,
  Users,
  Calendar,
  MapPin,
  DollarSign
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { 
  getDataCategories, 
  getQuickReports, 
  getAvailableSources, 
  getSourcesByCategory,
  getFieldsForSources,
  getFieldsByCategory,
  getSmartSuggestions,
  validateReportConfig,
  getCategoryLabel,
  DataCategory,
  QuickReport,
  DataSource,
  ReportField
} from '@/services/reportingSchemaService';
import { ReportConfig, createReport, updateReport, getReport, executeSchemaReport, Report } from "@/services/reportService";
import * as XLSX from 'xlsx';

// Step-based wizard component
const ReportWizardStep = ({ 
  stepNumber, 
  title, 
  description, 
  isActive, 
  isCompleted, 
  onClick, 
  children 
}: {
  stepNumber: number;
  title: string;
  description: string;
  isActive: boolean;
  isCompleted: boolean;
  onClick: () => void;
  children?: React.ReactNode;
}) => (
  <div className={`border rounded-lg p-4 transition-all cursor-pointer ${
    isActive ? 'border-blue-500 bg-blue-50' : isCompleted ? 'border-green-500 bg-green-50' : 'border-gray-200'
  }`} onClick={onClick}>
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center space-x-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
          isCompleted ? 'bg-green-500 text-white' : isActive ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
        }`}>
          {isCompleted ? <CheckCircle className="w-4 h-4" /> : stepNumber}
        </div>
        <div>
          <h3 className="font-medium">{title}</h3>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </div>
      {isActive && <ChevronRight className="w-5 h-5 text-blue-500" />}
    </div>
    {isActive && children && (
      <div className="mt-4 border-t pt-4">
        {children}
      </div>
    )}
  </div>
);

// Quick Report Template Card
const QuickReportCard = ({ 
  report, 
  onSelect 
}: { 
  report: QuickReport; 
  onSelect: (report: QuickReport) => void; 
}) => (
  <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onSelect(report)}>
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="text-2xl">{report.icon}</div>
          <div>
            <CardTitle className="text-sm">{report.label}</CardTitle>
            <p className="text-xs text-gray-600 mt-1">{report.description}</p>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-gray-400" />
      </div>
    </CardHeader>
  </Card>
);

// Category Selection Card
const CategoryCard = ({ 
  category, 
  isSelected, 
  onSelect,
  sourceCount 
}: { 
  category: DataCategory; 
  isSelected: boolean; 
  onSelect: (categoryId: string) => void;
  sourceCount: number;
}) => (
  <Card 
    className={`cursor-pointer transition-all ${
      isSelected ? 'border-blue-500 bg-blue-50' : 'hover:shadow-md'
    }`} 
    onClick={() => onSelect(category.id)}
  >
    <CardContent className="p-4">
      <div className="flex items-center space-x-3">
        <div className="text-2xl">{category.icon}</div>
        <div className="flex-1">
          <h3 className="font-medium">{category.label}</h3>
          <p className="text-sm text-gray-600">{category.description}</p>
          <p className="text-xs text-gray-500 mt-1">{sourceCount} data sources</p>
        </div>
        {isSelected && <CheckCircle className="w-5 h-5 text-blue-500" />}
      </div>
    </CardContent>
  </Card>
);

// Data Source Card
const DataSourceCard = ({ 
  source, 
  isSelected, 
  onToggle 
}: { 
  source: DataSource; 
  isSelected: boolean; 
  onToggle: (sourceId: string) => void; 
}) => (
  <Card 
    className={`cursor-pointer transition-all ${
      isSelected ? 'border-blue-500 bg-blue-50' : 'hover:shadow-md'
    }`} 
    onClick={() => onToggle(source.id)}
  >
    <CardContent className="p-4">
      <div className="flex items-center space-x-3">
        <div className="text-xl">{source.icon}</div>
        <div className="flex-1">
          <h4 className="font-medium text-sm">{source.businessLabel}</h4>
          <p className="text-xs text-gray-600">{source.description}</p>
        </div>
        <Checkbox checked={isSelected} readOnly />
      </div>
    </CardContent>
  </Card>
);

// Field Selection Component with Categories
const FieldSelector = ({ 
  sources, 
  selectedFields, 
  onFieldToggle,
  businessMode = true
}: {
  sources: string[];
  selectedFields: string[];
  onFieldToggle: (fieldId: string) => void;
  businessMode?: boolean;
}) => {
  const [categorizedFields, setCategorizedFields] = useState<Record<string, ReportField[]>>({});
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['basic']));
  
  useEffect(() => {
    if (sources.length > 0) {
      const fields = getFieldsByCategory(sources, businessMode);
      setCategorizedFields(fields);
    }
  }, [sources, businessMode]);
  
  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };
  
  return (
    <div className="space-y-4">
      {Object.entries(categorizedFields).map(([categoryId, fields]) => (
        <Card key={categoryId}>
          <CardHeader 
            className="pb-3 cursor-pointer" 
            onClick={() => toggleCategory(categoryId)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <h4 className="font-medium text-sm">{getCategoryLabel(categoryId, sources[0])}</h4>
                <Badge variant="secondary" className="text-xs">{fields.length}</Badge>
              </div>
              <ChevronRight className={`w-4 h-4 transition-transform ${
                expandedCategories.has(categoryId) ? 'rotate-90' : ''
              }`} />
            </div>
          </CardHeader>
          {expandedCategories.has(categoryId) && (
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 gap-2">
                {fields.map(field => (
                  <div 
                    key={field.id}
                    className="flex items-center space-x-3 p-2 rounded hover:bg-gray-50 cursor-pointer"
                    onClick={() => onFieldToggle(field.id)}
                  >
                    <Checkbox 
                      checked={selectedFields.includes(field.id)} 
                      readOnly 
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">{field.label}</span>
                        {field.aggregatable && <Badge variant="outline" className="text-xs">Sum</Badge>}
                        {field.type === 'currency' && <DollarSign className="w-3 h-3 text-green-500" />}
                        {field.type === 'date' && <Calendar className="w-3 h-3 text-blue-500" />}
                      </div>
                      {field.description && (
                        <p className="text-xs text-gray-500">{field.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
};

// Smart Suggestions Panel
const SmartSuggestions = ({
  selectedSources,
  selectedFields,
  onApplySuggestion
}: {
  selectedSources: string[];
  selectedFields: string[];
  onApplySuggestion: (type: 'field' | 'join', value: string) => void;
}) => {
  const suggestions = getSmartSuggestions(selectedSources, selectedFields);
  
  if (suggestions.suggestedFields.length === 0 && suggestions.suggestedJoins.length === 0 && suggestions.warnings.length === 0) {
    return null;
  }
  
  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader className="pb-3">
        <div className="flex items-center space-x-2">
          <Lightbulb className="w-4 h-4 text-orange-500" />
          <h4 className="font-medium text-sm">Smart Suggestions</h4>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {suggestions.suggestedFields.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-700 mb-2">Recommended Fields</p>
            <div className="space-y-1">
              {suggestions.suggestedFields.slice(0, 3).map(field => (
                <Button
                  key={field.id}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs h-8"
                  onClick={() => onApplySuggestion('field', field.id)}
                >
                  <Plus className="w-3 h-3 mr-2" />
                  {field.label}
                </Button>
              ))}
            </div>
          </div>
        )}
        
        {suggestions.suggestedJoins.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-700 mb-2">Related Data</p>
            <div className="space-y-1">
              {suggestions.suggestedJoins.map(joinSource => (
                <Button
                  key={joinSource}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs h-8"
                  onClick={() => onApplySuggestion('join', joinSource)}
                >
                  <Plus className="w-3 h-3 mr-2" />
                  Include {joinSource.replace('_', ' ')}
                </Button>
              ))}
            </div>
          </div>
        )}
        
        {suggestions.warnings.length > 0 && (
          <div>
            <p className="text-xs font-medium text-amber-700 mb-2">Performance Tips</p>
            <div className="space-y-1">
              {suggestions.warnings.map((warning, index) => (
                <div key={index} className="flex items-start space-x-2 text-xs text-amber-700">
                  <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>{warning}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default function NewReportBuilder() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { id } = useParams();
  
  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const [reportMode, setReportMode] = useState<'quick' | 'custom'>('quick');
  
  // Report configuration
  const [reportName, setReportName] = useState("New Report");
  const [description, setDescription] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [businessMode, setBusinessMode] = useState(true);
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [categories, setCategories] = useState<DataCategory[]>([]);
  const [quickReports, setQuickReports] = useState<QuickReport[]>([]);
  const [allSources, setAllSources] = useState<DataSource[]>([]);
  
  // Load data on mount
  useEffect(() => {
    setCategories(getDataCategories());
    setQuickReports(getQuickReports());
    setAllSources(getAvailableSources());
  }, []);
  
  // Load existing report if editing
  useEffect(() => {
    if (id && id !== 'new') {
      loadExistingReport(id);
    }
  }, [id]);
  
  const loadExistingReport = async (reportId: string) => {
    try {
      const report = await getReport(reportId);
      if (report) {
        setReportName(report.name);
        setDescription(report.description || "");
        setSelectedSources(report.report_config.dataSources || []);
        setSelectedFields(report.report_config.columns || []);
        setCurrentStep(4); // Go to preview step
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load report",
        variant: "destructive"
      });
    }
  };
  
  const handleQuickReportSelect = (report: QuickReport) => {
    setReportName(report.label);
    setDescription(report.description);
    setSelectedSources(report.entities);
    setSelectedFields(report.defaultFields);
    setCurrentStep(4); // Skip to preview
    setReportMode('quick');
  };
  
  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setSelectedSources([]);
    setSelectedFields([]);
    setCurrentStep(2);
    setReportMode('custom');
  };
  
  const handleSourceToggle = (sourceId: string) => {
    const newSources = selectedSources.includes(sourceId)
      ? selectedSources.filter(s => s !== sourceId)
      : [...selectedSources, sourceId];
    setSelectedSources(newSources);
    
    // Reset fields when sources change
    setSelectedFields([]);
  };
  
  const handleFieldToggle = (fieldId: string) => {
    const newFields = selectedFields.includes(fieldId)
      ? selectedFields.filter(f => f !== fieldId)
      : [...selectedFields, fieldId];
    setSelectedFields(newFields);
  };
  
  const handleSuggestionApply = (type: 'field' | 'join', value: string) => {
    if (type === 'field') {
      handleFieldToggle(value);
    } else if (type === 'join') {
      handleSourceToggle(value);
    }
  };
  
  const generatePreview = async () => {
    if (!currentOrganization?.id || selectedSources.length === 0 || selectedFields.length === 0) {
      return;
    }
    
    setIsLoading(true);
    try {
      const config = {
        subject: reportName,
        dataSources: selectedSources,
        columns: selectedFields,
        filters: [],
        sorts: [],
        assetTypes: [],
        limit: 10
      };
      
      const results = await executeSchemaReport(currentOrganization.id, config, 10);
      setPreviewData(results.data);
      
      toast({
        title: "Preview Generated ⚡",
        description: `Found ${results.data.length} record(s)`,
      });
    } catch (error) {
      console.error('Preview error:', error);
      toast({
        title: "Preview Failed",
        description: "Unable to generate preview. Please check your configuration.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const saveReport = async () => {
    if (!currentOrganization?.id) return;
    
    const validation = validateReportConfig({
      dataSources: selectedSources,
      columns: selectedFields
    });
    
    if (!validation.isValid) {
      toast({
        title: "Validation Error",
        description: validation.errors.join(', '),
        variant: "destructive"
      });
      return;
    }
    
    try {
      const reportConfig: ReportConfig = {
        subject: reportName,
        dataSources: selectedSources,
        columns: selectedFields,
        filters: [],
        sorts: [],
        assetTypes: []
      };
      
      if (id && id !== 'new') {
        await updateReport(id, {
          name: reportName,
          description,
          report_config: reportConfig
        });
        toast({ title: "Report Updated", description: "Your report has been saved." });
      } else {
        const newReport = await createReport({
          name: reportName,
          description,
          report_config: reportConfig,
          organization_id: currentOrganization.id
        });
        toast({ title: "Report Created", description: "Your report has been saved." });
        navigate(`/reports/${newReport.id}`);
      }
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Unable to save report",
        variant: "destructive"
      });
    }
  };
  
  const exportExcel = async () => {
    if (previewData.length === 0) return;
    
    const ws = XLSX.utils.json_to_sheet(previewData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report Data");
    XLSX.writeFile(wb, `${reportName}.xlsx`);
    
    toast({
      title: "Export Complete",
      description: "Report downloaded as Excel file"
    });
  };
  
  const isStepCompleted = (step: number): boolean => {
    switch (step) {
      case 1: return reportMode === 'quick' || selectedCategory !== '';
      case 2: return selectedSources.length > 0;
      case 3: return selectedFields.length > 0;
      case 4: return previewData.length > 0;
      default: return false;
    }
  };
  
  const canProceedToStep = (step: number): boolean => {
    switch (step) {
      case 2: return reportMode === 'custom' && selectedCategory !== '';
      case 3: return selectedSources.length > 0;
      case 4: return selectedFields.length > 0;
      default: return true;
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link to="/reports">
              <Button variant="ghost" size="sm">
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back to Reports
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-semibold">Create Report</h1>
              <p className="text-sm text-gray-600">Build reports with ease - no technical knowledge required</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Label htmlFor="business-mode" className="text-xs">Business Mode</Label>
              <Switch
                id="business-mode"
                checked={businessMode}
                onCheckedChange={setBusinessMode}
                className="scale-75"
              />
            </div>
            <Button onClick={saveReport} disabled={!canProceedToStep(4)}>
              <Save className="w-4 h-4 mr-2" />
              Save Report
            </Button>
          </div>
        </div>
      </div>
      
      <div className="flex">
        {/* Sidebar - Progress */}
        <div className="w-80 bg-white border-r p-6 min-h-screen">
          <div className="space-y-4">
            <div>
              <Label htmlFor="report-name" className="text-sm font-medium">Report Name</Label>
              <Input
                id="report-name"
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                className="mt-1"
                placeholder="Enter report name..."
              />
            </div>
            
            <div>
              <Label htmlFor="description" className="text-sm font-medium">Description (Optional)</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1"
                placeholder="What is this report for?"
              />
            </div>
            
            <div className="border-t pt-4">
              <h3 className="font-medium text-sm mb-3">Progress</h3>
              <div className="space-y-2">
                {[
                  { step: 1, title: "Choose Type", desc: "Quick template or custom" },
                  { step: 2, title: "Select Data", desc: "Choose data sources" },
                  { step: 3, title: "Pick Columns", desc: "Select fields to show" },
                  { step: 4, title: "Preview & Save", desc: "Review your report" }
                ].map(({ step, title, desc }) => (
                  <div key={step} className={`flex items-center space-x-3 p-2 rounded transition-colors ${
                    currentStep === step ? 'bg-blue-50' : isStepCompleted(step) ? 'bg-green-50' : 'hover:bg-gray-50'
                  }`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                      isStepCompleted(step) ? 'bg-green-500 text-white' : 
                      currentStep === step ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {isStepCompleted(step) ? <CheckCircle className="w-3 h-3" /> : step}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{title}</div>
                      <div className="text-xs text-gray-600">{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="flex-1 p-6">
          <div className="max-w-4xl mx-auto">
            
            {/* Step 1: Choose Report Type */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">How would you like to start?</h2>
                  <p className="text-gray-600">Choose a quick template or build a custom report from scratch</p>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Quick Reports */}
                  <Card className="p-6">
                    <div className="text-center mb-4">
                      <Sparkles className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                      <h3 className="font-semibold text-lg">Quick Reports</h3>
                      <p className="text-sm text-gray-600">Pre-built reports you can use immediately</p>
                    </div>
                    <div className="space-y-3">
                      {quickReports.slice(0, 4).map(report => (
                        <QuickReportCard 
                          key={report.id} 
                          report={report} 
                          onSelect={handleQuickReportSelect} 
                        />
                      ))}
                    </div>
                  </Card>
                  
                  {/* Custom Reports */}
                  <Card className="p-6">
                    <div className="text-center mb-4">
                      <Settings className="w-12 h-12 text-purple-500 mx-auto mb-3" />
                      <h3 className="font-semibold text-lg">Custom Report</h3>
                      <p className="text-sm text-gray-600">Build exactly what you need, step by step</p>
                    </div>
                    <div className="space-y-3">
                      {categories.map(category => {
                        const sourceCount = getSourcesByCategory(category.id).length;
                        return (
                          <CategoryCard
                            key={category.id}
                            category={category}
                            isSelected={selectedCategory === category.id}
                            onSelect={handleCategorySelect}
                            sourceCount={sourceCount}
                          />
                        );
                      })}
                    </div>
                  </Card>
                </div>
              </div>
            )}
            
            {/* Step 2: Select Data Sources */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Select Your Data Sources</h2>
                  <p className="text-gray-600">Choose which types of information you want to include</p>
                </div>
                
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getSourcesByCategory(selectedCategory).map(source => (
                    <DataSourceCard
                      key={source.id}
                      source={source}
                      isSelected={selectedSources.includes(source.id)}
                      onToggle={handleSourceToggle}
                    />
                  ))}
                </div>
                
                {selectedSources.length > 0 && (
                  <div className="flex justify-end">
                    <Button onClick={() => setCurrentStep(3)}>
                      Continue to Columns
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                )}
              </div>
            )}
            
            {/* Step 3: Select Fields */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Choose Your Columns</h2>
                  <p className="text-gray-600">Select which information you want to see in your report</p>
                </div>
                
                <div className="grid lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <FieldSelector
                      sources={selectedSources}
                      selectedFields={selectedFields}
                      onFieldToggle={handleFieldToggle}
                      businessMode={businessMode}
                    />
                  </div>
                  
                  <div className="space-y-4">
                    <SmartSuggestions
                      selectedSources={selectedSources}
                      selectedFields={selectedFields}
                      onApplySuggestion={handleSuggestionApply}
                    />
                    
                    {selectedFields.length > 0 && (
                      <Card>
                        <CardHeader className="pb-3">
                          <h4 className="font-medium text-sm">Selected Columns</h4>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-1">
                            {selectedFields.map(fieldId => {
                              const [source, column] = fieldId.split('.');
                              return (
                                <div key={fieldId} className="text-xs bg-blue-50 p-2 rounded flex items-center justify-between">
                                  <span>{column.replace('_', ' ')}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleFieldToggle(fieldId)}
                                    className="h-4 w-4 p-0"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
                
                {selectedFields.length > 0 && (
                  <div className="flex justify-end">
                    <Button onClick={() => setCurrentStep(4)}>
                      Preview Report
                      <Eye className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                )}
              </div>
            )}
            
            {/* Step 4: Preview & Save */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Preview Your Report</h2>
                    <p className="text-gray-600">Review your data and make adjustments if needed</p>
                  </div>
                  <div className="flex space-x-3">
                    <Button variant="outline" onClick={generatePreview} disabled={isLoading}>
                      {isLoading ? (
                        <><Loader2 className="animate-spin w-4 h-4 mr-2" />Refreshing...</>
                      ) : (
                        <><Eye className="w-4 h-4 mr-2" />Refresh Preview</>
                      )}
                    </Button>
                    {previewData.length > 0 && (
                      <Button onClick={exportExcel}>
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        Export Excel
                      </Button>
                    )}
                  </div>
                </div>
                
                {/* Auto-generate preview */}
                {selectedFields.length > 0 && previewData.length === 0 && !isLoading && (
                  <div className="text-center py-8">
                    <Button onClick={generatePreview} size="lg">
                      <Sparkles className="w-5 h-5 mr-2" />
                      Generate Preview
                    </Button>
                  </div>
                )}
                
                {isLoading && (
                  <div className="text-center py-10">
                    <Loader2 className="animate-spin w-8 h-8 mx-auto mb-4" />
                    <p className="text-gray-600">Generating your report preview...</p>
                  </div>
                )}
                
                {previewData.length > 0 && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Report Preview</CardTitle>
                        <Badge>{previewData.length} rows</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto max-h-96">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {selectedFields.map(fieldId => {
                                const [, column] = fieldId.split('.');
                                return (
                                  <TableHead key={fieldId} className="text-xs">
                                    {column.replace('_', ' ')}
                                  </TableHead>
                                );
                              })}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {previewData.slice(0, 10).map((row, index) => (
                              <TableRow key={index}>
                                {selectedFields.map(fieldId => (
                                  <TableCell key={fieldId} className="text-xs">
                                    {row[fieldId] || '-'}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
            
          </div>
        </div>
      </div>
    </div>
  );
}
