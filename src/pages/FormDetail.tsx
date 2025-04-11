
import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { 
  ChevronLeft, 
  Save, 
  Download, 
  Plus, 
  Trash2, 
  MoveVertical,
  FileText 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";

// Mock form templates data
const formTemplates = [
  { 
    id: "1", 
    name: "Basic Inventory Form", 
    fields: [
      { id: "field1", type: "text", label: "Item Name", required: true, placeholder: "Enter item name" },
      { id: "field2", type: "text", label: "SKU/Item Code", required: true, placeholder: "Enter SKU" },
      { id: "field3", type: "select", label: "Category", required: true, options: ["Electronics", "Furniture", "Office Supplies", "Equipment", "Other"] },
      { id: "field4", type: "number", label: "Quantity", required: true, placeholder: "Enter quantity" },
      { id: "field5", type: "number", label: "Unit Price", required: true, placeholder: "Enter price" },
      { id: "field6", type: "text", label: "Location", required: false, placeholder: "Storage location" },
      { id: "field7", type: "textarea", label: "Description", required: false, placeholder: "Enter description" },
      { id: "field8", type: "formula", label: "Total Value", formula: "field4 * field5", readOnly: true }
    ],
    assetTypes: ["General", "Equipment", "Furniture"],
    created: "2023-05-12", 
    lastUsed: "2023-06-01" 
  },
  { 
    id: "2", 
    name: "Equipment Inspection", 
    fields: [
      { id: "field1", type: "text", label: "Equipment Name", required: true },
      { id: "field2", type: "text", label: "Serial Number", required: true },
      { id: "field3", type: "select", label: "Condition", required: true, options: ["Excellent", "Good", "Fair", "Poor"] },
      { id: "field4", type: "checkbox", label: "Operational", required: true },
      { id: "field5", type: "date", label: "Inspection Date", required: true },
      { id: "field6", type: "textarea", label: "Notes", required: false }
    ],
    assetTypes: ["Equipment", "Machinery"],
    created: "2023-04-20", 
    lastUsed: "2023-05-28"
  },
  { 
    id: "3", 
    name: "Asset Transfer Form",
    fields: [
      { id: "field1", type: "text", label: "Asset Name", required: true },
      { id: "field2", type: "text", label: "Asset ID", required: true },
      { id: "field3", type: "text", label: "Current Location", required: true },
      { id: "field4", type: "text", label: "New Location", required: true },
      { id: "field5", type: "text", label: "Transferred By", required: true },
      { id: "field6", type: "date", label: "Transfer Date", required: true },
      { id: "field7", type: "textarea", label: "Reason", required: false }
    ],
    assetTypes: ["General", "Equipment", "Furniture"],
    created: "2023-06-05", 
    lastUsed: "2023-06-10"
  }
];

const assetTypes = [
  { id: "1", name: "General", description: "General inventory items" },
  { id: "2", name: "Equipment", description: "Technical equipment and machinery" },
  { id: "3", name: "Furniture", description: "Office furniture and fixtures" },
  { id: "4", name: "Machinery", description: "Heavy industrial machinery" },
  { id: "5", name: "IT Assets", description: "Computers, servers, and IT equipment" },
  { id: "6", name: "Vehicles", description: "Company vehicles and transportation" }
];

const fieldTypes = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "select", label: "Dropdown" },
  { value: "checkbox", label: "Checkbox" },
  { value: "date", label: "Date" },
  { value: "textarea", label: "Textarea" },
  { value: "formula", label: "Formula/Calculation" }
];

const FormDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [form, setForm] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formName, setFormName] = useState("");
  const [fields, setFields] = useState<any[]>([]);
  const [selectedAssetTypes, setSelectedAssetTypes] = useState<string[]>([]);
  const [availableAssetTypes] = useState(assetTypes);
  
  // Load form data
  useEffect(() => {
    if (id) {
      // In a real app, this would fetch the form from an API
      const foundForm = formTemplates.find(form => form.id === id);
      
      if (foundForm) {
        setForm(foundForm);
        setFormName(foundForm.name);
        setFields([...foundForm.fields]);
        setSelectedAssetTypes(foundForm.assetTypes || []);
        setLoading(false);
      } else {
        // Handle form not found
        toast({
          title: "Form not found",
          description: `Could not find form with ID: ${id}`,
          variant: "destructive"
        });
        navigate("/forms");
      }
    }
  }, [id, navigate, toast]);
  
  const handleSave = () => {
    // In a real app, this would update the form in the database
    const updatedForm = {
      ...form,
      name: formName,
      fields: fields,
      assetTypes: selectedAssetTypes
    };
    
    // Simulating save
    setForm(updatedForm);
    setIsEditMode(false);
    
    toast({
      title: "Form saved",
      description: "Your changes have been saved successfully."
    });
  };
  
  const addField = () => {
    const newField = {
      id: `field${fields.length + 1}`,
      type: "text",
      label: `New Field ${fields.length + 1}`,
      required: false,
      placeholder: ""
    };
    
    setFields([...fields, newField]);
  };
  
  const removeField = (fieldId: string) => {
    setFields(fields.filter(field => field.id !== fieldId));
  };
  
  const updateField = (index: number, updatedValues: any) => {
    const updatedFields = [...fields];
    updatedFields[index] = { ...updatedFields[index], ...updatedValues };
    setFields(updatedFields);
  };
  
  const moveField = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === fields.length - 1)
    ) {
      return;
    }
    
    const newFields = [...fields];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    const field = newFields[index];
    
    newFields.splice(index, 1);
    newFields.splice(newIndex, 0, field);
    
    setFields(newFields);
  };
  
  const toggleAssetType = (assetType: string) => {
    if (selectedAssetTypes.includes(assetType)) {
      setSelectedAssetTypes(selectedAssetTypes.filter(type => type !== assetType));
    } else {
      setSelectedAssetTypes([...selectedAssetTypes, assetType]);
    }
  };
  
  const exportCsv = () => {
    // Generate header row from field labels
    const headers = fields.map(field => field.label);
    
    // In a real app, you would include actual data here
    // For this example, we'll just generate empty rows
    const emptyRow = new Array(fields.length).fill("").join(",");
    
    const csvContent = [
      headers.join(","),
      emptyRow,
      emptyRow
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${formName.replace(/\s+/g, "_")}_template.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "CSV Template Exported",
      description: "The CSV template has been downloaded successfully."
    });
  };
  
  if (loading) {
    return <div className="p-8 text-center">Loading form details...</div>;
  }
  
  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
        <div className="flex items-center">
          <Button variant="ghost" onClick={() => navigate("/forms")} className="mr-2">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            {isEditMode ? (
              <Input 
                value={formName} 
                onChange={(e) => setFormName(e.target.value)} 
                className="text-2xl font-bold h-auto py-1 px-2" 
              />
            ) : (
              <h1 className="text-3xl font-bold">{form.name}</h1>
            )}
            <p className="text-muted-foreground">
              Created on {new Date(form.created).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex space-x-2 mt-4 sm:mt-0">
          {isEditMode ? (
            <>
              <Button variant="outline" onClick={() => setIsEditMode(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={exportCsv}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
              <Button onClick={() => setIsEditMode(true)}>
                Edit Form
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Form Fields */}
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Form Fields</h2>
                {isEditMode && (
                  <Button onClick={addField} size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Field
                  </Button>
                )}
              </div>
              
              {fields.length > 0 ? (
                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div 
                      key={field.id} 
                      className={`p-4 rounded-md ${isEditMode ? 'border' : ''}`}
                    >
                      {isEditMode ? (
                        <div className="space-y-4">
                          <div className="flex justify-between items-start">
                            <div className="space-y-1 flex-1">
                              <Label htmlFor={`field-${index}-label`}>Field Label</Label>
                              <Input
                                id={`field-${index}-label`}
                                value={field.label}
                                onChange={(e) => updateField(index, { label: e.target.value })}
                              />
                            </div>
                            <div className="flex space-x-1 ml-2">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => moveField(index, "up")}
                                disabled={index === 0}
                              >
                                <MoveVertical className="h-4 w-4 rotate-180" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => moveField(index, "down")}
                                disabled={index === fields.length - 1}
                              >
                                <MoveVertical className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-destructive"
                                onClick={() => removeField(field.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor={`field-${index}-type`}>Field Type</Label>
                              <Select
                                value={field.type}
                                onValueChange={(value) => updateField(index, { type: value })}
                              >
                                <SelectTrigger id={`field-${index}-type`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {fieldTypes.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                      {type.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div className="flex items-end">
                              <div className="flex items-center h-10 space-x-2">
                                <input
                                  type="checkbox"
                                  id={`field-${index}-required`}
                                  checked={field.required}
                                  onChange={(e) => updateField(index, { required: e.target.checked })}
                                  className="h-4 w-4"
                                />
                                <Label htmlFor={`field-${index}-required`}>Required Field</Label>
                              </div>
                            </div>
                          </div>
                          
                          {field.type === "formula" && (
                            <div>
                              <Label htmlFor={`field-${index}-formula`}>Formula</Label>
                              <Input
                                id={`field-${index}-formula`}
                                value={field.formula || ""}
                                onChange={(e) => updateField(index, { formula: e.target.value })}
                                placeholder="e.g., field1 * field2"
                              />
                              <p className="text-sm text-muted-foreground mt-1">
                                Use field IDs in formula (e.g., field1 * field2)
                              </p>
                            </div>
                          )}
                          
                          {field.type === "select" && (
                            <div>
                              <Label htmlFor={`field-${index}-options`}>Options (comma separated)</Label>
                              <Input
                                id={`field-${index}-options`}
                                value={field.options?.join(", ") || ""}
                                onChange={(e) => updateField(index, { 
                                  options: e.target.value.split(",").map((option: string) => option.trim()) 
                                })}
                                placeholder="Option 1, Option 2, Option 3"
                              />
                            </div>
                          )}
                          
                          {(field.type === "text" || field.type === "number" || field.type === "textarea") && (
                            <div>
                              <Label htmlFor={`field-${index}-placeholder`}>Placeholder</Label>
                              <Input
                                id={`field-${index}-placeholder`}
                                value={field.placeholder || ""}
                                onChange={(e) => updateField(index, { placeholder: e.target.value })}
                              />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex justify-between">
                          <div>
                            <div className="font-medium">{field.label}</div>
                            <div className="text-sm text-muted-foreground">
                              {fieldTypes.find(type => type.value === field.type)?.label || field.type} 
                              {field.required && " • Required"}
                            </div>
                            {field.type === "formula" && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Formula: {field.formula}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-8 text-muted-foreground">
                  No fields have been added to this form yet.
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Preview */}
          {!isEditMode && fields.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4">Form Preview</h2>
                <div className="space-y-4">
                  {fields.map((field) => (
                    <div key={field.id} className="space-y-2">
                      <Label htmlFor={`preview-${field.id}`}>
                        {field.label}
                        {field.required && <span className="text-destructive ml-1">*</span>}
                      </Label>
                      
                      {field.type === "text" && (
                        <Input 
                          id={`preview-${field.id}`} 
                          placeholder={field.placeholder}
                          disabled
                        />
                      )}
                      
                      {field.type === "number" && (
                        <Input 
                          id={`preview-${field.id}`} 
                          type="number" 
                          placeholder={field.placeholder}
                          disabled
                        />
                      )}
                      
                      {field.type === "select" && (
                        <Select disabled>
                          <SelectTrigger id={`preview-${field.id}`}>
                            <SelectValue placeholder="Select an option" />
                          </SelectTrigger>
                          <SelectContent>
                            {field.options?.map((option: string) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      
                      {field.type === "checkbox" && (
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`preview-${field.id}`}
                            disabled
                            className="h-4 w-4"
                          />
                          <label htmlFor={`preview-${field.id}`}>{field.label}</label>
                        </div>
                      )}
                      
                      {field.type === "date" && (
                        <Input 
                          id={`preview-${field.id}`} 
                          type="date" 
                          disabled
                        />
                      )}
                      
                      {field.type === "textarea" && (
                        <Textarea 
                          id={`preview-${field.id}`} 
                          placeholder={field.placeholder}
                          disabled
                        />
                      )}
                      
                      {field.type === "formula" && (
                        <Input 
                          id={`preview-${field.id}`} 
                          value="Calculated value will appear here"
                          disabled
                          readOnly
                        />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        
        <div className="space-y-6">
          {/* Associated Asset Types */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4">Associated Asset Types</h2>
              {isEditMode ? (
                <div className="space-y-2">
                  {availableAssetTypes.map((assetType) => (
                    <div key={assetType.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`asset-type-${assetType.id}`}
                        checked={selectedAssetTypes.includes(assetType.name)}
                        onChange={() => toggleAssetType(assetType.name)}
                        className="h-4 w-4"
                      />
                      <Label htmlFor={`asset-type-${assetType.id}`}>
                        {assetType.name}
                      </Label>
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  {selectedAssetTypes.length > 0 ? (
                    <div className="space-y-1">
                      {selectedAssetTypes.map((type) => (
                        <div key={type} className="flex items-center p-2 bg-secondary/50 rounded">
                          <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                          {type}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">
                      No asset types associated with this form.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Data Export Options */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4">CSV Export Format</h2>
              
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Configure how this form's data will export to CSV format
                </p>
                
                <h3 className="font-medium">Export Columns</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Field</TableHead>
                      <TableHead>Include in Export</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field) => (
                      <TableRow key={field.id}>
                        <TableCell>{field.label}</TableCell>
                        <TableCell>
                          <input
                            type="checkbox"
                            defaultChecked={true}
                            disabled={!isEditMode}
                            className="h-4 w-4"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {isEditMode && (
                  <Button variant="outline" size="sm" onClick={exportCsv}>
                    <Download className="mr-2 h-4 w-4" />
                    Preview CSV Format
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Form Info */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4">Form Information</h2>
              
              <div className="space-y-1">
                <div className="flex justify-between text-sm py-2 border-b">
                  <span className="text-muted-foreground">Total Fields:</span>
                  <span className="font-medium">{fields.length}</span>
                </div>
                <div className="flex justify-between text-sm py-2 border-b">
                  <span className="text-muted-foreground">Created:</span>
                  <span className="font-medium">{new Date(form.created).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between text-sm py-2 border-b">
                  <span className="text-muted-foreground">Last Used:</span>
                  <span className="font-medium">{new Date(form.lastUsed).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between text-sm py-2">
                  <span className="text-muted-foreground">Form ID:</span>
                  <span className="font-medium">{form.id}</span>
                </div>
              </div>
              
              {!isEditMode && (
                <div className="mt-4 pt-4 border-t">
                  <Button variant="outline" size="sm" className="w-full">
                    <FileText className="mr-2 h-4 w-4" />
                    Fill this form
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default FormDetail;
