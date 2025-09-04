/**
 * Monthly Snapshot Service
 * 
 * Handles API calls for monthly inventory snapshots
 */

import { supabase } from '@/integrations/supabase/client';

export interface MonthlySnapshot {
  id: string;
  inventory_item_id: string;
  organization_id: string;
  asset_id: string | null;
  asset_name: string | null;
  item_name: string;
  quantity: number;
  location: string | null;
  status: string | null;
  current_price: number;
  currency: string;
  snapshot_date: string;
  month_year: string;
  created_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
}

export interface SnapshotFilters {
  assetIds?: string[];
  assetName?: string;
  assetTypeIds?: string[];
  startDate?: string;
  endDate?: string;
  organizationId: string;
}

export interface SnapshotStats {
  total_snapshots: number;
  active_snapshots: number;
  deleted_snapshots: number;
  oldest_snapshot_date: string | null;
  newest_snapshot_date: string | null;
  snapshots_by_month: { [key: string]: number };
}

/**
 * Get monthly snapshots with filters
 */
export async function getMonthlySnapshots(filters: SnapshotFilters): Promise<MonthlySnapshot[]> {
  try {
    let query = supabase
      .from('monthly_inventory_snapshots')
      .select('*')
      .eq('organization_id', filters.organizationId)
      .eq('is_deleted', false)
      .order('snapshot_date', { ascending: false });

    // Apply filters
    if (filters.assetIds && filters.assetIds.length > 0) {
      query = query.in('asset_id', filters.assetIds);
    }

    if (filters.assetName) {
      query = query.eq('asset_name', filters.assetName);
    }

    if (filters.startDate) {
      query = query.gte('snapshot_date', filters.startDate);
    }

    if (filters.endDate) {
      query = query.lte('snapshot_date', filters.endDate);
    }

    // Filter by asset types if provided
    if (filters.assetTypeIds && filters.assetTypeIds.length > 0) {
      const { data: assetsOfType } = await supabase
        .from('assets')
        .select('id')
        .eq('organization_id', filters.organizationId)
        .in('asset_type_id', filters.assetTypeIds)
        .eq('is_deleted', false);

      if (assetsOfType) {
        const assetIdsOfType = assetsOfType.map(a => a.id);
        query = query.in('asset_id', assetIdsOfType);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching monthly snapshots:', error);
      throw new Error('Failed to fetch monthly snapshots');
    }

    return data || [];
  } catch (error) {
    console.error('Error in getMonthlySnapshots:', error);
    throw error;
  }
}

/**
 * Get complete history for a specific asset
 */
export async function getAssetCompleteHistory(assetName: string): Promise<MonthlySnapshot[]> {
  try {
    const { data, error } = await supabase
      .rpc('get_asset_complete_history', { asset_name_param: assetName });

    if (error) {
      console.error('Error fetching asset complete history:', error);
      throw new Error('Failed to fetch asset history');
    }

    return data || [];
  } catch (error) {
    console.error('Error in getAssetCompleteHistory:', error);
    throw error;
  }
}

/**
 * Get complete history for an inventory item
 */
export async function getInventoryItemCompleteHistory(itemId: string): Promise<MonthlySnapshot[]> {
  try {
    const { data, error } = await supabase
      .rpc('get_inventory_item_complete_history', { item_id: itemId });

    if (error) {
      console.error('Error fetching inventory item history:', error);
      throw new Error('Failed to fetch inventory item history');
    }

    return data || [];
  } catch (error) {
    console.error('Error in getInventoryItemCompleteHistory:', error);
    throw error;
  }
}

/**
 * Get history for a specific date range
 */
export async function getAssetHistoryByDateRange(
  assetName: string, 
  startDate: string, 
  endDate: string
): Promise<MonthlySnapshot[]> {
  try {
    const { data, error } = await supabase
      .rpc('get_asset_history_by_date_range', {
        asset_name_param: assetName,
        start_date: startDate,
        end_date: endDate
      });

    if (error) {
      console.error('Error fetching asset history by date range:', error);
      throw new Error('Failed to fetch asset history');
    }

    return data || [];
  } catch (error) {
    console.error('Error in getAssetHistoryByDateRange:', error);
    throw error;
  }
}

/**
 * Get history for last N months
 */
export async function getAssetHistoryLastNMonths(
  assetName: string, 
  monthsBack: number
): Promise<MonthlySnapshot[]> {
  try {
    const { data, error } = await supabase
      .rpc('get_asset_history_last_n_months', {
        asset_name_param: assetName,
        months_back: monthsBack
      });

    if (error) {
      console.error('Error fetching asset history for last N months:', error);
      throw new Error('Failed to fetch asset history');
    }

    return data || [];
  } catch (error) {
    console.error('Error in getAssetHistoryLastNMonths:', error);
    throw error;
  }
}

/**
 * Get snapshot statistics
 */
export async function getSnapshotStats(): Promise<SnapshotStats> {
  try {
    const { data, error } = await supabase
      .rpc('get_monthly_snapshot_stats');

    if (error) {
      console.error('Error fetching snapshot stats:', error);
      throw new Error('Failed to fetch snapshot statistics');
    }

    return data?.[0] || {
      total_snapshots: 0,
      active_snapshots: 0,
      deleted_snapshots: 0,
      oldest_snapshot_date: null,
      newest_snapshot_date: null,
      snapshots_by_month: {}
    };
  } catch (error) {
    console.error('Error in getSnapshotStats:', error);
    throw error;
  }
}

/**
 * Manually trigger snapshot for specific date
 */
export async function triggerManualSnapshot(targetDate?: string): Promise<{
  items_processed: number;
  snapshots_created: number;
  errors: string[];
}> {
  try {
    const { data, error } = await supabase
      .rpc('trigger_manual_snapshot', { 
        target_date: targetDate || new Date().toISOString().split('T')[0]
      });

    if (error) {
      console.error('Error triggering manual snapshot:', error);
      throw new Error('Failed to trigger manual snapshot');
    }

    return data?.[0] || { items_processed: 0, snapshots_created: 0, errors: [] };
  } catch (error) {
    console.error('Error in triggerManualSnapshot:', error);
    throw error;
  }
}

/**
 * Clean up old snapshots
 */
export async function cleanupOldSnapshots(
  monthsToKeep: number = 24, 
  dryRun: boolean = true
): Promise<{
  snapshots_to_delete: number;
  snapshots_deleted: number;
  cleanup_date: string;
}> {
  try {
    const { data, error } = await supabase
      .rpc('cleanup_old_snapshots', {
        months_to_keep: monthsToKeep,
        dry_run: dryRun
      });

    if (error) {
      console.error('Error cleaning up old snapshots:', error);
      throw new Error('Failed to cleanup old snapshots');
    }

    return data?.[0] || { snapshots_to_delete: 0, snapshots_deleted: 0, cleanup_date: '' };
  } catch (error) {
    console.error('Error in cleanupOldSnapshots:', error);
    throw error;
  }
}

/**
 * Soft delete snapshots
 */
export async function softDeleteSnapshots(
  snapshotIds: string[], 
  reason: string = 'Manual deletion'
): Promise<number> {
  try {
    const { data, error } = await supabase
      .rpc('soft_delete_monthly_snapshots', {
        snapshot_ids: snapshotIds,
        reason: reason
      });

    if (error) {
      console.error('Error soft deleting snapshots:', error);
      throw new Error('Failed to delete snapshots');
    }

    return data || 0;
  } catch (error) {
    console.error('Error in softDeleteSnapshots:', error);
    throw error;
  }
}
