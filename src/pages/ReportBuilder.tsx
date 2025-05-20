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
import { getAssetTypes } from "@/services/assetTypeService";
import { ReportConfig, createReport, updateReport, getReport, executeReport } from "@/services/reportService";
import { supabase } from "@/integrations/supabase/client";
import { getMappedFieldsForReporting } from '@/services/mappedFieldService';

// Available subjects for reports
const availableSubjects = [
  { id: "inventory_items", name: "Inventory Items" },
  { id: "assets", name: "Assets" },
  { id: "form_submissions", name: "Form Submissions" }
];

const ReportBuilder = () => {
  const { toast } = useToast();
  const { currentOrganization } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  const [reportName, setReportName] = useState("New Report");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("inventory_items");
  const [selectedColumns, setSelectedColumns] = useState([
    "name", "sku", "category", "quantity", "price", "total"
  ]);
  const [selectedAssetTypes, setSelectedAssetTypes] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("columns");
  const [filterRules, setFilterRules] = useState<any[]>([]);
  const [sortRules, setSortRules] = useState<any[]>([]);
  const [assetTypes, setAssetTypes] = useState<any[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [formFields, setFormFields] = useState<any[]>([]);
  const [fieldSearch, setFieldSearch] = useState("");
  
  useEffect(() => {
    const fetchAssetTypes = async () => {
      if (!currentOrganization?.id) return;
      
      try {
        const data = await getAssetTypes(supabase, currentOrganization.id);
        setAssetTypes(data);
      } catch (error) {
        console.error("Failed to fetch asset types:", error);
        toast({
          title: "Error",
          description: "Failed to load asset types. Please try again.",
          variant: "destructive",
        });
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
          setSubject(report.report_config.subject || "inventory_items");
          setSelectedColumns(report.report_config.columns || []);
          setFilterRules(report.report_config.filters || []);
          setSortRules(report.report_config.sorts || []);
          setSelectedAssetTypes(report.report_config.assetTypes || []);
          
          // Generate preview
          const previewResults = await executeReport(report, 10);
          setPreviewData(previewResults);
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
    const fetchFields = async () => {
      if (!currentOrganization?.id) return;
      try {
        const fields = await getMappedFieldsForReporting(currentOrganization.id);
        setFormFields(fields);
      } catch (error) {
        console.error('Failed to fetch mapped fields for reporting:', error);
        toast({
          title: 'Error',
          description: 'Failed to load fields for reporting. Please try again.',
          variant: 'destructive',
        });
      }
    };
    fetchFields();
  }, [currentOrganization?.id, toast]);
  
  const handleColumnToggle = (columnId: string) => {
    if (selectedColumns.includes(columnId)) {
      setSelectedColumns(selectedColumns.filter(id => id !== columnId));
    } else {
      setSelectedColumns([...selectedColumns, columnId]);
    }
  };
  
  const handleAssetTypeToggle = (typeId: string) => {
    if (selectedAssetTypes.includes(typeId)) {
      setSelectedAssetTypes(selectedAssetTypes.filter(id => id !== typeId));
    } else {
      setSelectedAssetTypes([...selectedAssetTypes, typeId]);
    }
  };
  
  const addFilterRule = () => {
    setFilterRules([
      ...filterRules,
      { id: Date.now().toString(), field: "", operator: "equals", value: "" }
    ]);
  };
  
  const updateFilterRule = (id: string, field: string, value: any) => {
    setFilterRules(filterRules.map(rule => 
      rule.id === id ? { ...rule, [field]: value } : rule
    ));
  };
  
  const removeFilterRule = (id: string) => {
    setFilterRules(filterRules.filter(rule => rule.id !== id));
  };
  
  const addSortRule = () => {
    setSortRules([
      ...sortRules,
      { id: Date.now().toString(), field: "", direction: "asc" }
    ]);
  };
  
  const updateSortRule = (id: string, field: string, value: any) => {
    setSortRules(sortRules.map(rule => 
      rule.id === id ? { ...rule, [field]: value } : rule
    ));
  };
  
  const removeSortRule = (id: string) => {
    setSortRules(sortRules.filter(rule => rule.id !== id));
  };
  
  const moveSortRule = (id: string, direction: "up" | "down") => {
    const index = sortRules.findIndex(rule => rule.id === id);
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === sortRules.length - 1)
    ) {
      return;
    }
    
    const newSortRules = [...sortRules];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    const rule = newSortRules[index];
    
    newSortRules.splice(index, 1);
    newSortRules.splice(newIndex, 0, rule);
    
    setSortRules(newSortRules);
  };
  
  const saveReport = async () => {
    if (!currentOrganization?.id) {
      toast({
        title: "Error",
        description: "Organization ID is required",
        variant: "destructive",
      });
      return;
    }
    
    // Prepare report config
    const reportConfig: ReportConfig = {
      subject,
      columns: selectedColumns,
      filters: filterRules.map(({ id, ...rest }) => rest),
      sorts: sortRules.map(({ id, ...rest }) => rest),
      assetTypes: selectedAssetTypes
    };
    
    setIsLoading(true);
    try {
      if (id) {
        // Update existing report
        await updateReport(id, {
          name: reportName,
          description,
          report_config: reportConfig
        });
        toast({
          title: "Report Updated",
          description: "Your report has been updated successfully."
        });
      } else {
        // Create new report
        await createReport({
          name: reportName,
          description,
          report_config: reportConfig,
          organization_id: currentOrganization.id
        });
        toast({
          title: "Report Created",
          description: "Your report has been created successfully."
        });
      }
      navigate('/reports');
    } catch (error) {
      console.error("Failed to save report:", error);
      toast({
        title: "Error",
        description: "Failed to save report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const generatePreview = async () => {
    if (!currentOrganization?.id) return;
    
    // Prepare temporary report for preview
    const tempReport = {
      id: id || 'preview',
      name: reportName,
      description,
      report_config: {
        subject,
        columns: selectedColumns,
        filters: filterRules.map(({ id, ...rest }) => rest),
        sorts: sortRules.map(({ id, ...rest }) => rest),
        assetTypes: selectedAssetTypes
      },
      organization_id: currentOrganization.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    setIsLoading(true);
    try {
      const results = await executeReport(tempReport, 10);
      setPreviewData(results);
    } catch (error) {
      console.error("Failed to generate preview:", error);
      toast({
        title: "Error",
        description: "Failed to generate preview. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const exportCsv = async () => {
    if (!currentOrganization?.id) return;
    
    // Prepare temporary report for export
    const tempReport = {
      id: id || 'export',
      name: reportName,
      description,
      report_config: {
        subject,
        columns: selectedColumns,
        filters: filterRules.map(({ id, ...rest }) => rest),
        sorts: sortRules.map(({ id, ...rest }) => rest),
        assetTypes: selectedAssetTypes
      },
      organization_id: currentOrganization.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    toast({
      title: "Preparing Export",
      description: "Please wait while we export your report..."
    });
    
    try {
      const results = await executeReport(tempReport);
      
      // Extract headers based on report configuration
      const headers = selectedColumns.map(col => {
        const field = formFields.find(f => f.id === col);
        return field ? field.field_label : col;
      });
      
      // Convert results to CSV data
      const data = results.map(item => {
        return selectedColumns.map(col => {
          // Handle nested data with dot notation
          if (col.includes('.')) {
            const [parent, child] = col.split('.');
            return item[parent]?.[child] || '';
          }
          return item[col] || '';
        });
      });
      
      const csvContent = [
        headers.join(","),
        ...data.map(row => row.join(","))
      ].join("\n");
      
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `${reportName.replace(/\s+/g, "_")}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Export Complete",
        description: "Your report has been exported successfully."
      });
    } catch (error) {
      console.error("Error generating CSV:", error);
      toast({
        title: "Error",
        description: "Failed to export report. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Group fields by form
  const fieldsByForm = formFields.reduce((acc, field) => {
    const form = field.form_name || "Other";
    if (!acc[form]) acc[form] = [];
    acc[form].push(field);
    return acc;
  }, {} as Record<string, any[]>);
  
  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
        <div className="flex items-center">
          <Button variant="ghost" asChild className="mr-2">
            <Link to="/reports">
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <Input 
              value={reportName} 
              onChange={(e) => setReportName(e.target.value)} 
              className="text-2xl font-bold h-auto py-1 px-2" 
            />
            <Input 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder="Report description (optional)"
              className="text-sm text-muted-foreground h-auto py-1 px-2 mt-1 bg-transparent border-0"
            />
          </div>
        </div>
        <div className="flex space-x-2 mt-4 sm:mt-0">
          <Button variant="outline" onClick={exportCsv}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={saveReport} disabled={isLoading}>
            <Save className="mr-2 h-4 w-4" />
            Save Report
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="mb-4">
                <Label htmlFor="subject-selector" className="text-lg font-semibold mb-2 block">
                  Report Subject
                </Label>
                <Select 
                  value={subject} 
                  onValueChange={setSubject}
                >
                  <SelectTrigger id="subject-selector" className="w-full">
                    <SelectValue placeholder="Select a report subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSubjects.map((subj) => (
                      <SelectItem key={subj.id} value={subj.id}>
                        {subj.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground mt-1">
                  Select the primary data source for your report
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <Tabs defaultValue="columns" value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="columns">Columns</TabsTrigger>
                  <TabsTrigger value="filters">Filters</TabsTrigger>
                  <TabsTrigger value="sorting">Sorting</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>
                
                <TabsContent value="columns">
                  <h2 className="text-xl font-semibold mb-4">Select Columns to Include</h2>
                  <Input
                    placeholder="Search fields..."
                    value={fieldSearch}
                    onChange={e => setFieldSearch(e.target.value)}
                    className="mb-2"
                  />
                  <div className="border rounded-md p-4 max-h-96 overflow-y-auto">
                    {Object.entries(fieldsByForm).map(([form, fields]) => {
                      const filtered = fields.filter(f =>
                        f.field_label.toLowerCase().includes(fieldSearch.toLowerCase())
                      );
                      if (filtered.length === 0) return null;
                      return (
                        <div key={form} className="mb-4">
                          <div className="font-semibold text-sm mb-2 text-blue-700">{form}</div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {filtered.map(field => (
                              <div key={field.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`column-${field.id}`}
                                  checked={selectedColumns.includes(field.id)}
                                  onCheckedChange={() => handleColumnToggle(field.id)}
                                />
                                <Label htmlFor={`column-${field.id}`}>{field.field_label}
                                  <span className="text-xs text-muted-foreground ml-1">({field.field_type})</span>
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>
                
                <TabsContent value="filters">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Filter Criteria</h2>
                    <Button onClick={addFilterRule} size="sm" variant="outline">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Filter
                    </Button>
                  </div>
                  
                  <Input
                    placeholder="Search fields..."
                    value={fieldSearch}
                    onChange={e => setFieldSearch(e.target.value)}
                    className="mb-2"
                  />
                  
                  <div className="space-y-4">
                    {filterRules.map((rule) => (
                      <div key={rule.id} className="border rounded-md p-4">
                        <div className="flex justify-between items-center mb-3">
                          <h3 className="font-medium">Filter Condition</h3>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => removeFilterRule(rule.id)}
                          >
                            <Trash className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`filter-field-${rule.id}`}>Field</Label>
                            <Select
                              value={rule.field}
                              onValueChange={(value) => updateFilterRule(rule.id, "field", value)}
                            >
                              <SelectTrigger id={`filter-field-${rule.id}`}>
                                <SelectValue placeholder="Select a field" />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(fieldsByForm).map(([form, fields]) => (
                                  <>
                                    <div className="px-2 py-1 text-xs text-blue-700 font-semibold">{form}</div>
                                    {fields.filter(f => f.field_label.toLowerCase().includes(fieldSearch.toLowerCase())).map(field => (
                                      <SelectItem key={field.id} value={field.id}>
                                        {field.field_label}
                                      </SelectItem>
                                    ))}
                                  </>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor={`filter-operator-${rule.id}`}>Operator</Label>
                            <Select
                              value={rule.operator}
                              onValueChange={(value) => updateFilterRule(rule.id, "operator", value)}
                            >
                              <SelectTrigger id={`filter-operator-${rule.id}`}>
                                <SelectValue placeholder="Select an operator" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="equals">Equals</SelectItem>
                                <SelectItem value="not_equals">Not Equals</SelectItem>
                                <SelectItem value="greater_than">Greater Than</SelectItem>
                                <SelectItem value="less_than">Less Than</SelectItem>
                                <SelectItem value="contains">Contains</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor={`filter-value-${rule.id}`}>Value</Label>
                            <Input
                              id={`filter-value-${rule.id}`}
                              value={rule.value}
                              onChange={(e) => updateFilterRule(rule.id, "value", e.target.value)}
                              placeholder="Enter value"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {filterRules.length === 0 && (
                      <div className="text-center py-6 border rounded-md">
                        <Filter className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">No filters added yet</p>
                        <Button variant="outline" className="mt-2" onClick={addFilterRule}>
                          <Plus className="mr-2 h-4 w-4" />
                          Add Your First Filter
                        </Button>
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="sorting">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Sort Options</h2>
                    <Button onClick={addSortRule} size="sm" variant="outline">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Sort Rule
                    </Button>
                  </div>
                  
                  <div className="space-y-4">
                    {sortRules.map((rule) => (
                      <div key={rule.id} className="border rounded-md p-4">
                        <div className="flex justify-between items-center mb-3">
                          <h3 className="font-medium">Sort Condition</h3>
                          <div className="flex space-x-1">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => moveSortRule(rule.id, "up")}
                              title="Move Up"
                            >
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => moveSortRule(rule.id, "down")}
                              title="Move Down"
                            >
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => removeSortRule(rule.id)}
                              title="Remove"
                            >
                              <Trash className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`sort-field-${rule.id}`}>Field</Label>
                            <Select
                              value={rule.field}
                              onValueChange={(value) => updateSortRule(rule.id, "field", value)}
                            >
                              <SelectTrigger id={`sort-field-${rule.id}`}>
                                <SelectValue placeholder="Select a field" />
                              </SelectTrigger>
                              <SelectContent>
                                {formFields.map((field) => (
                                  <SelectItem key={field.id} value={field.id}>
                                    {field.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor={`sort-direction-${rule.id}`}>Direction</Label>
                            <Select
                              value={rule.direction}
                              onValueChange={(value) => updateSortRule(rule.id, "direction", value)}
                            >
                              <SelectTrigger id={`sort-direction-${rule.id}`}>
                                <SelectValue placeholder="Select direction" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="asc">Ascending</SelectItem>
                                <SelectItem value="desc">Descending</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {sortRules.length === 0 && (
                      <div className="text-center py-6 border rounded-md">
                        <SortAsc className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">No sort rules added yet</p>
                        <Button variant="outline" className="mt-2" onClick={addSortRule}>
                          <Plus className="mr-2 h-4 w-4" />
                          Add Your First Sort Rule
                        </Button>
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="preview">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Report Preview</h2>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" onClick={generatePreview}>
                        {isLoading ? (
                          <>Loading...</>
                        ) : (
                          <>Refresh Preview</>
                        )}
                      </Button>
                      <Button variant="outline" size="sm" onClick={exportCsv}>
                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                        Export CSV
                      </Button>
                    </div>
                  </div>
                  
                  <div className="border rounded-md overflow-hidden">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {formFields
                              .filter(field => selectedColumns.includes(field.id))
                              .map(field => (
                                <TableHead key={field.id}>{field.name}</TableHead>
                              ))
                            }
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {previewData.length > 0 ? (
                            previewData.map((item, index) => (
                              <TableRow key={index}>
                                {formFields
                                  .filter(field => selectedColumns.includes(field.id))
                                  .map(field => (
                                    <TableCell key={field.id}>
                                      {item[field.id] || "-"}
                                    </TableCell>
                                  ))
                                }
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={selectedColumns.length} className="text-center py-8">
                                {isLoading ? (
                                  <div className="flex flex-col items-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
                                    <p>Loading preview data...</p>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center">
                                    <p className="text-muted-foreground mb-2">No preview data available</p>
                                    <Button variant="outline" size="sm" onClick={generatePreview}>
                                      Generate Preview
                                    </Button>
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                  
                  {previewData.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Showing {previewData.length} of {previewData.length} results.
                      {previewData.length === 10 && " Limited to 10 rows in preview."}
                    </p>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
        
        <div className="space-y-6">
          {/* Report Settings */}
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Report Settings</h2>
                <Settings className="h-5 w-5 text-muted-foreground" />
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="asset-types">Asset Types</Label>
                  <div className="border rounded-md p-4">
                    <div className="space-y-2">
                      {assetTypes.map((type) => (
                        <div key={type.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`asset-type-${type.id}`}
                            checked={selectedAssetTypes.includes(type.id)}
                            onCheckedChange={() => handleAssetTypeToggle(type.id)}
                          />
                          <Label htmlFor={`asset-type-${type.id}`}>{type.name}</Label>
                        </div>
                      ))}
                    </div>
                    
                    {selectedAssetTypes.length === 0 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        No asset types selected. Report will include all types.
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Export options in a dialog */}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Export Options
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Export Options</DialogTitle>
                      <DialogDescription>
                        Configure options for exporting your report data.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="date-format">Date Format</Label>
                        <Select defaultValue="YYYY-MM-DD">
                          <SelectTrigger id="date-format">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                            <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                            <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox id="include-headers" defaultChecked />
                        <Label htmlFor="include-headers">Include column headers</Label>
                      </div>
                    </div>
                    
                    <DialogFooter>
                      <Button onClick={exportCsv}>
                        <Download className="mr-2 h-4 w-4" />
                        Export CSV
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
          
          {/* Report Statistics */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4">Report Summary</h2>
              
              <div className="space-y-1">
                <div className="flex justify-between text-sm py-2 border-b">
                  <span className="text-muted-foreground">Subject:</span>
                  <span className="font-medium">
                    {availableSubjects.find(s => s.id === subject)?.name || "Inventory Items"}
                  </span>
                </div>
                <div className="flex justify-between text-sm py-2 border-b">
                  <span className="text-muted-foreground">Selected Columns:</span>
                  <span className="font-medium">{selectedColumns.length}</span>
                </div>
                <div className="flex justify-between text-sm py-2 border-b">
                  <span className="text-muted-foreground">Filters:</span>
                  <span className="font-medium">{filterRules.length}</span>
                </div>
                <div className="flex justify-between text-sm py-2 border-b">
                  <span className="text-muted-foreground">Sort Rules:</span>
                  <span className="font-medium">{sortRules.length}</span>
                </div>
                <div className="flex justify-between text-sm py-2">
                  <span className="text-muted-foreground">Items in Preview:</span>
                  <span className="font-medium">{previewData.length}</span>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t">
                <Button variant="outline" size="sm" className="w-full" onClick={exportCsv}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Download Report as CSV
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
