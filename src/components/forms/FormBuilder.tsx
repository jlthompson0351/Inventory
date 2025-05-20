import { useState, useEffect } from "react";
import { Reorder } from "framer-motion";
import { Trash2, Plus, Move, ChevronDown, ChevronUp, Copy, List, Badge as BadgeIcon, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { useOrganization } from '@/hooks/useOrganization';
import { getMappedFields } from '@/services/mappedFieldService';

// Import components from FormBuilderComponents
import { 
  FormField, 
  FormSchema, 
  FieldType, 
  ConditionOperator, 
  FieldOption,
  FieldCondition,
  OptionsManager,
  FormulaManager,
  ConditionsDisplay,
  FieldTypeSelector,
  FieldPropertiesPanel
} from "./FormBuilderComponents";

interface FormBuilderProps {
  initialSchema?: FormSchema;
  onChange?: (schema: FormSchema) => void;
}

export default function FormBuilder({ initialSchema, onChange }: FormBuilderProps) {
  const [schema, setSchema] = useState<FormSchema>(initialSchema || { fields: [] });
  const [showConditionDialog, setShowConditionDialog] = useState(false);
  const [showOptionDialog, setShowOptionDialog] = useState(false);
  const [currentFieldIndex, setCurrentFieldIndex] = useState<number | null>(null);
  const [currentFieldCondition, setCurrentFieldCondition] = useState<FieldCondition>({
    field: '',
    operator: 'equals',
    value: ''
  });
  const [currentFieldOption, setCurrentFieldOption] = useState<FieldOption>({
    label: '',
    value: ''
  });
  const [currentOptionIndex, setCurrentOptionIndex] = useState<number | null>(null);
  const [selectedField, setSelectedField] = useState<FormField | null>(null);
  const [mappableFields, setMappableFields] = useState<Array<any>>([]);
  const { currentOrganization } = useOrganization();

  // Update parent component when schema changes
  useEffect(() => {
    if (onChange) {
      onChange(schema);
    }
  }, [schema, onChange]);

  // Load mappable fields when organization is available
  useEffect(() => {
    if (currentOrganization?.id) {
      loadMappableFields();
    }
  }, [currentOrganization?.id]);
  
  const loadMappableFields = async () => {
    if (!currentOrganization?.id) return;
    
    try {
      const fields = await getMappedFields(currentOrganization.id);
      setMappableFields(fields);
    } catch (error) {
      console.error('Error loading mappable fields:', error);
    }
  };

  const getNextId = () => {
    return `field_${Date.now()}`;
  };

  const addField = (type: FieldType) => {
    const newField: FormField = {
      id: getNextId(),
      label: `New ${type} Field`,
      type: type,
      required: false,
    };

    // Add default options for select and radio
    if (type === 'select' || type === 'radio') {
      newField.options = [
        { label: 'Option 1', value: 'option1' },
        { label: 'Option 2', value: 'option2' }
      ];
    }

    // Set up formula field with default structure
    if (type === 'formula') {
      newField.formula = '{field1} + {field2}';
      newField.inputFields = [];
    }
    
    // Set specific label for current_inventory field
    if (type === 'current_inventory') {
      newField.label = 'Current Inventory';
      newField.description = 'Set initial inventory count for this asset';
      newField.type = 'number'; // Use number field type under the hood
    }

    setSchema(prev => ({
      ...prev,
      fields: [...prev.fields, newField]
    }));
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    setSchema(prev => {
      const updatedFields = [...prev.fields];
      updatedFields[index] = {
        ...updatedFields[index],
        ...updates
      };
      return { ...prev, fields: updatedFields };
    });
  };

  const removeField = (index: number) => {
    setSchema(prev => {
      const updatedFields = [...prev.fields];
      const removedField = updatedFields[index];
      
      // Remove the field
      updatedFields.splice(index, 1);
      
      // Also remove any conditions that reference this field
      updatedFields.forEach(field => {
        if (field.conditions) {
          field.conditions = field.conditions.filter(condition => 
            condition.field !== removedField.id
          );
          
          // If no conditions left, remove the empty array
          if (field.conditions.length === 0) {
            delete field.conditions;
          }
        }
        
        // Also remove from formula input fields
        if (field.type === 'formula' && field.inputFields) {
          field.inputFields = field.inputFields.filter(fieldId => 
            fieldId !== removedField.id
          );
          
          // Update formula to remove references
          if (field.formula) {
            field.formula = field.formula.replace(
              new RegExp(`\\{${removedField.id}\\}`, 'g'), 
              '0'
            );
          }
        }
      });
      
      return { ...prev, fields: updatedFields };
    });
  };

  const duplicateField = (index: number) => {
    setSchema(prev => {
      const fieldToDuplicate = { ...prev.fields[index] };
      // Give it a new ID
      fieldToDuplicate.id = getNextId();
      fieldToDuplicate.label = `${fieldToDuplicate.label} (Copy)`;
      
      const updatedFields = [...prev.fields];
      updatedFields.splice(index + 1, 0, fieldToDuplicate);
      
      return { ...prev, fields: updatedFields };
    });
  };

  const reorderFields = (newOrder: FormField[]) => {
    setSchema(prev => ({
      ...prev,
      fields: newOrder
    }));
  };

  const handleFieldsReordered = (newOrder: FormField[]) => {
    reorderFields(newOrder);
  };

  // Condition management
  const openConditionDialog = (fieldIndex: number) => {
    setCurrentFieldIndex(fieldIndex);
    setCurrentFieldCondition({
      field: '',
      operator: 'equals',
      value: ''
    });
    setShowConditionDialog(true);
  };

  const addCondition = () => {
    if (currentFieldIndex === null) return;
    
    setSchema(prev => {
      const updatedFields = [...prev.fields];
      const field = updatedFields[currentFieldIndex];
      
      if (!field.conditions) {
        field.conditions = [];
      }
      
      field.conditions.push({ ...currentFieldCondition });
      
      return { ...prev, fields: updatedFields };
    });
    
    // Reset and close dialog
    setCurrentFieldCondition({
      field: '',
      operator: 'equals',
      value: ''
    });
    setShowConditionDialog(false);
  };
  
  const removeCondition = (fieldIndex: number, conditionIndex: number) => {
    setSchema(prev => {
      const updatedFields = [...prev.fields];
      const field = updatedFields[fieldIndex];
      
      if (field.conditions) {
        field.conditions.splice(conditionIndex, 1);
        
        // Remove conditions array if empty
        if (field.conditions.length === 0) {
          delete field.conditions;
        }
      }
      
      return { ...prev, fields: updatedFields };
    });
  };

  // Option management for select and radio fields
  const openOptionDialog = (fieldIndex: number, optionIndex?: number) => {
    setCurrentFieldIndex(fieldIndex);
    
    if (optionIndex !== undefined) {
      setCurrentOptionIndex(optionIndex);
      const field = schema.fields[fieldIndex];
      const option = field.options?.[optionIndex];
      if (option) {
        setCurrentFieldOption({ ...option });
      }
    } else {
      setCurrentOptionIndex(null);
      setCurrentFieldOption({
        label: '',
        value: ''
      });
    }
    
    setShowOptionDialog(true);
  };
  
  const saveOption = () => {
    if (currentFieldIndex === null) return;
    
    setSchema(prev => {
      const updatedFields = [...prev.fields];
      const field = updatedFields[currentFieldIndex];
      
      if (!field.options) {
        field.options = [];
      }
      
      if (currentOptionIndex !== null) {
        // Update existing option
        field.options[currentOptionIndex] = { ...currentFieldOption };
      } else {
        // Add new option
        field.options.push({ ...currentFieldOption });
      }
      
      return { ...prev, fields: updatedFields };
    });
    
    // Reset and close dialog
    setCurrentFieldOption({
      label: '',
      value: ''
    });
    setShowOptionDialog(false);
  };
  
  const removeOption = (fieldIndex: number, optionIndex: number) => {
    setSchema(prev => {
      const updatedFields = [...prev.fields];
      const field = updatedFields[fieldIndex];
      
      if (field.options) {
        field.options.splice(optionIndex, 1);
      }
      
      return { ...prev, fields: updatedFields };
    });
  };

  // Render options for different field types
  const renderFieldOptions = (field: FormField, index: number) => {
    switch(field.type) {
      case 'select':
      case 'radio':
        return (
          <OptionsManager 
            field={field}
            index={index}
            openOptionDialog={openOptionDialog}
            removeOption={removeOption}
          />
        );
        
      case 'formula':
        return (
          <FormulaManager
            field={field}
            index={index}
            schema={schema}
            updateField={updateField}
            mappedFields={mappableFields}
          />
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Field List */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Form Fields</h3>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline">
                Add Field <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-50 w-[200px]">
              <DropdownMenuItem onClick={() => addField('text')}>
                <BadgeIcon className="mr-2 h-4 w-4" />
                Text Field
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => addField('number')}>
                <Badge className="mr-2 h-4 w-4" />
                Number Field
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => addField('current_inventory')}>
                <List className="mr-2 h-4 w-4" />
                Current Inventory
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => addField('select')}>
                <ChevronDown className="mr-2 h-4 w-4" />
                Select Field
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => addField('checkbox')}>
                <Checkbox className="mr-2 h-4 w-4" />
                Checkbox
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => addField('switch')}>
                <Badge className="mr-2 h-4 w-4" />
                Toggle Switch
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => addField('radio')}>
                <Badge className="mr-2 h-4 w-4" />
                Radio Group
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => addField('textarea')}>
                <Badge className="mr-2 h-4 w-4" />
                Text Area
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => addField('formula')}>
                <Badge className="mr-2 h-4 w-4" />
                Formula Field
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => addField('file')}>
                <File className="mr-2 h-4 w-4" />
                File Upload
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {schema.fields.length === 0 ? (
          <div className="border border-dashed rounded-lg p-8 text-center">
            <p className="text-muted-foreground">
              No fields added yet. Use the "Add Field" button to create form fields.
            </p>
          </div>
        ) : (
          <Reorder.Group 
            axis="y" 
            values={schema.fields} 
            onReorder={handleFieldsReordered}
            className="space-y-4"
          >
            {schema.fields.map((field, index) => (
              <Reorder.Item 
                key={field.id} 
                value={field}
                className="cursor-move"
              >
                <Card>
                  <CardHeader className="p-4 flex flex-row items-center justify-between">
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                      <Move className="h-4 w-4 text-muted-foreground" />
                      {field.label} 
                      <Badge variant="outline" className="ml-2">
                        {field.type}
                      </Badge>
                      {field.required && (
                        <Badge variant="secondary" className="ml-1">
                          Required
                        </Badge>
                      )}
                    </CardTitle>
                    <div className="flex items-center gap-1">
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon"
                        onClick={() => duplicateField(index)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon"
                        onClick={() => removeField(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-0">
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="settings">
                        <AccordionTrigger className="py-2">
                          Field Settings
                        </AccordionTrigger>
                        <AccordionContent className="pb-4 space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor={`label-${field.id}`}>Label</Label>
                            <Input 
                              id={`label-${field.id}`}
                              value={field.label}
                              onChange={e => updateField(index, { label: e.target.value })}
                            />
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`required-${field.id}`}
                              checked={field.required}
                              onCheckedChange={checked => updateField(index, { required: !!checked })}
                            />
                            <Label htmlFor={`required-${field.id}`}>Required field</Label>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor={`description-${field.id}`}>Description</Label>
                            <Textarea
                              id={`description-${field.id}`}
                              value={field.description || ''}
                              onChange={e => updateField(index, { description: e.target.value })}
                              placeholder="Help text shown below the field"
                            />
                          </div>
                          
                          {field.type !== 'formula' && (
                            <div className="space-y-2">
                              <Label htmlFor={`placeholder-${field.id}`}>Placeholder</Label>
                              <Input 
                                id={`placeholder-${field.id}`}
                                value={field.placeholder || ''}
                                onChange={e => updateField(index, { placeholder: e.target.value })}
                                placeholder="Text shown when no value is entered"
                              />
                            </div>
                          )}
                          
                          {/* Render options specific to field type */}
                          {renderFieldOptions(field, index)}
                        </AccordionContent>
                      </AccordionItem>
                      
                      <AccordionItem value="conditions">
                        <AccordionTrigger className="py-2">
                          Display Conditions
                        </AccordionTrigger>
                        <AccordionContent className="pb-4 space-y-4">
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <Label>When to show this field</Label>
                              <Button 
                                type="button" 
                                variant="outline" 
                                size="sm"
                                onClick={() => openConditionDialog(index)}
                                disabled={schema.fields.filter(f => f.id !== field.id).length === 0}
                              >
                                <ChevronUp className="h-3 w-3 mr-1" />
                                Add Condition
                              </Button>
                            </div>
                            
                            {field.conditions && field.conditions.length > 0 ? (
                              <ConditionsDisplay 
                                conditions={field.conditions}
                                schema={schema}
                                onRemove={(conditionIndex) => removeCondition(index, conditionIndex)}
                              />
                            ) : (
                              <div className="text-sm text-muted-foreground">
                                No conditions set. This field will always be visible.
                              </div>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </CardContent>
                  <CardFooter className="px-4 py-3">
                    <div className="text-xs text-muted-foreground">
                      Field ID: {field.id}
                    </div>
                  </CardFooter>
                </Card>
              </Reorder.Item>
            ))}
          </Reorder.Group>
        )}
      </div>
      
      {/* Condition Dialog */}
      <Dialog open={showConditionDialog} onOpenChange={setShowConditionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Display Condition</DialogTitle>
            <DialogDescription>
              Define when this field should be displayed based on values of other fields.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="condition-field">When field</Label>
              <Select
                value={currentFieldCondition.field}
                onValueChange={value => setCurrentFieldCondition(prev => ({ ...prev, field: value }))}
              >
                <SelectTrigger id="condition-field">
                  <SelectValue placeholder="Select a field" />
                </SelectTrigger>
                <SelectContent>
                  {schema.fields
                    .filter(f => currentFieldIndex !== null && f.id !== schema.fields[currentFieldIndex].id)
                    .map(field => (
                      <SelectItem key={field.id} value={field.id}>
                        {field.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="condition-operator">Operator</Label>
              <Select
                value={currentFieldCondition.operator}
                onValueChange={value => setCurrentFieldCondition(prev => ({ 
                  ...prev, 
                  operator: value as ConditionOperator,
                  // Clear value if selecting operators that don't need values
                  value: ['isTrue', 'isFalse', 'isEmpty', 'isNotEmpty'].includes(value) ? undefined : prev.value
                }))}
              >
                <SelectTrigger id="condition-operator">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="equals">Equals</SelectItem>
                  <SelectItem value="notEquals">Does not equal</SelectItem>
                  <SelectItem value="contains">Contains</SelectItem>
                  <SelectItem value="notContains">Does not contain</SelectItem>
                  <SelectItem value="greaterThan">Greater than</SelectItem>
                  <SelectItem value="lessThan">Less than</SelectItem>
                  <SelectItem value="isTrue">Is checked/true</SelectItem>
                  <SelectItem value="isFalse">Is unchecked/false</SelectItem>
                  <SelectItem value="isEmpty">Is empty</SelectItem>
                  <SelectItem value="isNotEmpty">Is not empty</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Only show value input for operators that need it */}
            {!['isTrue', 'isFalse', 'isEmpty', 'isNotEmpty'].includes(currentFieldCondition.operator) && (
              <div className="space-y-2">
                <Label htmlFor="condition-value">Value</Label>
                <Input
                  id="condition-value"
                  value={currentFieldCondition.value || ''}
                  onChange={e => setCurrentFieldCondition(prev => ({ ...prev, value: e.target.value }))}
                  placeholder="Value to compare against"
                />
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setShowConditionDialog(false)}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={addCondition}
              disabled={!currentFieldCondition.field}
            >
              Add Condition
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Option Dialog */}
      <Dialog open={showOptionDialog} onOpenChange={setShowOptionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {currentOptionIndex !== null ? 'Edit Option' : 'Add Option'}
            </DialogTitle>
            <DialogDescription>
              Define an option for this selection field.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="option-label">Label</Label>
              <Input
                id="option-label"
                value={currentFieldOption.label}
                onChange={e => setCurrentFieldOption(prev => ({ ...prev, label: e.target.value }))}
                placeholder="Display text"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="option-value">Value</Label>
              <Input
                id="option-value"
                value={currentFieldOption.value}
                onChange={e => setCurrentFieldOption(prev => ({ ...prev, value: e.target.value }))}
                placeholder="Stored value"
              />
              <p className="text-xs text-muted-foreground">
                The value is what gets stored in the database. If left empty, it will use the label.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setShowOptionDialog(false)}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={saveOption}
              disabled={!currentFieldOption.label}
            >
              {currentOptionIndex !== null ? 'Update Option' : 'Add Option'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedField && (
        <FieldPropertiesPanel
          field={selectedField}
          onFieldChange={(updatedField) => {
            const updatedFields = [...schema.fields];
            const index = updatedFields.findIndex(f => f.id === selectedField.id);
            if (index !== -1) {
              updatedFields[index] = updatedField;
              setSchema(prev => ({ ...prev, fields: updatedFields }));
            }
          }}
          onRemoveField={() => {
            setSchema(prev => ({
              ...prev,
              fields: prev.fields.filter(f => f.id !== selectedField.id)
            }));
            setSelectedField(null);
          }}
        />
      )}

      {/* FormulaManager with mapped fields */}
      {currentFieldIndex !== null && schema.fields[currentFieldIndex].type === 'formula' && (
        <div className="md:col-span-12">
          <Card>
            <CardHeader>
              <CardTitle>Formula Editor</CardTitle>
            </CardHeader>
            <CardContent>
              <FormulaManager
                field={schema.fields[currentFieldIndex]}
                index={currentFieldIndex}
                schema={schema}
                updateField={updateField}
                mappedFields={mappableFields}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
} 