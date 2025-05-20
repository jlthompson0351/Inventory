import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  FormControl, 
  FormDescription, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Upload, File, X } from "lucide-react";
// Import formula evaluator functions
import { evaluateFormula, extractFieldReferences } from "@/lib/formulaEvaluator";

// Field types that could be in a dynamic form
type FieldType = 
  | 'text' 
  | 'number' 
  | 'email' 
  | 'password' 
  | 'select' 
  | 'multiselect' 
  | 'textarea' 
  | 'checkbox' 
  | 'file' 
  | 'radio' 
  | 'switch'
  | 'formula'
  | 'current_inventory';

// Condition operator types
type ConditionOperator = 
  | 'equals' 
  | 'notEquals' 
  | 'contains' 
  | 'notContains' 
  | 'greaterThan' 
  | 'lessThan'
  | 'isTrue'
  | 'isFalse'
  | 'isEmpty'
  | 'isNotEmpty';

// Interface for conditional display
interface FieldCondition {
  field: string;
  operator: ConditionOperator;
  value?: any;
}

// Interface for select/radio options
interface FieldOption {
  label: string;
  value: string;
}

// Interface for a single form field
interface FormField {
  id: string;
  label: string;
  type: FieldType;
  required?: boolean;
  description?: string;
  placeholder?: string;
  options?: FieldOption[];
  formula?: string;
  inputFields?: string[];
  defaultValue?: any;
  conditions?: FieldCondition[]; // Conditions that determine if field is displayed
  accept?: string; // File types to accept for file upload
  error?: string; // Error message for field validation
}

// Interface for the form schema
export interface FormSchema {
  fields: FormField[];
}

interface DynamicFormProps {
  formSchema: FormSchema;
  initialValues?: Record<string, any>;
  onChange?: (values: Record<string, any>) => void;
}

export type FieldConfig = {
  id: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  required?: boolean;
  options?: SelectOption[];
  tabIndex?: number;
  autoFocus?: boolean;
};

export type FormValues = {
  [key: string]: string | number | boolean | string[] | File | null;
};

export type SelectOption = {
  label: string;
  value: string;
};

export default function DynamicForm({
  formSchema,
  initialValues = {},
  onChange,
}: DynamicFormProps) {
  const [values, setValues] = useState<Record<string, any>>(initialValues);
  const [calculatedValues, setCalculatedValues] = useState<Record<string, any>>({});
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({});

  // Initialize form values
  useEffect(() => {
    if (!formSchema || !Array.isArray(formSchema.fields)) return;
    const initialFormValues: Record<string, any> = {};
    const initialVisibility: Record<string, boolean> = {};
    
    formSchema.fields.forEach(field => {
      if (field.type !== 'formula') {
        initialFormValues[field.id] = initialValues[field.id] !== undefined 
          ? initialValues[field.id] 
          : field.defaultValue || getDefaultValueForType(field.type);
      }
      // Initialize all fields as visible by default
      initialVisibility[field.id] = true;
    });
    setValues(initialFormValues);
    setVisibleFields(initialVisibility);
  }, [formSchema]); // Only depend on formSchema, not initialValues

  // Calculate formula values when input fields change using the secure evaluator
  useEffect(() => {
    if (!formSchema || !Array.isArray(formSchema.fields)) return;
    const newCalculatedValues: Record<string, any> = {};
    
    formSchema.fields.forEach(field => {
      if (field.type === 'formula' && field.formula) {
        try {
          // Extract referenced fields from formula
          const fieldRefs = extractFieldReferences(field.formula);
          
          // Create variables object for formula evaluation
          const variables: Record<string, any> = {};
          fieldRefs.forEach(fieldId => {
            variables[fieldId] = values[fieldId] || 0;
          });
          
          // Evaluate the formula using our secure evaluator
          const result = evaluateFormula(field.formula, variables);
          newCalculatedValues[field.id] = result;
        } catch (error) {
          console.error(`Error calculating formula for ${field.id}:`, error);
          newCalculatedValues[field.id] = 'Error';
        }
      }
    });
    
    setCalculatedValues(newCalculatedValues);
    
    // Call onChange with combined values (input + calculated)
    if (onChange) {
      onChange({ ...values, ...newCalculatedValues });
    }
  }, [values, formSchema, onChange]);

  // Update field visibility based on conditions
  useEffect(() => {
    if (!formSchema || !Array.isArray(formSchema.fields)) return;
    const newVisibility: Record<string, boolean> = {};
    
    formSchema.fields.forEach(field => {
      if (!field.conditions || field.conditions.length === 0) {
        // No conditions, always visible
        newVisibility[field.id] = true;
      } else {
        // Field is visible if all conditions are met
        newVisibility[field.id] = field.conditions.every(condition => {
          const fieldValue = values[condition.field];
          const conditionValue = condition.value;
          
          switch (condition.operator) {
            case 'equals':
              return fieldValue === conditionValue;
            case 'notEquals':
              return fieldValue !== conditionValue;
            case 'contains':
              return String(fieldValue).includes(String(conditionValue));
            case 'notContains':
              return !String(fieldValue).includes(String(conditionValue));
            case 'greaterThan':
              return Number(fieldValue) > Number(conditionValue);
            case 'lessThan':
              return Number(fieldValue) < Number(conditionValue);
            case 'isTrue':
              return Boolean(fieldValue) === true;
            case 'isFalse':
              return Boolean(fieldValue) === false;
            case 'isEmpty':
              return fieldValue === undefined || fieldValue === null || fieldValue === '';
            case 'isNotEmpty':
              return fieldValue !== undefined && fieldValue !== null && fieldValue !== '';
            default:
              return true;
          }
        });
      }
    });
    
    setVisibleFields(newVisibility);
  }, [values, formSchema]);

  // Get default value based on field type
  const getDefaultValueForType = (type: FieldType): any => {
    switch (type) {
      case 'number':
        return 0;
      case 'checkbox':
      case 'switch':
        return false;
      case 'select':
      case 'radio':
        return '';
      default:
        return '';
    }
  };

  // Handle value changes
  const handleChange = (id: string, value: any) => {
    setValues(prev => ({
      ...prev,
      [id]: value,
    }));
  };

  // Render field based on its type
  const renderField = (field: FormField) => {
    // Don't render hidden fields
    if (visibleFields[field.id] === false) return null;

    // Skip rendering formula fields directly since their values are calculated
    if (field.type === 'formula') return null;

    const fieldValue = values[field.id] || '';
    
    // Render different form controls based on field type
    switch (field.type) {
      case 'text':
        return (
          <div className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.required && <span className="ml-1 text-destructive">*</span>}
            </Label>
            <Input
              id={field.id}
              type="text"
              placeholder={field.placeholder}
              value={fieldValue}
              onChange={e => handleChange(field.id, e.target.value)}
              required={field.required}
            />
            {field.description && (
              <p className="text-sm text-muted-foreground">{field.description}</p>
            )}
          </div>
        );
          
      case 'number':
      case 'current_inventory':
        return (
          <div className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.required && <span className="ml-1 text-destructive">*</span>}
            </Label>
            <Input
              id={field.id}
              type="number"
              placeholder={field.placeholder || (field.type === 'current_inventory' ? 'Enter initial inventory count' : undefined)}
              value={fieldValue}
              onChange={e => {
                // Allow empty string or convert to number
                const rawValue = e.target.value;
                if (rawValue === '') {
                  handleChange(field.id, ''); // Store empty string if user clears input
                } else {
                  const value = parseFloat(rawValue);
                  handleChange(field.id, isNaN(value) ? '' : value); // Store number or empty string if invalid
                }
              }}
              required={field.required}
              min={0} // Consider if negative numbers are ever needed
              step="any" // Allow any decimal value
              className={field.type === 'current_inventory' ? 'font-medium' : ''}
            />
            {field.description && (
              <p className="text-sm text-muted-foreground">{field.description}</p>
            )}
            {field.type === 'current_inventory' && (
              <p className="text-xs text-amber-600">
                This initial value will be used as the baseline for inventory tracking
              </p>
            )}
          </div>
        );
      
      case 'textarea':
        return (
          <div className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.required && <span className="ml-1 text-destructive">*</span>}
            </Label>
            <Textarea
              id={field.id}
              placeholder={field.placeholder}
              value={fieldValue}
              onChange={e => handleChange(field.id, e.target.value)}
              required={field.required}
            />
            {field.description && (
              <p className="text-sm text-muted-foreground">{field.description}</p>
            )}
          </div>
        );
      
      case 'select':
        return (
          <div className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.required && <span className="ml-1 text-destructive">*</span>}
            </Label>
            <Select
              value={fieldValue}
              onValueChange={value => handleChange(field.id, value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={field.placeholder || 'Select an option'} />
              </SelectTrigger>
              <SelectContent className="z-[200]">
                {field.options?.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {field.description && (
              <p className="text-sm text-muted-foreground">{field.description}</p>
            )}
          </div>
        );
      
      case 'checkbox':
        return (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id={field.id}
                checked={!!fieldValue}
                onCheckedChange={checked => handleChange(field.id, checked)}
              />
              <Label htmlFor={field.id}>
                {field.label}
                {field.required && <span className="ml-1 text-destructive">*</span>}
              </Label>
            </div>
            {field.description && (
              <p className="text-sm text-muted-foreground">{field.description}</p>
            )}
          </div>
        );
      
      case 'radio':
        return (
          <div className="space-y-2">
            <Label>
              {field.label}
              {field.required && <span className="ml-1 text-destructive">*</span>}
            </Label>
            <RadioGroup
              value={fieldValue}
              onValueChange={value => handleChange(field.id, value)}
            >
              {field.options?.map(option => (
                <div key={option.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.value} id={`${field.id}-${option.value}`} />
                  <Label htmlFor={`${field.id}-${option.value}`}>{option.label}</Label>
                </div>
              ))}
            </RadioGroup>
            {field.description && (
              <p className="text-sm text-muted-foreground">{field.description}</p>
            )}
          </div>
        );
      
      case 'switch':
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={field.id}>
                {field.label}
                {field.required && <span className="ml-1 text-destructive">*</span>}
              </Label>
              <Switch
                id={field.id}
                checked={!!fieldValue}
                onCheckedChange={checked => handleChange(field.id, checked)}
              />
            </div>
            {field.description && (
              <p className="text-sm text-muted-foreground">{field.description}</p>
            )}
          </div>
        );
      
      case 'file':
        return (
          <div className="mb-4" key={field.id}>
            <Label htmlFor={field.id} className="block mb-2">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {field.description && (
              <p className="text-sm text-gray-500 mb-2">{field.description}</p>
            )}
            
            <input
              type="file"
              id={field.id}
              name={field.id}
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleChange(field.id, e.target.files[0]);
                }
              }}
              accept={field.accept || ".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png"}
            />
            
            <div className="flex items-center gap-2 mb-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById(field.id)?.click()}
              >
                Upload Document
              </Button>
              {fieldValue && typeof fieldValue === 'object' && (
                <span className="text-sm text-gray-600">
                  {(fieldValue as File).name}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="ml-2 h-5 w-5 p-0"
                    onClick={() => handleChange(field.id, null)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </span>
              )}
            </div>
            
            {field.error && (
              <p className="text-sm text-red-500 mt-1">{field.error}</p>
            )}
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {(!formSchema || !Array.isArray(formSchema.fields)) ? (
        <div className="text-red-600 font-semibold">Form schema is missing or invalid. Please contact your administrator.</div>
      ) : (
        formSchema.fields.map(field => (
          <div key={field.id}>{renderField(field)}</div>
        ))
      )}
    </div>
  );
} 