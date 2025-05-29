import React from 'react';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface AssetType {
  id: string;
  name: string;
  color?: string;
  description?: string;
}

interface MappedField {
  id: string;
  field_id: string;
  field_label: string;
  source: 'conversion' | 'form';
  form_name?: string;
}

interface AssetTypeSelectionPanelProps {
  selectedAssetType?: AssetType;
  assetTypes: AssetType[];
  mappedFields: MappedField[];
  showSelection: boolean;
  selectedAssetTypeId: string;
  selectedFormPurpose: string;
  onAssetTypeChange: (assetTypeId: string) => void;
  onFormPurposeChange: (purpose: string) => void;
  onSelectionClose: () => void;
  onNavigateToAssetType: (assetTypeId: string) => void;
  isNewForm?: boolean;
}

const formPurposeOptions = [
  { value: 'intake', label: 'Intake Form - Add new items' },
  { value: 'inventory', label: 'Inventory Check - Count stock' },
  { value: 'checkout', label: 'Checkout - Track usage' },
  { value: 'maintenance', label: 'Maintenance - Service records' },
  { value: 'other', label: 'Other - General purpose' },
];

export const AssetTypeSelectionPanel: React.FC<AssetTypeSelectionPanelProps> = ({
  selectedAssetType,
  assetTypes,
  mappedFields,
  showSelection,
  selectedAssetTypeId,
  selectedFormPurpose,
  onAssetTypeChange,
  onFormPurposeChange,
  onSelectionClose,
  onNavigateToAssetType,
  isNewForm = false,
}) => {
  const conversionFieldsCount = mappedFields.filter(f => f.source === 'conversion').length;
  const formFieldsCount = mappedFields.filter(f => f.source === 'form').length;

  return (
    <>
      {/* Asset Type Information Panel */}
      {selectedAssetType && (
        <Card className="mb-6 border-l-4" style={{ borderLeftColor: selectedAssetType.color || '#6E56CF' }}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                  style={{ backgroundColor: selectedAssetType.color || '#6E56CF' }}
                >
                  {selectedAssetType.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold">{selectedAssetType.name}</h3>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{conversionFieldsCount} conversion fields</span>
                    <span>{formFieldsCount} form fields</span>
                    <span className="text-green-600">✓ Available in formulas</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigateToAssetType(selectedAssetType.id)}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Manage Asset Type
                </Button>
                {isNewForm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSelectionClose()}
                  >
                    Change Type
                  </Button>
                )}
              </div>
            </div>
            
            {/* Show conversion fields if available */}
            {conversionFieldsCount > 0 && (
              <div className="mt-3 p-3 bg-blue-50 rounded-md border border-blue-200">
                <p className="text-sm text-blue-800 font-medium mb-2">
                  Conversion Fields Available for Formulas:
                </p>
                <div className="flex flex-wrap gap-1">
                  {mappedFields
                    .filter(f => f.source === 'conversion')
                    .slice(0, 5)
                    .map(field => (
                      <Badge key={field.id} variant="secondary" className="text-xs">
                        {field.field_label}
                      </Badge>
                    ))}
                  {conversionFieldsCount > 5 && (
                    <Badge variant="outline" className="text-xs">
                      +{conversionFieldsCount - 5} more
                    </Badge>
                  )}
                </div>
              </div>
            )}
            
            {/* Show form mapped fields if available */}
            {formFieldsCount > 0 && (
              <div className="mt-3 p-3 bg-green-50 rounded-md border border-green-200">
                <p className="text-sm text-green-800 font-medium mb-2">
                  Mapped Fields from Linked Forms:
                </p>
                <div className="flex flex-wrap gap-1">
                  {mappedFields
                    .filter(f => f.source === 'form')
                    .slice(0, 5)
                    .map(field => (
                      <Badge key={field.id} variant="secondary" className="text-xs">
                        {field.field_label} ({field.form_name})
                      </Badge>
                    ))}
                  {formFieldsCount > 5 && (
                    <Badge variant="outline" className="text-xs">
                      +{formFieldsCount - 5} more
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Asset Type Selection Dialog */}
      <Dialog open={showSelection} onOpenChange={onSelectionClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Asset Type</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="assetType">Asset Type</Label>
              <Select value={selectedAssetTypeId} onValueChange={onAssetTypeChange}>
                <SelectTrigger id="assetType">
                  <SelectValue placeholder="Select an asset type" />
                </SelectTrigger>
                <SelectContent>
                  {assetTypes.map(type => (
                    <SelectItem key={type.id} value={type.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: type.color || '#6E56CF' }}
                        />
                        {type.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Forms are linked to asset types to enable mapped fields and calculations
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="formPurpose">Form Purpose (Optional)</Label>
              <Select value={selectedFormPurpose} onValueChange={onFormPurposeChange}>
                <SelectTrigger id="formPurpose">
                  <SelectValue placeholder="Select form purpose" />
                </SelectTrigger>
                <SelectContent>
                  {formPurposeOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Helps organize forms by their intended use
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={onSelectionClose} 
              disabled={!selectedAssetTypeId}
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}; 