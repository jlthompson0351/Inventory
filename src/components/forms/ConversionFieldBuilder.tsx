import { useState, useEffect, useRef, useCallback } from "react";
import { Plus, Trash2, GripVertical, Copy, AlertTriangle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export interface ConversionField {
  id: string;
  label: string;
  field_name: string;
  type: 'number' | 'text' | 'textarea' | 'select';
  description?: string;
  required: boolean;
  mappable: boolean;
  options?: string[];
  placeholder?: string;
  default_value?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

interface ConversionFieldBuilderProps {
  assetTypeId: string;
  initialFields: ConversionField[];
  onFieldsChange: (fields: ConversionField[]) => void;
}

// Sortable field item component
function SortableFieldItem({ 
  field, 
  onEdit, 
  onDelete, 
  onDuplicate, 
  onPreview,
  validationErrors 
}: {
  field: ConversionField;
  onEdit: (field: ConversionField) => void;
  onDelete: (fieldId: string) => void;
  onDuplicate: (field: ConversionField) => void;
  onPreview: (field: ConversionField) => void;
  validationErrors: string[];
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card ref={setNodeRef} style={style} className={`relative ${isDragging ? 'z-50' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <div 
                className="cursor-move p-1 text-muted-foreground hover:text-foreground"
                {...attributes}
                {...listeners}
              >
                <GripVertical className="h-4 w-4" />
              </div>
              <div className="font-medium">{field.label}</div>
              <Badge variant="outline" className="text-xs">
                {field.type}
              </Badge>
              {field.mappable && (
                <Badge variant="secondary" className="text-xs">
                  Mappable
                </Badge>
              )}
              {field.required && (
                <Badge variant="destructive" className="text-xs">
                  Required
                </Badge>
              )}
              {validationErrors.length > 0 && (
                <Badge variant="destructive" className="text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Issues
                </Badge>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              Field: <code className="text-xs bg-muted px-1 py-0.5 rounded">
                {`{${field.field_name}}`}
              </code>
            </div>
            {field.description && (
              <div className="text-sm text-muted-foreground">
                {field.description}
              </div>
            )}
            {validationErrors.length > 0 && (
              <Alert variant="destructive" className="mt-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  {validationErrors.join(', ')}
                </AlertDescription>
              </Alert>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPreview(field)}
              title="Preview field"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDuplicate(field)}
              title="Duplicate field"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(field)}
            >
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(field.id)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ConversionFieldBuilder({ 
  assetTypeId, 
  initialFields, 
  onFieldsChange 
}: ConversionFieldBuilderProps) {
  const [fields, setFields] = useState<ConversionField[]>(initialFields || []);
  const [editingField, setEditingField] = useState<ConversionField | null>(null);
  const [isAddingField, setIsAddingField] = useState(false);
  const [previewField, setPreviewField] = useState<ConversionField | null>(null);
  const [validationErrors, setValidationErrors] = useState<{ [fieldId: string]: string[] }>({});
  const prevFieldsRef = useRef<ConversionField[]>([]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Validate fields whenever they change
  const validateFields = useCallback((fieldsToValidate: ConversionField[]) => {
    const errors: { [fieldId: string]: string[] } = {};
    const fieldNames = new Set<string>();
    
    fieldsToValidate.forEach(field => {
      const fieldErrors: string[] = [];
      
      // Check for empty required values
      if (!field.label.trim()) {
        fieldErrors.push('Label is required');
      }
      if (!field.field_name.trim()) {
        fieldErrors.push('Field name is required');
      }
      
      // Check for duplicate field names
      if (fieldNames.has(field.field_name)) {
        fieldErrors.push('Duplicate field name');
      } else if (field.field_name.trim()) {
        fieldNames.add(field.field_name);
      }
      
      // Validate field name format
      if (field.field_name && !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(field.field_name)) {
        fieldErrors.push('Field name must start with letter and contain only letters, numbers, and underscores');
      }
      
      // Type-specific validation
      if (field.type === 'select' && (!field.options || field.options.length === 0)) {
        fieldErrors.push('Select fields must have at least one option');
      }
      
      if (fieldErrors.length > 0) {
        errors[field.id] = fieldErrors;
      }
    });
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, []);

  // Only sync with parent when fields actually change and are valid
  useEffect(() => {
    const fieldsChanged = JSON.stringify(fields) !== JSON.stringify(prevFieldsRef.current);
    if (fieldsChanged) {
      const isValid = validateFields(fields);
      prevFieldsRef.current = fields;
      onFieldsChange(fields);
    }
  }, [fields, onFieldsChange, validateFields]);

  // Update fields when initialFields change (from parent)
  useEffect(() => {
    if (initialFields && JSON.stringify(initialFields) !== JSON.stringify(fields)) {
      setFields(initialFields);
      prevFieldsRef.current = initialFields;
      validateFields(initialFields);
    }
  }, [initialFields, validateFields]);

  const addNewField = () => {
    const newField: ConversionField = {
      id: `field_${Date.now()}`,
      label: '',
      field_name: '',
      type: 'number',
      required: false,
      mappable: true,
      description: '',
      placeholder: ''
    };
    setEditingField(newField);
    setIsAddingField(true);
  };

  const duplicateField = (fieldToDuplicate: ConversionField) => {
    const newField: ConversionField = {
      ...fieldToDuplicate,
      id: `field_${Date.now()}`,
      label: `${fieldToDuplicate.label} (Copy)`,
      field_name: `${fieldToDuplicate.field_name}_copy`
    };
    setEditingField(newField);
    setIsAddingField(true);
  };

  const saveField = (field: ConversionField) => {
    if (isAddingField) {
      setFields(prev => [...prev, field]);
      setIsAddingField(false);
    } else {
      setFields(prev => prev.map(f => f.id === field.id ? field : f));
    }
    setEditingField(null);
  };

  const deleteField = (fieldId: string) => {
    if (confirm('Are you sure you want to delete this field? This action cannot be undone.')) {
      setFields(prev => prev.filter(f => f.id !== fieldId));
    }
  };

  const cancelEdit = () => {
    setEditingField(null);
    setIsAddingField(false);
  };

  const generateFieldName = (label: string) => {
    const baseName = label
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .replace(/^_+|_+$/g, '');
    
    // Ensure uniqueness
    let fieldName = baseName;
    let counter = 1;
    while (fields.some(f => f.field_name === fieldName && f.id !== editingField?.id)) {
      fieldName = `${baseName}_${counter}`;
      counter++;
    }
    
    return fieldName;
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setFields((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Field List */}
      {fields.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-muted-foreground">
              Conversion Fields ({fields.length})
            </div>
            {Object.keys(validationErrors).length > 0 && (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {Object.keys(validationErrors).length} issues
              </Badge>
            )}
          </div>
          
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
              {fields.map((field) => (
                <SortableFieldItem
                  key={field.id}
                  field={field}
                  onEdit={setEditingField}
                  onDelete={deleteField}
                  onDuplicate={duplicateField}
                  onPreview={setPreviewField}
                  validationErrors={validationErrors[field.id] || []}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* Add Field Button */}
      {!editingField && (
        <div className="text-center py-8 border border-dashed rounded-lg">
          <div className="text-muted-foreground mb-4">
            {fields.length === 0 
              ? "No conversion fields defined yet" 
              : "Add more conversion fields"}
          </div>
          <Button onClick={addNewField} variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Add Conversion Field
          </Button>
        </div>
      )}

      {/* Field Editor */}
      {editingField && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="text-lg">
              {isAddingField ? 'Add New Field' : 'Edit Field'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FieldEditor
              field={editingField}
              onSave={saveField}
              onCancel={cancelEdit}
              onFieldChange={setEditingField}
              generateFieldName={generateFieldName}
              existingFieldNames={fields.filter(f => f.id !== editingField.id).map(f => f.field_name)}
            />
          </CardContent>
        </Card>
      )}

      {/* Field Preview Dialog */}
      <Dialog open={!!previewField} onOpenChange={() => setPreviewField(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Field Preview</DialogTitle>
            <DialogDescription>
              How this field will appear when creating assets
            </DialogDescription>
          </DialogHeader>
          
          {previewField && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{previewField.label}</Label>
                {previewField.type === 'number' && (
                  <Input 
                    type="number" 
                    placeholder={previewField.placeholder || 'Enter a number'} 
                    disabled 
                  />
                )}
                {previewField.type === 'text' && (
                  <Input 
                    type="text" 
                    placeholder={previewField.placeholder || 'Enter text'} 
                    disabled 
                  />
                )}
                {previewField.type === 'textarea' && (
                  <Textarea 
                    placeholder={previewField.placeholder || 'Enter text'} 
                    disabled 
                  />
                )}
                {previewField.type === 'select' && (
                  <Select disabled>
                    <SelectTrigger>
                      <SelectValue placeholder={previewField.placeholder || 'Select an option'} />
                    </SelectTrigger>
                    <SelectContent>
                      {(previewField.options || []).map(option => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {previewField.description && (
                  <p className="text-sm text-muted-foreground">
                    {previewField.description}
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Field Editor Component
interface FieldEditorProps {
  field: ConversionField;
  onSave: (field: ConversionField) => void;
  onCancel: () => void;
  onFieldChange: (field: ConversionField) => void;
  generateFieldName: (label: string) => string;
  existingFieldNames: string[];
}

function FieldEditor({ 
  field, 
  onSave, 
  onCancel, 
  onFieldChange, 
  generateFieldName,
  existingFieldNames
}: FieldEditorProps) {
  const [localField, setLocalField] = useState<ConversionField>(field);
  const [fieldNameConflict, setFieldNameConflict] = useState(false);

  // Check for field name conflicts
  useEffect(() => {
    if (localField.field_name && existingFieldNames.includes(localField.field_name)) {
      setFieldNameConflict(true);
    } else {
      setFieldNameConflict(false);
    }
  }, [localField.field_name, existingFieldNames]);

  const updateField = (updates: Partial<ConversionField>) => {
    const updated = { ...localField, ...updates };
    setLocalField(updated);
    onFieldChange(updated);
  };

  const handleLabelChange = (label: string) => {
    const field_name = generateFieldName(label);
    updateField({ label, field_name });
  };

  const handleSave = () => {
    if (!localField.label.trim() || !localField.field_name.trim() || fieldNameConflict) {
      return; // Don't save if required fields are empty or there's a conflict
    }
    onSave(localField);
  };

  const isValid = localField.label.trim() && localField.field_name.trim() && !fieldNameConflict;

  return (
    <div className="space-y-4">
      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="label">Field Label *</Label>
          <Input
            id="label"
            value={localField.label}
            onChange={(e) => handleLabelChange(e.target.value)}
            placeholder="e.g., Vat Inches Conversion"
            className={!localField.label.trim() ? "border-red-300" : ""}
          />
          {!localField.label.trim() && (
            <p className="text-xs text-red-600">Label is required</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="field_name">Field Name *</Label>
          <Input
            id="field_name"
            value={localField.field_name}
            onChange={(e) => updateField({ field_name: e.target.value })}
            placeholder="Auto-generated from label"
            className={`font-mono text-sm ${
              !localField.field_name.trim() || fieldNameConflict ? "border-red-300" : ""
            }`}
          />
          <div className="text-xs text-muted-foreground">
            Used in formulas as: <code>{`{${localField.field_name}}`}</code>
          </div>
          {fieldNameConflict && (
            <p className="text-xs text-red-600">Field name already exists</p>
          )}
          {!localField.field_name.trim() && (
            <p className="text-xs text-red-600">Field name is required</p>
          )}
        </div>
      </div>

      {/* Field Type */}
      <div className="space-y-2">
        <Label htmlFor="type">Field Type</Label>
        <Select 
          value={localField.type} 
          onValueChange={(type: any) => updateField({ type })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="number">Number</SelectItem>
            <SelectItem value="text">Text</SelectItem>
            <SelectItem value="textarea">Long Text</SelectItem>
            <SelectItem value="select">Dropdown</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={localField.description || ''}
          onChange={(e) => updateField({ description: e.target.value })}
          placeholder="Explain what this field is used for..."
          rows={2}
        />
      </div>

      {/* Placeholder */}
      <div className="space-y-2">
        <Label htmlFor="placeholder">Placeholder Text</Label>
        <Input
          id="placeholder"
          value={localField.placeholder || ''}
          onChange={(e) => updateField({ placeholder: e.target.value })}
          placeholder="e.g., Enter conversion rate"
        />
      </div>

      {/* Validation Rules */}
      {localField.type === 'number' && (
        <div className="space-y-2">
          <Label>Validation Rules</Label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="min">Minimum Value</Label>
              <Input
                id="min"
                type="number"
                value={localField.validation?.min || ''}
                onChange={(e) => updateField({ 
                  validation: { 
                    ...localField.validation, 
                    min: e.target.value ? Number(e.target.value) : undefined 
                  } 
                })}
                placeholder="No minimum"
              />
            </div>
            <div>
              <Label htmlFor="max">Maximum Value</Label>
              <Input
                id="max"
                type="number"
                value={localField.validation?.max || ''}
                onChange={(e) => updateField({ 
                  validation: { 
                    ...localField.validation, 
                    max: e.target.value ? Number(e.target.value) : undefined 
                  } 
                })}
                placeholder="No maximum"
              />
            </div>
          </div>
        </div>
      )}

      {/* Options for Select */}
      {localField.type === 'select' && (
        <div className="space-y-2">
          <Label htmlFor="options">Options (one per line) *</Label>
          <Textarea
            id="options"
            value={(localField.options || []).join('\n')}
            onChange={(e) => updateField({ 
              options: e.target.value.split('\n').filter(o => o.trim()) 
            })}
            placeholder="Option 1&#10;Option 2&#10;Option 3"
            rows={3}
            className={!localField.options?.length ? "border-red-300" : ""}
          />
          {!localField.options?.length && (
            <p className="text-xs text-red-600">Select fields must have at least one option</p>
          )}
        </div>
      )}

      {/* Toggles */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Required Field</Label>
            <div className="text-sm text-muted-foreground">
              Must be filled when creating assets
            </div>
          </div>
          <Switch
            checked={localField.required}
            onCheckedChange={(required) => updateField({ required })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Mappable in Formulas</Label>
            <div className="text-sm text-muted-foreground">
              Can be used in inventory form calculations
            </div>
          </div>
          <Switch
            checked={localField.mappable}
            onCheckedChange={(mappable) => updateField({ mappable })}
          />
        </div>
      </div>

      {/* Default Value */}
      <div className="space-y-2">
        <Label htmlFor="defaultValue">Default Value</Label>
        {localField.type === 'number' ? (
          <Input
            id="defaultValue"
            type="number"
            value={localField.default_value || ''}
            onChange={(e) => updateField({ default_value: e.target.value ? Number(e.target.value) : undefined })}
            placeholder="No default value"
          />
        ) : localField.type === 'select' ? (
          <Select
            value={localField.default_value || ''}
            onValueChange={(value) => updateField({ default_value: value || undefined })}
          >
            <SelectTrigger>
              <SelectValue placeholder="No default value" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">No default value</SelectItem>
              {(localField.options || []).map(option => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            id="defaultValue"
            value={localField.default_value || ''}
            onChange={(e) => updateField({ default_value: e.target.value || undefined })}
            placeholder="No default value"
          />
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!isValid}>
          Save Field
        </Button>
      </div>
    </div>
  );
} 