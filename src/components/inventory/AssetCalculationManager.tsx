import { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator, Plus, Trash2, Save, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface AssetCalculationManagerProps {
  assetTypeId: string;
  organizationId?: string;
  calculationFormulas?: Record<string, any>;
  initialFormulas?: Record<string, any>;
  formIds?: {
    intakeFormId?: string;
    inventoryFormId?: string;
  };
  onFormulasChanged?: (formulas: Record<string, any>) => void;
}

type FormulaType = 'basic' | 'multiply' | 'add' | 'subtract' | 'divide' | 'custom';

interface FormulaEntry {
  id: string;
  targetField: string;
  formulaType: FormulaType;
  description: string;
  baseValue?: number;
  multiplier?: number;
  addend?: number;
  customFormula?: string;
}

export function AssetCalculationManager({
  assetTypeId,
  organizationId,
  calculationFormulas = {},
  initialFormulas = {},
  formIds,
  onFormulasChanged
}: AssetCalculationManagerProps) {
  const [formulas, setFormulas] = useState<FormulaEntry[]>([]);
  const [activeTab, setActiveTab] = useState<string>('intake');
  const [isLoading, setIsLoading] = useState(false);
  const [availableFields, setAvailableFields] = useState<string[]>([]);
  const { toast } = useToast();
  
  // Use either initialFormulas or calculationFormulas - memoize to prevent infinite re-renders
  const formulasToUse = useMemo(() => {
    return Object.keys(initialFormulas).length > 0 ? initialFormulas : calculationFormulas;
  }, [initialFormulas, calculationFormulas]);

  // Memoize formIds to ensure stable reference
  const stableFormIds = useMemo(() => ({
    intakeFormId: formIds?.intakeFormId,
    inventoryFormId: formIds?.inventoryFormId
  }), [formIds?.intakeFormId, formIds?.inventoryFormId]);

  // Create a stable stringified version for dependency comparison
  const formulasJsonString = useMemo(() => {
    try {
      return JSON.stringify(formulasToUse || {});
    } catch {
      return '{}';
    }
  }, [formulasToUse]);

  // Convert JSON formulas object to FormEntry array for UI
  useEffect(() => {
    // Parse the stringified formulas
    let parsedFormulas: Record<string, any> = {};
    try {
      parsedFormulas = JSON.parse(formulasJsonString);
    } catch {
      parsedFormulas = {};
    }
    
    const formulaEntries: FormulaEntry[] = [];
    
    Object.entries(parsedFormulas).forEach(([field, value]) => {
      // Try to parse the formula description
      try {
        const formulaObj = typeof value === 'string' ? JSON.parse(value) : value;
        formulaEntries.push({
          id: `formula-${field}`,
          targetField: field,
          formulaType: formulaObj.type || 'basic',
          description: formulaObj.description || '',
          baseValue: formulaObj.baseValue,
          multiplier: formulaObj.multiplier,
          addend: formulaObj.addend,
          customFormula: formulaObj.customFormula,
        });
      } catch (e) {
        // If parsing fails, create a basic entry
        formulaEntries.push({
          id: `formula-${field}`,
          targetField: field,
          formulaType: 'custom',
          description: 'Custom formula',
          customFormula: String(value)
        });
      }
    });
    
    // Only update if the formulas actually changed
    setFormulas(prevFormulas => {
      // Compare the new formulas with the previous ones
      const prevJson = JSON.stringify(prevFormulas.map(f => ({ 
        field: f.targetField, 
        type: f.formulaType,
        description: f.description 
      })));
      const newJson = JSON.stringify(formulaEntries.map(f => ({ 
        field: f.targetField, 
        type: f.formulaType,
        description: f.description 
      })));
      
      return prevJson === newJson ? prevFormulas : formulaEntries;
    });
  }, [formulasJsonString]); // Use stringified version for stable comparison
  
  // Fetch available form fields - now using stable form IDs
  useEffect(() => {
    const fetchFormFields = async () => {
      let formId: string | undefined;
      
      if (activeTab === 'intake') {
        formId = stableFormIds.intakeFormId;
      } else if (activeTab === 'inventory') {
        formId = stableFormIds.inventoryFormId;
      }
      
      if (!formId) {
        setAvailableFields([]);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('forms')
          .select('form_data')
          .eq('id', formId)
          .single();
        
        if (error) throw error;
        
        if (!data || !data.form_data) {
          setAvailableFields([]);
          return;
        }
        
        // Parse form_data if it's a string, similar to other parts of the codebase
        let formData: any;
        if (typeof data.form_data === 'string') {
          try {
            formData = JSON.parse(data.form_data);
          } catch (e) {
            console.error('Error parsing form_data JSON:', e);
            setAvailableFields([]);
            return;
          }
        } else {
          formData = data.form_data as any;
        }
        
        const fields = (formData as any)?.fields || [];
        const fieldIds = fields.map((field: any) => field.id);
        setAvailableFields(fieldIds);
      } catch (error) {
        console.error('Error fetching form fields:', error);
        setAvailableFields([]);
      }
    };

    fetchFormFields();
  }, [activeTab, stableFormIds.intakeFormId, stableFormIds.inventoryFormId]);
  
  const addNewFormula = () => {
    const newId = `formula-${Date.now()}`;
    setFormulas([
      ...formulas,
      {
        id: newId,
        targetField: '',
        formulaType: 'basic',
        description: 'New Formula',
      }
    ]);
  };
  
  const removeFormula = (id: string) => {
    setFormulas(formulas.filter(formula => formula.id !== id));
  };
  
  const updateFormula = (id: string, data: Partial<FormulaEntry>) => {
    setFormulas(formulas.map(formula => 
      formula.id === id ? { ...formula, ...data } : formula
    ));
  };
  
  const saveFormulas = async () => {
    try {
      setIsLoading(true);
      
      // Convert FormEntry array back to JSON object
      const formulasObject: Record<string, any> = {};
      
      formulas.forEach(formula => {
        if (formula.targetField) {
          // Create formula object based on type
          let formulaValue: any;
          
          switch (formula.formulaType) {
            case 'basic':
              formulaValue = JSON.stringify({
                type: 'basic',
                description: formula.description,
                baseValue: formula.baseValue
              });
              break;
            case 'multiply':
              formulaValue = JSON.stringify({
                type: 'multiply',
                description: formula.description,
                baseValue: formula.baseValue,
                multiplier: formula.multiplier
              });
              break;
            case 'add':
              formulaValue = JSON.stringify({
                type: 'add',
                description: formula.description,
                baseValue: formula.baseValue,
                addend: formula.addend
              });
              break;
            case 'custom':
              formulaValue = formula.customFormula;
              break;
            default:
              formulaValue = JSON.stringify({
                type: formula.formulaType,
                description: formula.description,
                baseValue: formula.baseValue,
                multiplier: formula.multiplier,
                addend: formula.addend
              });
          }
          
          formulasObject[formula.targetField] = formulaValue;
        }
      });
      
      // Update the asset type with the formulas
      const { error } = await supabase
        .from('asset_types')
        .update({
          calculation_formulas: formulasObject,
          updated_at: new Date().toISOString()
        })
        .eq('id', assetTypeId);
      
      if (error) throw error;
      
      if (onFormulasChanged) {
        onFormulasChanged(formulasObject);
      }
      
      toast({
        title: 'Calculation Formulas Saved',
        description: 'Custom formulas have been updated for this asset type',
      });
    } catch (error) {
      console.error('Error saving formulas:', error);
      toast({
        title: 'Save Failed',
        description: 'Could not save calculation formulas',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const renderFormulaEditor = (formula: FormulaEntry) => {
    return (
      <div key={formula.id} className="border rounded-md p-4 mb-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center">
            <Calculator className="h-4 w-4 mr-2 text-primary" />
            <h3 className="font-medium">{formula.description || 'Formula'}</h3>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => removeFormula(formula.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor={`${formula.id}-description`}>Description</Label>
            <Input
              id={`${formula.id}-description`}
              value={formula.description || ''}
              onChange={(e) => updateFormula(formula.id, { description: e.target.value })}
              placeholder="Enter a description"
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor={`${formula.id}-target`}>Target Field</Label>
            <Select
              value={formula.targetField}
              onValueChange={(value) => updateFormula(formula.id, { targetField: value })}
            >
              <SelectTrigger id={`${formula.id}-target`}>
                <SelectValue placeholder="Select field" />
              </SelectTrigger>
              <SelectContent>
                {availableFields.map(field => (
                  <SelectItem key={field} value={field}>{field}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Field that will receive the calculated value
            </p>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor={`${formula.id}-type`}>Formula Type</Label>
            <Select
              value={formula.formulaType}
              onValueChange={(value: FormulaType) => updateFormula(formula.id, { formulaType: value })}
            >
              <SelectTrigger id={`${formula.id}-type`}>
                <SelectValue placeholder="Select formula type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="basic">Basic Value</SelectItem>
                <SelectItem value="multiply">Multiplication</SelectItem>
                <SelectItem value="add">Addition</SelectItem>
                <SelectItem value="subtract">Subtraction</SelectItem>
                <SelectItem value="divide">Division</SelectItem>
                <SelectItem value="custom">Custom Formula</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {formula.formulaType === 'basic' && (
            <div className="grid gap-2">
              <Label htmlFor={`${formula.id}-base`}>Base Value</Label>
              <Input
                id={`${formula.id}-base`}
                type="number"
                value={formula.baseValue || 0}
                onChange={(e) => updateFormula(formula.id, { baseValue: parseFloat(e.target.value) })}
              />
            </div>
          )}
          
          {formula.formulaType === 'multiply' && (
            <>
              <div className="grid gap-2">
                <Label htmlFor={`${formula.id}-base`}>Base Value</Label>
                <Input
                  id={`${formula.id}-base`}
                  type="number"
                  value={formula.baseValue || 0}
                  onChange={(e) => updateFormula(formula.id, { baseValue: parseFloat(e.target.value) })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`${formula.id}-multiplier`}>Multiplier</Label>
                <Input
                  id={`${formula.id}-multiplier`}
                  type="number"
                  value={formula.multiplier || 1}
                  onChange={(e) => updateFormula(formula.id, { multiplier: parseFloat(e.target.value) })}
                />
              </div>
            </>
          )}
          
          {formula.formulaType === 'add' && (
            <>
              <div className="grid gap-2">
                <Label htmlFor={`${formula.id}-base`}>Base Value</Label>
                <Input
                  id={`${formula.id}-base`}
                  type="number"
                  value={formula.baseValue || 0}
                  onChange={(e) => updateFormula(formula.id, { baseValue: parseFloat(e.target.value) })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`${formula.id}-addend`}>Value to Add</Label>
                <Input
                  id={`${formula.id}-addend`}
                  type="number"
                  value={formula.addend || 0}
                  onChange={(e) => updateFormula(formula.id, { addend: parseFloat(e.target.value) })}
                />
              </div>
            </>
          )}
          
          {formula.formulaType === 'custom' && (
            <div className="grid gap-2">
              <Label htmlFor={`${formula.id}-custom`}>Custom Formula</Label>
              <Input
                id={`${formula.id}-custom`}
                value={formula.customFormula || ''}
                onChange={(e) => updateFormula(formula.id, { customFormula: e.target.value })}
                placeholder="Enter a custom formula expression"
              />
              <p className="text-xs text-muted-foreground">
                Use JavaScript expression format: e.g., "baseValue * 1.5 + 10"
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center">
            <Calculator className="h-5 w-5 mr-2" />
            Calculation Formulas
          </CardTitle>
          <Badge>{formulas.length} formulas</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="intake">Intake Form Formulas</TabsTrigger>
            <TabsTrigger value="inventory">Inventory Form Formulas</TabsTrigger>
          </TabsList>
          
          <TabsContent value="intake">
            {!stableFormIds.intakeFormId ? (
              <div className="text-center p-4 border border-dashed rounded-md">
                <p className="text-muted-foreground">
                  No intake form configured for this asset type.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground mb-4">
                  Define calculation formulas for the intake form. These values will be automatically calculated when the form is filled.
                </div>
                
                {formulas.filter(f => availableFields.includes(f.targetField)).map(renderFormulaEditor)}
                
                <Button onClick={addNewFormula} variant="outline" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Formula
                </Button>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="inventory">
            {!stableFormIds.inventoryFormId ? (
              <div className="text-center p-4 border border-dashed rounded-md">
                <p className="text-muted-foreground">
                  No inventory form configured for this asset type.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground mb-4">
                  Define calculation formulas for the monthly inventory form. These values will be automatically calculated when the form is filled.
                </div>
                
                {formulas.filter(f => availableFields.includes(f.targetField)).map(renderFormulaEditor)}
                
                <Button onClick={addNewFormula} variant="outline" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Formula
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        <div className="mt-6">
          <Button 
            onClick={saveFormulas} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Formulas
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 