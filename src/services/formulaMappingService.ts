import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/types/database.types';
import { getMappedFields } from './mappedFieldService';

export interface AssetFormulaMapping {
  id?: string;
  asset_type_id: string;
  organization_id: string;
  source_field: string;
  target_field: string;
  description?: string;
  field_type?: string;  // 'number', 'text', 'date', 'boolean'
  aggregatable?: boolean;
  created_at?: string;
  updated_at?: string;
  formula?: string; // Optional formula for calculated mappings
}

/**
 * Get formula mappings for a specific asset type
 */
export const getFormulaMappingsByAssetType = async (
  assetTypeId: string
): Promise<AssetFormulaMapping[]> => {
  const { data, error } = await supabase
    .from('asset_formula_mappings')
    .select('*')
    .eq('asset_type_id', assetTypeId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching formula mappings:', error);
    throw error;
  }

  return data || [];
};

/**
 * Create a new formula mapping
 */
export const createFormulaMapping = async (
  mapping: AssetFormulaMapping
): Promise<AssetFormulaMapping> => {
  // Ensure field_type has a default value
  const mappingWithDefaults = {
    field_type: 'number',
    aggregatable: false,
    ...mapping
  };

  const { data, error } = await supabase
    .from('asset_formula_mappings')
    .insert([mappingWithDefaults])
    .select()
    .single();

  if (error) {
    console.error('Error creating formula mapping:', error);
    throw error;
  }

  return data;
};

/**
 * Update an existing formula mapping
 */
export const updateFormulaMapping = async (
  id: string,
  mapping: Partial<AssetFormulaMapping>
): Promise<AssetFormulaMapping> => {
  const { data, error } = await supabase
    .from('asset_formula_mappings')
    .update(mapping)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating formula mapping:', error);
    throw error;
  }

  return data;
};

/**
 * Delete a formula mapping
 */
export const deleteFormulaMapping = async (
  id: string
): Promise<void> => {
  const { error } = await supabase
    .from('asset_formula_mappings')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting formula mapping:', error);
    throw error;
  }
};

/**
 * Apply formula mappings to form data using asset metadata and mappable fields
 */
export const applyFormulaMappings = async (
  formData: Record<string, any>,
  assetTypeId: string,
  assetMetadata: Record<string, any>
): Promise<Record<string, any>> => {
  try {
    // Get formula mappings for this asset type
    const mappings = await getFormulaMappingsByAssetType(assetTypeId);
    
    if (!mappings.length) {
      return formData;
    }
    
    // Create a new copy of the form data
    const result = { ...formData };
    
    // Apply each mapping
    for (const mapping of mappings) {
      const { source_field, target_field, field_type } = mapping;
      
      // If the source field exists in the asset metadata,
      // map its value to the target field in the form data
      if (assetMetadata && assetMetadata[source_field] !== undefined) {
        // Convert value based on field type if needed
        let value = assetMetadata[source_field];
        
        if (field_type === 'number' && typeof value === 'string') {
          value = parseFloat(value);
        } else if (field_type === 'boolean' && typeof value === 'string') {
          value = value.toLowerCase() === 'true';
        }
        
        result[target_field] = value;
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error applying formula mappings:', error);
    return formData;
  }
};

/**
 * Get aggregatable fields for reporting
 */
export const getAggregatableFields = async (
  organizationId: string,
  assetTypeId?: string
): Promise<AssetFormulaMapping[]> => {
  try {
    let query = supabase
      .from('asset_formula_mappings')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('aggregatable', true);
    
    if (assetTypeId) {
      query = query.eq('asset_type_id', assetTypeId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      throw error;
    }
    
    // Also check for mapped fields that might be aggregatable
    const mappedFields = await getMappedFields(organizationId);
    
    // Convert mapped fields to AssetFormulaMapping format if they're marked as aggregatable
    const mappedFieldMappings = mappedFields
      .filter(field => field.aggregatable)
      .map(field => ({
        id: field.id,
        organization_id: organizationId,
        asset_type_id: assetTypeId || '',
        source_field: field.field_id,
        target_field: field.field_id,
        field_type: field.field_type,
        description: field.description,
        aggregatable: true
      } as AssetFormulaMapping));
    
    return [...(data || []), ...mappedFieldMappings];
  } catch (error) {
    console.error('Error fetching aggregatable fields:', error);
    return [];
  }
};

/**
 * Get all mappable fields from a form
 */
export const getMappableFields = async (
  formId: string
): Promise<{ id: string; label: string; type: string }[]> => {
  try {
    // Get the form schema
    const { data, error } = await supabase
      .from('forms')
      .select('form_data')
      .eq('id', formId)
      .single();
    
    if (error) throw error;
    
    if (!data || !data.form_data) {
      return [];
    }
    
    // Parse form_data if it's a string, similar to other parts of the codebase
    let formData: any;
    if (typeof data.form_data === 'string') {
      try {
        formData = JSON.parse(data.form_data);
      } catch (e) {
        console.error('Error parsing form_data JSON:', e);
        return [];
      }
    } else {
      formData = data.form_data;
    }
    
    if (!formData || !formData.fields) {
      return [];
    }
    
    // Filter out only mappable fields
    const mappableFields = formData.fields
      .filter((field: any) => field.mappable)
      .map((field: any) => ({
        id: field.id,
        label: field.label,
        type: field.type
      }));
    
    return mappableFields;
  } catch (error) {
    console.error('Error getting mappable fields:', error);
    return [];
  }
};

/**
 * Get mappable fields for asset types
 */
export const getMappableFieldsByAssetType = async (
  assetTypeId: string
): Promise<{ formId: string; fields: { id: string; label: string; type: string }[] }[]> => {
  try {
    // Get the intake form ID for this asset type
    const { data: assetType, error: assetTypeError } = await supabase
      .from('asset_types')
      .select('intake_form_id')
      .eq('id', assetTypeId)
      .single();
    
    if (assetTypeError) throw assetTypeError;
    
    if (!assetType || !assetType.intake_form_id) {
      return [];
    }
    
    // Get mappable fields from the intake form
    const mappableFields = await getMappableFields(assetType.intake_form_id);
    
    return [{ formId: assetType.intake_form_id, fields: mappableFields }];
  } catch (error) {
    console.error('Error getting mappable fields by asset type:', error);
    return [];
  }
}; 