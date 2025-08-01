import { supabase } from '@/integrations/supabase/client';

export interface MappedField {
  id?: string;
  organization_id: string;
  form_id: string;
  field_id: string;
  field_label: string;
  field_type: string;
  form_name?: string;
  description?: string;
  aggregatable?: boolean;
  inventory_action?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Get all mapped fields for an organization, optionally filtered by asset type
 */
export const getMappedFields = async (
  organizationId: string,
  assetTypeId?: string
): Promise<MappedField[]> => {
  try {
    let { data, error } = await supabase.rpc(
      'get_mappable_fields_with_form_names',
      { p_organization_id: organizationId }
    );
    if (error) throw error;
    if (assetTypeId) {
      // Filter by asset type if provided (by joining with asset_type_forms)
      const { data: atf, error: atfError } = await supabase.rpc(
        'get_forms_for_asset_type',
        { p_asset_type_id: assetTypeId, p_organization_id: organizationId }
      );
      if (atfError) throw atfError;
      const formIds = (atf || []).map((row) => row.form_id);
      data = (data || []).filter((f) => formIds.includes(f.form_id));
    }
    return data || [];
  } catch (error) {
    console.error('Error fetching mapped fields:', error);
    return [];
  }
};

/**
 * Get all mapped fields for a specific form
 */
export const getFormMappedFields = async (
  formId: string
): Promise<MappedField[]> => {
  try {
    const { data, error } = await supabase.rpc(
      'get_form_mappable_fields',
      { p_form_id: formId }
    );

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching form mapped fields:', error);
    return [];
  }
};

/**
 * Register a field as mappable (now supports inventory_action)
 */
export const registerMappedField = async (
  field: {
    organization_id: string;
    form_id: string;
    field_id: string;
    field_label: string;
    field_type: string;
    description?: string;
    inventory_action?: string;
  }
): Promise<string | null> => {
  try {
    const { data, error } = await supabase.rpc(
      'register_mapped_field',
      {
        p_organization_id: field.organization_id,
        p_form_id: field.form_id,
        p_field_id: field.field_id,
        p_field_label: field.field_label,
        p_field_type: field.field_type,
        p_description: field.description || null,
        p_inventory_action: field.inventory_action || 'none'
      }
    );
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error registering mapped field:', error);
    return null;
  }
};

/**
 * Unregister a field as mappable
 */
export const unregisterMappedField = async (
  formId: string,
  fieldId: string
): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc(
      'unregister_mapped_field',
      {
        p_form_id: formId,
        p_field_id: fieldId
      }
    );

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error unregistering mapped field:', error);
    return false;
  }
};

/**
 * Sync mapped fields from all forms of an asset type
 * This should be called when saving a form to ensure mappable fields are properly registered
 */
export const syncMappedFieldsForAssetType = async (
  organizationId: string,
  assetTypeId: string
): Promise<boolean> => {
  try {
    // Get all forms for this asset type
    const { data: atf, error: atfError } = await supabase.rpc(
      'get_forms_for_asset_type',
      { p_asset_type_id: assetTypeId, p_organization_id: organizationId }
    );
    if (atfError) throw atfError;
    const formIds = (atf || []).map((row) => row.form_id);
    
    // Track errors but don't stop the entire sync
    const errors: any[] = [];
    
    // For each form, get its fields and register mappable ones
    for (const formId of formIds) {
      try {
        const { data: form, error: formError } = await supabase
          .from('forms')
          .select('form_data')
          .eq('id', formId)
          .single();
          
        if (formError || !form) {
          // Could not fetch form
          continue;
        }
        
        const fields = (form.form_data?.fields || []);
        
        for (const field of fields) {
          try {
            if (field.mappable) {
              await registerMappedField({
                organization_id: organizationId,
                form_id: formId,
                field_id: field.id,
                field_label: field.label,
                field_type: field.type || 'text',
                description: field.description,
                inventory_action: field.inventory_action || 'none'
              });
            } else {
              // Only try to unregister if the field exists
              await unregisterMappedField(formId, field.id);
            }
          } catch (fieldError) {
            // Log field-level errors but continue processing
            // Error processing field
            errors.push({ formId, fieldId: field.id, error: fieldError });
          }
        }
      } catch (formError) {
        // Log form-level errors but continue processing
        console.error(`Error processing form ${formId}:`, formError);
        errors.push({ formId, error: formError });
      }
    }
    
    // If we had errors, log them but still return success if some fields were processed
    if (errors.length > 0) {
      // Sync completed with errors
    }
    
    return true;
  } catch (error) {
    console.error('Error syncing mapped fields for asset type:', error);
    return false;
  }
};

/**
 * Get all mapped fields for reporting (with labels, form names, and types)
 */
export const getMappedFieldsForReporting = async (
  organizationId: string
): Promise<MappedField[]> => {
  try {
    const { data, error } = await supabase
      .from('mapped_fields_reporting')
      .select('*')
      .eq('organization_id', organizationId);
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching mapped fields for reporting:', error);
    return [];
  }
};

/**
 * Get ALL mapped fields available for an asset type (conversion fields + form mapped fields)
 * This includes:
 * - Conversion fields defined directly on the asset type
 * - Mapped fields from all forms linked to this asset type
 */
export const getAllMappedFieldsForAssetType = async (
  assetTypeId: string,
  organizationId: string
): Promise<{
  conversionFields: Array<{
    id: string;
    field_name: string;
    label: string;
    type: string;
    source: 'conversion';
    description?: string;
  }>;
  formMappedFields: Array<{
    id: string;
    field_id: string;
    field_label: string;
    field_type: string;
    form_name: string;
    form_id: string;
    source: 'form';
    description?: string;
  }>;
}> => {
  try {
    // 1. Get conversion fields from asset type
    const { data: assetType, error: assetTypeError } = await supabase
      .from('asset_types')
      .select('conversion_fields')
      .eq('id', assetTypeId)
      .single();
    
    if (assetTypeError) throw assetTypeError;
    
    let conversionFields: any[] = [];
    if (assetType?.conversion_fields && Array.isArray(assetType.conversion_fields)) {
      conversionFields = (assetType.conversion_fields as any[]).map(field => ({
        id: field.id,
        field_name: field.field_name,
        label: field.label,
        type: field.type,
        source: 'conversion',
        description: field.description
      }));
    }
    
    // 2. Get all forms linked to this asset type
    const { data: linkedForms, error: formsError } = await supabase.rpc(
      'get_forms_for_asset_type',
      { p_asset_type_id: assetTypeId, p_organization_id: organizationId }
    );
    
    if (formsError) throw formsError;
    
    // 3. Get mapped fields from all linked forms
    let formMappedFields: any[] = [];
    if (linkedForms && linkedForms.length > 0) {
      const formIds = linkedForms.map((f: any) => f.form_id);
      
      const { data: mappedFields, error: mappedError } = await supabase.rpc(
        'get_mappable_fields_with_form_names',
        { p_organization_id: organizationId }
      );
      
      if (mappedError) throw mappedError;
      
      // Filter to only include fields from forms linked to this asset type
      formMappedFields = (mappedFields || [])
        .filter((field: any) => formIds.includes(field.form_id))
        .map((field: any) => ({
          id: field.id,
          field_id: field.field_id,
          field_label: field.field_label,
          field_type: field.field_type,
          form_name: field.form_name,
          form_id: field.form_id,
          source: 'form',
          description: field.description
        }));
    }
    
    return {
      conversionFields,
      formMappedFields
    };
  } catch (error) {
    console.error('Error fetching all mapped fields for asset type:', error);
    return {
      conversionFields: [],
      formMappedFields: []
    };
  }
}; 