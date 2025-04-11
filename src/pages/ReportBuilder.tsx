
import { useState } from "react";
import { Link } from "react-router-dom";
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
  SortAsc
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

// Mock data
const assetTypes = [
  { id: "1", name: "General" },
  { id: "2", name: "Equipment" },
  { id: "3", name: "Furniture" },
  { id: "4", name: "Machinery" },
  { id: "5", name: "IT Assets" },
  { id: "6", name: "Vehicles" }
];

const formFields = [
  { id: "field1", name: "Item Name", type: "text" },
  { id: "field2", name: "SKU/Item Code", type: "text" },
  { id: "field3", name: "Category", type: "select" },
  { id: "field4", name: "Quantity", type: "number" },
  { id: "field5", name: "Unit Price", type: "number" },
  { id: "field6", name: "Total Value", type: "formula" },
  { id: "field7", name: "Location", type: "text" },
  { id: "field8", name: "Purchase Date", type: "date" },
  { id: "field9", name: "Last Inspection", type: "date" },
  { id: "field10", name: "Status", type: "select" }
];

// Example inventory data for preview
const inventoryData = [
  { id: 1, name: "Laptop", sku: "TECH-001", category: "Electronics", quantity: 12, price: 1200, total: 14400, location: "Main Office", purchaseDate: "2023-05-10", status: "In Stock" },
  { id: 2, name: "Office Chair", sku: "FURN-022", category: "Furniture", quantity: 5, price: 120, total: 600, location: "Warehouse", purchaseDate: "2023-03-15", status: "Low Stock" },
  { id: 3, name: "Desk Lamp", sku: "FURN-015", category: "Furniture", quantity: 20, price: 30, total: 600, location: "Storage", purchaseDate: "2023-04-22", status: "In Stock" },
  { id: 4, name: "Monitor", sku: "TECH-005", category: "Electronics", quantity: 8, price: 250, total: 2000, location: "Main Office", purchaseDate: "2023-06-05", status: "In Stock" },
  { id: 5, name: "Keyboard", sku: "TECH-008", category: "Electronics", quantity: 4, price: 50, total: 200, location: "Storage", purchaseDate: "2023-01-30", status: "Low Stock" }
];

const ReportBuilder = () => {
  const { toast } = useToast();
  
  const [reportName, setReportName] = useState("New Inventory Report");
  const [description, setDescription] = useState("");
  const [selectedColumns, setSelectedColumns] = useState([
    "name", "sku", "category", "quantity", "price", "total"
  ]);
  const [selectedAssetTypes, setSelectedAssetTypes] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("columns");
  const [filterRules, setFilterRules] = useState<any[]>([]);
  const [sortRules, setSortRules] = useState<any[]>([]);
  
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
  
  const saveReport = () => {
    // In a real app, this would save the report configuration to the backend
    toast({
      title: "Report Saved",
      description: "Your report has been saved successfully."
    });
  };
  
  const exportCsv = () => {
    // In a real app, this would fetch data based on the report configuration
    // and generate a CSV file for download
    
    // For this example, we'll use the mock data and selected columns
    const headers = formFields
      .filter(field => selectedColumns.includes(field.id))
      .map(field => field.name);
    
    const dataRows = inventoryData.map(item => {
      const row: any = {};
      if (selectedColumns.includes("name")) row.name = item.name;
      if (selectedColumns.includes("sku")) row.sku = item.sku;
      if (selectedColumns.includes("category")) row.category = item.category;
      if (selectedColumns.includes("quantity")) row.quantity = item.quantity;
      if (selectedColumns.includes("price")) row.price = item.price;
      if (selectedColumns.includes("total")) row.total = item.total;
      if (selectedColumns.includes("location")) row.location = item.location;
      if (selectedColumns.includes("purchaseDate")) row.purchaseDate = item.purchaseDate;
      if (selectedColumns.includes("status")) row.status = item.status;
      return Object.values(row).join(",");
    });
    
    const csvContent = [
      headers.join(","),
      ...dataRows
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
      title: "CSV Exported",
      description: "Your report has been exported to CSV successfully."
    });
  };
  
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
          <Button onClick={saveReport}>
            <Save className="mr-2 h-4 w-4" />
            Save Report
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
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
                  <div className="border rounded-md p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {formFields.map((field) => (
                        <div key={field.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`column-${field.id}`}
                            checked={selectedColumns.includes(field.id)}
                            onCheckedChange={() => handleColumnToggle(field.id)}
                          />
                          <Label htmlFor={`column-${field.id}`}>
                            {field.name}
                            <span className="text-xs text-muted-foreground ml-1">
                              ({field.type})
                            </span>
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="filters">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Filter Rules</h2>
                    <Button size="sm" onClick={addFilterRule}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Filter
                    </Button>
                  </div>
                  
                  {filterRules.length === 0 ? (
                    <div className="text-center py-8 border rounded-md">
                      <Filter className="w-12 h-12 mx-auto text-muted-foreground opacity-50 mb-2" />
                      <p className="text-muted-foreground">No filters have been added yet.</p>
                      <p className="text-sm text-muted-foreground">
                        Click "Add Filter" to start filtering your report data.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filterRules.map((rule) => (
                        <div key={rule.id} className="border rounded-md p-4">
                          <div className="flex justify-between items-start mb-4">
                            <h3 className="font-medium">Filter Rule</h3>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="text-destructive h-7 w-7"
                              onClick={() => removeFilterRule(rule.id)}
                            >
                              <Trash2 className="h-4 w-4" />
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
                                  {formFields.map((field) => (
                                    <SelectItem key={field.id} value={field.id}>
                                      {field.name}
                                    </SelectItem>
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
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="equals">Equals</SelectItem>
                                  <SelectItem value="not_equals">Not equals</SelectItem>
                                  <SelectItem value="greater_than">Greater than</SelectItem>
                                  <SelectItem value="less_than">Less than</SelectItem>
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
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="sorting">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Sort Rules</h2>
                    <Button size="sm" onClick={addSortRule}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Sort Rule
                    </Button>
                  </div>
                  
                  {sortRules.length === 0 ? (
                    <div className="text-center py-8 border rounded-md">
                      <SortAsc className="w-12 h-12 mx-auto text-muted-foreground opacity-50 mb-2" />
                      <p className="text-muted-foreground">No sorting rules have been added yet.</p>
                      <p className="text-sm text-muted-foreground">
                        Click "Add Sort Rule" to define how your report data should be sorted.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {sortRules.map((rule, index) => (
                        <div key={rule.id} className="border rounded-md p-4">
                          <div className="flex justify-between items-start mb-4">
                            <h3 className="font-medium">Sort Rule {index + 1}</h3>
                            <div className="flex space-x-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => moveSortRule(rule.id, "up")}
                                disabled={index === 0}
                              >
                                <MoveVertical className="h-4 w-4 rotate-180" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => moveSortRule(rule.id, "down")}
                                disabled={index === sortRules.length - 1}
                              >
                                <MoveVertical className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="text-destructive h-7 w-7"
                                onClick={() => removeSortRule(rule.id)}
                              >
                                <Trash2 className="h-4 w-4" />
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
                                  <SelectValue />
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
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="preview">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Report Preview</h2>
                    <Button variant="outline" size="sm" onClick={exportCsv}>
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Export CSV
                    </Button>
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
                          {inventoryData.map((item) => (
                            <TableRow key={item.id}>
                              {selectedColumns.includes("name") && <TableCell>{item.name}</TableCell>}
                              {selectedColumns.includes("sku") && <TableCell>{item.sku}</TableCell>}
                              {selectedColumns.includes("category") && <TableCell>{item.category}</TableCell>}
                              {selectedColumns.includes("quantity") && <TableCell>{item.quantity}</TableCell>}
                              {selectedColumns.includes("price") && <TableCell>${item.price}</TableCell>}
                              {selectedColumns.includes("total") && <TableCell>${item.total}</TableCell>}
                              {selectedColumns.includes("location") && <TableCell>{item.location}</TableCell>}
                              {selectedColumns.includes("purchaseDate") && <TableCell>{item.purchaseDate}</TableCell>}
                              {selectedColumns.includes("status") && <TableCell>{item.status}</TableCell>}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    
                    {inventoryData.length === 0 && (
                      <div className="text-center py-8">
                        <TableIcon className="w-12 h-12 mx-auto text-muted-foreground opacity-50 mb-2" />
                        <p className="text-muted-foreground">No data available for preview.</p>
                      </div>
                    )}
                  </div>
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
                
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <TableIcon className="mr-2 h-4 w-4" />
                      Configure CSV Format
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>CSV Export Settings</DialogTitle>
                      <DialogDescription>
                        Configure how your data will be exported to CSV format
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="csv-delimiter">Column Delimiter</Label>
                        <Select defaultValue=",">
                          <SelectTrigger id="csv-delimiter">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value=",">Comma (,)</SelectItem>
                            <SelectItem value=";">Semicolon (;)</SelectItem>
                            <SelectItem value="\t">Tab</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
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
                  <span className="font-medium">{inventoryData.length}</span>
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
