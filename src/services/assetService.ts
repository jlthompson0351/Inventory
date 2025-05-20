import { Database } from '@/types/database.types';
import { supabase } from '@/integrations/supabase/client';

export interface Asset {
  id: string;
  name: string;
  description: string | null;
  asset_id: string | null;
  organization_id: string;
  asset_type_id: string;
  location: string | null;
  status: string;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
  metadata: Record<string, any> | null;
  has_inventory_item?: boolean;
}

export const getAssetById = async (id: string): Promise<Asset | null> => {
  try {
    if (!id) {
      console.warn('getAssetById called with empty ID');
      return null;
    }
    
    console.log(`Attempting to fetch asset with ID: ${id}`);
    
    // First get the asset
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) {
      // Handle the specific case of no rows found
      if (error.code === 'PGRST116' || error.message?.includes('no rows')) {
        console.warn(`Asset with ID ${id} not found in database`);
        return null;
      }
      console.error('Supabase error fetching asset by id:', error);
      throw error;
    }

    if (!data) {
      console.warn(`No data returned for asset with ID ${id}`);
      return null;
    }

    console.log(`Successfully found asset: ${data.name} (${data.id})`);

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
      .single();

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