import { useState, useRef, useEffect } from 'react';
import { Calculator, Eye, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

interface ExcelFormulaBuilderProps {
  formula: string;
  onChange: (formula: string) => void;
  currentFields: FormField[];
  mappedFields: MappedField[];
  onPreview?: (formula: string) => string;
  className?: string;
}

export default function ExcelFormulaBuilder({
  formula,
  onChange,
  currentFields,
  mappedFields,
  onPreview,
  className = ""
}: ExcelFormulaBuilderProps) {
  const [internalFormula, setInternalFormula] = useState(formula);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<any[]>([]);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Convert current bracket formula to display format
  useEffect(() => {
    setInternalFormula(convertToDisplayFormat(formula));
  }, [formula]);

  // Convert legacy {field_1} format to Excel [Field Name] format for display
  const convertToDisplayFormat = (legacyFormula: string): string => {
    if (!legacyFormula) return '';
    
    let displayFormula = legacyFormula;
    
    // Convert {field_id} to [Field Label]
    currentFields.forEach(field => {
      const regex = new RegExp(`\\{${field.id}\\}`, 'g');
      displayFormula = displayFormula.replace(regex, `[${field.label}]`);
    });
    
    // Convert {mapped.field_name} to [Asset.Field Name]
    mappedFields.forEach(field => {
      const regex = new RegExp(`\\{mapped\\.${field.field_id}\\}`, 'g');
      const assetName = field.source === 'conversion' ? 'Asset' : field.form_name;
      displayFormula = displayFormula.replace(regex, `[${assetName}.${field.field_label}]`);
    });
    
    return displayFormula;
  };

  // Convert Excel [Field Name] format back to legacy {field_1} format
  const convertToLegacyFormat = (displayFormula: string): string => {
    if (!displayFormula) return '';
    
    let legacyFormula = displayFormula;
    
    // Convert [Field Label] back to {field_id}
    currentFields.forEach(field => {
      const regex = new RegExp(`\\[${field.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`, 'g');
      legacyFormula = legacyFormula.replace(regex, `{${field.id}}`);
    });
    
    // Convert [Asset.Field Name] back to {mapped.field_name}
    mappedFields.forEach(field => {
      const assetName = field.source === 'conversion' ? 'Asset' : field.form_name;
      const regex = new RegExp(`\\[${assetName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.${field.field_label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`, 'g');
      legacyFormula = legacyFormula.replace(regex, `{mapped.${field.field_id}}`);
    });
    
    return legacyFormula;
  };

  // Handle formula changes
  const handleFormulaChange = (value: string) => {
    setInternalFormula(value);
    const legacyFormat = convertToLegacyFormat(value);
    onChange(legacyFormat);
    
    // Show suggestions if typing [ 
    if (value.includes('[') && !value.endsWith(']')) {
      showFieldSuggestions(value);
    } else {
      setShowSuggestions(false);
    }
  };

  // Show field suggestions when typing [
  const showFieldSuggestions = (currentValue: string) => {
    const lastBracketIndex = currentValue.lastIndexOf('[');
    if (lastBracketIndex === -1) return;
    
    const searchTerm = currentValue.slice(lastBracketIndex + 1).toLowerCase();
    
    const allFields = [
      ...currentFields.map(f => ({
        type: 'form',
        label: f.label,
        displayText: f.label,
        insertText: `[${f.label}]`,
        badge: f.type
      })),
      ...mappedFields.map(f => {
        const assetName = f.source === 'conversion' ? 'Asset' : f.form_name;
        return {
          type: f.source,
          label: f.field_label,
          displayText: `${assetName}.${f.field_label}`,
          insertText: `[${assetName}.${f.field_label}]`,
          badge: f.field_type
        };
      })
    ];
    
    const filtered = allFields.filter(field => 
      field.displayText.toLowerCase().includes(searchTerm)
    );
    
    setFilteredSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
  };

  // Insert field at cursor position
  const insertField = (fieldText: string) => {
    if (!inputRef.current) return;
    
    const input = inputRef.current;
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const currentValue = internalFormula;
    
    // Find the position of the incomplete bracket
    const beforeCursor = currentValue.slice(0, start);
    const lastBracketIndex = beforeCursor.lastIndexOf('[');
    
    let newValue;
    if (lastBracketIndex !== -1) {
      // Replace the incomplete bracket with the complete field
      newValue = currentValue.slice(0, lastBracketIndex) + fieldText + currentValue.slice(end);
    } else {
      // Insert at cursor position
      newValue = currentValue.slice(0, start) + fieldText + currentValue.slice(end);
    }
    
    handleFormulaChange(newValue);
    setShowSuggestions(false);
    
    // Focus back to input
    setTimeout(() => {
      input.focus();
      const newCursorPos = lastBracketIndex !== -1 ? lastBracketIndex + fieldText.length : start + fieldText.length;
      input.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // Click to insert field
  const clickToInsertField = (field: any) => {
    const insertText = field.insertText;
    const currentValue = internalFormula;
    const newValue = currentValue + insertText;
    
    handleFormulaChange(newValue);
    
    // Focus and move cursor to end
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(newValue.length, newValue.length);
      }
    }, 0);
  };

  // Copy field reference to clipboard
  const copyFieldReference = async (field: any) => {
    try {
      await navigator.clipboard.writeText(field.insertText);
      setCopiedField(field.insertText);
      toast({
        title: "Copied to clipboard",
        description: `${field.insertText} copied successfully`,
      });
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Group mapped fields by source
  const conversionFields = mappedFields.filter(f => f.source === 'conversion');
  const formMappedFields = mappedFields.filter(f => f.source === 'form');

  return (
    <div className={`space-y-4 ${className}`}>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Formula Builder
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Excel-style formulas with click-to-insert fields. Type <kbd>[</kbd> for field suggestions.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Main Formula Input */}
          <div className="space-y-2">
            <Label htmlFor="formula-input">Formula</Label>
            <div className="relative">
              <Input
                ref={inputRef}
                id="formula-input"
                value={internalFormula}
                onChange={(e) => handleFormulaChange(e.target.value)}
                placeholder="=[How Many in litter] * [Asset.How many]"
                className="font-mono pr-10"
                onFocus={() => {
                  // Update cursor position
                  setTimeout(() => {
                    if (inputRef.current) {
                      setCursorPosition(inputRef.current.selectionStart || 0);
                    }
                  }, 0);
                }}
                onKeyUp={(e) => {
                  setCursorPosition((e.target as HTMLInputElement).selectionStart || 0);
                }}
              />
              
              {/* Suggestions Dropdown */}
              {showSuggestions && (
                <div className="absolute top-full left-0 right-0 z-50 bg-white border rounded-md shadow-lg mt-1 max-h-40 overflow-y-auto">
                  {filteredSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center gap-2"
                      onClick={() => insertField(suggestion.insertText)}
                    >
                      <Badge variant="outline" className="text-xs">
                        {suggestion.badge}
                      </Badge>
                      <span className="flex-1">{suggestion.displayText}</span>
                      <Badge variant="secondary" className="text-xs">
                        {suggestion.type === 'form' ? 'Field' : suggestion.type === 'conversion' ? 'Asset' : 'Form'}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Use square brackets like Excel: <code>[Field Name]</code> for form fields, <code>[Asset.Field Name]</code> for conversions
            </p>
          </div>

          {/* Compact Field Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Form Fields Dropdown */}
            <div className="space-y-1">
              <Label className="text-sm font-medium">Form Fields ({currentFields.length})</Label>
              <Select onValueChange={(value) => {
                const field = currentFields.find(f => f.id === value);
                if (field) {
                  clickToInsertField({
                    insertText: `[${field.label}]`,
                    displayText: field.label
                  });
                }
              }}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Click to insert field" />
                </SelectTrigger>
                <SelectContent>
                  {currentFields.map(field => (
                    <SelectItem key={field.id} value={field.id}>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {field.type}
                        </Badge>
                        <span>{field.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                  {currentFields.length === 0 && (
                    <SelectItem value="none" disabled>
                      No form fields available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Asset Fields Dropdown */}
            <div className="space-y-1">
              <Label className="text-sm font-medium">Asset Fields ({conversionFields.length})</Label>
              <Select onValueChange={(value) => {
                const field = conversionFields.find(f => f.field_id === value);
                if (field) {
                  clickToInsertField({
                    insertText: `[Asset.${field.field_label}]`,
                    displayText: `Asset.${field.field_label}`
                  });
                }
              }}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Click to insert asset field" />
                </SelectTrigger>
                <SelectContent>
                  {conversionFields.map(field => (
                    <SelectItem key={field.id} value={field.field_id}>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {field.field_type}
                        </Badge>
                        <span>{field.field_label}</span>
                      </div>
                    </SelectItem>
                  ))}
                  {conversionFields.length === 0 && (
                    <SelectItem value="none" disabled>
                      No asset fields available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Other Forms Dropdown */}
            <div className="space-y-1">
              <Label className="text-sm font-medium">Other Forms ({formMappedFields.length})</Label>
              <Select onValueChange={(value) => {
                const field = formMappedFields.find(f => f.field_id === value);
                if (field) {
                  clickToInsertField({
                    insertText: `[${field.form_name}.${field.field_label}]`,
                    displayText: `${field.form_name}.${field.field_label}`
                  });
                }
              }}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Click to insert mapped field" />
                </SelectTrigger>
                <SelectContent>
                  {formMappedFields.map(field => (
                    <SelectItem key={field.id} value={field.field_id}>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {field.field_type}
                        </Badge>
                        <div>
                          <div className="text-sm">{field.field_label}</div>
                          <div className="text-xs text-muted-foreground">{field.form_name}</div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                  {formMappedFields.length === 0 && (
                    <SelectItem value="none" disabled>
                      No mapped fields available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Quick Insert Operators */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Quick Insert</Label>
            <div className="flex flex-wrap gap-2">
              {['+', '-', '*', '/', '(', ')'].map(op => (
                <Button
                  key={op}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newValue = internalFormula + op;
                    handleFormulaChange(newValue);
                    setTimeout(() => {
                      if (inputRef.current) {
                        inputRef.current.focus();
                        inputRef.current.setSelectionRange(newValue.length, newValue.length);
                      }
                    }, 0);
                  }}
                  className="h-8 w-8 p-0"
                >
                  {op}
                </Button>
              ))}
            </div>
          </div>

          {/* Preview */}
          {onPreview && internalFormula && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="h-4 w-4 text-green-600" />
                <Label className="text-sm font-medium text-green-800">Preview</Label>
              </div>
              <p className="font-mono text-sm text-green-700">
                Result: {onPreview(convertToLegacyFormat(internalFormula))}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
