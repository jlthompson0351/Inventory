import React, { useState } from 'react';
import { Calculator, Save, Trash2, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Separator } from '@/components/ui/separator';

export interface MockValueSet {
  id: string;
  name: string;
  values: { [key: string]: string | number };
}

interface MockValueTestingPanelProps {
  formFields: Array<{
    id: string;
    label: string;
    type: string;
    formula?: string;
  }>;
  mappedFields: Array<{
    field_id: string;
    field_label: string;
    source: 'conversion' | 'form';
  }>;
  mockValues: { [key: string]: string | number };
  mockValueSets: MockValueSet[];
  activeMockSetId: string | null;
  onMockValueChange: (key: string, value: string) => void;
  onSaveMockSet: (name: string) => void;
  onLoadMockSet: (setId: string) => void;
  onDeleteMockSet: (setId: string) => void;
  onCalculate: (fieldId: string) => string;
}

export const MockValueTestingPanel: React.FC<MockValueTestingPanelProps> = ({
  formFields,
  mappedFields,
  mockValues,
  mockValueSets,
  activeMockSetId,
  onMockValueChange,
  onSaveMockSet,
  onLoadMockSet,
  onDeleteMockSet,
  onCalculate,
}) => {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newSetName, setNewSetName] = useState('');

  const handleSaveMockSet = () => {
    if (newSetName.trim()) {
      onSaveMockSet(newSetName.trim());
      setNewSetName('');
      setShowSaveDialog(false);
    }
  };

  const exportMockValues = () => {
    const data = {
      name: activeMockSetId ? mockValueSets.find(s => s.id === activeMockSetId)?.name : 'Current Values',
      values: mockValues,
      timestamp: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mock-values-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const calculatedFields = formFields.filter(f => f.type === 'calculated' && f.formula);
  const numberFields = formFields.filter(f => f.type === 'number');

  return (
    <Card className="sticky top-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Mock Values for Formula Testing</CardTitle>
          <Calculator className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mock Value Sets */}
        <div className="space-y-2">
          <Label className="text-sm">Load Saved Values</Label>
          <div className="flex gap-2">
            <Select value={activeMockSetId || ''} onValueChange={onLoadMockSet}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select a saved set" />
              </SelectTrigger>
              <SelectContent>
                {mockValueSets.map(set => (
                  <SelectItem key={set.id} value={set.id}>
                    {set.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowSaveDialog(true)}
              disabled={Object.keys(mockValues).length === 0}
            >
              <Save className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={exportMockValues}
              disabled={Object.keys(mockValues).length === 0}
            >
              <FileDown className="h-4 w-4" />
            </Button>
            {activeMockSetId && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onDeleteMockSet(activeMockSetId)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {showSaveDialog && (
          <div className="p-3 border rounded-md space-y-2 bg-muted/50">
            <Label className="text-sm">Save Current Values As:</Label>
            <div className="flex gap-2">
              <Input
                value={newSetName}
                onChange={(e) => setNewSetName(e.target.value)}
                placeholder="Enter set name"
                className="flex-1"
              />
              <Button size="sm" onClick={handleSaveMockSet}>
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={() => {
                setShowSaveDialog(false);
                setNewSetName('');
              }}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        <Separator />

        {/* Form Fields Section */}
        {numberFields.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">Form Fields</Label>
              <Badge variant="secondary" className="text-xs">
                {numberFields.length}
              </Badge>
            </div>
            <div className="space-y-2">
              {numberFields.map(field => (
                <div key={field.id} className="space-y-1">
                  <Label htmlFor={`mock-${field.id}`} className="text-xs">
                    {field.label}
                  </Label>
                  <Input
                    id={`mock-${field.id}`}
                    type="number"
                    value={mockValues[field.id] || ''}
                    onChange={(e) => onMockValueChange(field.id, e.target.value)}
                    placeholder="Enter test value"
                    className="h-8 text-sm"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mapped Fields Section */}
        {mappedFields.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Mapped Fields</Label>
                <Badge variant="outline" className="text-xs">
                  {mappedFields.length}
                </Badge>
              </div>
              
              {/* Conversion Fields */}
              {mappedFields.filter(f => f.source === 'conversion').length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    Asset Type Conversions
                  </div>
                  {mappedFields
                    .filter(f => f.source === 'conversion')
                    .map(field => (
                      <div key={`mapped.${field.field_id}`} className="space-y-1">
                        <Label htmlFor={`mock-mapped-${field.field_id}`} className="text-xs">
                          {field.field_label}
                        </Label>
                        <Input
                          id={`mock-mapped-${field.field_id}`}
                          type="number"
                          value={mockValues[`mapped.${field.field_id}`] || ''}
                          onChange={(e) => onMockValueChange(`mapped.${field.field_id}`, e.target.value)}
                          placeholder="Enter test value"
                          className="h-8 text-sm"
                        />
                      </div>
                    ))}
                </div>
              )}
              
              {/* Form Mapped Fields */}
              {mappedFields.filter(f => f.source === 'form').length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    Linked Form Fields
                  </div>
                  {mappedFields
                    .filter(f => f.source === 'form')
                    .map(field => (
                      <div key={`mapped.${field.field_id}`} className="space-y-1">
                        <Label htmlFor={`mock-mapped-form-${field.field_id}`} className="text-xs">
                          {field.field_label}
                        </Label>
                        <Input
                          id={`mock-mapped-form-${field.field_id}`}
                          type="number"
                          value={mockValues[`mapped.${field.field_id}`] || ''}
                          onChange={(e) => onMockValueChange(`mapped.${field.field_id}`, e.target.value)}
                          placeholder="Enter test value"
                          className="h-8 text-sm"
                        />
                      </div>
                    ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Calculated Fields Results */}
        {calculatedFields.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <Label className="text-sm font-medium">Calculation Results</Label>
              <div className="space-y-2">
                {calculatedFields.map(field => (
                  <div key={field.id} className="p-2 bg-muted/50 rounded-md">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-medium">{field.label}</span>
                      <span className="text-sm font-mono font-semibold">
                        {onCalculate(field.id)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {formFields.length === 0 && mappedFields.length === 0 && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              Add number or calculated fields to test formulas
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 