import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
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
  AlertCircle,
  Loader2,
  ArrowLeft,
  InfoIcon
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
import { useOrganization } from "@/hooks/useOrganization";
import { createForm, updateForm, getFormById } from "@/services/formService";
import { syncMappedFieldsForAssetType, getMappedFields } from "@/services/mappedFieldService";
import { Badge } from "@/components/ui/badge";
import { addAssetTypeFormLink } from '@/services/assetTypeService';

// Field type options
const fieldTypes = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "textarea", label: "Text Area" },
  { value: "select", label: "Dropdown" },
  { value: "date", label: "Date" },
  { value: "checkbox", label: "Checkbox" },
  { value: "calculated", label: "Calculated Field" },
  { value: "current_inventory", label: "Current Inventory" },
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
      description: "",
      mappable: false
    },
    {
      id: "field_2",
      label: "Quantity",
      type: "number",
      required: true,
      placeholder: "Enter quantity",
      options: [],
      formula: "",
      description: "",
      mappable: false
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
  description: string;
  mappable: boolean;
}

const FormBuilder = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentOrganization, isLoading: isOrgLoading } = useOrganization();
  const [formData, setFormData] = useState(initialForm);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [newOptionText, setNewOptionText] = useState("");
  const [fieldBeingDragged, setFieldBeingDragged] = useState<string | null>(null);
  const [showFormulaHelp, setShowFormulaHelp] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(!!id);
  const fieldRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [mappedFields, setMappedFields] = useState<any[]>([]);
  const location = useLocation();
  // Parse query params for assetType and purpose
  const queryParams = new URLSearchParams(location.search);
  const assetTypeIdFromQuery = queryParams.get('assetType');
  const purposeFromQuery = queryParams.get('purpose');

  useEffect(() => {
    // If we have an ID, load the existing form
    if (id) {
      setIsLoading(true);
      console.log(`Loading form with ID: ${id}`);
      
      getFormById(id)
        .then(formData => {
          if (formData) {
            console.log('Form data loaded:', formData);
            try {
              // Parse form_data if it's a string
              let parsedFormData;
              if (typeof formData.form_data === 'string') {
                try {
                  parsedFormData = JSON.parse(formData.form_data);
                } catch (parseError) {
                  console.error("Error parsing form_data JSON:", parseError);
                  parsedFormData = { fields: [] };
                }
              } else {
                parsedFormData = formData.form_data || { fields: [] };
              }
              
              // Set form data with proper structure and fallbacks for missing properties
              setFormData({
                title: formData.name || '',
                description: formData.description || '',
                fields: Array.isArray(parsedFormData.fields) 
                  ? parsedFormData.fields.map(field => ({
                      // Ensure each field has all required properties
                      id: field.id || generateFieldId(),
                      label: field.label || 'Untitled Field',
                      type: field.type || 'text',
                      required: !!field.required,
                      placeholder: field.placeholder || '',
                      options: Array.isArray(field.options) ? field.options : [],
                      formula: field.formula || '',
                      description: field.description || '',
                      mappable: field.mappable ?? false
                    }))
                  : []
              });
              
              console.log('Form successfully loaded and parsed');
            } catch (error) {
              console.error("Error setting form data:", error);
              toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to parse form data. The form format may be invalid.",
              });
            }
          } else {
            console.error(`Form with ID ${id} not found`);
            toast({
              variant: "destructive",
              title: "Form Not Found",
              description: `The form you're trying to edit could not be found.`,
            });
            navigate("/forms");
          }
        })
        .catch(error => {
          console.error("Error loading form:", error);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to load form data",
          });
          navigate("/forms");
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      // If creating a new form, no initial loading needed for form data
      setIsLoading(false);
    }
  }, [id, toast, navigate]);

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
    const newField: FormField = {
      id: generateFieldId(),
      label: "New Field",
      type: "text",
      required: false,
      placeholder: "Enter value",
      options: [],
      formula: "",
      description: "",
      mappable: false
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

  // Add a field of specific type
  const addFieldOfType = (type: string) => {
    const newField: FormField = {
      id: generateFieldId(),
      label: type === "current_inventory" ? "Current Inventory" : "New Field",
      type: type,
      required: false,
      placeholder: type === "current_inventory" ? "Enter initial inventory count" : "Enter value",
      options: [],
      formula: "",
      description: type === "current_inventory" ? "Set initial inventory count for this asset" : "",
      mappable: false
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
  const saveForm = async () => {
    // Check organization before proceeding
    if (isOrgLoading || !currentOrganization?.id) {
        toast({
          variant: "destructive",
        title: "Organization Not Ready",
        description: isOrgLoading 
          ? "Organization context is still loading. Please wait."
          : "No organization selected. Please select an organization first."
        });
        return;
      }
    
    try {
      setIsSaving(true);

      // Validate form data
      if (!formData.title.trim()) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Form title is required"
        });
        setIsSaving(false);
        return;
      }

      if (formData.fields.length === 0) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "At least one form field is required"
        });
        setIsSaving(false);
        return;
      }

      // Create a properly structured form data to save
      const formDataToSave = {
        title: formData.title,
        description: formData.description,
        fields: formData.fields
      };

      const formToSave = {
        name: formData.title,
        description: formData.description,
        form_data: JSON.stringify(formDataToSave),
        organization_id: currentOrganization.id,
        status: 'draft',
        version: 1,
        is_template: false
      };

      console.log("Saving form with data:", formToSave);
      let result;

      if (id) {
        // Update existing form
        console.log(`Updating form with ID: ${id}`);
        result = await updateForm(id, formToSave);
      } else {
        // Create new form
        console.log('Creating new form');
        result = await createForm(formToSave);
      }

      if (result && result.id) {
        console.log("Form saved successfully:", result);
        
        // Sync mappable fields
        await syncMappedFieldsForAssetType(
          currentOrganization.id, 
          result.id, 
          formData.fields
        );
        
        toast({
          title: id ? "Form Updated" : "Form Saved",
          description: `Form "${formData.title}" has been ${id ? "updated" : "saved"}.`,
        });
        
        // If creating a new form and assetType/purpose are present, link the form
        if (!id && assetTypeIdFromQuery && purposeFromQuery && currentOrganization?.id) {
          try {
            await addAssetTypeFormLink(assetTypeIdFromQuery, result.id, purposeFromQuery, currentOrganization.id);
            toast({
              title: 'Form Linked',
              description: `Form linked to asset type for purpose: ${purposeFromQuery}`
            });
          } catch (linkError) {
            toast({
              title: 'Warning',
              description: 'Form was created but could not be linked to the asset type.',
              variant: 'destructive'
            });
          }
        }
        
        navigate("/forms");
      } else {
        throw new Error("Failed to save form. No result returned.");
      }
    } catch (error) {
      console.error("Error saving form:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save form. Please try again."
      });
    } finally {
      setIsSaving(false);
    }
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

  // Load mapped fields when organization is available
  useEffect(() => {
    if (currentOrganization?.id) {
      loadMappedFields();
    }
  }, [currentOrganization?.id]);

  const loadMappedFields = async () => {
    if (!currentOrganization?.id) return;
    
    try {
      const fields = await getMappedFields(currentOrganization.id);
      setMappedFields(fields);
    } catch (error) {
      console.error('Error loading mapped fields:', error);
    }
  };

  // Combined loading state for rendering
  const isPageLoading = isOrgLoading || isLoading;

  if (isPageLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  // Check for organization *after* loading is complete
  if (!currentOrganization?.id) {
    return (
      <div className="container max-w-2xl py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-3" />
            <div>
              <h3 className="font-medium text-red-800">No Organization Selected</h3>
              <p className="text-sm text-red-700 mt-1">
                Please ensure you're connected to an organization before creating or editing a form.
                Go to the organization switcher in the top bar to select an organization.
              </p>
              <Button 
                className="mt-3" 
                variant="outline" 
                size="sm" 
                onClick={() => navigate("/forms")}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Forms
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4 pb-24">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold">
            {id ? "Edit Form" : "Create Form"}
          </h1>
          {currentOrganization && (
            <p className="text-sm text-muted-foreground">
              Organization: {currentOrganization.name}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => navigate("/forms")} variant="outline">
            Cancel
          </Button>
          <Button 
            onClick={saveForm} 
            disabled={isSaving || formData.title.trim() === "" || formData.fields.length === 0}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
              </>
            ) : (
              "Save Form"
            )}
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
                <div className="flex gap-2">
                  <Button onClick={addField} size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Field
                  </Button>
                  <Select onValueChange={addFieldOfType}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Add specific field type" />
                    </SelectTrigger>
                    <SelectContent>
                      {fieldTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
                      
                      {field.type === "current_inventory" && (
                        <div>
                          <Input 
                            type="number" 
                            disabled 
                            placeholder={field.placeholder || "Enter initial quantity"} 
                            className="border-amber-300"
                          />
                          <p className="text-xs text-amber-600 mt-1">Initial inventory value</p>
                        </div>
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

                        {/* Add Mappable Field toggle */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Label htmlFor="fieldMappable" className="mr-1">Mappable Field</Label>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span tabIndex={0}>
                                    <InfoIcon className="h-4 w-4 text-muted-foreground" />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-xs">
                                  <p className="text-sm">
                                    Mark this field as mappable to use it in formula mappings.
                                    Mappable fields can be accessed in inventory calculations.
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <Switch
                            id="fieldMappable"
                            checked={field.mappable || false}
                            onCheckedChange={(checked) => updateField(field.id, 'mappable', checked)}
                          />
                        </div>

                        <div>
                          <Label htmlFor="fieldDescription">Description</Label>
                          <Textarea
                            id="fieldDescription"
                            value={field.description || ''}
                            onChange={(e) => updateField(field.id, 'description', e.target.value)}
                            placeholder="Help text shown below the field"
                          />
                        </div>
                        
                        {field.type === "current_inventory" && (
                          <div className="bg-amber-50 p-3 rounded-md border border-amber-200">
                            <p className="text-sm text-amber-800">
                              This field will be used as the baseline for inventory tracking. The initial value 
                              will be used to create an inventory item with the specified quantity.
                            </p>
                          </div>
                        )}
                        
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
                                    
                                    {mappedFields.length > 0 && (
                                      <>
                                        <Separator className="my-2" />
                                        <h3 className="font-semibold">Mapped Fields From Other Forms:</h3>
                                        <div className="max-h-48 overflow-y-auto space-y-1">
                                          {mappedFields.map(f => (
                                            <div key={f.id} className="text-sm p-1 rounded bg-muted">
                                              <code>{`{mapped.${f.field_id}}`}</code> - {f.field_label} 
                                              <span className="text-xs text-muted-foreground ml-1">
                                                (from {f.form_name || "Unknown Form"})
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      </>
                                    )}
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
                                placeholder="e.g. {field_1} * {field_2} or {mapped.field_id}"
                                rows={3}
                                className="font-mono"
                              />
                              
                              <div className="mt-2 border rounded-md overflow-hidden">
                                <div className="bg-muted p-2 text-xs font-medium flex justify-between items-center">
                                  <span>Quick Field Insert</span>
                                  <Badge variant="outline">Click to insert</Badge>
                                </div>
                                <div className="max-h-[120px] overflow-y-auto p-2 flex flex-wrap gap-1">
                                  {/* Current form fields */}
                                  {formData.fields
                                    .filter(f => f.id !== field.id && ['number', 'text'].includes(f.type))
                                    .map(f => (
                                      <Button 
                                        key={f.id}
                                        variant="outline" 
                                        size="sm"
                                        className="text-xs"
                                        onClick={() => {
                                          updateField(field.id, 'formula', 
                                            (field.formula || '') + `{${f.id}}`);
                                        }}
                                      >
                                        {f.label}
                                      </Button>
                                  ))}
                                </div>
                                
                                {mappedFields.length > 0 && (
                                  <>
                                    <div className="bg-blue-50 p-2 text-xs font-medium">
                                      Mapped Fields From Other Forms
                                    </div>
                                    <div className="max-h-[120px] overflow-y-auto p-2 flex flex-wrap gap-1">
                                      {mappedFields.map(f => (
                                        <Button 
                                          key={f.id}
                                          variant="outline" 
                                          size="sm"
                                          className="text-xs bg-blue-50 border-blue-200 hover:bg-blue-100"
                                          onClick={() => {
                                            updateField(field.id, 'formula', 
                                              (field.formula || '') + `{mapped.${f.field_id}}`);
                                          }}
                                        >
                                          {f.field_label}
                                          <span className="ml-1 text-[10px] opacity-70">({f.form_name})</span>
                                        </Button>
                                      ))}
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {field.formula && (
                          <div className="p-2 bg-muted rounded text-sm mt-2">
                            <p className="font-medium mb-1">Preview:</p>
                            <div className="font-mono">
                              {previewCalculation(field.formula)}
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
                      <Button variant="outline" size="sm" onClick={() => addFieldOfType("current_inventory")}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Inventory Field
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
