import { useState, useEffect } from 'react';
import { Plus, Trash2, Calculator, Eye, EyeOff, Parentheses } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

interface FormField {
  id: string;
  label: string;
  type: string;
}

interface MappedField {
  id: string;
  field_id: string;
  field_label: string;
  field_type: string;
  form_name: string;
  source: 'conversion' | 'form';
}

interface FormulaElement {
  id: string;
  type: 'field' | 'mapped' | 'operator' | 'number' | 'parenthesis';
  value: string;
  label?: string;
  source?: string;
}

interface VisualFormulaBuilderProps {
  formula: string;
  onChange: (formula: string) => void;
  currentFields: FormField[];
  mappedFields: MappedField[];
  onPreview?: (formula: string) => string;
  className?: string;
  resetToTextMode?: boolean;
}

const OPERATORS = [
  { value: '+', label: 'Add (+)', description: 'Addition' },
  { value: '-', label: 'Subtract (-)', description: 'Subtraction' },
  { value: '*', label: 'Multiply (×)', description: 'Multiplication' },
  { value: '/', label: 'Divide (÷)', description: 'Division' },
  { value: '**', label: 'Power (^)', description: 'Exponentiation' },
  { value: '%', label: 'Modulo (%)', description: 'Remainder' },
];

const FUNCTIONS = [
  { value: 'Math.round', label: 'Round', description: 'Round to nearest integer' },
  { value: 'Math.ceil', label: 'Ceiling', description: 'Round up' },
  { value: 'Math.floor', label: 'Floor', description: 'Round down' },
  { value: 'Math.abs', label: 'Absolute', description: 'Absolute value' },
  { value: 'Math.max', label: 'Maximum', description: 'Largest of values' },
  { value: 'Math.min', label: 'Minimum', description: 'Smallest of values' },
];

export default function VisualFormulaBuilder({
  formula,
  onChange,
  currentFields,
  mappedFields,
  onPreview,
  className = "",
  resetToTextMode = false
}: VisualFormulaBuilderProps) {
  const [elements, setElements] = useState<FormulaElement[]>([]);
  const [showTextEditor, setShowTextEditor] = useState(true);
  const [textFormula, setTextFormula] = useState(formula);
  const [numberInput, setNumberInput] = useState('');
  
  // Reset keys for dropdowns to force them to reset after selection
  const [fieldSelectKey, setFieldSelectKey] = useState(0);
  const [conversionSelectKey, setConversionSelectKey] = useState(0);
  const [operatorSelectKey, setOperatorSelectKey] = useState(0);

  // Parse formula into elements when formula prop changes
  useEffect(() => {
    parseFormulaToElements(formula);
  }, [formula]);

  // Handle reset to text mode from parent
  useEffect(() => {
    if (resetToTextMode) {
      setShowTextEditor(true);
    }
  }, [resetToTextMode]);

  // Update text formula when elements change (but not if we're in text mode)
  useEffect(() => {
    if (!showTextEditor) {
      const newFormula = elementsToFormula(elements);
      setTextFormula(newFormula);
      onChange(newFormula);
    }
  }, [elements, showTextEditor]);

  const parseFormulaToElements = (formulaStr: string) => {
    const parsed: FormulaElement[] = [];
    let remaining = formulaStr.trim();
    let elementId = 0;

    if (!remaining) {
      setElements([]);
      return;
    }

    // Simple parsing - this could be enhanced with a proper parser
    const tokens = remaining.match(/\{[^}]+\}|[\+\-\*/\(\)%]|\d+(?:\.\d+)?|\w+/g) || [];
    
    tokens.forEach(token => {
      elementId++;
      
      if (token.match(/^\{.*\}$/)) {
        // Field reference
        const fieldRef = token.slice(1, -1);
        if (fieldRef.startsWith('mapped.')) {
          const fieldId = fieldRef.substring(7);
          const mappedField = mappedFields.find(f => f.field_id === fieldId);
          parsed.push({
            id: `element_${elementId}`,
            type: 'mapped',
            value: fieldId,
            label: mappedField ? mappedField.field_label : fieldId,
            source: mappedField ? mappedField.form_name : 'Unknown'
          });
        } else {
          const formField = currentFields.find(f => f.id === fieldRef);
          parsed.push({
            id: `element_${elementId}`,
            type: 'field',
            value: fieldRef,
            label: formField ? formField.label : fieldRef
          });
        }
      } else if (token.match(/^[\+\-\*/\(\)%]$/)) {
        // Operator or parenthesis
        if (token === '(' || token === ')') {
          parsed.push({
            id: `element_${elementId}`,
            type: 'parenthesis',
            value: token,
            label: token
          });
        } else {
          parsed.push({
            id: `element_${elementId}`,
            type: 'operator',
            value: token,
            label: OPERATORS.find(op => op.value === token)?.label || token
          });
        }
      } else if (token.match(/^\d+(?:\.\d+)?$/)) {
        // Number
        parsed.push({
          id: `element_${elementId}`,
          type: 'number',
          value: token,
          label: token
        });
      }
    });

    setElements(parsed);
  };

  const elementsToFormula = (elements: FormulaElement[]): string => {
    return elements.map(element => {
      switch (element.type) {
        case 'field':
          return `{${element.value}}`;
        case 'mapped':
          return `{mapped.${element.value}}`;
        case 'operator':
        case 'parenthesis':
        case 'number':
          return element.value;
        default:
          return '';
      }
    }).join(' ');
  };

  const addElement = (type: 'field' | 'mapped' | 'operator' | 'number' | 'parenthesis', value: string, label?: string, source?: string) => {
    const newElement: FormulaElement = {
      id: `element_${Date.now()}_${Math.random()}`,
      type,
      value,
      label,
      source
    };
    setElements(prev => [...prev, newElement]);
  };

  const removeElement = (elementId: string) => {
    setElements(prev => prev.filter(el => el.id !== elementId));
  };

  const clearFormula = () => {
    setElements([]);
  };

  const addNumber = () => {
    if (numberInput.trim() && !isNaN(parseFloat(numberInput))) {
      addElement('number', numberInput, numberInput);
      setNumberInput('');
    }
  };

  const handleTextFormulaChange = (value: string) => {
    setTextFormula(value);
    onChange(value);
    parseFormulaToElements(value);
  };

  const conversionFields = mappedFields.filter(f => f.source === 'conversion');
  const formMappedFields = mappedFields.filter(f => f.source === 'form');

  return (
    <div className={`space-y-4 ${className}`}>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Formula Builder
            </CardTitle>
            <div className="flex items-center gap-2">
              <Label htmlFor="text-editor" className="text-sm">
                Text Editor
              </Label>
              <Switch
                id="text-editor"
                checked={showTextEditor}
                onCheckedChange={setShowTextEditor}
              />
              {showTextEditor && (
                <span className="text-xs text-green-600 font-medium">Recommended</span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {showTextEditor ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Formula (Text Mode)</Label>
                <Input
                  value={textFormula}
                  onChange={(e) => handleTextFormulaChange(e.target.value)}
                  placeholder="e.g. {field_1} * {mapped.conversion_rate} + 10"
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Use {'{field_id}'} for form fields and {'{mapped.field_name}'} for conversion fields
                </p>
              </div>
              
              {/* Quick field insertion for text mode */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Insert Form Fields</Label>
                  <Select onValueChange={(value) => {
                    const cursorPos = 0; // Could be enhanced to track cursor position
                    const newFormula = textFormula + `{${value}}`;
                    handleTextFormulaChange(newFormula);
                  }}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Insert field" />
                    </SelectTrigger>
                    <SelectContent>
                      {currentFields.map(field => (
                        <SelectItem key={field.id} value={field.id}>
                          {field.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm">Insert Conversion Fields</Label>
                  <Select onValueChange={(value) => {
                    const newFormula = textFormula + `{mapped.${value}}`;
                    handleTextFormulaChange(newFormula);
                  }}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Insert conversion" />
                    </SelectTrigger>
                    <SelectContent>
                      {conversionFields.map(field => (
                        <SelectItem key={field.id} value={field.field_id}>
                          {field.field_label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Current Formula Display */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Current Formula</Label>
                  {elements.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearFormula}>
                      Clear All
                    </Button>
                  )}
                </div>
                <div className="min-h-[60px] p-3 border rounded-md bg-muted/20">
                  {elements.length === 0 ? (
                    <p className="text-muted-foreground">Build your formula using the controls below</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {elements.map((element) => (
                        <Badge
                          key={element.id}
                          variant={
                            element.type === 'field' ? 'default' :
                            element.type === 'mapped' ? 'secondary' :
                            element.type === 'operator' ? 'outline' :
                            element.type === 'number' ? 'destructive' :
                            'outline'
                          }
                          className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => removeElement(element.id)}
                        >
                          {element.label || element.value}
                          <Trash2 className="h-3 w-3 ml-1" />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                {elements.length > 0 && (
                  <code className="text-sm bg-muted px-2 py-1 rounded block">
                    {elementsToFormula(elements)}
                  </code>
                )}
              </div>

              {/* Add Elements Section */}
              <div className="space-y-4">
                <Label className="text-sm font-medium">Build Formula Step by Step</Label>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Current Form Fields */}
                  <div className="space-y-2">
                    <Label className="text-sm">Form Fields</Label>
                    <Select 
                      key={fieldSelectKey}
                      onValueChange={(value) => {
                        const field = currentFields.find(f => f.id === value);
                        if (field) {
                          addElement('field', value, field.label);
                          setFieldSelectKey(prev => prev + 1); // Reset dropdown
                        }
                      }}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Add field" />
                      </SelectTrigger>
                      <SelectContent>
                        {currentFields.map(field => (
                          <SelectItem key={field.id} value={field.id}>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px]">
                                {field.type}
                              </Badge>
                              {field.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Conversion Fields */}
                  <div className="space-y-2">
                    <Label className="text-sm">Conversions</Label>
                    <Select 
                      key={conversionSelectKey}
                      onValueChange={(value) => {
                        const field = conversionFields.find(f => f.field_id === value);
                        if (field) {
                          addElement('mapped', value, field.field_label, field.form_name);
                          setConversionSelectKey(prev => prev + 1); // Reset dropdown
                        }
                      }}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Add conversion" />
                      </SelectTrigger>
                      <SelectContent>
                        {conversionFields.map(field => (
                          <SelectItem key={field.id} value={field.field_id}>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-[10px]">
                                {field.field_type}
                              </Badge>
                              {field.field_label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Operators */}
                  <div className="space-y-2">
                    <Label className="text-sm">Operators</Label>
                    <Select 
                      key={operatorSelectKey}
                      onValueChange={(value) => {
                        const operator = OPERATORS.find(op => op.value === value);
                        if (operator) {
                          addElement('operator', value, operator.label);
                          setOperatorSelectKey(prev => prev + 1); // Reset dropdown
                        }
                      }}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Add operator" />
                      </SelectTrigger>
                      <SelectContent>
                        {OPERATORS.map(operator => (
                          <SelectItem key={operator.value} value={operator.value}>
                            {operator.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Numbers & Parentheses */}
                  <div className="space-y-2">
                    <Label className="text-sm">Numbers</Label>
                    <div className="flex gap-1">
                      <Input
                        type="number"
                        placeholder="0"
                        value={numberInput}
                        onChange={(e) => setNumberInput(e.target.value)}
                        className="h-8 flex-1"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            addNumber();
                          }
                        }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => addElement('parenthesis', '(', '(')}
                      >
                        (
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => addElement('parenthesis', ')', ')')}
                      >
                        )
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-6 text-xs"
                      onClick={addNumber}
                      disabled={!numberInput.trim() || isNaN(parseFloat(numberInput))}
                    >
                      Add Number
                    </Button>
                  </div>
                </div>

                {/* Mapped Fields from Forms */}
                {formMappedFields.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm">Mapped Fields (from other forms)</Label>
                    <Select onValueChange={(value) => {
                      const field = formMappedFields.find(f => f.field_id === value);
                      if (field) {
                        addElement('mapped', value, field.field_label, field.form_name);
                      }
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Add mapped field" />
                      </SelectTrigger>
                      <SelectContent>
                        {formMappedFields.map(field => (
                          <SelectItem key={field.id} value={field.field_id}>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px]">
                                {field.field_type}
                              </Badge>
                              {field.field_label}
                              <span className="text-xs text-muted-foreground">
                                from {field.form_name}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Preview */}
          {onPreview && elementsToFormula(elements) && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="h-4 w-4 text-green-600" />
                <Label className="text-sm font-medium text-green-800">Formula Preview</Label>
              </div>
              <p className="font-mono text-sm text-green-700">
                Result: {onPreview(elementsToFormula(elements))}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 