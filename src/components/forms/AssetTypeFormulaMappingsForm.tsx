import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusIcon, TrashIcon, InfoIcon, Calculator } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useOrganization } from '@/hooks/useOrganization';
import { 
  AssetFormulaMapping, 
  createFormulaMapping, 
  deleteFormulaMapping, 
  getFormulaMappingsByAssetType,
  getMappableFieldsByAssetType
} from '@/services/formulaMappingService';
import { Badge } from '@/components/ui/badge';
import { validateFormula } from '@/lib/formulaEvaluator';

interface AssetTypeFormulaMappingsFormProps {
  assetTypeId: string;
}

// Field type options
const FIELD_TYPES = [
  { value: 'number', label: 'Number (for calculations)' },
  { value: 'text', label: 'Text' },
  { value: 'date', label: 'Date' },
  { value: 'boolean', label: 'Yes/No' },
];

export default function AssetTypeFormulaMappingsForm({ assetTypeId }: AssetTypeFormulaMappingsFormProps) {
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();
  const [mappings, setMappings] = useState<AssetFormulaMapping[]>([]);
  const [loading, setLoading] = useState(false);
  const [mappableFields, setMappableFields] = useState<{id: string, label: string, type: string}[]>([]);
  const [newMapping, setNewMapping] = useState<Partial<AssetFormulaMapping>>({
    source_field: '',
    target_field: '',
    description: '',
    field_type: 'number',
    aggregatable: false
  });
  const [formulaError, setFormulaError] = useState<string | null>(null);
  const [showFieldDropdown, setShowFieldDropdown] = useState(false);
  const [formulaInputRef, setFormulaInputRef] = useState<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (assetTypeId) {
      fetchMappings();
      fetchMappableFields();
    }
  }, [assetTypeId]);

  const fetchMappings = async () => {
    if (!assetTypeId) return;
    
    try {
      setLoading(true);
      const data = await getFormulaMappingsByAssetType(assetTypeId);
      setMappings(data);
    } catch (error) {
      console.error('Error fetching formula mappings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load formula mappings',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMappableFields = async () => {
    if (!assetTypeId) return;
    
    try {
      setLoading(true);
      const formFieldsData = await getMappableFieldsByAssetType(assetTypeId);
      
      if (formFieldsData.length > 0) {
        const fields = formFieldsData[0].fields;
        setMappableFields(fields);
      }
    } catch (error) {
      console.error('Error fetching mappable fields:', error);
      toast({
        title: 'Error',
        description: 'Failed to load mappable fields',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewMapping(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setNewMapping(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setNewMapping(prev => ({ ...prev, [name]: checked }));
  };

  const handleFormulaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNewMapping(prev => ({ ...prev, formula: value }));
    // Validate formula in real time
    const error = validateFormula(value, mappableFields.map(f => f.id));
    setFormulaError(error);
  };

  const handleFormulaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === '{') {
      setShowFieldDropdown(true);
    }
  };

  const handleFieldSelect = (fieldId: string) => {
    if (!formulaInputRef) return;
    const textarea = formulaInputRef;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;
    const newValue = value.slice(0, start) + '{' + fieldId + '}' + value.slice(end);
    textarea.value = newValue;
    setNewMapping(prev => ({ ...prev, formula: newValue }));
    setShowFieldDropdown(false);
    // Move cursor after inserted field
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + fieldId.length + 2;
    }, 0);
    // Validate after insert
    const error = validateFormula(newValue, mappableFields.map(f => f.id));
    setFormulaError(error);
  };

  const handleAddMapping = async () => {
    if (!currentOrganization?.id) {
      toast({
        title: 'Error',
        description: 'Organization information is required',
        variant: 'destructive'
      });
      return;
    }

    if (!newMapping.source_field || !newMapping.target_field) {
      toast({
        title: 'Validation Error',
        description: 'Both source and target fields are required',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);
      const mapping: AssetFormulaMapping = {
        ...newMapping as AssetFormulaMapping,
        asset_type_id: assetTypeId,
        organization_id: currentOrganization.id
      };

      await createFormulaMapping(mapping);
      
      // Reset form
      setNewMapping({
        source_field: '',
        target_field: '',
        description: '',
        field_type: 'number',
        aggregatable: false
      });
      
      // Refresh mappings
      await fetchMappings();
      
      toast({
        title: 'Success',
        description: 'Formula mapping added successfully'
      });
    } catch (error) {
      console.error('Error adding formula mapping:', error);
      toast({
        title: 'Error',
        description: 'Failed to add formula mapping',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMapping = async (id: string) => {
    try {
      setLoading(true);
      await deleteFormulaMapping(id);
      await fetchMappings();
      
      toast({
        title: 'Success',
        description: 'Formula mapping deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting formula mapping:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete formula mapping',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Asset Formula Mappings</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0}>
                  <InfoIcon className="h-5 w-5 text-muted-foreground" />
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm p-4">
                <p>
                  Formula mappings link specific fields from an asset's metadata 
                  (typically set during intake) to fields in inventory forms for calculations.
                  <br /><br />
                  Example: If 'tank_conversion_factor' is set during asset creation, 
                  it can be mapped to 'conversion_factor' field in inventory forms.
                  <br /><br />
                  Mark fields as "Aggregatable" to include them in monthly inventory reports.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="source_field">Source Field (Asset Metadata)</Label>
              {mappableFields.length > 0 ? (
                <Select
                  value={newMapping.source_field}
                  onValueChange={(value) => handleSelectChange('source_field', value)}
                >
                  <SelectTrigger id="source_field">
                    <SelectValue placeholder="Select mappable field" />
                  </SelectTrigger>
                  <SelectContent>
                    {mappableFields.map(field => (
                      <SelectItem key={field.id} value={field.label}>
                        {field.label} ({field.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex flex-col gap-2">
                  <Input
                    id="source_field"
                    name="source_field"
                    placeholder="e.g. tank_conversion_factor"
                    value={newMapping.source_field}
                    onChange={handleInputChange}
                  />
                  <p className="text-xs text-muted-foreground">
                    No mappable fields found. Add fields with the "Mappable" option in your form builder.
                  </p>
                </div>
              )}
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="target_field">Target Field (Inventory Form)</Label>
              <Input
                id="target_field"
                name="target_field"
                placeholder="e.g. conversion_factor"
                value={newMapping.target_field}
                onChange={handleInputChange}
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="field_type">Field Type</Label>
              <Select
                value={newMapping.field_type}
                onValueChange={(value) => handleSelectChange('field_type', value)}
              >
                <SelectTrigger id="field_type">
                  <SelectValue placeholder="Select field type" />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-3">
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                name="description"
                placeholder="e.g. Tank volume conversion"
                value={newMapping.description || ''}
                onChange={handleInputChange}
              />
            </div>
            <div className="md:col-span-2 flex items-end">
              <div className="flex items-center space-x-2">
                <Switch
                  id="aggregatable"
                  checked={!!newMapping.aggregatable}
                  onCheckedChange={(checked) => handleCheckboxChange('aggregatable', checked)}
                />
                <Label htmlFor="aggregatable">Include in reports</Label>
              </div>
            </div>
            <div className="md:col-span-1 flex items-end">
              <Button 
                onClick={handleAddMapping} 
                disabled={loading || !newMapping.source_field || !newMapping.target_field}
                className="w-full"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
            <div className="md:col-span-6">
              <Label htmlFor="formula">Formula (optional)</Label>
              <div className="relative">
                <Textarea
                  id="formula"
                  name="formula"
                  placeholder="e.g. {Drum_Inches} * {Conversion_Rate}"
                  value={newMapping.formula || ''}
                  onChange={handleFormulaChange}
                  onKeyDown={handleFormulaKeyDown}
                  ref={setFormulaInputRef}
                  className={formulaError ? 'border-red-500' : ''}
                  rows={2}
                />
                {/* Autocomplete dropdown for field references */}
                {showFieldDropdown && mappableFields.length > 0 && (
                  <div className="absolute z-10 bg-white border rounded shadow mt-1 max-h-40 overflow-auto w-full">
                    {mappableFields.map(field => (
                      <div
                        key={field.id}
                        className="px-3 py-2 hover:bg-blue-100 cursor-pointer"
                        onClick={() => handleFieldSelect(field.id)}
                      >
                        {field.id} <span className="text-xs text-muted-foreground">({field.label})</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* Formula validation error */}
              {formulaError && (
                <div className="text-red-500 text-xs mt-1">{formulaError}</div>
              )}
              {/* Formula help tooltip */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={0}>
                      <Button variant="ghost" size="icon" className="ml-2">
                        <InfoIcon className="h-4 w-4" />
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs p-3">
                    <div className="text-xs">
                      <b>Formula Syntax:</b><br />
                      Use <code>{'{Field_ID}'}</code> to reference fields.<br />
                      Supported operators: <code>+ - * / % ^</code><br />
                      Functions: <code>sum, avg, min, max, round, floor, ceil, abs, sqrt, pow</code><br />
                      <br />
                      <b>Available Fields:</b><br />
                      {mappableFields.map(f => (
                        <div key={f.id}><code>{'{'+f.id+'}'}</code> - {f.label}</div>
                      ))}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          {mappings.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source Field</TableHead>
                  <TableHead>Target Field</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Reports</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappings.map((mapping) => (
                  <TableRow key={mapping.id}>
                    <TableCell>{mapping.source_field}</TableCell>
                    <TableCell>{mapping.target_field}</TableCell>
                    <TableCell>
                      {mapping.field_type === 'number' ? (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          Number
                        </Badge>
                      ) : mapping.field_type === 'text' ? (
                        <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                          Text
                        </Badge>
                      ) : mapping.field_type === 'date' ? (
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                          Date
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          {mapping.field_type || 'Number'}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{mapping.description || '-'}</TableCell>
                    <TableCell>
                      {mapping.aggregatable ? (
                        <Badge className="bg-green-100 text-green-800 border-green-200">
                          <Calculator className="h-3 w-3 mr-1" />
                          Aggregated
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          No
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => mapping.id && handleDeleteMapping(mapping.id)}
                        disabled={loading}
                      >
                        <TrashIcon className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              No formula mappings defined. Add your first mapping above.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 