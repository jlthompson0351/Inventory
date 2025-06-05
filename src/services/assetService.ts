import { Database } from '@/types/database.types';
import { supabase } from '@/integrations/supabase/client';

export interface Asset {
  acquisition_date: string | null;
  asset_type_id: string | null;
  barcode: string | null;
  barcode_type: string | null;
  created_at: string | null;
  created_by: string | null;
  deleted_at: string | null;
  description: string | null;
  id: string;
  is_deleted: boolean | null;
  metadata: any | null;
  name: string;
  organization_id: string | null;
  parent_asset_id: string | null;
  serial_number: string | null;
  status: string | null;
  updated_at: string | null;
  has_inventory_item?: boolean;
}

export const getAssetById = async (id: string): Promise<Asset | null> => {
  try {
    if (!id) {
      console.warn('getAssetById called with empty ID');
      return null;
    }
    
    // Attempting to fetch asset
    
    // First get the asset
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      console.error('Supabase error fetching asset by id:', error);
      throw error;
    }

    if (!data) {
      console.warn(`Asset with ID ${id} not found in database`);
      return null;
    }

    // Successfully found asset

    // Check if inventory item exists for this asset
    const { data: inventoryData, error: inventoryError } = await supabase
      .from('inventory_items')
      .select('id')
      .eq('asset_id', data.id)
      .maybeSingle();

    if (inventoryError) {
      console.error('Supabase error checking inventory item:', inventoryError);
    }

    return {
      ...data,
      has_inventory_item: !!inventoryData
    };
  } catch (error) {
    console.error(`Failed to fetch asset with ID ${id}:`, error);
    return null;
  }
};

export const getAssetsByAssetType = async (assetTypeId: string): Promise<Asset[]> => {
  try {
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .eq('asset_type_id', assetTypeId)
      .is('deleted_at', null)
      .order('name');

    if (error) {
      console.error('Supabase error fetching assets by type:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Failed to fetch assets by type:', error);
    return [];
  }
};

export const getAssetByQrCode = async (qrCode: string): Promise<Asset | null> => {
  try {
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .eq('asset_id', qrCode)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      console.error('Supabase error fetching asset by QR code:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to fetch asset by QR code:', error);
    return null;
  }
};

/**
 * Soft delete an asset (sets deleted_at to now and is_deleted to true)
 */
export const softDeleteAsset = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('assets')
      .update({ deleted_at: new Date().toISOString(), is_deleted: true })
      .eq('id', id);
    if (error) {
      console.error('Error soft deleting asset:', error);
      throw error;
    }
    return true;
  } catch (error) {
    console.error('Failed to soft delete asset:', error);
    return false;
  }
};

// Remove or comment out hardDeleteAsset to enforce soft deletion only
// export const hardDeleteAsset = async (id: string): Promise<boolean> => {
//   // Not supported: prefer soft deletes for all cases
//   return false;
// }; 