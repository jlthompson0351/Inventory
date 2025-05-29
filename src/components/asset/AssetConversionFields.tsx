import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface ConversionField {
  id: string;
  field_name: string;
  label: string;
  type: string;
  description?: string;
}

interface AssetConversionFieldsProps {
  assetId: string;
  assetTypeId: string;
  currentMetadata: Record<string, any>;
  onUpdate?: () => void;
}

export function AssetConversionFields({ 
  assetId, 
  assetTypeId, 
  currentMetadata,
  onUpdate 
}: AssetConversionFieldsProps) {
  const [conversionFields, setConversionFields] = useState<ConversionField[]>([]);
  const [values, setValues] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadConversionFields();
  }, [assetTypeId]);

  const loadConversionFields = async () => {
    try {
      const { data, error } = await supabase
        .from('asset_types')
        .select('conversion_fields')
        .eq('id', assetTypeId)
        .single();

      if (error) throw error;

      if (data?.conversion_fields) {
        const fields = data.conversion_fields as unknown as ConversionField[];
        setConversionFields(fields);
        
        // Initialize values from current metadata
        const initialValues: Record<string, any> = {};
        fields.forEach(field => {
          initialValues[field.field_name] = currentMetadata[field.field_name] || '';
        });
        setValues(initialValues);
      }
    } catch (error) {
      console.error('Error loading conversion fields:', error);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Update asset metadata with conversion values
      const updatedMetadata = {
        ...currentMetadata,
        ...values
      };

      const { error } = await supabase
        .from('assets')
        .update({ metadata: updatedMetadata })
        .eq('id', assetId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Conversion values saved successfully',
      });

      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error saving conversion values:', error);
      toast({
        title: 'Error',
        description: 'Failed to save conversion values',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (conversionFields.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conversion Factors</CardTitle>
        <CardDescription>
          Enter the conversion factors specific to this asset. These values are used in inventory calculations.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {conversionFields.map(field => (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.field_name}>{field.label}</Label>
            {field.description && (
              <p className="text-sm text-muted-foreground">{field.description}</p>
            )}
            <Input
              id={field.field_name}
              type="number"
              step="0.01"
              value={values[field.field_name] || ''}
              onChange={(e) => setValues(prev => ({
                ...prev,
                [field.field_name]: e.target.value
              }))}
              placeholder="Enter conversion value"
            />
          </div>
        ))}
        
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="w-full"
        >
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving...' : 'Save Conversion Values'}
        </Button>
      </CardContent>
    </Card>
  );
} 