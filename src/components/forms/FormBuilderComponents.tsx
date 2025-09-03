import { useState } from "react";
import { Trash2, Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormulaToolbar } from "../ui/FormulaToolbar";
import { FieldSelector } from "../ui/FieldSelector";
import { FormulaTestPanel } from "../ui/FormulaTestPanel";
import { MappedFieldSelector } from "../ui/MappedFieldSelector";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

// Types from FormBuilder.tsx
export type FieldType = 
  | 'text' 
  | 'number' 
  | 'textarea' 
  | 'select' 
  | 'checkbox' 
  | 'radio' 
  | 'switch'
  | 'formula'
  | 'file'
  | 'current_inventory';

export type ConditionOperator = 
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

export interface FieldOption {
  label: string;
  value: string;
}

export interface FieldCondition {
  field: string;
  operator: ConditionOperator;
  value?: any;
}

export interface FormField {
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
  conditions?: FieldCondition[];
  mappable?: boolean;
  inventory_action?: 'add' | 'subtract' | 'set' | null;
  min?: number;
  max?: number;
  pattern?: string;
}

export interface FormSchema {
  fields: FormField[];
}

// Extracted component for Options Management
export function OptionsManager({ 
  field, 
  index, 
  openOptionDialog, 
  removeOption 
}: { 
  field: FormField; 
  index: number; 
  openOptionDialog: (fieldIndex: number, optionIndex?: number) => void;
  removeOption: (fieldIndex: number, optionIndex: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <Label>Options</Label>
        <Button 
          type="button" 
          variant="outline" 
          size="sm"
          onClick={() => openOptionDialog(index)}
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Option
        </Button>
      </div>
      
      {field.options && field.options.length > 0 ? (
        <div className="space-y-2">
          {field.options.map((option, optionIndex) => (
            <div key={optionIndex} className="flex items-center justify-between gap-2 p-2 border rounded-md">
              <div className="flex-1 truncate">
                <span className="font-medium">{option.label}</span>
                {option.label !== option.value && (
                  <span className="ml-2 text-sm text-muted-foreground">
                    Value: {option.value}
                  </span>
                )}
              </div>
              <div className="flex gap-1">
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon"
                  onClick={() => openOptionDialog(index, optionIndex)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon"
                  onClick={() => removeOption(index, optionIndex)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">
          No options defined. Add at least one option.
        </div>
      )}
    </div>
  );
}

// Extracted component for Formula Field Management
export function FormulaManager({ 
  field, 
  index,
  schema,
  updateField,
  mappedFields = []
}: { 
  field: FormField; 
  index: number;
  schema: FormSchema;
  updateField: (index: number, updates: Partial<FormField>) => void;
  mappedFields?: Array<{id: string, field_id: string, field_label: string, field_type: string, form_name?: string}>;
}) {
  const [tabView, setTabView] = useState<'form-fields' | 'mapped-fields'>('form-fields');
  
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor={`formula-${field.id}`}>Formula</Label>
        <div className="mt-2">
          <FormulaToolbar 
            onInsert={(text, moveCursorBack) => {
              const formulaInput = document.getElementById(`formula-${field.id}`) as HTMLTextAreaElement;
              if (formulaInput) {
                const start = formulaInput.selectionStart || 0;
                const end = formulaInput.selectionEnd || 0;
                const currentValue = formulaInput.value;
                const newValue = 
                  currentValue.substring(0, start) + 
                  text + 
                  currentValue.substring(end);
                
                // Update the field's formula
                updateField(index, { formula: newValue });
                
                // Set cursor position
                setTimeout(() => {
                  if (moveCursorBack) {
                    const newCursorPos = start + text.length - moveCursorBack;
                    formulaInput.selectionStart = newCursorPos;
                    formulaInput.selectionEnd = newCursorPos;
                  } else {
                    formulaInput.selectionStart = start + text.length;
                    formulaInput.selectionEnd = start + text.length;
                  }
                  formulaInput.focus();
                }, 0);
              }
            }}
          />
        </div>
        
        <div className="flex mt-2">
          <Textarea
            id={`formula-${field.id}`}
            value={field.formula || ''}
            onChange={e => updateField(index, { formula: e.target.value })}
            placeholder="Example: {field1} + {field2} * 10"
            className="min-h-20 flex-grow font-mono"
          />
          <div className="ml-2 flex flex-col gap-2">
            <div className="flex gap-1 mb-2">
              <Button 
                size="sm" 
                variant={tabView === 'form-fields' ? 'default' : 'outline'}
                onClick={() => setTabView('form-fields')}
                className="text-xs"
              >
                Form Fields
              </Button>
              <Button 
                size="sm" 
                variant={tabView === 'mapped-fields' ? 'default' : 'outline'}
                onClick={() => setTabView('mapped-fields')}
                className="text-xs"
              >
                Mapped Fields
              </Button>
            </div>
            
            {tabView === 'form-fields' ? (
              <FieldSelector 
                fields={schema.fields
                  .filter(f => f.id !== field.id && ['number', 'text'].includes(f.type))
                  .map(f => ({ id: f.id, label: f.label, type: f.type }))}
                onSelectField={(fieldId, fieldLabel) => {
                  const formulaInput = document.getElementById(`formula-${field.id}`) as HTMLTextAreaElement;
                  if (formulaInput) {
                    const start = formulaInput.selectionStart || 0;
                    const end = formulaInput.selectionEnd || 0;
                    const currentValue = formulaInput.value;
                    const newValue = 
                      currentValue.substring(0, start) + 
                      `{${fieldId}}` + 
                      currentValue.substring(end);
                    
                    // Update the field's formula
                    updateField(index, { formula: newValue });
                    
                    // Set cursor position
                    setTimeout(() => {
                      formulaInput.selectionStart = start + fieldId.length + 2;
                      formulaInput.selectionEnd = start + fieldId.length + 2;
                      formulaInput.focus();
                    }, 0);
                  }
                }}
              />
            ) : (
              <div className="border rounded-md p-2 overflow-y-auto max-h-48 w-64 bg-white">
                <MappedFieldSelector 
                  fields={mappedFields} // Pass the mapped fields from FormBuilder (includes asset data)
                  onSelectField={(fieldId, fieldLabel, formName) => {
                    const formulaInput = document.getElementById(`formula-${field.id}`) as HTMLTextAreaElement;
                    if (formulaInput) {
                      const start = formulaInput.selectionStart || 0;
                      const end = formulaInput.selectionEnd || 0;
                      const currentValue = formulaInput.value;
                      const reference = `{mapped.${fieldId}}`;
                      const newValue = 
                        currentValue.substring(0, start) + 
                        reference + 
                        currentValue.substring(end);
                      
                      // Update the field's formula
                      updateField(index, { formula: newValue });
                      
                      // Set cursor position after insertion
                      setTimeout(() => {
                        formulaInput.selectionStart = start + reference.length;
                        formulaInput.selectionEnd = start + reference.length;
                        formulaInput.focus();
                      }, 0);
                    }
                  }}
                />
              </div>
            )}
          </div>
        </div>
        
        <FormulaTestPanel 
          formula={field.formula || ''} 
          availableFields={schema.fields
            .filter(f => f.id !== field.id)
            .map(f => f.id)}
        />
      </div>
    </div>
  );
}

// Conditions display component
export function ConditionsDisplay({
  conditions,
  schema,
  onRemove
}: {
  conditions: FieldCondition[];
  schema: FormSchema;
  onRemove: (index: number) => void;
}) {
  // Helper function for condition description
  const getConditionDescription = (condition: FieldCondition) => {
    const targetField = schema.fields.find(f => f.id === condition.field);
    if (!targetField) return 'Unknown condition';
    
    let operatorText = '';
    switch(condition.operator) {
      case 'equals': operatorText = 'equals'; break;
      case 'notEquals': operatorText = 'does not equal'; break;
      case 'contains': operatorText = 'contains'; break;
      case 'notContains': operatorText = 'does not contain'; break;
      case 'greaterThan': operatorText = 'is greater than'; break;
      case 'lessThan': operatorText = 'is less than'; break;
      case 'isTrue': operatorText = 'is checked/true'; break;
      case 'isFalse': operatorText = 'is unchecked/false'; break;
      case 'isEmpty': operatorText = 'is empty'; break;
      case 'isNotEmpty': operatorText = 'is not empty'; break;
    }
    
    if (['isTrue', 'isFalse', 'isEmpty', 'isNotEmpty'].includes(condition.operator)) {
      return `When ${targetField.label} ${operatorText}`;
    }
    
    return `When ${targetField.label} ${operatorText} "${condition.value}"`;
  };

  return (
    <div className="space-y-2">
      {conditions.map((condition, i) => (
        <div key={i} className="flex justify-between items-center gap-2">
          <Badge variant="outline" className="flex-1">
            {getConditionDescription(condition)}
          </Badge>
          <Button 
            type="button" 
            variant="ghost" 
            size="icon" 
            onClick={() => onRemove(i)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}

// Field type selector component
export function FieldTypeSelector({
  value,
  onChange
}: {
  value: FieldType;
  onChange: (value: FieldType) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange as any}>
      <SelectTrigger>
        <SelectValue placeholder="Select field type" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="text">Text</SelectItem>
        <SelectItem value="number">Number</SelectItem>
        <SelectItem value="textarea">Long Text</SelectItem>
        <SelectItem value="select">Dropdown</SelectItem>
        <SelectItem value="checkbox">Checkbox</SelectItem>
        <SelectItem value="radio">Radio Button</SelectItem>
        <SelectItem value="switch">Toggle Switch</SelectItem>
        <SelectItem value="formula">Formula</SelectItem>
        <SelectItem value="file">File Upload</SelectItem>
        <SelectItem value="current_inventory">Current Inventory</SelectItem>
      </SelectContent>
    </Select>
  );
}

export function FieldPropertiesPanel({ 
  field, 
  onFieldChange, 
  onRemoveField 
}: {
  field: FormField;
  onFieldChange: (updatedField: FormField) => void;
  onRemoveField: () => void;
}) {
  // Inventory action warnings
  // Find all fields in the current form with inventory_action (assume parent passes all fields as context, or fallback to window for demo)
  let allFields: FormField[] = [];
  try {
    // Try to get all fields from a global context (for demo, real code should pass as prop)
    allFields = (window as any).CURRENT_FORM_FIELDS || [];
  } catch {}
  const setFields = allFields.filter(f => f.inventory_action === 'set');
  const addFields = allFields.filter(f => f.inventory_action === 'add');
  const subtractFields = allFields.filter(f => f.inventory_action === 'subtract');
  const showSetWarning = setFields.length > 1;
  const showAddSubtractWarning = addFields.length > 1 || subtractFields.length > 1;

  return (
    <div className="bg-white p-4 rounded-md border">
      {/* Inventory Action Warnings */}
      {showSetWarning && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Warning: Multiple "Set Inventory" Fields</AlertTitle>
          <AlertDescription>
            Only one field per form should be set to <b>Set Inventory</b>. Please review your fields.
          </AlertDescription>
        </Alert>
      )}
      {showAddSubtractWarning && (
        <Alert variant="warning" className="mb-4">
          <AlertTitle>Notice: Multiple Add/Subtract Fields</AlertTitle>
          <AlertDescription>
            More than one field is set to <b>Add to Inventory</b> or <b>Subtract from Inventory</b>. Make sure this is intentional.
          </AlertDescription>
        </Alert>
      )}
      <h3 className="font-medium text-base mb-4">Field Properties</h3>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="field-label">Field Label</Label>
          <Input
            id="field-label"
            value={field.label}
            onChange={(e) => onFieldChange({ ...field, label: e.target.value })}
            placeholder="Enter field label"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="field-type">Field Type</Label>
          <Select
            value={field.type}
            onValueChange={(value) => onFieldChange({ ...field, type: value as FieldType })}
          >
            <SelectTrigger id="field-type">
              <SelectValue placeholder="Select field type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="number">Number</SelectItem>
              <SelectItem value="textarea">Text Area</SelectItem>
              <SelectItem value="select">Dropdown</SelectItem>
              <SelectItem value="checkbox">Checkbox</SelectItem>
              <SelectItem value="radio">Radio Button</SelectItem>
              <SelectItem value="switch">Toggle Switch</SelectItem>
              <SelectItem value="formula">Formula</SelectItem>
              <SelectItem value="file">File Upload</SelectItem>
              <SelectItem value="current_inventory">Current Inventory</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center space-x-2">
          <Switch
            id="mappable-field"
            checked={field.mappable || false}
            onCheckedChange={(checked) => onFieldChange({ ...field, mappable: checked })}
          />
          <Label htmlFor="mappable-field" className="cursor-pointer">
            Mappable Field (available for formula mapping)
          </Label>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="inventory-action">Inventory Action</Label>
          <Select
            value={field.inventory_action ?? ''}
            onValueChange={(value: string) => {
              if (value === 'add' || value === 'subtract' || value === 'set') {
                onFieldChange({ ...field, inventory_action: value as 'add' | 'subtract' | 'set' });
              } else {
                onFieldChange({ ...field, inventory_action: null });
              }
            }}
          >
            <SelectTrigger id="inventory-action">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">None</SelectItem>
              <SelectItem value="add">Add to Inventory</SelectItem>
              <SelectItem value="subtract">Subtract from Inventory</SelectItem>
              <SelectItem value="set">Set Inventory</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="field-description">Description</Label>
          <Textarea
            id="field-description"
            value={field.description || ''}
            onChange={e => onFieldChange({ ...field, description: e.target.value })}
            placeholder="Optional help text or instructions for this field"
          />
        </div>
        
        {/* Validation controls */}
        {(field.type === 'number' || field.type === 'text') && (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Switch
                id="required-field"
                checked={field.required || false}
                onCheckedChange={checked => onFieldChange({ ...field, required: checked })}
              />
              <Label htmlFor="required-field" className="cursor-pointer">
                Required Field
              </Label>
            </div>
            {field.type === 'number' && (
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="min-value">Min</Label>
                  <Input
                    id="min-value"
                    type="number"
                    value={field.min ?? ''}
                    onChange={e => onFieldChange({ ...field, min: e.target.value === '' ? undefined : Number(e.target.value) })}
                    placeholder="Min value"
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="max-value">Max</Label>
                  <Input
                    id="max-value"
                    type="number"
                    value={field.max ?? ''}
                    onChange={e => onFieldChange({ ...field, max: e.target.value === '' ? undefined : Number(e.target.value) })}
                    placeholder="Max value"
                  />
                </div>
              </div>
            )}
            {field.type === 'text' && (
              <div className="space-y-2">
                <Label htmlFor="pattern">Regex Pattern</Label>
                <Input
                  id="pattern"
                  value={field.pattern || ''}
                  onChange={e => onFieldChange({ ...field, pattern: e.target.value })}
                  placeholder="e.g. ^[A-Za-z0-9]+$"
                />
              </div>
            )}
          </div>
        )}
        
        <Button 
          variant="outline" 
          size="sm" 
          className="text-destructive hover:text-destructive w-full" 
          onClick={onRemoveField}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Remove Field
        </Button>
      </div>
    </div>
  );
} 