import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FormBuilderEvaluator } from "@/utils/safeEvaluator";

// Helper function to extract field references from formula
const extractFieldReferences = (formula: string): string[] => {
  const matches = formula.match(/\{([a-zA-Z0-9_]+)\}/g) || [];
  return [...new Set(matches.map(m => m.slice(1, -1)))];
};

interface FormulaTestPanelProps {
  formula: string;
  availableFields?: string[];
}

export function FormulaTestPanel({ formula, availableFields = [] }: FormulaTestPanelProps) {
  const [testValues, setTestValues] = useState<Record<string, number>>({});
  const [result, setResult] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Extract field references from the formula
  const fieldRefs = extractFieldReferences(formula);
  
  // Filter field references to only include available fields
  const validFieldRefs = availableFields.length 
    ? fieldRefs.filter(field => availableFields.includes(field))
    : fieldRefs;
  
  // Initialize test values when formula changes
  useEffect(() => {
    if (!formula) {
      setResult(null);
      setError(null);
      return;
    }
    
    // Reset test values for the new formula references
    const newTestValues: Record<string, number> = {};
    
    validFieldRefs.forEach(field => {
      // Preserve existing values if they exist
      newTestValues[field] = testValues[field] || 0;
    });
    
    setTestValues(newTestValues);
    
    // Reset result and error
    setResult(null);
    setError(null);
  }, [formula, validFieldRefs]);
  
  // Update a test value for a specific field
  const updateTestValue = (field: string, value: string) => {
    const numValue = value === '' ? 0 : parseFloat(value);
    
    setTestValues(prev => ({
      ...prev,
      [field]: isNaN(numValue) ? 0 : numValue
    }));
  };
  
  // Calculate the result using the test values
  const calculateResult = () => {
    if (!formula) {
      setError("No formula to evaluate");
      setResult(null);
      return;
    }
    
          try {
        const calcResult = FormBuilderEvaluator.calculateWithFormatting(formula, [], testValues);
        setResult(calcResult);
        setError(null);
    } catch (err) {
      setResult(null);
      setError((err as Error).message);
    }
  };
  
  // If no formula or no fields, show message
  if (!formula) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Formula Test</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Enter a formula to test</p>
        </CardContent>
      </Card>
    );
  }
  
  if (validFieldRefs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Formula Test</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No fields to test in the formula</p>
          
          <Button 
            variant="outline" 
            className="mt-4 w-full"
            onClick={calculateResult}
          >
            Calculate Constant Result
          </Button>
          
          {result !== null && (
            <Alert className="mt-4 bg-green-50 border-green-200">
              <AlertDescription>Result: {result}</AlertDescription>
            </Alert>
          )}
          
          {error && (
            <Alert className="mt-4 bg-red-50 border-red-200">
              <AlertDescription className="text-red-600">{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  }
  
  // Render the test panel with input fields for each referenced field
  return (
    <Card>
      <CardHeader>
        <CardTitle>Test Formula</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          {validFieldRefs.map(field => (
            <div key={field} className="grid grid-cols-3 items-center gap-2">
              <Label htmlFor={`test-${field}`}>{field}</Label>
              <Input
                id={`test-${field}`}
                type="number"
                value={testValues[field] || 0}
                onChange={(e) => updateTestValue(field, e.target.value)}
                className="col-span-2"
              />
            </div>
          ))}
          
          <Button onClick={calculateResult} className="w-full mt-2">
            Calculate Result
          </Button>
          
          {result !== null && (
            <Alert className="mt-2 bg-green-50 border-green-200">
              <AlertDescription>Result: {result}</AlertDescription>
            </Alert>
          )}
          
          {error && (
            <Alert className="mt-2 bg-red-50 border-red-200">
              <AlertDescription className="text-red-600">{error}</AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 