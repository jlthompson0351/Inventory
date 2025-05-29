import React from 'react';
import { GripVertical, MoveUp, MoveDown, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import VisualFormulaBuilder from './VisualFormulaBuilder';

export interface FormField {
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

interface FormFieldCardProps {
  field: FormField;
  isSelected: boolean;
  isDragging: boolean;
  mappedFields: any[];
  mockMappedValues: { [key: string]: string | number };
  allFields: FormField[];
  onSelect: () => void;
  onRemove: () => void;
  onMove: (direction: 'up' | 'down') => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onUpdateFormula: (formula: string) => void;
  onPreviewCalculation: (formula: string) => string;
  resetFormulaToTextMode?: boolean;
}

export const FormFieldCard: React.FC<FormFieldCardProps> = ({
  field,
  isSelected,
  isDragging,
  mappedFields,
  mockMappedValues,
  allFields,
  onSelect,
  onRemove,
  onMove,
  onDragStart,
  onDragOver,
  onDrop,
  onUpdateFormula,
  onPreviewCalculation,
  resetFormulaToTextMode,
}) => {
  const fieldTypes = {
    text: 'Text',
    number: 'Number',
    textarea: 'Text Area',
    select: 'Dropdown',
    date: 'Date',
    checkbox: 'Checkbox',
    calculated: 'Calculated Field',
    current_inventory: 'Current Inventory',
  };

  const getInventoryActionBadge = () => {
    if (!field.inventory_action || field.inventory_action === 'none') return null;
    
    const actionConfig = {
      set: { icon: '📋', text: 'SET', className: 'border-blue-500 text-blue-700 bg-blue-50' },
      add: { icon: '🔼', text: 'ADD', className: 'border-green-500 text-green-700 bg-green-50' },
      subtract: { icon: '🔽', text: 'SUB', className: 'border-orange-500 text-orange-700 bg-orange-50' },
    };

    const config = actionConfig[field.inventory_action];
    if (!config) return null;

    return (
      <Badge 
        variant="outline" 
        className={`text-[10px] px-1.5 py-0.5 font-medium ${config.className}`}
      >
        {config.icon} {config.text}
      </Badge>
    );
  };

  return (
    <div
      className={`border rounded-md p-4 relative ${
        isSelected ? "border-primary" : ""
      } ${
        isDragging ? "opacity-50" : ""
      }`}
      onClick={onSelect}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="flex items-start mb-3">
        <div className="cursor-move p-1 text-muted-foreground mt-1">
          <GripVertical className="h-4 w-4" />
        </div>
        <div className="flex-1 ml-2 min-w-0">
          <p className="font-medium text-sm leading-tight break-words">{field.label || "Untitled Field"}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">
              {fieldTypes[field.type] || field.type}
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
            {getInventoryActionBadge()}
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
                    onMove('up');
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
                    onMove('down');
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
                    onRemove();
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
                onChange={onUpdateFormula}
                currentFields={allFields.filter(f => f.id !== field.id)}
                mappedFields={mappedFields}
                onPreview={onPreviewCalculation}
                resetToTextMode={resetFormulaToTextMode}
              />
              {field.formula && (
                <div className="mt-2 text-sm text-muted-foreground bg-gray-50 p-2 rounded">
                  Preview: {onPreviewCalculation(field.formula)}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 