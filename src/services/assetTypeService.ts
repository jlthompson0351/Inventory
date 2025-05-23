import { Database, Json } from '@/types/database.types';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export interface AssetType {
  id: string;
  name: string;
  description: string | null;
  organization_id: string;
  color: string | null;
  created_at: string;
  updated_at: string | null;
  deleted_at?: string | null;
  intake_form_id?: string | null;
  inventory_form_id?: string | null;
  mapping_form_id?: string | null;
  conversion_fields?: Json | null;
  enable_barcodes?: boolean;
  barcode_type?: string;
  barcode_prefix?: string;
  calculation_formulas?: Json | null;
}

export interface AssetTypeWithCount extends AssetType {
  asset_count: number;
  intake_form_id?: string | null;
  inventory_form_id?: string | null;
  mapping_form_id?: string | null;
}

export type MothershipAssetType = AssetTypeWithCount & {
  organization_name: string;
};

export const getAssetTypes = async (
  organizationId: string
): Promise<AssetType[]> => {
  const { data, error } = await supabase
    .from('asset_types')
    .select('*')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching asset types:', error);
    throw error;
  }

  return data || [];
};

export const getAssetTypesWithCounts = async (
  supabase: ReturnType<typeof createClient<Database>>,
  organizationId: string
): Promise<AssetTypeWithCount[]> => {
  const { data, error } = await supabase
    .rpc('get_asset_types_with_counts', { org_id: organizationId });

  if (error) {
    console.error('Error fetching asset types with counts:', error);
    throw error;
  }

  return data || [];
};

export const getMothershipAssetTypes = async (
  supabase: ReturnType<typeof createClient<Database>>,
  userId: string
): Promise<MothershipAssetType[]> => {
  const { data, error } = await supabase
    .rpc('get_mothership_asset_types', { admin_user_id: userId });

  if (error) {
    console.error('Error fetching mothership asset types:', error);
    return [];
  }

  return (data as any) || [];
};

export const createAssetType = async (
  supabase: ReturnType<typeof createClient<Database>>,
  assetType: Partial<AssetType>
): Promise<AssetType> => {
  try {
    const { data, error } = await supabase
      .from('asset_types')
      .insert({
        name: assetType.name,
        description: assetType.description,
        organization_id: assetType.organization_id,
        color: assetType.color,
        enable_barcodes: assetType.enable_barcodes || false,
        barcode_type: assetType.barcode_type || 'qr',
        barcode_prefix: assetType.barcode_prefix || null
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating asset type:', error);
    throw error;
  }
};

export const updateAssetType = async (
  supabase: ReturnType<typeof createClient<Database>>,
  id: string,
  updates: Partial<AssetType>
): Promise<AssetType> => {
  try {
    const { data, error } = await supabase
      .from('asset_types')
      .update({
        name: updates.name,
        description: updates.description,
        color: updates.color,
        intake_form_id: updates.intake_form_id,
        inventory_form_id: updates.inventory_form_id,
        mapping_form_id: updates.mapping_form_id,
        conversion_fields: updates.conversion_fields,
        enable_barcodes: updates.enable_barcodes,
        barcode_type: updates.barcode_type,
        barcode_prefix: updates.barcode_prefix,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating asset type:', error);
    throw error;
  }
};

export const deleteAssetType = async (
  supabase: ReturnType<typeof createClient<Database>>,
  id: string
): Promise<void> => {
  const { error } = await supabase
    .from('asset_types')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('Error deleting asset type:', error);
    throw error;
  }
};

export const cloneAssetType = async (
  supabase: ReturnType<typeof createClient<Database>>,
  sourceAssetTypeId: string,
  targetOrganizationId: string,
  userId: string
): Promise<string> => {
  const { data, error } = await supabase
    .rpc('clone_asset_type', {
      type_id: sourceAssetTypeId,
      target_org_id: targetOrganizationId,
      admin_user_id: userId
    });

  if (error) {
    console.error('Error cloning asset type:', error);
    throw error;
  }

  return data;
};

export async function getAssetType(
  supabase: ReturnType<typeof createClient<Database>>,
  id: string
): Promise<AssetType | null> {
  try {
    const { data, error } = await supabase
      .from('asset_types')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching asset type:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to fetch asset type:', error);
    return null;
  }
}

// Get asset type by ID without requiring supabase client parameter
export const getAssetTypeById = async (id: string): Promise<AssetType | null> => {
  try {
    const { data, error } = await supabase
      .from('asset_types')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching asset type:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to fetch asset type:', error);
    return null;
  }
};

// Create default forms for an asset type
export const createDefaultFormsForAssetType = async (
  supabase: ReturnType<typeof createClient<Database>>,
  assetTypeId: string
): Promise<{ intake_form_id: string, inventory_form_id: string } | null> => {
  try {
    const { data, error } = await supabase.rpc(
      'create_default_forms_for_asset_type',
      { p_asset_type_id: assetTypeId }
    );

    if (error) {
      console.error('Error creating default forms:', error);
      throw error;
    }

    if (Array.isArray(data) && data.length > 0) {
      return data[0] as { intake_form_id: string, inventory_form_id: string };
    }
    if (data && !Array.isArray(data)) {
      return data as { intake_form_id: string, inventory_form_id: string };
    }
    
    return null;
  } catch (error) {
    console.error('Failed to create default forms:', error);
    return null;
  }
};

// Link a form to an asset type for a specific purpose (organization-aware)
export const addAssetTypeFormLink = async (
  assetTypeId: string,
  formId: string,
  purpose: string,
  organizationId: string
) => {
  const { error } = await supabase.rpc('link_asset_type_form', {
    p_asset_type_id: assetTypeId,
    p_form_id: formId,
    p_organization_id: organizationId,
    p_purpose: purpose
  });
  if (error) throw error;
  return true;
};

// Unlink a form from an asset type for a specific purpose (organization-aware)
export const removeAssetTypeFormLink = async (
  assetTypeId: string,
  formId: string,
  purpose: string,
  organizationId: string
) => {
  const { error } = await supabase.rpc('unlink_asset_type_form', {
    p_asset_type_id: assetTypeId,
    p_form_id: formId,
    p_organization_id: organizationId,
    p_purpose: purpose
  });
  if (error) throw error;
  return true;
};

// Get all forms linked to an asset type with their purpose (organization-aware)
export const getAssetTypeForms = async (
  assetTypeId: string,
  organizationId: string
) => {
  const { data, error } = await supabase.rpc('get_forms_for_asset_type', {
    p_asset_type_id: assetTypeId,
    p_organization_id: organizationId
  });
  if (error) throw error;
  return data;
};

// Get all asset types and purposes a form is linked to (organization-aware)
export const getFormAssetTypeLinks = async (
  formId: string,
  organizationId: string
) => {
  const { data, error } = await supabase.rpc('get_asset_types_for_form', {
    p_form_id: formId,
    p_organization_id: organizationId
  });
  if (error) throw error;
  return data;
};

// Get recommended forms for an asset type
export const getRecommendedFormsForAssetType = async (
  supabase: ReturnType<typeof createClient<Database>>,
  assetTypeId: string
): Promise<{ form_id: string, form_name: string, form_description: string, form_type: string, similarity: number }[] | null> => {
  try {
    const { data, error } = await supabase.rpc(
      'find_recommended_forms_for_asset_type',
      { p_asset_type_id: assetTypeId }
    );

    if (error) {
      console.error('Error getting recommended forms:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Failed to get recommended forms:', error);
    return [];
  }
};

/**
 * Restores a soft-deleted asset type by setting deleted_at to null.
 */
export const restoreAssetType = async (id: string): Promise<boolean> => {
  if (!id) {
    console.warn('[assetTypeService] restoreAssetType called with no ID.');
    return false;
  }
  try {
    const { error } = await supabase
      .from('asset_types')
      .update({ deleted_at: null })
      .eq('id', id)
      // Crucially, we also need to ensure we are not violating the unique constraint
      // This requires a bit more complex logic if we want to prevent errors proactively,
      // or we handle the potential unique constraint violation error post-update attempt.
      // For now, we'll rely on the database to throw an error if a conflict occurs.

    if (error) {
      console.error('[assetTypeService] Error restoring asset type:', error);
      // Check for unique constraint violation (code 23505 in PostgreSQL)
      if (error.code === '23505') {
        // Optionally, re-throw a custom error or return a specific status
        throw new Error('An active asset type with the same name already exists in this organization.');
      }
      throw error;
    }
    console.log(`[assetTypeService] Asset type ${id} restored successfully.`);
    return true;
  } catch (error) {
    console.error(`[assetTypeService] Failed to restore asset type ${id}:`, error);
    return false;
  }
};

/**
 * Soft deletes an asset type by setting its deleted_at field.
 */
export const softDeleteAssetType = async (id: string): Promise<boolean> => {
  if (!id) {
    console.warn('[assetTypeService] softDeleteAssetType called with no ID.');
    return false;
  }
  try {
    const { error } = await supabase
      .from('asset_types')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('[assetTypeService] Error soft deleting asset type:', error);
      throw error;
    }
    console.log(`[assetTypeService] Asset type ${id} soft deleted successfully.`);
    return true;
  } catch (error) {
    console.error(`[assetTypeService] Failed to soft delete asset type ${id}:`, error);
    return false;
  }
};

export const getArchivedAssetTypesWithCounts = async (
  supabaseClient: ReturnType<typeof createClient<Database>>,
  organizationId: string
): Promise<AssetTypeWithCount[]> => {
  // Step 1: Fetch archived asset types for the organization
  const { data: archivedTypes, error: fetchError } = await supabaseClient
    .from('asset_types')
    .select('*')
    .eq('organization_id', organizationId)
    .not('deleted_at', 'is', null) // Get records where deleted_at is NOT NULL
    .order('name', { ascending: true });

  if (fetchError) {
    console.error('[assetTypeService] Error fetching archived asset types:', fetchError);
    throw fetchError;
  }

  if (!archivedTypes || archivedTypes.length === 0) {
    return [];
  }

  // Step 2: For each archived type, count its active assets
  const typesWithCounts: AssetTypeWithCount[] = await Promise.all(
    archivedTypes.map(async (type) => {
      const { count, error: countError } = await supabaseClient
        .from('assets')
        .select('*', { count: 'exact', head: true })
        .eq('asset_type_id', type.id)
        .is('deleted_at', null); // Count only active assets

      if (countError) {
        console.error(`[assetTypeService] Error counting assets for archived type ${type.id}:`, countError);
        // Return with count 0 or handle error as appropriate
        return { ...type, asset_count: 0 };
      }
      return { ...type, asset_count: count || 0 };
    })
  );
  console.log(`[assetTypeService] Fetched ${typesWithCounts.length} archived asset types with counts.`);
  return typesWithCounts;
}; 