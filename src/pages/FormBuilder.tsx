/*
 * FormBuilder Component - Production Ready
 * 
 * A comprehensive form builder for creating dynamic forms with:
 * - Multiple field types (text, number, select, etc.)
 * - Calculated fields with formula support
 * - Asset type integration and mapping
 * - Drag & drop field reordering
 * - Real-time preview and validation
 * 
 * For complete documentation, see README-FORM-BUILDER.md
 */
import React, { useState, useRef, useEffect, useCallback, memo } from "react";
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
  InfoIcon,
  Settings,
  Eye
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
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Switch } from "@/components/ui/switch";
import { useOrganization } from "@/hooks/useOrganization";
import { createForm, updateForm, getFormById } from "@/services/formService";
import { syncMappedFieldsForAssetType, getMappedFields, getAllMappedFieldsForAssetType } from "@/services/mappedFieldService";
import { Badge } from "@/components/ui/badge";
import { addAssetTypeFormLink, getFormAssetTypeLinks } from '@/services/assetTypeService';
import { registerMappedField, unregisterMappedField } from "@/services/mappedFieldService";
import { getAssetTypes } from "@/services/assetTypeService";
import VisualFormulaBuilder from '@/components/forms/VisualFormulaBuilder';
import { FormBuilderEvaluator } from '@/utils/safeEvaluator';

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
      mappable: false,
      inventory_action: 'none' as 'add' | 'subtract' | 'set' | 'none'
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
      mappable: false,
      inventory_action: 'none' as 'add' | 'subtract' | 'set' | 'none'
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
  inventory_action: 'add' | 'subtract' | 'set' | 'none';
}

// Interface for mock value sets
interface MockValueSet {
  id: string;
  name: string;
  values: { [key: string]: string | number };
}

// Helper function to validate inventory_action
const validateInventoryAction = (action: any): 'add' | 'subtract' | 'set' | 'none' => {
  if (action === 'add' || action === 'subtract' || action === 'set' || action === 'none') {
    return action;
  }
  return 'none'; // Default to 'none' if invalid
};

// Helper function to validate formula
const validateFormula = (formula: string, currentFields: FormField[], mappedFields: any[], lenient = false): { 
  isValid: boolean; 
  error?: string;
  referencedFields: string[];
  referencedMappedFields: string[];
} => {
  const result = {
    isValid: true,
    referencedFields: [] as string[],
    referencedMappedFields: [] as string[],
  };

  // Find all field references
  const fieldMatches = formula.match(/\{field_\d+\}/g) || [];
  result.referencedFields = fieldMatches.map(m => m.slice(1, -1));
  
  // Find all mapped field references
  const mappedMatches = formula.match(/\{mapped\.[a-zA-Z0-9_]+\}/g) || [];
  result.referencedMappedFields = mappedMatches.map(m => m.slice(1, -1));
  
  // In lenient mode, we allow non-existent fields (they'll be replaced with fallback values)
  if (!lenient) {
    // Check if referenced fields exist
    const nonExistentFields = result.referencedFields.filter(
      fieldId => !currentFields.some(f => f.id === fieldId)
    );
    
    if (nonExistentFields.length > 0) {
      return {
        ...result,
        isValid: false,
        error: `Referenced fields don't exist: ${nonExistentFields.join(', ')}`
      };
    }
    
    // Check if referenced mapped fields exist
    const nonExistentMappedFields = result.referencedMappedFields.filter(
      mappedKey => !mappedFields.some(f => `mapped.${f.field_id}` === mappedKey)
    );
    
    if (nonExistentMappedFields.length > 0) {
      return {
        ...result,
        isValid: false,
        error: `Referenced mapped fields don't exist: ${nonExistentMappedFields.join(', ')}`
      };
    }
  }
  
  // Check formula syntax (basic testing for balanced braces, operators)
  try {
    // Replace field references with 1 to test evaluation
    let testFormula = formula;
    result.referencedFields.forEach(fieldId => {
      testFormula = testFormula.replace(new RegExp(`\\{${fieldId}\\}`, 'g'), '1');
    });
    result.referencedMappedFields.forEach(mappedKey => {
      testFormula = testFormula.replace(new RegExp(`\\{${mappedKey}\\}`, 'g'), '1');
    });
    
    // Clean comments
    testFormula = testFormula.replace(/\/\*.*?\*\//g, '');
    
    // Use secure safe evaluator for formula validation
    const validationResult = FormBuilderEvaluator.validateFormula(formula, currentFields, mappedFields);
    if (!validationResult.isValid) {
      throw new Error(validationResult.error || 'Validation failed');
    }
    
    // Test the actual formula parsing with safe evaluator
    FormBuilderEvaluator.previewCalculation(testFormula.replace(/\{field_\d+\}/g, '1').replace(/\{mapped\.[a-zA-Z0-9_]+\}/g, '1'));
    
  } catch (e) {
    return {
      ...result,
      isValid: false,
      error: `Formula syntax error: ${e instanceof Error ? e.message : 'Invalid expression'}`
    };
  }
  
  return result;
};

// Memoized FieldRow component for rendering each field
interface FieldRowProps {
  field: FormField;
  selectedField: string | null;
  fieldBeingDragged: string | null;
  fieldRefs: React.MutableRefObject<{ [key: string]: HTMLDivElement | null }>;
  setSelectedField: (id: string) => void;
  handleDragStart: (e: React.DragEvent, id: string) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent, targetId: string) => void;
  removeField: (id: string) => void;
  moveField: (id: string, direction: 'up' | 'down') => void;
  updateField: (id: string, key: string, value: any) => void;
  formData: { title: string; description: string; fields: FormField[] };
  mappedFields: any[];
  resetFormulaToTextMode: boolean;
  previewCalculationWithMocks: (formula: string, fields: FormField[], mockValues: any) => string;
  mockMappedValues: { [key: string]: string | number };
  addOption: (fieldId: string) => void;
  removeOption: (fieldId: string, optionIndex: number) => void;
  newOptionText: string;
  setNewOptionText: (text: string) => void;
}

const FieldRow = memo(function FieldRow({
  field,
  selectedField,
  fieldBeingDragged,
  fieldRefs,
  setSelectedField,
  handleDragStart,
  handleDragOver,
  handleDrop,
  removeField,
  moveField,
  updateField,
  formData,
  mappedFields,
  resetFormulaToTextMode,
  previewCalculationWithMocks,
  mockMappedValues,
  addOption,
  removeOption,
  newOptionText,
  setNewOptionText
}: FieldRowProps) {
  return (
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
      <div className="flex items-start mb-3">
        <div className="cursor-move p-1 text-muted-foreground mt-1">
          <GripVertical className="h-4 w-4" />
        </div>
        <div className="flex-1 ml-2 min-w-0">
          <p className="font-medium text-sm leading-tight break-words">{field.label || "Untitled Field"}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">
              {fieldTypes.find(t => t.value === field.type)?.label || field.type}
            </span>
            {field.required && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                Required
              </Badge>
            )}
            {field.mappable && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                Mappable
              </Badge>
            )}
            {field.inventory_action && field.inventory_action !== 'none' && (
              <Badge 
                variant="outline" 
                className={`text-[10px] px-1.5 py-0.5 font-medium ${
                  field.inventory_action === 'set' ? 'border-blue-500 text-blue-700 bg-blue-50' :
                  field.inventory_action === 'add' ? 'border-green-500 text-green-700 bg-green-50' :
                  field.inventory_action === 'subtract' ? 'border-orange-500 text-orange-700 bg-orange-50' :
                  'border-gray-500 text-gray-700 bg-gray-50'
                }`}
              >
                {field.inventory_action === 'set' ? '📋 SET' :
                 field.inventory_action === 'add' ? '🔼 ADD' :
                 field.inventory_action === 'subtract' ? '🔽 SUB' :
                 (field.inventory_action as string).toUpperCase()}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex space-x-1 ml-2 shrink-0">
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
          <div>
            <div className="space-y-4">
              <VisualFormulaBuilder
                formula={field.formula || ''}
                onChange={(formula) => updateField(field.id, 'formula', formula)}
                currentFields={formData.fields.filter(f => f.id !== field.id)}
                mappedFields={mappedFields}
                onPreview={(formula) => previewCalculationWithMocks(
                  formula, 
                  formData.fields.filter(f => f.id !== selectedField), 
                  mockMappedValues
                )}
                resetToTextMode={resetFormulaToTextMode}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

const FormBuilder = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentOrganization, isLoading: isOrgLoading } = useOrganization();
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    fields: FormField[];
  }>(initialForm);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [newOptionText, setNewOptionText] = useState("");
  const [fieldBeingDragged, setFieldBeingDragged] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(!!id);
  const fieldRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [mappedFields, setMappedFields] = useState<any[]>([]);
  const location = useLocation();
  const [mockMappedValues, setMockMappedValues] = useState<{ [key: string]: string | number }>({});
  const [mockValueSets, setMockValueSets] = useState<MockValueSet[]>([]);
  const [activeMockSetId, setActiveMockSetId] = useState<string | null>(null);
  const [resetFormulaToTextMode, setResetFormulaToTextMode] = useState(false);
  
  // Asset type selection for new forms
  const [assetTypes, setAssetTypes] = useState<any[]>([]);
  const [selectedAssetTypeId, setSelectedAssetTypeId] = useState<string>('');
  const [showAssetTypeSelection, setShowAssetTypeSelection] = useState(false);
  const [selectedFormPurpose, setSelectedFormPurpose] = useState<string>(''); // Optional form purpose
  
  // Asset type links for existing forms
  const [assetTypeLinks, setAssetTypeLinks] = useState<any[]>([]);
  const [loadingAssetTypeLinks, setLoadingAssetTypeLinks] = useState(false);
  
  // Parse query params for assetType and purpose
  const queryParams = new URLSearchParams(location.search);
  const assetTypeIdFromQuery = queryParams.get('assetType');
  const purposeFromQuery = queryParams.get('purpose');
  
  // Get effective asset type info for display
  const effectiveAssetTypeId = selectedAssetTypeId || assetTypeIdFromQuery;
  const selectedAssetType = assetTypes.find(at => at.id === effectiveAssetTypeId);

  // For new forms, show asset type selection if not already set
  useEffect(() => {
    if (!id && !effectiveAssetTypeId && assetTypes.length > 0 && currentOrganization) {
      setShowAssetTypeSelection(true);
    }
  }, [id, effectiveAssetTypeId, assetTypes, currentOrganization]);

  // Load asset types and mapped fields when organization is available
  useEffect(() => {
    if (currentOrganization?.id) {
      loadAssetTypes();
      loadMappedFields();
    }
  }, [currentOrganization?.id]);

  // Reload mapped fields when asset type selection changes
  useEffect(() => {
    if (currentOrganization?.id && (selectedAssetTypeId || assetTypeIdFromQuery)) {
      loadMappedFields();
    }
  }, [selectedAssetTypeId, assetTypeIdFromQuery, currentOrganization?.id]);

  // Load asset type links for existing forms
  useEffect(() => {
    if (id && currentOrganization?.id && !loadingAssetTypeLinks) {
      setLoadingAssetTypeLinks(true);
      getFormAssetTypeLinks(id, currentOrganization.id)
        .then(links => {
          setAssetTypeLinks(links || []);
        })
        .catch(error => {
          setAssetTypeLinks([]);
        })
        .finally(() => {
          setLoadingAssetTypeLinks(false);
        });
    }
  }, [id, currentOrganization?.id]);

  // Initialize form data and asset type selection
  useEffect(() => {
    const initializeForm = async () => {
      if (!currentOrganization?.id) return;

      if (id) {
        // Editing existing form
        setIsLoading(true);
        try {
          const form = await getFormById(id);
          if (form && form.form_data) {
            let parsedFormData;
            if (typeof form.form_data === 'string') {
              parsedFormData = JSON.parse(form.form_data);
            } else {
              parsedFormData = form.form_data;
            }
            
            setFormData({
              title: form.name,
              description: form.description || "",
              fields: Array.isArray(parsedFormData.fields) 
                ? parsedFormData.fields.map((field: any) => {
                    const incomingAction = field.inventory_action;
                    let validInventoryAction: 'add' | 'subtract' | 'set' | 'none' = 'none';
                    if (incomingAction === 'add' || incomingAction === 'subtract' || incomingAction === 'set' || incomingAction === 'none') {
                      validInventoryAction = incomingAction;
                    }

                    return {
                      id: field.id || generateFieldId(),
                      label: field.label || 'Untitled Field',
                      type: field.type || 'text',
                      required: !!field.required,
                      placeholder: field.placeholder || '',
                      options: Array.isArray(field.options) ? field.options : [],
                      formula: field.formula || '',
                      description: field.description || '',
                      mappable: field.mappable ?? false,
                      inventory_action: validInventoryAction
                    };
                  })
                : []
            });
            
            // Check for asset type links after loading form
            const links = await getFormAssetTypeLinks(id, currentOrganization.id);
            
            if (links && links.length > 0) {
              const firstLink = links[0];
              setSelectedAssetTypeId(firstLink.asset_type_id);
            }
          }
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to load form data",
            variant: "destructive",
          });
        } finally {
          setIsLoading(false);
        }
      } else {
        // Creating new form
        if (assetTypeIdFromQuery) {
          // Asset type provided in URL
          setSelectedAssetTypeId(assetTypeIdFromQuery);
        } else {
          // Show asset type selection for new forms
          setShowAssetTypeSelection(true);
        }
      }
    };

    initializeForm();
  }, [id, currentOrganization?.id, assetTypeIdFromQuery]);

  // Generate unique ID for new fields
  const generateFieldId = () => {
    const ids = formData.fields.map(field => {
      const match = field.id.match(/field_(\d+)/);
      return match ? parseInt(match[1]) : 0;
    });
    const maxId = Math.max(...ids, 0);
    return `field_${maxId + 1}`;
  };

  // Memoize all field update/remove/move/add functions
  const updateField = useCallback((id: string, key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.map(field => 
        field.id === id ? { ...field, [key]: value } : field
      ),
    }));
  }, []);
  const removeField = useCallback((id: string) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.filter(field => field.id !== id),
    }));
    
    if (selectedField === id) {
      setSelectedField(null);
    }
  }, [selectedField]);
  const moveField = useCallback((id: string, direction: 'up' | 'down') => {
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
  }, []);
  const addField = useCallback(() => {
    const newField: FormField = {
      id: generateFieldId(),
      label: "New Field",
      type: "text",
      required: false,
      placeholder: "Enter value",
      options: [],
      formula: "",
      description: "",
      mappable: false,
      inventory_action: 'none'
    };
    
    setFormData(prev => ({
      ...prev,
      fields: [...prev.fields, newField],
    }));
    
    setSelectedField(newField.id);
    
    // Scroll to the new field after render
    setTimeout(() => {
      fieldRefs.current[newField.id]?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, []);
  const addFieldOfType = useCallback((type: string) => {
    const newField: FormField = {
      id: generateFieldId(),
      label: type === "current_inventory" ? "Current Inventory" : 
             type === "calculated" ? "Calculated Field" : "New Field",
      type: type,
      required: type === "current_inventory",
      placeholder: type === "current_inventory" ? "Enter current inventory count" : 
                   type === "number" ? "Enter number" : 
                   type === "calculated" ? "Will be calculated automatically" : "Enter value",
      options: [],
      formula: "",
      description: "",
      mappable: type === "current_inventory" || type === "calculated",
      inventory_action: 'none'
    };
    
    setFormData(prev => ({
      ...prev,
      fields: [...prev.fields, newField],
    }));
    
    setSelectedField(newField.id);
    
    // Scroll to the new field after render
    setTimeout(() => {
      fieldRefs.current[newField.id]?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, []);
  const updateFormMeta = useCallback((key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  // Handle drag start
  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    setFieldBeingDragged(id);
  }, []);

  // Handle drag over
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  // Handle drop
  const handleDrop = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain');
    
    if (sourceId !== targetId) {
      const sourceIndex = formData.fields.findIndex(field => field.id === sourceId);
      const targetIndex = formData.fields.findIndex(field => field.id === targetId);
      
      const reorderedFields = [...formData.fields];
      const [movedField] = reorderedFields.splice(sourceIndex, 1);
      reorderedFields.splice(targetIndex, 0, movedField);
      
      setFormData(prev => ({
        ...prev,
        fields: reorderedFields,
      }));
    }
    
    setFieldBeingDragged(null);
  }, [formData.fields]);

  // Add option to a select field
  const addOption = useCallback((fieldId: string) => {
    if (!newOptionText.trim()) return;
    
    const field = formData.fields.find(f => f.id === fieldId);
    if (field) {
      const updatedOptions = [...field.options, newOptionText];
      updateField(fieldId, 'options', updatedOptions);
      setNewOptionText("");
    }
  }, [newOptionText, formData.fields, updateField]);

  // Remove option from a select field
  const removeOption = useCallback((fieldId: string, optionIndex: number) => {
    const field = formData.fields.find(f => f.id === fieldId);
    if (field) {
      const updatedOptions = field.options.filter((_, i) => i !== optionIndex);
      updateField(fieldId, 'options', updatedOptions);
    }
  }, [formData.fields, updateField]);

  // Save form (now with asset type linking)
  const saveForm = async () => {
    if (!currentOrganization?.id) {
      toast({
        title: "Error",
        description: "No organization selected. Please ensure you're connected to an organization.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Form title is required",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const formDataToSave = {
        name: formData.title,
        description: formData.description,
        organization_id: currentOrganization.id,
        form_data: JSON.parse(JSON.stringify({ fields: formData.fields })),
      };

      let savedForm;
      if (id) {
        // Update existing form
        savedForm = await updateForm(id, formDataToSave);
      } else {
        // Create new form
        savedForm = await createForm(formDataToSave);
      }

      if (savedForm) {
        // Auto-link form to selected asset type if creating new form
        const effectiveAssetTypeId = selectedAssetTypeId || assetTypeIdFromQuery;
        if (!id && effectiveAssetTypeId) {
          try {
            // Use selected form purpose, or purpose from query, or default to 'other'
            const formPurpose = selectedFormPurpose || purposeFromQuery || 'other';
            await addAssetTypeFormLink(
              effectiveAssetTypeId,
              savedForm.id,
              formPurpose,
              currentOrganization.id
            );
          } catch (linkError) {
            // Silently handle link error - form was created successfully
          }
        }

        // Sync mapped fields if we have an asset type
        if (effectiveAssetTypeId) {
          await syncMappedFieldsForAssetType(currentOrganization.id, effectiveAssetTypeId);
        }

        toast({
          title: "Success",
          description: id ? "Form updated successfully" : "Form created successfully",
        });

        // Reset formula builders to text mode after save
        setResetFormulaToTextMode(true);
        setTimeout(() => setResetFormulaToTextMode(false), 100);

        navigate("/forms");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save form",
        variant: "destructive",
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
      // Use secure safe evaluator for formula preview
      sampleResult = FormBuilderEvaluator.previewCalculation(formula);
    } catch (e) {
      // Formula evaluation failed
    }
    
    return sampleResult;
  };

  const getMappedFieldsFromFormula = (formula: string): string[] => {
    const matches = formula.match(/\{mapped\.([a-zA-Z0-9_]+)\}/g) || [];
    return [...new Set(matches.map(m => m.slice(1, -1)))]; 
  };

  useEffect(() => {
    if (selectedField) {
      const field = formData.fields.find(f => f.id === selectedField);
      if (field && field.type === 'calculated' && field.formula) {
        const dependencies = getMappedFieldsFromFormula(field.formula);
        const newMocks = { ...mockMappedValues };
        dependencies.forEach(depKey => {
          if (!(depKey in newMocks)) {
            newMocks[depKey] = ''; 
          }
        });
        setMockMappedValues(newMocks);
      }
    }
  }, [selectedField, formData.fields]); // Rerun if selected field or any field's formula changes.

  const handleMockValueChange = (mappedFieldKey: string, value: string) => {
    setMockMappedValues(prev => ({ ...prev, [mappedFieldKey]: value }));
  };
  
  const previewCalculationWithMocks = (formula: string, currentFieldsInForm: FormField[], localMockValues: { [key: string]: string | number }) => {
    if (!formula || formula.trim() === '') {
      return "No formula";
    }
    
    let processedFormula = formula;
    try {
      // First, replace mapped field references
      for (const key in localMockValues) {
        const value = localMockValues[key];
        if (value !== '' && value !== undefined && value !== null) {
          const val = parseFloat(value as string);
          if (!isNaN(val)) {
            // Handle mapped fields like {mapped.field_name}
            if (key.startsWith('mapped.')) {
              processedFormula = processedFormula.replace(new RegExp(`\\{${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}`, 'g'), String(val));
            } else {
              // Handle regular form fields like {field_1}
              processedFormula = processedFormula.replace(new RegExp(`\\{${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}`, 'g'), String(val));
            }
          }
        }
      }

      // Then handle form fields that don't have mock values but are referenced in the formula
      const typeSafeFields = currentFieldsInForm.map(cf => ({
        ...cf,
        inventory_action: validateInventoryAction(cf.inventory_action)
      }));

      typeSafeFields.forEach(cf => {
        if (processedFormula.includes(`{${cf.id}}`)) {
          // Use mock value if available, otherwise use placeholder or default to 1
          const mockValue = localMockValues[cf.id];
          if (mockValue !== undefined && mockValue !== '' && mockValue !== null) {
            const val = parseFloat(mockValue as string);
            if (!isNaN(val)) {
              processedFormula = processedFormula.replace(new RegExp(`\\{${cf.id}\\}`, 'g'), String(val));
            }
          } else {
            // Use placeholder value or default to 1
            const placeholderVal = parseFloat(cf.placeholder);
            const defaultVal = isNaN(placeholderVal) ? 1 : placeholderVal; 
            processedFormula = processedFormula.replace(new RegExp(`\\{${cf.id}\\}`, 'g'), String(defaultVal));
          }
        }
      });
      
      // Replace any remaining field references with 0
      processedFormula = processedFormula.replace(/\{([a-zA-Z0-9_.]+)\}/g, '0');
      
      // Clean up the formula
      processedFormula = processedFormula.trim().replace(/\s+/g, ' ');
      
      // Validation checks
      if (/[+\-*/]\s*$/.test(processedFormula)) {
        return "Incomplete formula";
      }
      
      const openParens = (processedFormula.match(/\(/g) || []).length;
      const closeParens = (processedFormula.match(/\)/g) || []).length;
      if (openParens !== closeParens) {
        return "Unmatched parentheses";
      }
      
      if (!processedFormula || processedFormula.trim() === '') {
        return "Empty formula";
      }
  
      // Use secure safe evaluator for calculation with formatting
      return FormBuilderEvaluator.calculateWithFormatting(
        formula, 
        currentFieldsInForm, 
        localMockValues
      );
    } catch (e) {
      return "Calculation Error";
    }
  };

  // Functions for managing mock value sets
  const saveMockValueSet = () => {
    const setName = window.prompt('Name for this set of test values:');
    if (!setName) return;
    
    const newSet: MockValueSet = {
      id: `set_${Date.now()}`,
      name: setName,
      values: {...mockMappedValues}
    };
    
    setMockValueSets(prev => [...prev, newSet]);
    setActiveMockSetId(newSet.id);
  };

  const loadMockValueSet = (setId: string) => {
    const set = mockValueSets.find(s => s.id === setId);
    if (set) {
      setMockMappedValues({...set.values});
      setActiveMockSetId(setId);
    }
  };

  const deleteMockValueSet = (setId: string) => {
    setMockValueSets(prev => prev.filter(s => s.id !== setId));
    if (activeMockSetId === setId) {
      setActiveMockSetId(null);
    }
  };

  // Load mapped fields (now enhanced for asset types)
  const loadMappedFields = async () => {
    if (!currentOrganization?.id) return;
    
    try {
      const effectiveAssetTypeId = selectedAssetTypeId || assetTypeIdFromQuery;
      
      if (effectiveAssetTypeId) {
        // Get comprehensive mapped fields for the selected asset type
        const { conversionFields, formMappedFields } = await getAllMappedFieldsForAssetType(
          effectiveAssetTypeId, 
          currentOrganization.id
        );
        
        // Combine conversion fields and form mapped fields into a unified format
        const allFields = [
          // Conversion fields from asset type - ensure they all have the right format
          ...conversionFields.map((field, index) => ({
            id: field.id || `conversion_${index}`,
            field_id: field.field_name,
            field_label: field.label,
            field_type: field.type,
            form_name: 'Asset Type Conversions',
            source: 'conversion' as const,
            description: field.description,
            form_id: effectiveAssetTypeId // Use asset type ID as form_id for conversions
          })),
          // Mapped fields from linked forms
          ...formMappedFields.map(field => ({
            ...field,
            source: 'form' as const
          }))
        ];
        
        setMappedFields(allFields);
      } else {
        // Fallback to organization-wide mapped fields if no asset type selected
        const fields = await getMappedFields(currentOrganization.id);
        setMappedFields(fields.map(field => ({ ...field, source: 'form' as const })));
      }
    } catch (error) {
      setMappedFields([]);
    }
  };

  // Load asset types
  const loadAssetTypes = async () => {
    if (!currentOrganization?.id) return;
    
    try {
      const types = await getAssetTypes(currentOrganization.id);
      setAssetTypes(types);
    } catch (error) {
      // Silently handle error - asset types are optional
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
                Contact your administrator to ensure you have the proper organization setup.
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
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold truncate">
            {id ? "Edit Form" : "Create Form"}
          </h1>
          {currentOrganization && (
            <p className="text-sm text-muted-foreground truncate">
              Organization: {currentOrganization.name}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button onClick={() => navigate("/forms")} variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button 
            onClick={saveForm} 
            disabled={isSaving || formData.title.trim() === "" || formData.fields.length === 0}
            size="sm"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span className="hidden sm:inline">Saving...</span>
                <span className="sm:hidden">Save</span>
              </>
            ) : (
              <>
                <span className="hidden sm:inline">Save Form</span>
                <span className="sm:hidden">Save</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Asset Type Information Panel */}
      {selectedAssetType && (
        <Card className="mb-6 border-l-4" style={{ borderLeftColor: selectedAssetType.color || '#6E56CF' }}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                  style={{ backgroundColor: selectedAssetType.color || '#6E56CF' }}
                >
                  {selectedAssetType.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold">{selectedAssetType.name}</h3>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>
                      {mappedFields.filter(f => f.source === 'conversion').length} conversion fields
                    </span>
                    <span>
                      {mappedFields.filter(f => f.source === 'form').length} form fields
                    </span>
                    <span className="text-green-600">
                      ✓ Available in formulas
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/asset-types/${selectedAssetType.id}`)}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Manage Asset Type
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAssetTypeSelection(true)}
                >
                  Change Type
                </Button>
              </div>
            </div>
            
            {/* Show conversion fields if available */}
            {mappedFields.filter(f => f.source === 'conversion').length > 0 && (
              <div className="mt-3 p-3 bg-blue-50 rounded-md border border-blue-200">
                <p className="text-sm text-blue-800 font-medium mb-2">
                  Conversion Fields Available for Formulas:
                </p>
                <div className="flex flex-wrap gap-1">
                  {mappedFields.filter(f => f.source === 'conversion').slice(0, 5).map(field => (
                    <Badge key={field.id} variant="secondary" className="text-xs">
                      {field.field_label}
                    </Badge>
                  ))}
                  {mappedFields.filter(f => f.source === 'conversion').length > 5 && (
                    <Badge variant="outline" className="text-xs">
                      +{mappedFields.filter(f => f.source === 'conversion').length - 5} more
                    </Badge>
                  )}
                </div>
              </div>
            )}
            
            {/* Show form mapped fields if available */}
            {mappedFields.filter(f => f.source === 'form').length > 0 && (
              <div className="mt-3 p-3 bg-green-50 rounded-md border border-green-200">
                <p className="text-sm text-green-800 font-medium mb-2">
                  Mapped Fields from Linked Forms:
                </p>
                <div className="flex flex-wrap gap-1">
                  {mappedFields.filter(f => f.source === 'form').slice(0, 5).map(field => (
                    <Badge key={field.id} variant="secondary" className="text-xs">
                      {field.field_label} ({field.form_name})
                    </Badge>
                  ))}
                  {mappedFields.filter(f => f.source === 'form').length > 5 && (
                    <Badge variant="outline" className="text-xs">
                      +{mappedFields.filter(f => f.source === 'form').length - 5} more
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 relative">
        <div className="xl:col-span-8">
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
                
                {/* Asset type links for existing forms */}
                {id && (
                  <div className="mt-4">
                    {loadingAssetTypeLinks ? (
                      <div className="text-xs text-muted-foreground">Loading asset type links...</div>
                    ) : assetTypeLinks.length > 0 ? (
                      <div>
                        <Label className="text-sm text-muted-foreground">Linked to Asset Types:</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {assetTypeLinks.map(link => (
                            <span
                              key={link.asset_type_id + link.purpose}
                              className="px-2 py-1 rounded text-xs font-medium cursor-pointer hover:opacity-80"
                              style={{ backgroundColor: link.asset_type_color || '#e5e7eb', color: '#222' }}
                              title={link.purpose ? `Purpose: ${link.purpose}` : ''}
                              onClick={() => navigate(`/asset-types/${link.asset_type_id}`)}
                            >
                              {link.asset_type_name}
                              {link.purpose ? ` (${link.purpose})` : ''}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">Not linked to any asset types</div>
                    )}
                  </div>
                )}
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
                      {fieldTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {/* Bulk Operations */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        Bulk Operations
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Bulk Field Operations</DialogTitle>
                        <DialogDescription>
                          Import, export, or manage multiple fields at once
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Export Fields</Label>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => {
                                const fieldsData = JSON.stringify(formData.fields, null, 2);
                                const blob = new Blob([fieldsData], { type: 'application/json' });
                                const url = URL.createObjectURL(blob);
                                const link = document.createElement('a');
                                link.href = url;
                                link.download = `${formData.title.replace(/\s+/g, '_')}_fields.json`;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                              }}
                              className="flex-1"
                            >
                              Export All Fields
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => {
                                const mappableFields = formData.fields.filter(f => f.mappable);
                                const fieldsData = JSON.stringify(mappableFields, null, 2);
                                const blob = new Blob([fieldsData], { type: 'application/json' });
                                const url = URL.createObjectURL(blob);
                                const link = document.createElement('a');
                                link.href = url;
                                link.download = `${formData.title.replace(/\s+/g, '_')}_mappable_fields.json`;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                              }}
                              className="flex-1"
                            >
                              Export Mappable Only
                            </Button>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Import Fields</Label>
                          <Input
                            type="file"
                            accept=".json"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  try {
                                    const importedFields = JSON.parse(event.target?.result as string);
                                    if (Array.isArray(importedFields)) {
                                      const validatedFields = importedFields.map(field => ({
                                        ...field,
                                        id: `field_${Date.now()}_${Math.random()}`,
                                        inventory_action: validateInventoryAction(field.inventory_action),
                                      }));
                                      setFormData(prev => ({
                                        ...prev,
                                        fields: [...prev.fields, ...validatedFields]
                                      }));
                                      toast({
                                        title: "Success",
                                        description: `Imported ${validatedFields.length} fields`,
                                      });
                                    }
                                  } catch (error) {
                                    toast({
                                      title: "Error",
                                      description: "Invalid JSON file",
                                      variant: "destructive",
                                    });
                                  }
                                };
                                reader.readAsText(file);
                              }
                            }}
                          />
                          <p className="text-xs text-muted-foreground">
                            Import fields from a JSON file (will be added to existing fields)
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Clear Fields</Label>
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={() => {
                              if (confirm('Are you sure you want to remove all fields? This cannot be undone.')) {
                                setFormData(prev => ({ ...prev, fields: [] }));
                                setSelectedField(null);
                                toast({
                                  title: "Fields Cleared",
                                  description: "All fields have been removed",
                                });
                              }
                            }}
                            className="w-full"
                          >
                            Clear All Fields
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              <div className="space-y-4">
                {formData.fields.map((field) => (
                  <FieldRow
                    key={field.id}
                    field={field}
                    selectedField={selectedField}
                    fieldBeingDragged={fieldBeingDragged}
                    fieldRefs={fieldRefs}
                    setSelectedField={setSelectedField}
                    handleDragStart={handleDragStart}
                    handleDragOver={handleDragOver}
                    handleDrop={handleDrop}
                    removeField={removeField}
                    moveField={moveField}
                    updateField={updateField}
                    formData={formData}
                    mappedFields={mappedFields}
                                         resetFormulaToTextMode={resetFormulaToTextMode}
                     previewCalculationWithMocks={previewCalculationWithMocks}
                     mockMappedValues={mockMappedValues}
                     addOption={addOption}
                     removeOption={removeOption}
                     newOptionText={newOptionText}
                     setNewOptionText={setNewOptionText}
                   />
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
        
        <div className="xl:col-span-4">
          <div className="sticky top-4 space-y-4">
            <Card className="border-2">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Field Properties</h2>
                  {selectedField && (
                    <Badge variant="outline" className="text-xs">
                      {formData.fields.find(f => f.id === selectedField)?.type || 'field'}
                    </Badge>
                  )}
                </div>
                
                {selectedField ? (
                  (() => {
                    const field = formData.fields.find(f => f.id === selectedField);
                    if (!field) return null;
                    
                    return (
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="fieldLabel" className="text-sm font-medium">Field Label</Label>
                          <Input
                            id="fieldLabel"
                            value={field.label}
                            onChange={(e) => updateField(field.id, 'label', e.target.value)}
                            className="mt-1"
                            placeholder="Enter field label"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="fieldType" className="text-sm font-medium">Field Type</Label>
                          <Select
                            value={field.type}
                            onValueChange={(value) => updateField(field.id, 'type', value)}
                          >
                            <SelectTrigger id="fieldType" className="mt-1">
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
                            <Label htmlFor="fieldPlaceholder" className="text-sm font-medium">Placeholder</Label>
                            <Input
                              id="fieldPlaceholder"
                              value={field.placeholder}
                              onChange={(e) => updateField(field.id, 'placeholder', e.target.value)}
                              className="mt-1"
                              placeholder="Enter placeholder text"
                            />
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between py-2">
                          <Label htmlFor="fieldRequired" className="text-sm font-medium">Required Field</Label>
                          <Switch
                            id="fieldRequired"
                            checked={field.required}
                            onCheckedChange={(checked) => updateField(field.id, 'required', checked)}
                          />
                        </div>

                        {/* Add Mappable Field toggle */}
                        <div className="flex items-center justify-between py-2">
                          <div className="flex items-center gap-2">
                            <Label htmlFor="fieldMappable" className="text-sm font-medium">Mappable Field</Label>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span tabIndex={0}>
                                    <InfoIcon className="h-4 w-4 text-muted-foreground" />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="max-w-xs">
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

                        {/* Enhanced Inventory Action selector for number and calculated fields */}
                        {(field.type === "number" || field.type === "calculated" || field.type === "current_inventory") && (
                          <div className="space-y-3">
                            <Label htmlFor="inventoryAction" className="text-sm font-medium">Inventory Action</Label>
                            <Select
                              value={field.inventory_action || 'none'}
                              onValueChange={(value) => updateField(field.id, 'inventory_action', value)}
                            >
                              <SelectTrigger id="inventoryAction" className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">
                                  <div className="py-1">
                                    <div className="font-medium">None - Just track value</div>
                                    <div className="text-xs text-muted-foreground">Records the value without affecting inventory</div>
                                  </div>
                                </SelectItem>
                                <SelectItem value="add">
                                  <div className="py-1">
                                    <div className="font-medium">Add to current stock</div>
                                    <div className="text-xs text-muted-foreground">For intake forms: "I got 5 more gallons"</div>
                                  </div>
                                </SelectItem>
                                <SelectItem value="subtract">
                                  <div className="py-1">
                                    <div className="font-medium">Subtract from current stock</div>
                                    <div className="text-xs text-muted-foreground">For usage forms: "I used 3 gallons"</div>
                                  </div>
                                </SelectItem>
                                <SelectItem value="set">
                                  <div className="py-1">
                                    <div className="font-medium">Set as new stock level</div>
                                    <div className="text-xs text-muted-foreground">For inventory counts: "I counted 17 gallons total"</div>
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            
                            {/* Enhanced descriptions with examples */}
                            <div className="p-3 rounded-md bg-muted/30 border">
                              {field.inventory_action === 'add' && (
                                <div className="text-sm">
                                  <div className="font-medium text-green-700 mb-1">🔼 ADD Example:</div>
                                  <div className="text-muted-foreground">
                                    Current stock: <strong>17 gallons</strong><br/>
                                    This field value: <strong>5 gallons</strong><br/>
                                    New stock: <strong>22 gallons</strong> (17 + 5)
                                  </div>
                                </div>
                              )}
                              {field.inventory_action === 'subtract' && (
                                <div className="text-sm">
                                  <div className="font-medium text-orange-700 mb-1">🔽 SUBTRACT Example:</div>
                                  <div className="text-muted-foreground">
                                    Current stock: <strong>20 gallons</strong><br/>
                                    This field value: <strong>3 gallons</strong><br/>
                                    New stock: <strong>17 gallons</strong> (20 - 3)
                                  </div>
                                </div>
                              )}
                              {field.inventory_action === 'set' && (
                                <div className="text-sm">
                                  <div className="font-medium text-blue-700 mb-1">📋 SET Example:</div>
                                  <div className="text-muted-foreground">
                                    Previous stock: <strong>20 gallons</strong><br/>
                                    This field value: <strong>17 gallons</strong><br/>
                                    New stock: <strong>17 gallons</strong> (set to this amount)<br/>
                                    <span className="text-xs text-amber-600">
                                      📈 Automatically tracks 3 gallons as "used" in history
                                    </span>
                                  </div>
                                </div>
                              )}
                              {field.inventory_action === 'none' && (
                                <div className="text-sm">
                                  <div className="font-medium text-gray-700 mb-1">📊 TRACK ONLY:</div>
                                  <div className="text-muted-foreground">
                                    This field will be recorded in the form submission but won't change inventory levels. 
                                    Good for notes, measurements, or reference values.
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {/* Warning for calculated fields */}
                            {field.type === "calculated" && field.inventory_action !== 'none' && (
                              <div className="p-3 rounded-md bg-blue-50 border border-blue-200">
                                <div className="flex items-start gap-2">
                                  <div className="text-blue-600 mt-0.5">💡</div>
                                  <div className="text-sm">
                                    <div className="font-medium text-blue-800 mb-1">Perfect for Calculated Fields!</div>
                                    <div className="text-blue-700">
                                      This calculated field will use its formula result for the inventory action. 
                                      Great for totaling up multiple measurements or applying conversions.
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        <div>
                          <Label htmlFor="fieldDescription" className="text-sm font-medium">Description</Label>
                          <Textarea
                            id="fieldDescription"
                            value={field.description || ''}
                            onChange={(e) => updateField(field.id, 'description', e.target.value)}
                            placeholder="Help text shown below the field"
                            className="mt-1 min-h-[80px] resize-y"
                            rows={3}
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
                            <Label className="text-sm font-medium">Options</Label>
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
                  <div className="text-center py-12 px-4">
                    <div className="max-w-sm mx-auto">
                      <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                        <Settings className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-medium mb-2">No Field Selected</h3>
                      <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
                        Click on a field in the form builder to edit its properties, or create a new field to get started.
                      </p>
                      {formData.fields.length > 0 ? (
                        <Button variant="outline" size="sm" onClick={() => setSelectedField(formData.fields[0].id)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Select First Field
                        </Button>
                      ) : (
                        <div className="space-y-2">
                          <Button variant="outline" size="sm" onClick={() => addFieldOfType("current_inventory")} className="w-full">
                            <Plus className="mr-2 h-4 w-4" />
                            Add Inventory Field
                          </Button>
                          <Button variant="ghost" size="sm" onClick={addField} className="w-full">
                            <Plus className="mr-2 h-4 w-4" />
                            Add Basic Field
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Mock Values Card - separate card that will also follow */}
            {(() => {
              const currentCalcField = formData.fields.find(f => f.id === selectedField);
              let mappedDependenciesInFormula: string[] = [];
              let fieldDependenciesInFormula: string[] = [];
              let formulaValidationRes: { isValid: boolean; error?: string; referencedFields: string[]; referencedMappedFields: string[]; } = { isValid: true, referencedFields: [], referencedMappedFields: [] };
              
              if (currentCalcField && currentCalcField.type === 'calculated' && currentCalcField.formula) {
                mappedDependenciesInFormula = getMappedFieldsFromFormula(currentCalcField.formula);
                formulaValidationRes = validateFormula(
                  currentCalcField.formula, 
                  formData.fields.filter(f => f.id !== selectedField),
                  mappedFields,
                  true // Use lenient mode for Mock Values testing - allows non-existent fields
                );
                fieldDependenciesInFormula = formulaValidationRes.referencedFields;
              }

              const hasAnyDependencies = mappedDependenciesInFormula.length > 0 || fieldDependenciesInFormula.length > 0;

              if (hasAnyDependencies || (currentCalcField && currentCalcField.type === 'calculated')) {
                return (
                  <Card className="border-2 border-green-200">
                    <CardContent className="p-4">
                      {currentCalcField && currentCalcField.type === 'calculated' && !formulaValidationRes.isValid && (
                        <div className="p-2 bg-red-50 border border-red-200 rounded-md mb-3">
                          <p className="text-xs font-medium text-red-800">{formulaValidationRes.error}</p>
                        </div>
                      )}
                      
                      <div className="flex justify-between items-center mb-4">
                        <p className="text-sm font-medium text-muted-foreground">Mock Values for Formula Testing</p>
                        <div className="flex gap-2">
                          <Select value={activeMockSetId || ''} onValueChange={value => value && loadMockValueSet(value)}>
                            <SelectTrigger className="h-8 text-xs w-[130px]">
                              <SelectValue placeholder="Load saved..." />
                            </SelectTrigger>
                            <SelectContent>
                              {mockValueSets.map(set => (
                                <SelectItem key={set.id} value={set.id}>{set.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 text-xs"
                            onClick={saveMockValueSet}
                            disabled={!hasAnyDependencies}
                          >
                            Save Values
                          </Button>
                        </div>
                      </div>
                      
                      {/* Form Fields used in formula */}
                      {fieldDependenciesInFormula.length > 0 && (
                        <div className="space-y-2 mb-4">
                          <p className="text-xs font-medium text-blue-700">Form Fields:</p>
                          {fieldDependenciesInFormula.map(fieldId => {
                            const referencedField = formData.fields.find(f => f.id === fieldId);
                            const label = referencedField ? referencedField.label : fieldId;
                            return (
                              <div key={fieldId} className="relative">
                                <Label htmlFor={`mock-field-${fieldId}`} className="text-xs flex items-center">
                                  {label}
                                  <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                                    form field
                                  </span>
                                </Label>
                                <Input
                                  id={`mock-field-${fieldId}`}
                                  type="number"
                                  value={mockMappedValues[fieldId] || ""}
                                  placeholder="Enter test value"
                                  className="h-8 text-xs"
                                  onChange={(e) => handleMockValueChange(fieldId, e.target.value)}
                                />
                              </div>
                            );
                          })}
                        </div>
                      )}
                      
                      {/* Mapped Fields used in formula */}
                      {mappedDependenciesInFormula.length > 0 && (
                        <div className="space-y-2 mb-4">
                          <p className="text-xs font-medium text-green-700">Mapped Fields:</p>
                          {mappedDependenciesInFormula.map(depKey => {
                            const originalMappedField = mappedFields.find(mf => `mapped.${mf.field_id}` === depKey);
                            const label = originalMappedField ? 
                              `${originalMappedField.field_label} (from ${originalMappedField.source === 'conversion' ? 'Asset Type Conversions' : originalMappedField.form_name})` : 
                              depKey;
                            return (
                              <div key={depKey} className="relative">
                                <Label htmlFor={`mock-${depKey}`} className="text-xs flex items-center">
                                  {label}
                                  <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-green-100 text-green-800 rounded-full">
                                    mapped
                                  </span>
                                </Label>
                                <Input
                                  id={`mock-${depKey}`}
                                  type="number"
                                  value={mockMappedValues[depKey] || ""}
                                  placeholder="Enter test value"
                                  className="h-8 text-xs"
                                  onChange={(e) => handleMockValueChange(depKey, e.target.value)}
                                />
                              </div>
                            );
                          })}
                        </div>
                      )}
                      
                      {activeMockSetId && (
                        <div className="flex justify-end mt-2 mb-4">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => deleteMockValueSet(activeMockSetId)}
                          >
                            Delete Saved Set
                          </Button>
                        </div>
                      )}
                      
                      {currentCalcField && currentCalcField.type === 'calculated' && currentCalcField.formula && (
                         <div className="p-3 border border-green-200 bg-green-50 rounded-md">
                          <div className="flex justify-between items-center mb-2">
                            <p className="text-sm font-semibold text-green-800">Formula Result:</p>
                            <Badge variant={formulaValidationRes.isValid ? "success" : "destructive"} className="text-[10px]">
                              {formulaValidationRes.isValid ? "Valid" : "Invalid"}
                            </Badge>
                          </div>
                          <p className="font-mono text-lg font-semibold text-green-900">
                            {formulaValidationRes.isValid
                              ? previewCalculationWithMocks(
                                  currentCalcField!.formula, 
                                  formData.fields.filter(f => f.id !== selectedField), 
                                  mockMappedValues
                                )
                              : "—"
                            }
                          </p>
                          <p className="text-xs text-green-700 mt-1">
                            Real-time calculation using mock values above. Non-existent fields use fallback values.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              }
              return null; 
            })()}
          </div>
        </div>
      </div>

      {/* Asset Type Selection Dialog for New Forms */}
      <Dialog open={showAssetTypeSelection} onOpenChange={(open) => {
        // Prevent closing if this is a new form without asset type selected
        if (!open && !id && !effectiveAssetTypeId) {
          toast({
            title: "Asset Type Required",
            description: "Please select an asset type to continue creating your form",
            variant: "destructive",
          });
          return;
        }
        setShowAssetTypeSelection(open);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Asset Type</DialogTitle>
            <DialogDescription>
              Choose which asset type this form will be used for. <strong>This selection is required</strong> to organize your forms and provide relevant mapped fields for formulas.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="asset-type-select">Asset Type *</Label>
              <Select 
                value={selectedAssetTypeId} 
                onValueChange={setSelectedAssetTypeId}
              >
                <SelectTrigger id="asset-type-select">
                  <SelectValue placeholder="Select an asset type" />
                </SelectTrigger>
                <SelectContent>
                  {assetTypes.map((assetType) => (
                    <SelectItem key={assetType.id} value={assetType.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: assetType.color || '#6E56CF' }}
                        />
                        {assetType.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="form-purpose-select">Form Purpose (Optional)</Label>
              <Select 
                value={selectedFormPurpose} 
                onValueChange={setSelectedFormPurpose}
              >
                <SelectTrigger id="form-purpose-select">
                  <SelectValue placeholder="Select a purpose (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="intake">Intake Form - For adding new items</SelectItem>
                  <SelectItem value="inventory">Inventory Form - For tracking existing items</SelectItem>
                  <SelectItem value="adjustment">Adjustment Form - For inventory adjustments</SelectItem>
                  <SelectItem value="transfer">Transfer Form - For moving items</SelectItem>
                  <SelectItem value="audit">Audit Form - For inventory audits</SelectItem>
                  <SelectItem value="other">Other - General purpose</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                This helps suggest which form to use for different operations, but can be changed later.
              </p>
            </div>
            
            {selectedAssetTypeId && (
              <div className="text-sm text-muted-foreground p-3 bg-blue-50 rounded-lg">
                <strong>Benefits of linking to an asset type:</strong>
                <ul className="mt-1 list-disc list-inside text-xs space-y-1">
                  <li>Formula fields will show conversion fields from this asset type</li>
                  <li>Access to mapped fields from other forms linked to this asset type</li> 
                  <li>Form will be automatically linked to this asset type</li>
                  <li>Better organization and asset type management</li>
                </ul>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                // For new forms, navigate back to forms page if they cancel
                if (!id) {
                  navigate('/forms');
                } else {
                  setShowAssetTypeSelection(false);
                  setSelectedAssetTypeId('');
                  setSelectedFormPurpose('');
                }
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                setShowAssetTypeSelection(false);
                if (selectedAssetTypeId) {
                  loadMappedFields(); // Reload mapped fields for selected asset type
                }
              }}
              disabled={!selectedAssetTypeId}
            >
              Continue with {assetTypes.find(at => at.id === selectedAssetTypeId)?.name || 'Selected Type'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FormBuilder;
