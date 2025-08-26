/**
 * Inventory Correction Service
 * 
 * Implements industry best practices for historical data corrections:
 * - Never edit original records
 * - Create correction records with full audit trail
 * - Handle soft-deleted assets gracefully
 * - Maintain data integrity and compliance
 */

import { supabase } from '@/integrations/supabase/client';

export interface InventoryCorrection {
  id: string;
  original_history_id: string;
  corrected_by: string;
  correction_reason: string;
  original_quantity: number;
  original_location: string | null;
  original_notes: string | null;
  original_response_data: Record<string, any> | null;
  corrected_quantity: number;
  corrected_location: string | null;
  corrected_notes: string | null;
  corrected_response_data: Record<string, any> | null;
  correction_type: string;
  approval_status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export interface CorrectionFormData {
  quantity: number;
  location?: string;
  notes?: string;
  response_data?: Record<string, any>;
  reason: string;
}

export interface HistoryWithAssetStatus {
  history_record: any;
  asset_is_deleted: boolean;
  asset_id: string;
  asset_name: string;
}

/**
 * Get history record with asset deletion status
 * This handles the soft-deleted asset scenario
 */
export const getHistoryWithAssetStatus = async (historyId: string): Promise<HistoryWithAssetStatus | null> => {
  try {
    const { data, error } = await supabase.rpc('get_history_with_asset_status', {
      p_history_id: historyId
    });

    if (error) {
      console.error('Error getting history with asset status:', error);
      throw error;
    }

    return data?.[0] || null;
  } catch (error) {
    console.error('Failed to get history with asset status:', error);
    return null;
  }
};

/**
 * Apply an inventory correction
 * This creates a correction record and updates current inventory
 */
export const applyInventoryCorrection = async (
  originalHistoryId: string,
  correctionData: CorrectionFormData
): Promise<{ success: boolean; message: string; correction_id?: string }> => {
  try {
    // Get current user ID
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    
    if (!userId) {
      return { success: false, message: 'User authentication required' };
    }
    
    const { data, error } = await supabase.rpc('apply_inventory_correction', {
      p_original_history_id: originalHistoryId,
      p_corrected_quantity: correctionData.quantity,
      p_corrected_location: correctionData.location || null,
      p_corrected_notes: correctionData.notes || null,
      p_corrected_response_data: correctionData.response_data || null,
      p_correction_reason: correctionData.reason,
      p_user_id: userId, // Pass user_id explicitly
      p_auto_approve: true // Auto-approve for now, can add approval workflow later
    });

    if (error) {
      console.error('Error applying correction:', error);
      return { success: false, message: error.message };
    }

    if (data && typeof data === 'object') {
      return {
        success: data.success || false,
        message: data.message || 'Correction applied',
        correction_id: data.correction_id
      };
    }

    return { success: true, message: 'Correction applied successfully' };
  } catch (error) {
    console.error('Failed to apply inventory correction:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Get all corrections for a history record
 */
export const getCorrectionsByHistoryId = async (historyId: string): Promise<InventoryCorrection[]> => {
  try {
    const { data, error } = await supabase
      .from('inventory_corrections')
      .select('*')
      .eq('original_history_id', historyId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching corrections:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Failed to get corrections:', error);
    return [];
  }
};

/**
 * Get all corrections for a list of history records
 */
export const getCorrectionsByHistoryIds = async (historyIds: string[]): Promise<InventoryCorrection[]> => {
  if (historyIds.length === 0) {
    return [];
  }
  
  try {
    const { data, error } = await supabase
      .from('inventory_corrections')
      .select('*')
      .in('original_history_id', historyIds)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching corrections by IDs:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Failed to get corrections by IDs:', error);
    return [];
  }
};

/**
 * Restore a soft-deleted asset temporarily for correction
 */
export const temporaryRestoreAsset = async (assetId: string): Promise<{ success: boolean; message: string }> => {
  try {
    const { error } = await supabase
      .from('assets')
      .update({
        is_deleted: false,
        deleted_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', assetId);

    if (error) {
      console.error('Error restoring asset:', error);
      return { success: false, message: error.message };
    }

    return { success: true, message: 'Asset temporarily restored for correction' };
  } catch (error) {
    console.error('Failed to restore asset:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Check if a history record has any corrections
 */
export const hasCorrections = async (historyId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('inventory_corrections')
      .select('id')
      .eq('original_history_id', historyId)
      .eq('is_deleted', false)
      .limit(1);

    if (error) {
      console.error('Error checking for corrections:', error);
      return false;
    }

    return (data || []).length > 0;
  } catch (error) {
    console.error('Failed to check for corrections:', error);
    return false;
  }
};

/**
 * Get the latest corrected values for a history record
 * Returns the most recent correction, or original values if no corrections
 */
export const getLatestCorrectedValues = async (historyId: string) => {
  try {
    // Get the most recent correction
    const { data: correction, error } = await supabase
      .from('inventory_corrections')
      .select('*')
      .eq('original_history_id', historyId)
      .eq('approval_status', 'approved')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error getting latest correction:', error);
      return null;
    }

    if (correction) {
      return {
        quantity: correction.corrected_quantity,
        location: correction.corrected_location,
        notes: correction.corrected_notes,
        response_data: correction.corrected_response_data,
        is_corrected: true,
        correction_id: correction.id,
        corrected_at: correction.created_at,
        corrected_by: correction.corrected_by
      };
    }

    // No corrections found, return original values
    const { data: original, error: originalError } = await supabase
      .from('inventory_history')
      .select('quantity, location, notes, response_data')
      .eq('id', historyId)
      .single();

    if (originalError) {
      console.error('Error getting original values:', originalError);
      return null;
    }

    return {
      quantity: original.quantity,
      location: original.location,
      notes: original.notes,
      response_data: original.response_data,
      is_corrected: false
    };
  } catch (error) {
    console.error('Failed to get latest corrected values:', error);
    return null;
  }
};
