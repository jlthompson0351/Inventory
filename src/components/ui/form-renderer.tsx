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
import { evaluateFormula } from '@/lib/formulaEvaluator';

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
  submitButtonIconProps
}: FormRendererProps) {
  const [formData, setFormData] = useState<any>(initialData);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Extract fields from form.form_data
  const fields: FormField[] = (form.form_data as any)?.fields || [];

  // Initialize form data with default values
  useEffect(() => {
    const defaultData = { ...initialData };
    
    fields.forEach(field => {
      if (field.defaultValue !== undefined && defaultData[field.id] === undefined) {
        defaultData[field.id] = field.defaultValue;
      }
    });
    
    setFormData(defaultData);
  }, [form, initialData]);

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
      // Create variables object for evaluation
      const variables: Record<string, any> = {};
      fields.forEach(f => {
        variables[f.id] = formData[f.id] || 0;
      });
      
      // Use secure formula evaluator
      const result = evaluateFormula(field.formula, variables);
      return result.toString();
    } catch (e) {
      console.error('Formula evaluation error:', e);
      return 'Error';
    }
  };

  // Handle form change
  const handleChange = (fieldId: string, value: any) => {
    const updatedData = { ...formData, [fieldId]: value };
    
    // Calculate formula fields that depend on this field using secure evaluator
    fields.forEach(field => {
      if (field.type === 'calculated' && field.formula) {
        try {
          // Check if this formula depends on the changed field
          if (field.formula.includes(`{${fieldId}}`)) {
            // Create variables object for evaluation
            const variables: Record<string, any> = {};
            fields.forEach(f => {
              variables[f.id] = f.id === fieldId ? value : updatedData[f.id] || 0;
            });
            
            // Use secure formula evaluator
            const result = evaluateFormula(field.formula, variables);
            updatedData[field.id] = result.toString();
          }
        } catch (e) {
          console.error('Formula evaluation error:', e);
          updatedData[field.id] = 'Error';
        }
      }
    });
    
    setFormData(updatedData);
    
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
            value={calculateFieldValue(field)}
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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