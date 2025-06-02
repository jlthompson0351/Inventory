import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Info, 
  TrendingUp, 
  TrendingDown,
  Calculator,
  Clock,
  User
} from 'lucide-react';
import { CalculationResult, InventoryChange } from '@/services/inventoryCalculationService';

interface InventoryValidationPanelProps {
  calculationResult?: CalculationResult;
  previousQuantity: number;
  onValidate?: (notes: string) => void;
  onDismiss?: () => void;
  showValidationControls?: boolean;
  editHistory?: any[];
}

export const InventoryValidationPanel: React.FC<InventoryValidationPanelProps> = ({
  calculationResult,
  previousQuantity,
  onValidate,
  onDismiss,
  showValidationControls = false,
  editHistory = []
}) => {
  const [validationNotes, setValidationNotes] = React.useState('');

  if (!calculationResult) {
    return null;
  }

  const hasErrors = calculationResult.errors.length > 0;
  const hasWarnings = calculationResult.warnings.length > 0;
  const hasChanges = calculationResult.changes.length > 0;

  const getChangeIcon = (change: InventoryChange) => {
    switch (change.action) {
      case 'set':
        return <Calculator className="h-4 w-4" />;
      case 'add':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'subtract':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getChangeColor = (change: InventoryChange) => {
    switch (change.action) {
      case 'add':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'subtract':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'set':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      {/* Validation Status */}
      {hasErrors && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Validation Errors</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1 mt-2">
              {calculationResult.errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {hasWarnings && (
        <Alert variant="default" className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-900">Validation Warnings</AlertTitle>
          <AlertDescription className="text-amber-800">
            <ul className="list-disc list-inside space-y-1 mt-2">
              {calculationResult.warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Calculation Summary */}
      {hasChanges && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Inventory Changes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Summary */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Quantity Change</p>
                <p className="text-lg font-semibold">
                  {previousQuantity} → {calculationResult.newQuantity}
                  <span className={`ml-2 text-sm ${
                    calculationResult.newQuantity > previousQuantity 
                      ? 'text-green-600' 
                      : calculationResult.newQuantity < previousQuantity 
                        ? 'text-red-600' 
                        : 'text-gray-600'
                  }`}>
                    ({calculationResult.newQuantity > previousQuantity ? '+' : ''}
                    {calculationResult.newQuantity - previousQuantity})
                  </span>
                </p>
              </div>
              <Badge variant={hasWarnings ? 'destructive' : 'default'}>
                {calculationResult.changes.length} change{calculationResult.changes.length !== 1 ? 's' : ''}
              </Badge>
            </div>

            {/* Individual Changes */}
            <div className="space-y-2">
              {calculationResult.changes.map((change, index) => (
                <div key={index} className={`p-3 rounded-lg border ${getChangeColor(change)}`}>
                  <div className="flex items-start gap-3">
                    {getChangeIcon(change)}
                    <div className="flex-1">
                      <p className="font-medium">{change.field}</p>
                      <p className="text-sm opacity-90">{change.description}</p>
                      {change.formula && (
                        <p className="text-xs opacity-75 mt-1 font-mono">
                          Formula: {change.formula}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {change.action.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit History */}
      {editHistory.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Edit History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {editHistory.slice(0, 3).map((edit, index) => (
                <div key={index} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                  <User className="h-4 w-4 text-gray-500" />
                  <div className="flex-1">
                    <p className="text-sm">
                      Edited {new Date(edit.edited_at).toLocaleDateString()} at{' '}
                      {new Date(edit.edited_at).toLocaleTimeString()}
                    </p>
                    {edit.changes && (
                      <p className="text-xs text-gray-600">
                        Quantity: {edit.changes.quantity_before} → {edit.changes.quantity_after}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {editHistory.length > 3 && (
                <p className="text-xs text-gray-500 text-center">
                  +{editHistory.length - 3} more edit{editHistory.length - 3 !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Validation Controls */}
      {showValidationControls && (hasWarnings || hasErrors) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Validation Required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Validation Notes</label>
              <textarea
                className="w-full mt-1 p-2 border rounded-md text-sm"
                rows={3}
                placeholder="Add notes explaining this change or confirming the data is correct..."
                value={validationNotes}
                onChange={(e) => setValidationNotes(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => onValidate?.(validationNotes)}
                disabled={!validationNotes.trim()}
                className="flex-1"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Validate & Save
              </Button>
              <Button 
                variant="outline" 
                onClick={onDismiss}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calculation Metadata */}
      {calculationResult.metadata && (
        <details className="text-xs text-gray-500">
          <summary className="cursor-pointer hover:text-gray-700">
            Calculation Details
          </summary>
          <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-auto">
            {JSON.stringify(calculationResult.metadata, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}; 