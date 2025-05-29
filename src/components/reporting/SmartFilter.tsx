import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, X, ChevronDown, Search } from 'lucide-react';
import { format } from 'date-fns';

interface SmartFilterProps {
  filterRule: any;
  updateFilterRule: (id: string, key: string, value: any) => void;
  removeFilterRule: (id: string) => void;
  formFields: any[];
  previewData: any[];
}

export function SmartFilter({ 
  filterRule, 
  updateFilterRule, 
  removeFilterRule, 
  formFields, 
  previewData 
}: SmartFilterProps) {
  const [searchValue, setSearchValue] = useState('');

  // Get field info
  const selectedField = formFields.find(f => f.id === filterRule.field);
  
  // Get unique values for the selected field from preview data
  const availableValues = useMemo(() => {
    if (!selectedField || !previewData.length) return [];
    
    const values = previewData
      .map(row => row[selectedField.id])
      .filter(val => val !== null && val !== undefined && val !== '')
      .map(val => String(val));
    
    const uniqueValues = [...new Set(values)];
    return uniqueValues.sort();
  }, [selectedField, previewData]);

  // Filter values based on search
  const filteredValues = useMemo(() => {
    if (!searchValue) return availableValues;
    return availableValues.filter(val => 
      val.toLowerCase().includes(searchValue.toLowerCase())
    );
  }, [availableValues, searchValue]);

  // Get appropriate operators for field type
  const getOperatorsForField = (fieldType: string) => {
    switch (fieldType) {
      case 'number':
      case 'currency':
        return [
          { value: 'equals', label: 'Equals' },
          { value: 'not_equals', label: 'Does not equal' },
          { value: 'greater_than', label: 'Greater than' },
          { value: 'less_than', label: 'Less than' },
          { value: 'between', label: 'Between' },
          { value: 'is_null', label: 'Is empty' },
          { value: 'is_not_null', label: 'Is not empty' }
        ];
      case 'date':
      case 'datetime':
        return [
          { value: 'equals', label: 'Is' },
          { value: 'not_equals', label: 'Is not' },
          { value: 'greater_than', label: 'Is after' },
          { value: 'less_than', label: 'Is before' },
          { value: 'between', label: 'Is between' },
          { value: 'is_null', label: 'Is empty' },
          { value: 'is_not_null', label: 'Is not empty' }
        ];
      case 'text':
      case 'select':
      default:
        return [
          { value: 'equals', label: 'Is' },
          { value: 'not_equals', label: 'Is not' },
          { value: 'contains', label: 'Contains' },
          { value: 'not_contains', label: 'Does not contain' },
          { value: 'starts_with', label: 'Starts with' },
          { value: 'ends_with', label: 'Ends with' },
          { value: 'in', label: 'Is any of' },
          { value: 'not_in', label: 'Is none of' },
          { value: 'is_null', label: 'Is empty' },
          { value: 'is_not_null', label: 'Is not empty' }
        ];
    }
  };

  const operators = selectedField ? getOperatorsForField(selectedField.field_type) : [];

  // Render value input based on field type and operator
  const renderValueInput = () => {
    if (!selectedField) return null;

    const needsNoValue = ['is_null', 'is_not_null'].includes(filterRule.operator);
    if (needsNoValue) {
      return <div className="text-sm text-muted-foreground italic">No value needed</div>;
    }

    const fieldType = selectedField.field_type;
    const operator = filterRule.operator;

    // Multi-select for "in" and "not_in" operators
    if (['in', 'not_in'].includes(operator)) {
      const selectedValues = Array.isArray(filterRule.value) ? filterRule.value : [];
      
      return (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              {selectedValues.length === 0 ? (
                "Select values..."
              ) : selectedValues.length === 1 ? (
                selectedValues[0]
              ) : (
                `${selectedValues.length} values selected`
              )}
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0">
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search values..." 
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto p-2">
              {filteredValues.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  {availableValues.length === 0 ? 'No values available' : 'No matching values'}
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredValues.map((value) => (
                    <div key={value} className="flex items-center space-x-2 p-2 hover:bg-slate-50 rounded">
                      <Checkbox
                        checked={selectedValues.includes(value)}
                        onCheckedChange={(checked) => {
                          const newValues = checked 
                            ? [...selectedValues, value]
                            : selectedValues.filter(v => v !== value);
                          updateFilterRule(filterRule.id, 'value', newValues);
                        }}
                      />
                      <label className="text-sm cursor-pointer flex-grow">{value}</label>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {selectedValues.length > 0 && (
              <div className="p-2 border-t bg-slate-50">
                <div className="flex flex-wrap gap-1">
                  {selectedValues.map((value) => (
                    <Badge key={value} variant="secondary" className="text-xs">
                      {value}
                      <X 
                        className="ml-1 h-3 w-3 cursor-pointer" 
                        onClick={() => {
                          const newValues = selectedValues.filter(v => v !== value);
                          updateFilterRule(filterRule.id, 'value', newValues);
                        }}
                      />
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </PopoverContent>
        </Popover>
      );
    }

    // Date inputs
    if (['date', 'datetime'].includes(fieldType)) {
      if (operator === 'between') {
        return (
          <div className="grid grid-cols-2 gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filterRule.value ? format(new Date(filterRule.value), 'MM/dd/yyyy') : 'Start date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filterRule.value ? new Date(filterRule.value) : undefined}
                  onSelect={(date) => updateFilterRule(filterRule.id, 'value', date?.toISOString())}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filterRule.secondValue ? format(new Date(filterRule.secondValue), 'MM/dd/yyyy') : 'End date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filterRule.secondValue ? new Date(filterRule.secondValue) : undefined}
                  onSelect={(date) => updateFilterRule(filterRule.id, 'secondValue', date?.toISOString())}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        );
      } else {
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filterRule.value ? format(new Date(filterRule.value), 'MM/dd/yyyy') : 'Select date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filterRule.value ? new Date(filterRule.value) : undefined}
                onSelect={(date) => updateFilterRule(filterRule.id, 'value', date?.toISOString())}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        );
      }
    }

    // Dropdown for text fields with available values (Airtable style!)
    if (['text', 'select'].includes(fieldType) && availableValues.length > 0 && !['contains', 'not_contains', 'starts_with', 'ends_with'].includes(operator)) {
      return (
        <Select value={filterRule.value || ''} onValueChange={(value) => updateFilterRule(filterRule.id, 'value', value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select value..." />
          </SelectTrigger>
          <SelectContent>
            <div className="p-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search..." 
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  className="pl-8 mb-2"
                />
              </div>
            </div>
            {filteredValues.length === 0 ? (
              <div className="text-center py-2 text-muted-foreground text-sm">No matching values</div>
            ) : (
              filteredValues.map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      );
    }

    // Number inputs
    if (['number', 'currency'].includes(fieldType)) {
      if (operator === 'between') {
        return (
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              placeholder="Min value"
              value={filterRule.value || ''}
              onChange={(e) => updateFilterRule(filterRule.id, 'value', e.target.value)}
            />
            <Input
              type="number"
              placeholder="Max value"
              value={filterRule.secondValue || ''}
              onChange={(e) => updateFilterRule(filterRule.id, 'secondValue', e.target.value)}
            />
          </div>
        );
      } else {
        return (
          <Input
            type="number"
            placeholder="Enter number"
            value={filterRule.value || ''}
            onChange={(e) => updateFilterRule(filterRule.id, 'value', e.target.value)}
          />
        );
      }
    }

    // Fallback to text input
    return (
      <Input
        placeholder="Enter value"
        value={filterRule.value || ''}
        onChange={(e) => updateFilterRule(filterRule.id, 'value', e.target.value)}
      />
    );
  };

  return (
    <div className="border rounded-md p-4 bg-slate-50 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end">
        {/* Field Selection */}
        <div className="space-y-1">
          <Label className="text-xs">Field</Label>
          <Select value={filterRule.field} onValueChange={(value) => {
            updateFilterRule(filterRule.id, "field", value);
            // Reset operator and value when field changes
            updateFilterRule(filterRule.id, "operator", "equals");
            updateFilterRule(filterRule.id, "value", "");
            updateFilterRule(filterRule.id, "secondValue", "");
          }}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Select field" />
            </SelectTrigger>
            <SelectContent>
              {formFields.filter(f => f.id !== 'record_source').map(f => (
                <SelectItem key={f.id} value={f.id} className="text-xs">
                  <div className="flex items-center">
                    <span>{f.field_label}</span>
                    <Badge variant="outline" className="ml-2 text-xs">
                      {f.field_type}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Operator Selection */}
        <div className="space-y-1">
          <Label className="text-xs">Condition</Label>
          <Select value={filterRule.operator} onValueChange={(value) => {
            updateFilterRule(filterRule.id, "operator", value);
            // Reset value when operator changes
            updateFilterRule(filterRule.id, "value", "");
            updateFilterRule(filterRule.id, "secondValue", "");
          }}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Operator" />
            </SelectTrigger>
            <SelectContent>
              {operators.map(op => (
                <SelectItem key={op.value} value={op.value} className="text-xs">
                  {op.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Value Input */}
        <div className="space-y-1">
          <Label className="text-xs">Value</Label>
          {renderValueInput()}
        </div>

        {/* Remove Button */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-9 w-9 mt-auto" 
          onClick={() => removeFilterRule(filterRule.id)}
        >
          <X className="h-4 w-4 text-destructive" />
        </Button>
      </div>

      {/* Preview of current filter */}
      {selectedField && filterRule.operator && (
        <div className="text-xs text-muted-foreground bg-white p-2 rounded border">
          <strong>Filter:</strong> {selectedField.field_label} {operators.find(op => op.value === filterRule.operator)?.label.toLowerCase()} {
            ['is_null', 'is_not_null'].includes(filterRule.operator) 
              ? ''
              : Array.isArray(filterRule.value) 
                ? `[${filterRule.value.join(', ')}]`
                : filterRule.value
          }
        </div>
      )}
    </div>
  );
} 