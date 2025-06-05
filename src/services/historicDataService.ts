import { supabase } from '@/integrations/supabase/client';

/**
 * Historic Data Service
 * 
 * This service provides access to ALL data including soft-deleted records
 * for comprehensive reporting, analytics, and audit purposes.
 * 
 * Use these functions when you need complete historic data that includes
 * deleted asset types, assets, forms, etc.
 */

export interface HistoricDataOptions {
  includeDeleted?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
}

/**
 * Get all asset types including soft-deleted ones for historic reporting
 */
export const getHistoricAssetTypes = async (
  organizationId: string,
  options: HistoricDataOptions = {}
): Promise<any[]> => {
  const { includeDeleted = true, sortBy = 'created_at', sortOrder = 'desc', limit } = options;

  let query = supabase
    .from('asset_types')
    .select('*')
    .eq('organization_id', organizationId);

  if (!includeDeleted) {
    query = query.eq('is_deleted', false);
  }

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query.order(sortBy, { ascending: sortOrder === 'asc' });

  if (error) {
    console.error('Error fetching historic asset types:', error);
    throw error;
  }

  return data || [];
};

/**
 * Get all assets including soft-deleted ones for historic reporting
 */
export const getHistoricAssets = async (
  organizationId: string,
  options: HistoricDataOptions = {}
): Promise<any[]> => {
  const { includeDeleted = true, sortBy = 'created_at', sortOrder = 'desc', limit } = options;

  let query = supabase
    .from('assets')
    .select(`
      *,
      asset_types(id, name, description, color, is_deleted, deleted_at)
    `)
    .eq('organization_id', organizationId);

  if (!includeDeleted) {
    query = query.eq('is_deleted', false);
  }

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query.order(sortBy, { ascending: sortOrder === 'asc' });

  if (error) {
    console.error('Error fetching historic assets:', error);
    throw error;
  }

  return data || [];
};

/**
 * Get all forms including soft-deleted ones for historic reporting
 */
export const getHistoricForms = async (
  organizationId: string,
  options: HistoricDataOptions = {}
): Promise<any[]> => {
  const { includeDeleted = true, sortBy = 'created_at', sortOrder = 'desc', limit } = options;

  let query = supabase
    .from('forms')
    .select('*')
    .eq('organization_id', organizationId);

  if (!includeDeleted) {
    query = query.eq('is_deleted', false);
  }

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query.order(sortBy, { ascending: sortOrder === 'asc' });

  if (error) {
    console.error('Error fetching historic forms:', error);
    throw error;
  }

  return data || [];
};

/**
 * Get all inventory items including soft-deleted ones for historic reporting
 */
export const getHistoricInventoryItems = async (
  organizationId: string,
  options: HistoricDataOptions = {}
): Promise<any[]> => {
  const { includeDeleted = true, sortBy = 'created_at', sortOrder = 'desc', limit } = options;

  let query = supabase
    .from('inventory_items')
    .select(`
      *,
      asset_types(id, name, description, color, is_deleted, deleted_at)
    `)
    .eq('organization_id', organizationId);

  if (!includeDeleted) {
    query = query.eq('is_deleted', false);
  }

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query.order(sortBy, { ascending: sortOrder === 'asc' });

  if (error) {
    console.error('Error fetching historic inventory items:', error);
    throw error;
  }

  return data || [];
};

/**
 * Get comprehensive audit trail showing all changes including soft deletes
 */
export const getComprehensiveAuditTrail = async (
  organizationId: string,
  options: HistoricDataOptions = {}
): Promise<{
  assetTypes: any[];
  assets: any[];
  forms: any[];
  inventoryItems: any[];
  summary: {
    totalActive: number;
    totalDeleted: number;
    deletionRatio: number;
  };
}> => {
  const { limit = 1000 } = options;

  try {
    const [assetTypes, assets, forms, inventoryItems] = await Promise.all([
      getHistoricAssetTypes(organizationId, { includeDeleted: true, limit }),
      getHistoricAssets(organizationId, { includeDeleted: true, limit }),
      getHistoricForms(organizationId, { includeDeleted: true, limit }),
      getHistoricInventoryItems(organizationId, { includeDeleted: true, limit })
    ]);

    // Calculate summary statistics
    const allItems = [...assetTypes, ...assets, ...forms, ...inventoryItems];
    const totalActive = allItems.filter(item => !item.is_deleted).length;
    const totalDeleted = allItems.filter(item => item.is_deleted).length;
    const deletionRatio = totalActive > 0 ? (totalDeleted / (totalActive + totalDeleted)) * 100 : 0;

    return {
      assetTypes,
      assets,
      forms,
      inventoryItems,
      summary: {
        totalActive,
        totalDeleted,
        deletionRatio: Math.round(deletionRatio * 100) / 100
      }
    };
  } catch (error) {
    console.error('Error fetching comprehensive audit trail:', error);
    throw error;
  }
};

/**
 * Get statistics about soft-deleted items by table
 */
export const getSoftDeleteStatistics = async (
  organizationId: string
): Promise<{
  [tableName: string]: {
    total: number;
    active: number;
    deleted: number;
    deletionPercentage: number;
  };
}> => {
  try {
    const [assetTypes, assets, forms, inventoryItems] = await Promise.all([
      getHistoricAssetTypes(organizationId, { includeDeleted: true }),
      getHistoricAssets(organizationId, { includeDeleted: true }),
      getHistoricForms(organizationId, { includeDeleted: true }),
      getHistoricInventoryItems(organizationId, { includeDeleted: true })
    ]);

    const calculateStats = (items: any[]) => {
      const total = items.length;
      const deleted = items.filter(item => item.is_deleted).length;
      const active = total - deleted;
      const deletionPercentage = total > 0 ? (deleted / total) * 100 : 0;
      
      return {
        total,
        active,
        deleted,
        deletionPercentage: Math.round(deletionPercentage * 100) / 100
      };
    };

    return {
      asset_types: calculateStats(assetTypes),
      assets: calculateStats(assets),
      forms: calculateStats(forms),
      inventory_items: calculateStats(inventoryItems)
    };
  } catch (error) {
    console.error('Error getting soft delete statistics:', error);
    throw error;
  }
};

/**
 * Search through historic data with filters
 */
export const searchHistoricData = async (
  organizationId: string,
  searchTerm: string,
  tables: string[] = ['asset_types', 'assets', 'forms'],
  includeDeleted: boolean = true
): Promise<{
  assetTypes: any[];
  assets: any[];
  forms: any[];
}> => {
  try {
    const results = {
      assetTypes: [],
      assets: [],
      forms: []
    };

    if (tables.includes('asset_types')) {
      const { data: assetTypes } = await supabase
        .from('asset_types')
        .select('*')
        .eq('organization_id', organizationId)
        .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        .eq('is_deleted', includeDeleted ? undefined : false);
      
      results.assetTypes = assetTypes || [];
    }

    if (tables.includes('assets')) {
      const { data: assets } = await supabase
        .from('assets')
        .select('*, asset_types(name, color)')
        .eq('organization_id', organizationId)
        .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,barcode.ilike.%${searchTerm}%`)
        .eq('is_deleted', includeDeleted ? undefined : false);
      
      results.assets = assets || [];
    }

    if (tables.includes('forms')) {
      const { data: forms } = await supabase
        .from('forms')
        .select('*')
        .eq('organization_id', organizationId)
        .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        .eq('is_deleted', includeDeleted ? undefined : false);
      
      results.forms = forms || [];
    }

    return results;
  } catch (error) {
    console.error('Error searching historic data:', error);
    throw error;
  }
};

/**
 * Get detailed deletion history for a specific item
 */
export const getDeletionHistory = async (
  itemType: 'asset_type' | 'asset' | 'form' | 'inventory_item',
  itemId: string
): Promise<{
  item: any;
  relatedDeletions: any[];
  deletionImpact: {
    directlyAffected: number;
    cascadeDeleted: number;
  };
}> => {
  try {
    // This would require more complex queries to track relationships
    // For now, return basic item info
    const { data: item } = await supabase
      .from(itemType === 'asset_type' ? 'asset_types' : 
            itemType === 'asset' ? 'assets' :
            itemType === 'form' ? 'forms' : 'inventory_items')
      .select('*')
      .eq('id', itemId)
      .single();

    return {
      item,
      relatedDeletions: [], // Would need to implement relationship tracking
      deletionImpact: {
        directlyAffected: 0,
        cascadeDeleted: 0
      }
    };
  } catch (error) {
    console.error('Error getting deletion history:', error);
    throw error;
  }
};