
import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ChevronLeft, 
  Plus, 
  Trash2, 
  MoveUp, 
  MoveDown, 
  Save, 
  FileInput, 
  GripVertical, 
  Calculator, 
  AlertCircle 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Switch } from "@/components/ui/switch";

// Field type options
const fieldTypes = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "textarea", label: "Text Area" },
  { value: "select", label: "Dropdown" },
  { value: "date", label: "Date" },
  { value: "checkbox", label: "Checkbox" },
  { value: "calculated", label: "Calculated Field" },
  { value: "barcode", label: "Barcode" },
];

// Initial form data
const initialForm = {
  title: "New Inventory Form",
  description: "Enter inventory details using this form",
  fields: [
    {
      id: "field_1",
      label: "Item Name",
      type: "text",
      required: true,
      placeholder: "Enter item name",
      options: [],
      formula: "",
    },
    {
      id: "field_2",
      label: "Quantity",
      type: "number",
      required: true,
      placeholder: "Enter quantity",
      options: [],
      formula: "",
    },
  ]
};

// Interface for form field
interface FormField {
  id: string;
  label: string;
  type: string;
  required: boolean;
  placeholder: string;
  options: string[];
  formula: string;
}

const FormBuilder = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [formData, setFormData] = useState(initialForm);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [newOptionText, setNewOptionText] = useState("");
  const [fieldBeingDragged, setFieldBeingDragged] = useState<string | null>(null);
  const [showFormulaHelp, setShowFormulaHelp] = useState(false);
  const fieldRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Generate unique ID for new fields
  const generateFieldId = () => {
    const ids = formData.fields.map(field => {
      const match = field.id.match(/field_(\d+)/);
      return match ? parseInt(match[1]) : 0;
    });
    const maxId = Math.max(...ids, 0);
    return `field_${maxId + 1}`;
  };

  // Add a new field
  const addField = () => {
    const newField = {
      id: generateFieldId(),
      label: "New Field",
      type: "text",
      required: false,
      placeholder: "Enter value",
      options: [],
      formula: "",
    };
    
    setFormData({
      ...formData,
      fields: [...formData.fields, newField],
    });
    
    setSelectedField(newField.id);
    
    // Scroll to the new field after render
    setTimeout(() => {
      fieldRefs.current[newField.id]?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  // Remove a field
  const removeField = (id: string) => {
    setFormData({
      ...formData,
      fields: formData.fields.filter(field => field.id !== id),
    });
    
    if (selectedField === id) {
      setSelectedField(null);
    }
  };

  // Update form title or description
  const updateFormMeta = (key: string, value: string) => {
    setFormData({
      ...formData,
      [key]: value,
    });
  };

  // Update field properties
  const updateField = (id: string, key: string, value: any) => {
    setFormData({
      ...formData,
      fields: formData.fields.map(field => 
        field.id === id ? { ...field, [key]: value } : field
      ),
    });
  };

  // Add option to a select field
  const addOption = (fieldId: string) => {
    if (!newOptionText.trim()) return;
    
    const field = formData.fields.find(f => f.id === fieldId);
    if (field) {
      const updatedOptions = [...field.options, newOptionText];
      updateField(fieldId, 'options', updatedOptions);
      setNewOptionText("");
    }
  };

  // Remove option from a select field
  const removeOption = (fieldId: string, optionIndex: number) => {
    const field = formData.fields.find(f => f.id === fieldId);
    if (field) {
      const updatedOptions = field.options.filter((_, i) => i !== optionIndex);
      updateField(fieldId, 'options', updatedOptions);
    }
  };

  // Move field up or down
  const moveField = (id: string, direction: 'up' | 'down') => {
    const index = formData.fields.findIndex(field => field.id === id);
    if (
      (direction === 'up' && index === 0) || 
      (direction === 'down' && index === formData.fields.length - 1)
    ) {
      return;
    }
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const reorderedFields = [...formData.fields];
    const [movedField] = reorderedFields.splice(index, 1);
    reorderedFields.splice(newIndex, 0, movedField);
    
    setFormData({
      ...formData,
      fields: reorderedFields,
    });
  };

  // Handle drag start
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    setFieldBeingDragged(id);
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Handle drop
  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain');
    
    if (sourceId !== targetId) {
      const sourceIndex = formData.fields.findIndex(field => field.id === sourceId);
      const targetIndex = formData.fields.findIndex(field => field.id === targetId);
      
      const reorderedFields = [...formData.fields];
      const [movedField] = reorderedFields.splice(sourceIndex, 1);
      reorderedFields.splice(targetIndex, 0, movedField);
      
      setFormData({
        ...formData,
        fields: reorderedFields,
      });
    }
    
    setFieldBeingDragged(null);
  };

  // Save the form
  const saveForm = () => {
    // In a real app, this would make an API call to save the form
    toast({
      title: "Form Saved",
      description: `Form "${formData.title}" has been saved.`,
    });
    
    navigate("/forms");
  };

  // Export the form as JSON
  const exportForm = () => {
    const jsonString = JSON.stringify(formData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.download = `${formData.title.replace(/\s+/g, '_')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Preview calculation
  const previewCalculation = (formula: string) => {
    let sampleResult = "Error";
    try {
      // Replace field references with sample values
      const processedFormula = formula
        .replace(/\{field_1\}/g, "10")
        .replace(/\{field_2\}/g, "5")
        .replace(/\{field_3\}/g, "20");
      
      // eslint-disable-next-line no-eval
      sampleResult = eval(processedFormula).toString();
    } catch (e) {
      console.error("Formula evaluation error:", e);
    }
    
    return sampleResult;
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mr-2">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Form Builder</h1>
            <p className="text-muted-foreground">Create and customize your inventory form</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={exportForm}>
            Export
          </Button>
          <Button onClick={saveForm}>
            <Save className="mr-2 h-4 w-4" />
            Save Form
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <Card>
            <CardContent className="p-6">
              <div className="mb-8">
                <div className="mb-4">
                  <Label htmlFor="formTitle">Form Title</Label>
                  <Input
                    id="formTitle"
                    value={formData.title}
                    onChange={(e) => updateFormMeta('title', e.target.value)}
                    className="font-medium text-lg"
                  />
                </div>
                <div>
                  <Label htmlFor="formDescription">Description</Label>
                  <Textarea
                    id="formDescription"
                    value={formData.description}
                    onChange={(e) => updateFormMeta('description', e.target.value)}
                    rows={2}
                  />
                </div>
              </div>

              <div className="mb-4 flex justify-between items-center">
                <h2 className="text-lg font-semibold">Form Fields</h2>
                <Button onClick={addField} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Field
                </Button>
              </div>

              <div className="space-y-4">
                {formData.fields.map((field) => (
                  <div
                    key={field.id}
                    ref={el => fieldRefs.current[field.id] = el}
                    className={`border rounded-md p-4 relative ${
                      selectedField === field.id ? "border-primary" : ""
                    } ${
                      fieldBeingDragged === field.id ? "opacity-50" : ""
                    }`}
                    onClick={() => setSelectedField(field.id)}
                    draggable
                    onDragStart={(e) => handleDragStart(e, field.id)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, field.id)}
                  >
                    <div className="flex items-center mb-2">
                      <div className="cursor-move p-1 text-muted-foreground">
                        <GripVertical className="h-4 w-4" />
                      </div>
                      <div className="flex-1 ml-2">
                        <p className="font-medium truncate">{field.label || "Untitled Field"}</p>
                        <p className="text-xs text-muted-foreground">
                          {fieldTypes.find(t => t.value === field.type)?.label || field.type}
                          {field.required && " • Required"}
                        </p>
                      </div>
                      <div className="flex space-x-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveField(field.id, 'up');
                                }}
                              >
                                <MoveUp className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Move Up</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveField(field.id, 'down');
                                }}
                              >
                                <MoveDown className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Move Down</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0 text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeField(field.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete Field</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>

                    {/* Preview of field based on type */}
                    <div className="pl-8 pr-2">
                      {field.type === "text" && (
                        <Input disabled placeholder={field.placeholder} />
                      )}
                      
                      {field.type === "number" && (
                        <Input type="number" disabled placeholder={field.placeholder} />
                      )}
                      
                      {field.type === "textarea" && (
                        <Textarea disabled placeholder={field.placeholder} />
                      )}
                      
                      {field.type === "select" && (
                        <Select disabled>
                          <SelectTrigger>
                            <SelectValue placeholder={field.placeholder} />
                          </SelectTrigger>
                        </Select>
                      )}
                      
                      {field.type === "date" && (
                        <Input type="date" disabled />
                      )}
                      
                      {field.type === "checkbox" && (
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" disabled className="form-checkbox" />
                          <span className="text-sm text-muted-foreground">{field.label}</span>
                        </div>
                      )}
                      
                      {field.type === "calculated" && (
                        <div className="flex items-center space-x-2">
                          <Input 
                            disabled 
                            value={field.formula ? previewCalculation(field.formula) : "Calculated value"} 
                            className="bg-muted/50"
                          />
                          <Calculator className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      
                      {field.type === "barcode" && (
                        <div className="flex items-center space-x-2">
                          <Input disabled placeholder="Scan barcode" />
                          <Button variant="outline" size="sm" disabled>
                            <svg 
                              className="h-4 w-4" 
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7V5a1 1 0 011-1h4a1 1 0 011 1v2m0 0H4m6 0h2m4 0h4a1 1 0 001-1V5a1 1 0 00-1-1h-4a1 1 0 00-1 1v2m0 0h-2m-6 6h16M4 13v2a1 1 0 001 1h4a1 1 0 001-1v-2m0 0H4m6 0h2m4 0h4a1 1 0 001-1v-2a1 1 0 00-1-1h-4a1 1 0 00-1 1v2m0 0h-2" />
                            </svg>
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {formData.fields.length === 0 && (
                  <div className="border border-dashed rounded-md p-8 text-center">
                    <FileInput className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-muted-foreground mb-2">No fields added yet</p>
                    <Button onClick={addField} size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Field
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="lg:col-span-4">
          <div className="sticky top-4">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4">Field Properties</h2>
                
                {selectedField ? (
                  (() => {
                    const field = formData.fields.find(f => f.id === selectedField);
                    if (!field) return null;
                    
                    return (
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="fieldLabel">Field Label</Label>
                          <Input
                            id="fieldLabel"
                            value={field.label}
                            onChange={(e) => updateField(field.id, 'label', e.target.value)}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="fieldType">Field Type</Label>
                          <Select
                            value={field.type}
                            onValueChange={(value) => updateField(field.id, 'type', value)}
                          >
                            <SelectTrigger id="fieldType">
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
                        
                        {field.type !== "checkbox" && (
                          <div>
                            <Label htmlFor="fieldPlaceholder">Placeholder</Label>
                            <Input
                              id="fieldPlaceholder"
                              value={field.placeholder}
                              onChange={(e) => updateField(field.id, 'placeholder', e.target.value)}
                            />
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between">
                          <Label htmlFor="fieldRequired">Required Field</Label>
                          <Switch
                            id="fieldRequired"
                            checked={field.required}
                            onCheckedChange={(checked) => updateField(field.id, 'required', checked)}
                          />
                        </div>
                        
                        {field.type === "select" && (
                          <div>
                            <Label>Options</Label>
                            <div className="space-y-2 mt-2">
                              {field.options.map((option, index) => (
                                <div key={index} className="flex items-center">
                                  <Input
                                    value={option}
                                    onChange={(e) => {
                                      const newOptions = [...field.options];
                                      newOptions[index] = e.target.value;
                                      updateField(field.id, 'options', newOptions);
                                    }}
                                    className="flex-1"
                                  />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="ml-2 text-destructive"
                                    onClick={() => removeOption(field.id, index)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                              
                              <div className="flex items-center mt-2">
                                <Input
                                  placeholder="Add new option"
                                  value={newOptionText}
                                  onChange={(e) => setNewOptionText(e.target.value)}
                                  className="flex-1"
                                />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="ml-2"
                                  onClick={() => addOption(field.id)}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {field.type === "calculated" && (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <Label htmlFor="fieldFormula">Formula</Label>
                              <Dialog open={showFormulaHelp} onOpenChange={setShowFormulaHelp}>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <AlertCircle className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md">
                                  <DialogHeader>
                                    <DialogTitle>Formula Help</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-2">
                                    <p className="text-sm">
                                      Create mathematical formulas using field references and operators.
                                    </p>
                                    <h3 className="font-semibold">Examples:</h3>
                                    <p className="text-sm">
                                      <code>{"{field_1} * {field_2}"}</code> - Multiply fields
                                    </p>
                                    <p className="text-sm">
                                      <code>{"{field_1} + {field_2} - {field_3}"}</code> - Addition and subtraction
                                    </p>
                                    <p className="text-sm">
                                      <code>{"({field_1} + {field_2}) * 0.1"}</code> - Use parentheses and constants
                                    </p>
                                    <Separator className="my-2" />
                                    <h3 className="font-semibold">Available Fields:</h3>
                                    <div className="max-h-48 overflow-y-auto space-y-1">
                                      {formData.fields
                                        .filter(f => f.id !== field.id)
                                        .map(f => (
                                          <div key={f.id} className="text-sm p-1 rounded bg-muted">
                                            <code>{`{${f.id}}`}</code> - {f.label}
                                          </div>
                                        ))}
                                    </div>
                                  </div>
                                  <DialogFooter>
                                    <Button onClick={() => setShowFormulaHelp(false)}>
                                      Close
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            </div>
                            <div className="space-y-2">
                              <Textarea
                                id="fieldFormula"
                                value={field.formula}
                                onChange={(e) => updateField(field.id, 'formula', e.target.value)}
                                placeholder="e.g. {field_1} * {field_2}"
                                rows={3}
                              />
                              
                              {field.formula && (
                                <div className="p-2 bg-muted rounded text-sm">
                                  <p className="font-medium mb-1">Preview:</p>
                                  <div className="font-mono">
                                    {previewCalculation(field.formula)}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        <Separator />
                        
                        <Button 
                          variant="outline" 
                          className="w-full text-destructive"
                          onClick={() => removeField(field.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove Field
                        </Button>
                      </div>
                    );
                  })()
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-2">
                      Select a field to edit its properties
                    </p>
                    {formData.fields.length > 0 ? (
                      <Button variant="outline" size="sm" onClick={() => setSelectedField(formData.fields[0].id)}>
                        Select First Field
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={addField}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Field
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormBuilder;
