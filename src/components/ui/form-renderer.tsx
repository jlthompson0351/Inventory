import { useState, useEffect } from 'react';
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form } from '@/services/formService';
import { FormValidationRule, FormFieldDependency } from '@/services/formService';
import { z } from 'zod';
import { evaluateFormula, FormulaContext } from '@/lib/formulaEvaluator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Eye, EyeOff, AlertTriangle } from 'lucide-react';

interface FormField {
  id: string;
  label: string;
  type: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
  formula?: string;
  description?: string;
  defaultValue?: any;
  inventory_action?: string;
}

interface FormRendererProps {
  form: Form;
  validationRules?: FormValidationRule[];
  fieldDependencies?: FormFieldDependency[];
  onSubmit: (data: any) => void;
  initialData?: any;
  readOnly?: boolean;
  submitButtonText?: string;
  submitButtonIcon?: any;
  submitButtonDisabled?: boolean;
  submitButtonIconProps?: any;
  mappedFields?: Record<string, any>;
  assetName?: string;
}

export function FormRenderer({
  form,
  validationRules = [],
  fieldDependencies = [],
  onSubmit,
  initialData = {},
  readOnly = false,
  submitButtonText,
  submitButtonIcon,
  submitButtonDisabled,
  submitButtonIconProps,
  mappedFields = {},
  assetName
}: FormRendererProps) {
  const [formData, setFormData] = useState<any>(() => {
    // Initialize with initialData on first render
    console.log('FormRenderer - Initial mount with data:', initialData);
    return initialData;
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCalculatedFields, setShowCalculatedFields] = useState(false);
  const [inventoryWarning, setInventoryWarning] = useState<string | null>(null);
  
  // Extract fields from form.form_data
  const fields: FormField[] = (form.form_data as any)?.fields || [];

  // Update form data when initialData changes (but preserve user edits)
  useEffect(() => {
    console.log('FormRenderer - initialData changed:', initialData);
    setFormData(prevData => {
      console.log('FormRenderer - prevData in initialData useEffect:', prevData);
      // If we have no data yet, use initialData
      if (!prevData || Object.keys(prevData).length === 0) {
        const defaultData = { ...initialData };
        
        // Add default values for fields that don't have values
        fields.forEach(field => {
          if (field.defaultValue !== undefined && defaultData[field.id] === undefined) {
            defaultData[field.id] = field.defaultValue;
          }
          
          // Ensure numeric fields have proper string representation
          if (field.type === 'number' && defaultData[field.id] !== undefined && defaultData[field.id] !== '') {
            defaultData[field.id] = String(defaultData[field.id]);
          }
        });
        
        console.log('FormRenderer - Setting initial form data from useEffect:', defaultData);
        return defaultData;
      }
      
      // If initialData has more keys than current data, it's probably a new submission being loaded
      if (Object.keys(initialData).length > Object.keys(prevData).length) {
        const newData = { ...initialData };
        
        // Ensure numeric fields have proper string representation
        fields.forEach(field => {
          if (field.type === 'number' && newData[field.id] !== undefined && newData[field.id] !== '') {
            newData[field.id] = String(newData[field.id]);
          }
        });
        
        console.log('FormRenderer - New submission data detected, replacing form data in useEffect');
        return newData;
      }
      
      // Otherwise keep current data
      console.log('FormRenderer - Keeping previous form data in useEffect:', prevData);
      return prevData;
    });
  }, [initialData]);

  // Initialize calculated fields on first load
  useEffect(() => {
    if (Object.keys(formData).length > 0 && fields.length > 0) {
      const updatedData = { ...formData };
      let hasChanges = true;
      let iterations = 0;
      const MAX_ITERATIONS = 10;
      
      // Calculate all formula fields with cascading support
      while (hasChanges && iterations < MAX_ITERATIONS) {
        hasChanges = false;
        iterations++;
        
        fields.forEach(field => {
          if (field.type === 'calculated' && field.formula) {
            const calculatedValue = calculateFieldValue(field);
            if (!updatedData[field.id] || updatedData[field.id] !== calculatedValue) {
              updatedData[field.id] = calculatedValue;
              hasChanges = true;
            }
          }
        });
      }
      
      if (hasChanges || iterations > 1) {
        setFormData(updatedData);
        checkInventoryAnomaly(updatedData);
      }
    }
  }, [fields.length]); // Only run when fields are first loaded

  // Determine if a field should be visible based on dependencies
  const isFieldVisible = (fieldId: string): boolean => {
    const dependencies = fieldDependencies.filter(dep => dep.target_field_id === fieldId);
    
    if (dependencies.length === 0) return true;
    
    return dependencies.every(dep => {
      const sourceValue = formData[dep.source_field_id];
      const conditionValue = dep.condition_value;
      
      switch (dep.condition) {
        case 'equals':
          return sourceValue === conditionValue;
        case 'not_equals':
          return sourceValue !== conditionValue;
        case 'contains':
          return sourceValue?.includes(conditionValue);
        case 'not_contains':
          return !sourceValue?.includes(conditionValue);
        case 'greater_than':
          return Number(sourceValue) > Number(conditionValue);
        case 'less_than':
          return Number(sourceValue) < Number(conditionValue);
        default:
          return true;
      }
    });
  };

  // Determine if a field is required based on dependencies
  const isFieldRequired = (field: FormField): boolean => {
    if (field.required) return true;
    
    const dependencies = fieldDependencies.filter(
      dep => dep.target_field_id === field.id && dep.action === 'require'
    );
    
    if (dependencies.length === 0) return false;
    
    return dependencies.some(dep => {
      const sourceValue = formData[dep.source_field_id];
      const conditionValue = dep.condition_value;
      
      switch (dep.condition) {
        case 'equals':
          return sourceValue === conditionValue;
        case 'not_equals':
          return sourceValue !== conditionValue;
        case 'contains':
          return sourceValue?.includes(conditionValue);
        case 'not_contains':
          return !sourceValue?.includes(conditionValue);
        case 'greater_than':
          return Number(sourceValue) > Number(conditionValue);
        case 'less_than':
          return Number(sourceValue) < Number(conditionValue);
        default:
          return false;
      }
    });
  };

  // Determine if a field is disabled based on dependencies
  const isFieldDisabled = (fieldId: string): boolean => {
    if (readOnly) return true;
    
    const dependencies = fieldDependencies.filter(
      dep => dep.target_field_id === fieldId && dep.action === 'disable'
    );
    
    if (dependencies.length === 0) return false;
    
    return dependencies.some(dep => {
      const sourceValue = formData[dep.source_field_id];
      const conditionValue = dep.condition_value;
      
      switch (dep.condition) {
        case 'equals':
          return sourceValue === conditionValue;
        case 'not_equals':
          return sourceValue !== conditionValue;
        case 'contains':
          return sourceValue?.includes(conditionValue);
        case 'not_contains':
          return !sourceValue?.includes(conditionValue);
        case 'greater_than':
          return Number(sourceValue) > Number(conditionValue);
        case 'less_than':
          return Number(sourceValue) < Number(conditionValue);
        default:
          return false;
      }
    });
  };

  // Calculate value for calculated fields using secure evaluator
  const calculateFieldValue = (field: FormField): string => {
    if (!field.formula) return '';
    
    try {
      // Create context object for evaluation
      const context: FormulaContext = {
        fields: {},
        mappedFields: {}
      };
      
      // Add all field values to context - ensure numeric values
      fields.forEach(f => {
        const value = formData[f.id];
        // Convert to number, default to 0 for empty/invalid values
        context.fields[f.id] = (value === '' || value === null || value === undefined) ? 0 : Number(value) || 0;
      });
      
      // Add mapped fields from props
      Object.entries(mappedFields).forEach(([key, value]) => {
        // The formulas expect {mapped.field_name} so we need to set the key as 'mapped.field_name'
        context.mappedFields[`mapped.${key}`] = Number(value) || 0;
      });
      
      // Use secure formula evaluator
      const result = evaluateFormula(field.formula, context);
      if (result.success) {
        // Format to 2 decimal places for display
        return Number(result.result).toFixed(2);
      } else {
        console.error('Formula evaluation error:', (result as { success: false; error: string }).error);
        return '0.00';
      }
    } catch (e) {
      console.error('Formula evaluation error:', e);
      return '0.00';
    }
  };

  // Check for inventory anomalies (when total inventory seems impossible)
  const checkInventoryAnomaly = (updatedData: any) => {
    // Look for the total gallons field (field with inventory_action: 'set')
    const totalField = fields.find(field => field.inventory_action === 'set');
    if (!totalField) return;
    
    const totalGallons = Number(updatedData[totalField.id]) || 0;
    
    // Get starting inventory from asset metadata (inventory at the beginning of the period)
    const startingInventory = Number(mappedFields.starting_inventory) || Number(mappedFields.current_inventory) || 0;
    const currentInventory = Number(mappedFields.current_inventory) || 0;
    
    // Check if we have any intake fields that add to inventory
    const intakeFields = fields.filter(field => field.inventory_action === 'add');
    const totalIntake = intakeFields.reduce((sum, field) => {
      return sum + (Number(updatedData[field.id]) || 0);
    }, 0);
    
    // Expected max inventory = starting + any intake during the period
    const expectedMaxInventory = startingInventory + totalIntake;
    
    if (totalGallons > expectedMaxInventory * 1.2) { // Allow 20% margin for measurement variations
      setInventoryWarning(
        `⚠️ Inventory Alert: Counted ${totalGallons.toFixed(2)} gallons, but started with ${startingInventory} gallons` +
        (totalIntake > 0 ? ` and added ${totalIntake} gallons` : '') +
        `. Maximum expected: ${expectedMaxInventory.toFixed(2)} gallons.\n\n` +
        `This suggests either:\n` +
        `• Unreported intake (someone added inventory without recording it)\n` +
        `• Counting error\n` +
        `• Data entry mistake\n\n` +
        `Please verify your count or check for missing intake records.`
      );
    } else if (totalGallons < startingInventory * 0.1 && startingInventory > 0) { // Warn if less than 10% remains
      const consumption = startingInventory - totalGallons + totalIntake;
      const consumptionPercent = (consumption / startingInventory * 100).toFixed(1);
      setInventoryWarning(
        `⚠️ Low Inventory Alert: Only ${totalGallons.toFixed(2)} gallons remaining from ${startingInventory} gallons starting inventory.\n` +
        `This represents ${consumptionPercent}% consumption this period` +
        (totalIntake > 0 ? ` (after adding ${totalIntake} gallons)` : '') + `.`
      );
    } else {
      setInventoryWarning(null);
    }
  };

  // Handle form change
  const handleChange = (fieldId: string, value: any) => {
    console.log(`FormRenderer - handleChange for ${fieldId}, new value: ${value}`);
    
    // For numeric fields, ensure we keep valid values even if temporarily empty
    const field = fields.find(f => f.id === fieldId);
    if (field?.type === 'number') {
      // Allow empty string (user is typing) but don't convert to 0
      if (value === '') {
        const updatedData = { ...formData, [fieldId]: value };
        setFormData(updatedData);
        
        // Clear error for this field
        if (errors[fieldId]) {
          const updatedErrors = { ...errors };
          delete updatedErrors[fieldId];
          setErrors(updatedErrors);
        }
        
        return;
      }
    }
    
    const updatedData = { ...formData, [fieldId]: value };
    
    // Calculate ALL formula fields with cascading support
    // This ensures all calculated fields update properly, even with complex dependencies
    let hasChanges = true;
    let iterations = 0;
    const MAX_ITERATIONS = 10; // Prevent infinite loops
    
    console.log('FormRenderer - Starting calculation pass for all calculated fields');
    
    while (hasChanges && iterations < MAX_ITERATIONS) {
      hasChanges = false;
      iterations++;
      console.log(`FormRenderer - Calculation iteration ${iterations}`);
      
      fields.forEach(field => {
        if (field.type === 'calculated' && field.formula) {
          try {
            // Create context object for evaluation with ALL current values
            const context: FormulaContext = {
              fields: {},
              mappedFields: {}
            };
            
            // Add all field values to context (including other calculated fields)
            fields.forEach(f => {
              const currentValue = updatedData[f.id];
              // Convert to number, default to 0 for empty/invalid values
              context.fields[f.id] = (currentValue === '' || currentValue === null || currentValue === undefined) ? 0 : Number(currentValue) || 0;
            });
            
            // Add mapped fields from props
            Object.entries(mappedFields).forEach(([key, value]) => {
              // The formulas expect {mapped.field_name} so we need to set the key as 'mapped.field_name'
              context.mappedFields[`mapped.${key}`] = Number(value) || 0;
            });
            
            // Use secure formula evaluator
            const result = evaluateFormula(field.formula, context);
            if (result.success) {
              const newValue = Number(result.result).toFixed(2);
              
              // Check if value changed
              if (updatedData[field.id] !== newValue) {
                console.log(`FormRenderer - Calculated field ${field.id} changed from ${updatedData[field.id]} to ${newValue}`);
                updatedData[field.id] = newValue;
                hasChanges = true; // Mark that we need another iteration
              }
            } else {
              console.error('Formula evaluation error:', (result as { success: false; error: string }).error);
              updatedData[field.id] = '0.00';
            }
          } catch (e) {
            console.error('Formula evaluation error:', e);
            updatedData[field.id] = '0.00';
          }
        }
      });
    }
    
    if (iterations >= MAX_ITERATIONS) {
      console.warn('FormRenderer - Maximum calculation iterations reached. Possible circular dependency.');
    } else {
      console.log(`FormRenderer - Calculations completed in ${iterations} iteration(s)`);
    }
    
    setFormData(updatedData);
    
    // Check for inventory anomalies after calculations
    checkInventoryAnomaly(updatedData);
    
    // Clear error for this field
    if (errors[fieldId]) {
      const updatedErrors = { ...errors };
      delete updatedErrors[fieldId];
      setErrors(updatedErrors);
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    
    // Check required fields
    fields.forEach(field => {
      if (!isFieldVisible(field.id)) return;
      
      if (isFieldRequired(field) && 
          (formData[field.id] === undefined || 
           formData[field.id] === null || 
           formData[field.id] === '')) {
        newErrors[field.id] = `${field.label} is required`;
      }
    });
    
    // Apply validation rules
    validationRules.forEach(rule => {
      if (!isFieldVisible(rule.field_id)) return;
      
      const field = fields.find(f => f.id === rule.field_id);
      if (!field) return;
      
      const value = formData[rule.field_id];
      
      // Skip validation if field is empty and not required
      if ((value === undefined || value === null || value === '') && !isFieldRequired(field)) {
        return;
      }
      
      switch (rule.rule_type) {
        case 'min':
          if (field.type === 'number' && Number(value) < Number(rule.rule_value)) {
            newErrors[rule.field_id] = rule.error_message || 
              `${field.label} must be at least ${rule.rule_value}`;
          } else if (typeof value === 'string' && value.length < Number(rule.rule_value)) {
            newErrors[rule.field_id] = rule.error_message || 
              `${field.label} must be at least ${rule.rule_value} characters`;
          }
          break;
        case 'max':
          if (field.type === 'number' && Number(value) > Number(rule.rule_value)) {
            newErrors[rule.field_id] = rule.error_message || 
              `${field.label} must be at most ${rule.rule_value}`;
          } else if (typeof value === 'string' && value.length > Number(rule.rule_value)) {
            newErrors[rule.field_id] = rule.error_message || 
              `${field.label} must be at most ${rule.rule_value} characters`;
          }
          break;
        case 'pattern':
          if (typeof value === 'string' && !new RegExp(String(rule.rule_value)).test(value)) {
            newErrors[rule.field_id] = rule.error_message || 
              `${field.label} has an invalid format`;
          }
          break;
        case 'custom':
          // Custom validation would be implemented here
          // This could be a function name that's looked up in a registry
          break;
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    
    if (validateForm()) {
      try {
        await onSubmit(formData);
      } catch (error) {
        console.error('Form submission error:', error);
        // Could set a general form error here
      }
    }
    
    setIsSubmitting(false);
  };

  // Render form fields
  const renderField = (field: FormField) => {
    if (!isFieldVisible(field.id)) return null;
    
    // Hide calculated fields if toggle is off
    if (field.type === 'calculated' && !showCalculatedFields) return null;
    
    const isDisabled = isFieldDisabled(field.id) || field.type === 'calculated';
    
    return (
      <div className="mb-4" key={field.id}>
        <Label htmlFor={field.id} className="flex items-center">
          {field.label}
          {isFieldRequired(field) && <span className="text-red-500 ml-1">*</span>}
        </Label>
        
        {field.description && (
          <p className="text-sm text-muted-foreground mb-2">{field.description}</p>
        )}
        
        {field.type === 'text' && (
          <Input
            id={field.id}
            value={formData[field.id] || ''}
            onChange={(e) => handleChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            disabled={isDisabled}
            className={errors[field.id] ? 'border-red-500' : ''}
          />
        )}
        
        {field.type === 'number' && (
          <Input
            id={field.id}
            type="number"
            value={formData[field.id] || ''}
            onChange={(e) => handleChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            disabled={isDisabled}
            className={errors[field.id] ? 'border-red-500' : ''}
          />
        )}
        
        {field.type === 'textarea' && (
          <Textarea
            id={field.id}
            value={formData[field.id] || ''}
            onChange={(e) => handleChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            disabled={isDisabled}
            className={errors[field.id] ? 'border-red-500' : ''}
          />
        )}
        
        {field.type === 'select' && (
          <Select
            value={formData[field.id] || ''}
            onValueChange={(value) => handleChange(field.id, value)}
            disabled={isDisabled}
          >
            <SelectTrigger id={field.id} className={errors[field.id] ? 'border-red-500' : ''}>
              <SelectValue placeholder={field.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        
        {field.type === 'checkbox' && (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={field.id}
              checked={!!formData[field.id]}
              onCheckedChange={(checked) => handleChange(field.id, checked)}
              disabled={isDisabled}
              className={errors[field.id] ? 'border-red-500' : ''}
            />
            <Label htmlFor={field.id} className="text-sm font-normal">
              {field.placeholder || 'Yes'}
            </Label>
          </div>
        )}
        
        {field.type === 'date' && (
          <Input
            id={field.id}
            type="date"
            value={formData[field.id] || ''}
            onChange={(e) => handleChange(field.id, e.target.value)}
            disabled={isDisabled}
            className={errors[field.id] ? 'border-red-500' : ''}
          />
        )}
        
        {field.type === 'calculated' && (
          <Input
            id={field.id}
            value={formData[field.id] || '0.00'}
            readOnly
            disabled
            className="bg-muted"
          />
        )}
        
        {field.type === 'barcode' && (
          <div className="flex space-x-2">
            <Input
              id={field.id}
              value={formData[field.id] || ''}
              onChange={(e) => handleChange(field.id, e.target.value)}
              placeholder="Scan barcode"
              disabled={isDisabled}
              className={`flex-1 ${errors[field.id] ? 'border-red-500' : ''}`}
            />
            <Button type="button" variant="outline" disabled={isDisabled}>
              Scan
            </Button>
          </div>
        )}
        
        {/* Display validation error */}
        {errors[field.id] && (
          <p className="text-sm text-red-500 mt-1">{errors[field.id]}</p>
        )}
      </div>
    );
  };

  // Debug helper - expose current form state to window for debugging
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__debugFormState = () => {
        console.log('=== Form Debug Info ===');
        console.log('Form Data:', formData);
        console.log('Mapped Fields:', mappedFields);
        console.log('Fields:', fields);
        console.log('Calculated Fields:', fields.filter(f => f.type === 'calculated').map(f => ({
          id: f.id,
          label: f.label,
          formula: f.formula,
          value: formData[f.id]
        })));
        console.log('======================');
      };
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).__debugFormState;
      }
    };
  }, [formData, mappedFields, fields]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Asset info and calculated fields toggle */}
      {assetName && (
        <Alert className="mb-4">
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="flex justify-between items-center">
              <span>
                <strong>Asset:</strong> {assetName}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowCalculatedFields(!showCalculatedFields)}
                className="ml-4"
              >
                {showCalculatedFields ? (
                  <>
                    <EyeOff className="h-4 w-4 mr-2" />
                    Hide Conversions
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Show Conversions
                  </>
                )}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      {/* Inventory Warning */}
      {inventoryWarning && (
        <Alert className="mb-4 border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800 whitespace-pre-line">
            {inventoryWarning}
          </AlertDescription>
        </Alert>
      )}
      
      <div className="grid gap-4">
        {fields.map(renderField)}
      </div>
      
      {!readOnly && (
        <div className="flex justify-end">
          <Button 
            type="submit" 
            className="w-full"
            disabled={isSubmitting || submitButtonDisabled}
          >
            {submitButtonIcon && (
              <span className="mr-2">
                {React.createElement(submitButtonIcon, submitButtonIconProps)}
              </span>
            )}
            {submitButtonText || "Submit"}
          </Button>
        </div>
      )}
    </form>
  );
} 