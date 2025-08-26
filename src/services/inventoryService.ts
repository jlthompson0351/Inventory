import { Database } from '@/types/database.types';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { TablesInsert, TablesUpdate, InventoryItemInsert } from '@/integrations/supabase/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { PostgrestError } from '@supabase/supabase-js';
import { getAssetById } from './assetService';

export type InventoryItem = Database['public']['Tables']['inventory_items']['Row'];
export type InventoryPriceHistory = Database['public']['Tables']['inventory_price_history']['Row'];

// Interface for inventory item creation
export interface CreateInventoryItemData {
  name: string;
  description?: string;
  sku?: string;
  barcode?: string;
  quantity?: number;
  location?: string;
  category?: string;
  organization_id: string;
  asset_id: string;
}

// Interface for inventory item update
export interface UpdateInventoryItemData {
  name?: string;
  description?: string;
  sku?: string;
  barcode?: string;
  quantity?: number;
  location?: string;
  category?: string;
}

/**
 * Get all inventory items for an organization, or by asset_id
 * @param organizationId - The organization ID
 * @param assetId - Can be either an asset_id to filter by, or a specific inventory item ID
 */
export const getInventoryItems = async (
  organizationId: string,
  assetId?: string
): Promise<any[] | null> => {
  try {
    if (assetId) {
      // First, try to find inventory items with this asset_id
      const assetQuery = supabase
        .from('inventory_items')
        .select(`*, asset_type:asset_types(id, name, color)`)
        .eq('organization_id', organizationId)
        .eq('asset_id', assetId);
        
      const { data: assetData, error: assetError } = await assetQuery;
      
      if (assetError) {
        // Error fetching inventory items by asset_id
      } else if (assetData && assetData.length > 0) {
        return assetData;
      } else {
      }
      
      // If no results by asset_id, try direct inventory item ID match
      const directQuery = supabase
        .from('inventory_items')
        .select(`*, asset_type:asset_types(id, name, color)`)
        .eq('organization_id', organizationId)
        .eq('id', assetId);
        
      const { data: directData, error: directError } = await directQuery;
      
      if (directError) {
        // Error fetching inventory item by direct ID
      } else if (directData && directData.length > 0) {
        return directData;
      } else {
        // No inventory item found with direct ID
      }
      
      // If we got here, no items were found for this asset ID
      return [];
    }
    
    // If no assetId provided, get all inventory items for the org
    const query = supabase
      .from('inventory_items')
      .select(`*, asset_type:asset_types(id, name, color)`)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });
      
    const { data, error: fetchError } = await query;
    
    if (fetchError) {
      // Error fetching all inventory items
      throw fetchError;
    }
    
    return data;
  } catch (error) {
    // Error in getInventoryItems
    return null;
  }
};

// Legacy version with supabase client parameter
export const getInventoryItemsLegacy = async (
  supabase: SupabaseClient<Database>,
  organizationId: string
): Promise<any[] | null> => {
  const { data, error } = await supabase
    .from('inventory_items')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (error) {
    // Error fetching inventory items
    throw error;
  }

  return data;
};

/**
 * Get a single inventory item by ID
 */
export async function getInventoryItem(id: string) {
  try {
    const { data, error, status } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      if (error.code === 'PGRST116' || error.message?.includes('multiple') || error.message?.includes('no rows')) {
        // Not found or multiple rows, return null
        // No inventory item found or multiple rows
        return null;
      }
      throw error;
    }
    return data;
  } catch (error) {
    // Error getting inventory item
    return null;
  }
}

// Legacy version with supabase client parameter
export async function getInventoryItemLegacy(supabase: any, id: string) {
  try {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    // Error getting inventory item
    throw error;
  }
}

// Utility to check if a periodic inventory exists for an asset in the current month
export const hasPeriodicInventoryForMonth = async (assetId: string, monthYear: string) => {
  const { data, error } = await supabase
    .from('inventory_items')
    .select('id')
    .eq('asset_id', assetId)
    .single();
  if (!data || error) return false;
  const { data: history, error: historyError } = await supabase
    .from('inventory_history')
    .select('id')
    .eq('inventory_item_id', data.id)
    .eq('month_year', monthYear)
    .eq('check_type', 'periodic')
    .maybeSingle();
  return !!history && !historyError;
};

// Helper to map old check_type to new event_type
function mapCheckTypeToEventType(checkType: string): string {
  if (checkType === 'initial') return 'intake';
  if (checkType === 'periodic') return 'audit';
  return checkType; // fallback for custom/other types
}

/**
 * @deprecated Use assetInventoryService.createInventoryForAsset() instead
 * This function has data consistency issues and creates orphaned inventory items
 * 
 * Create a new inventory item (must be linked to an asset, only one per asset)
 * Now also creates an initial inventory_history entry for the intake month with the intake quantity.
 */
export const createInventoryItem = async (
  itemData: InventoryItemInsert
): Promise<any> => {
  // DEPRECATED: Throw error to prevent usage in production
  throw new Error(
    'createInventoryItem is deprecated. Use assetInventoryService.createInventoryForAsset() instead. ' +
    'This function has been disabled to prevent data consistency issues.'
  );
  try {
    let assetExists = true;
    let assetIdToUse = itemData.asset_id;
    if (itemData.asset_id) {
      const asset = await getAssetById(itemData.asset_id);
      if (!asset) {
        assetExists = false;
        assetIdToUse = null;
        // Asset not found. Creating orphaned inventory item.
      } else {
        // Check if inventory already exists for this asset
        const { data: existingInventory, error: checkError } = await supabase
          .from('inventory_items')
          .select('id, name')
          .eq('asset_id', itemData.asset_id)
          .maybeSingle();
          
        if (checkError) {
          // Error checking for existing inventory
        }
          
        if (existingInventory) {
          // Inventory item already exists for this asset
          throw new Error(`An inventory item already exists for this asset. Please edit the existing inventory item instead of creating a new one.`);
        }
      }
    }
    
    // Check if inventory already exists for this asset (but allow if only initial exists)
    if (assetIdToUse) {
      const { data: existing, error: existingError } = await supabase
        .from('inventory_items')
        .select('id')
        .eq('asset_id', assetIdToUse)
        .single();
      if (existing && !existingError) {
        // Check if a periodic inventory exists for this month
        const monthYear = new Date().toISOString().slice(0, 7);
        const { data: periodic, error: periodicError } = await supabase
          .from('inventory_history')
          .select('id')
          .eq('inventory_item_id', existing.id)
          .eq('month_year', monthYear)
          .eq('check_type', 'periodic')
          .maybeSingle();
        if (periodic && !periodicError) {
          throw new Error('A periodic inventory record already exists for this asset this month.');
        }
      }
    }
    // Get the current user's ID
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    // Use intake quantity if provided, else default to 0
    const intakeQuantity = typeof itemData.quantity === 'number' ? itemData.quantity : 0;
    const newItemData = {
      ...itemData,
      asset_id: assetIdToUse,
      quantity: intakeQuantity,
      created_by: userId || null,
      created_at: new Date().toISOString()
    };
    // Create the inventory item
    const { data, error } = await supabase
      .from('inventory_items')
      .insert(newItemData)
      .select()
      .single();
    if (error) {
      // Handle the unique constraint violation specifically
      if (error.code === '23505' && error.message?.includes('unique_inventory_per_asset')) {
        throw new Error(`An inventory item already exists for this asset. Please edit the existing inventory item instead of creating a new one.`);
      }
      
      // Provide more specific error messages for common issues
      if (error.code === '23503' && error.message.includes('inventory_items_asset_id_fkey')) {
        throw new Error(`The asset ID ${itemData.asset_id} does not exist in the system. Please select a valid asset.`);
      }
      // Error creating inventory item
      throw error;
    }
    // Immediately create an initial inventory_history entry for the intake month
    if (data && data.id) {
      const now = new Date();
      await upsertMonthlyInventoryHistory({
        organization_id: data.organization_id,
        inventory_item_id: data.id,
        location: data.location || '',
        quantity: intakeQuantity,
        check_type: 'initial',
        notes: assetExists ? 'Initial intake quantity' : 'Initial intake quantity (asset missing, orphaned item)',
        status: 'active',
        check_date: now,
      });
    }
    if (!assetExists) {
      // Asset not found. Created orphaned inventory item.
    }
    return data;
  } catch (error) {
    // Error creating inventory item
    throw error;
  }
};

// Legacy version with supabase client parameter
export const createInventoryItemLegacy = async (
  supabase: SupabaseClient<Database>,
  itemData: CreateInventoryItemData
): Promise<any> => {
  // Add the current user's ID as the creator
  const user = await supabase.auth.getUser();
  const userId = user.data.user?.id;

  const newItemData = {
    ...itemData,
    created_by: userId,
  };

  const { data, error } = await supabase
    .from('inventory_items')
    .insert(newItemData)
    .select()
    .single();

  if (error) {
    // Error creating inventory item
    throw error;
  }

  return data;
};

/**
 * Update an inventory item
 */
export async function updateInventoryItem(id: string, itemData: any) {
  try {
    let assetIdToUse = itemData.asset_id;
    if (itemData.asset_id) {
      const asset = await getAssetById(itemData.asset_id);
      if (!asset) {
        assetIdToUse = null;
        // Asset not found. Setting asset_id to null.
      }
    }
    const { data, error } = await supabase
      .from('inventory_items')
      .update({
        name: itemData.name,
        description: itemData.description,
        sku: itemData.sku,
        barcode: itemData.barcode,
        quantity: itemData.quantity,
        location: itemData.location,
        category: itemData.category,
        asset_id: assetIdToUse,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select();
    
    if (error) {
      // Provide more specific error messages for common issues
      if (error.code === '23503' && error.message.includes('inventory_items_asset_id_fkey')) {
        throw new Error(`The asset ID ${itemData.asset_id} does not exist in the system. Please select a valid asset.`);
      }
      throw error;
    }
    return data;
  } catch (error) {
    // Error updating inventory item
    throw error;
  }
}

// Legacy version with supabase client parameter
export async function updateInventoryItemLegacy(supabase: any, id: string, itemData: any) {
  try {
    const { data, error } = await supabase
      .from('inventory_items')
      .update({
        name: itemData.name,
        description: itemData.description,
        sku: itemData.sku,
        barcode: itemData.barcode,
        quantity: itemData.quantity,
        location: itemData.location,
        category: itemData.category,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return data;
  } catch (error) {
    // Error updating inventory item
    throw error;
  }
}

/**
 * Soft delete an inventory item (sets deleted_at and is_deleted)
 */
export async function softDeleteInventoryItem(id: string) {
  try {
    const { error } = await supabase
      .from('inventory_items')
      .update({ deleted_at: new Date().toISOString(), is_deleted: true })
      .eq('id', id);
    if (error) throw error;
    return true;
  } catch (error) {
    // Error soft deleting inventory item
    throw error;
  }
}

// Update deleteInventoryItem to use soft delete
export async function deleteInventoryItem(id: string) {
  return softDeleteInventoryItem(id);
}

/**
 * Search inventory items by name, description, SKU, or barcode
 */
export const searchInventoryItems = async (
  supabase: SupabaseClient<Database>,
  organizationId: string,
  searchQuery: string
): Promise<any[] | null> => {
  const { data, error } = await supabase
    .from('inventory_items')
    .select('*')
    .eq('organization_id', organizationId)
    .or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,sku.ilike.%${searchQuery}%,barcode.ilike.%${searchQuery}%`)
    .order('created_at', { ascending: false });

  if (error) {
    // Error searching inventory items
    throw error;
  }

  return data;
};

/**
 * Filter inventory items by category
 */
export const filterInventoryItemsByCategory = async (
  supabase: SupabaseClient<Database>,
  organizationId: string,
  category: string
): Promise<any[] | null> => {
  const { data, error } = await supabase
    .from('inventory_items')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('category', category)
    .order('created_at', { ascending: false });

  if (error) {
    // Error filtering inventory items by category
    throw error;
  }

  return data;
};

/**
 * Get categories from inventory items
 */
export const getInventoryCategories = async (
  supabase: SupabaseClient<Database>,
  organizationId: string
): Promise<string[] | null> => {
  const { data, error } = await supabase
    .from('inventory_items')
    .select('category')
    .eq('organization_id', organizationId)
    .not('category', 'is', null);

  if (error) {
    // Error fetching inventory categories
    throw error;
  }

  // Extract unique categories
  const categories = data
    .map(item => item.category)
    .filter((value, index, self) => value && self.indexOf(value) === index);

  return categories as string[];
};

/**
 * Generate a unique barcode for an inventory item
 */
export const generateBarcode = async (
  supabase: SupabaseClient,
  prefix: string,
  itemId: string
) => {
  // Extract a few characters from the itemId to create a unique code
  const shortId = itemId.substring(0, 8).toUpperCase();
  
  // Combine prefix and short ID to create a barcode
  const barcode = `${prefix}-${shortId}`;
  
  return barcode;
};

export const updateInventoryItemPrice = async (
  supabaseClient: ReturnType<typeof createClient<Database>>,
  id: string,
  price: number,
  currency: string = 'USD',
  notes?: string,
  submissionId?: string
): Promise<void> => {
  // First, update the inventory item with the new price
  const { error: updateError } = await supabaseClient
    .from('inventory_items')
    .update({ 
      current_price: price,
      currency,
      updated_at: new Date().toISOString()
    })
    .eq('id', id);

  if (updateError) {
          // Error updating inventory item price
    throw updateError;
  }

  // Get the organization ID for this item
  const { data: item, error: itemError } = await supabaseClient
    .from('inventory_items')
    .select('organization_id')
    .eq('id', id)
    .single();

  if (itemError) {
            // Error fetching inventory item organization
    throw itemError;
  }

  // Then create a price history record
  const { error: historyError } = await supabaseClient
    .from('inventory_price_history')
    .insert({
      inventory_item_id: id,
      organization_id: item.organization_id,
      price,
      currency,
      notes,
      submission_id: submissionId
    });

  if (historyError) {
          // Error creating price history record
    throw historyError;
  }
};

export const getInventoryItemPriceHistory = async (
  supabaseClient: ReturnType<typeof createClient<Database>>,
  itemId: string
): Promise<InventoryPriceHistory[]> => {
  const { data, error } = await supabaseClient
    .from('inventory_price_history')
    .select('*')
    .eq('inventory_item_id', itemId)
    .order('effective_date', { ascending: false });

  if (error) {
    // Error fetching price history
    throw error;
  }

  return data || [];
};

export const validateBarcode = async (
  supabaseClient: ReturnType<typeof createClient<Database>>,
  barcode: string
): Promise<boolean> => {
  try {
    const { data, error } = await supabaseClient.rpc(
      'validate_barcode',
      { p_barcode: barcode }
    );

    if (error) {
      // Error validating barcode
      throw error;
    }

    return data;
  } catch (error) {
    // Failed to validate barcode
    // Fallback validation in case the RPC fails
    return /^[A-Za-z0-9]+-[A-Za-z0-9]{8}$/.test(barcode);
  }
};

export type InventoryItemUpdate = TablesUpdate<'inventory_items'>;

export async function getInventoryItemByBarcode(organizationId: string, barcode: string): Promise<InventoryItem | null> {
  try {
    const { data, error } = await supabase
      .from('inventory_items')
      .select(`
        *,
        asset_type:asset_types(*)
      `)
      .eq('organization_id', organizationId)
      .eq('barcode', barcode)
      .single();

    if (error) {
      // Error fetching inventory item by barcode
      throw error;
    }

    return data;
  } catch (error) {
    // Failed to fetch inventory item by barcode
    return null;
  }
}

export async function generateAssetBarcode(
  supabase: ReturnType<typeof createClient<Database>>,
  assetId: string,
  barcodeType: string = 'qr'
): Promise<string> {
  try {
    const { data, error } = await supabase.rpc('generate_asset_barcode', {
      p_asset_id: assetId,
      p_barcode_type: barcodeType
    });

    if (error) throw error;
    return data;
  } catch (error) {
    // Error generating asset barcode
    throw error;
  }
}

export async function scanAssetBarcode(
  supabase: ReturnType<typeof createClient<Database>>,
  barcode: string
) {
  try {
    const { data, error } = await supabase.rpc('scan_asset_barcode', {
      p_barcode: barcode
    });

    if (error) throw error;
    return data;
  } catch (error) {
    // Error scanning asset barcode
    throw error;
  }
}

/**
 * Get asset forms by barcode - used in QR code workflow
 */
export async function getAssetFormsByBarcode(
  supabase: ReturnType<typeof createClient<Database>>,
  barcode: string
): Promise<any> {
  try {
    const { data, error } = await supabase.rpc('get_asset_forms_by_barcode', {
      p_barcode: barcode
    });

    if (error) throw error;
    return data;
  } catch (error) {
    // Error getting asset forms by barcode
    return null;
  }
}

/**
 * Get asset with calculation formulas by barcode - enhanced version for formula support
 */
export async function getAssetWithFormulasByBarcode(
  supabase: ReturnType<typeof createClient<Database>>,
  barcode: string
): Promise<any> {
  try {
    const { data, error } = await supabase.rpc('get_asset_with_formulas_by_barcode', {
      p_barcode: barcode
    });

    if (error) throw error;
    return data;
  } catch (error) {
    // Error getting asset with formulas by barcode
    return null;
  }
}

/**
 * Apply calculation formulas to form data
 */
export async function applyAssetCalculationFormulas(
  supabase: ReturnType<typeof createClient<Database>>,
  formData: any,
  calculationFormulas: any,
  assetMetadata: any = {}
): Promise<any> {
  try {
    const { data, error } = await supabase.rpc('apply_asset_calculation_formulas', {
      p_form_data: formData,
      p_calculation_formulas: calculationFormulas,
      p_asset_metadata: assetMetadata
    });

    if (error) throw error;
    return data;
  } catch (error) {
    // Error applying calculation formulas
    // Return original form data if there's an error
    return formData;
  }
}

/**
 * Create an inventory check record for an asset
 * This is used for both initial creation and periodic inventory checks
 */
export const createInventoryCheck = async (
  assetId: string,
  assetTypeId: string,
  organizationId: string,
  checkData: {
    quantity: number;
    condition?: string;
    notes?: string;
    status?: string;
    location?: string;
    unitType?: string;
    checkType: 'initial' | 'periodic';
  }
): Promise<any> => {
  try {
    // Get the current user's ID
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    // Get the asset details to include in inventory
    const { data: assetData, error: assetError } = await supabase
      .from('assets')
      .select('name, description, metadata')
      .eq('id', assetId)
      .single();
    if (assetError) {
      // Error fetching asset data
      throw assetError;
    }
    // For periodic checks, see if a periodic inventory already exists for this asset this month
    if (checkData.checkType === 'periodic') {
      const monthYear = new Date().toISOString().slice(0, 7);
      const hasPeriodic = await hasPeriodicInventoryForMonth(assetId, monthYear);
      if (hasPeriodic) {
        throw new Error('A periodic inventory record already exists for this asset this month.');
      }
    }
    const event_type = mapCheckTypeToEventType(checkData.checkType);
    // Setup metadata for inventory
    const metadata = {
      ...(assetData.metadata || {}),
      check_type: checkData.checkType,
      event_type,
      check_date: new Date().toISOString(),
      condition: checkData.condition,
      notes: checkData.notes,
    };
    // Create the inventory item with intake quantity (not 0)
    const intakeQuantity = typeof checkData.quantity === 'number' ? checkData.quantity : 0;
    const inventoryItemData = {
      organization_id: organizationId,
      asset_type_id: assetTypeId,
      asset_id: assetId,
      name: assetData.name,
      description: assetData.description,
      status: checkData.status || 'active',
      quantity: intakeQuantity,
      location: checkData.location,
      metadata,
      created_by: userId,
      created_at: new Date().toISOString()
    };
    // Insert the inventory record
    const { data: inventoryItem, error } = await supabase
      .from('inventory_items')
      .insert(inventoryItemData)
      .select()
      .single();
    if (error) {
      // Error creating inventory check
      throw error;
    }
    // For initial check, create an initial inventory_history entry
    if (checkData.checkType === 'initial' && inventoryItem && inventoryItem.id) {
      await upsertMonthlyInventoryHistory({
        organization_id: inventoryItem.organization_id,
        inventory_item_id: inventoryItem.id,
        location: inventoryItem.location || '',
        quantity: intakeQuantity,
        check_type: 'initial',
        notes: 'Initial intake quantity',
        status: 'active',
        check_date: new Date(),
      });
    }
    return inventoryItem;
  } catch (error) {
    // Error in createInventoryCheck
    throw error;
  }
};

/**
 * Upsert inventory_history for a given item and month_year
 */
export const upsertMonthlyInventoryHistory = async ({
  organization_id,
  inventory_item_id,
  location,
  quantity,
  check_type = 'periodic',
  notes = '',
  status = 'active',
  check_date = new Date(),
}: {
  organization_id: string;
  inventory_item_id: string;
  location: string;
  quantity: number;
  check_type?: string;
  notes?: string;
  status?: string;
  check_date?: Date;
}) => {
  const month_year = check_date
    ? check_date.toISOString().slice(0, 7)
    : new Date().toISOString().slice(0, 7);
  const event_type = mapCheckTypeToEventType(check_type);
  
  // Get current user
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  // Try to find an existing record for this item/location/month and event_type
  const { data: existing, error: findError } = await supabase
    .from('inventory_history')
    .select('id, quantity')
    .eq('inventory_item_id', inventory_item_id)
    .eq('location', location)
    .eq('month_year', month_year)
    .eq('event_type', event_type)
    .maybeSingle();
  if (findError) {
          // Error finding inventory history
    throw findError;
  }
  if (existing) {
    // Update the quantity (add to existing)
    const updateData = {
      quantity: existing.quantity + quantity,
      notes,
      status,
      created_by: userId,
      check_date: check_date.toISOString(),
    };
    
    // DEBUG: updating inventory history
    
    const { data, error } = await supabase
      .from('inventory_history')
      .update(updateData)
      .eq('id', existing.id)
      .select();
    if (error) {
      // Error updating inventory history
      throw error;
    }
    return data;
  } else {
    // Use database function to bypass Supabase client schema issues
    // Using database function for insert
    
    const { data, error } = await (supabase as any).rpc('insert_inventory_history_simple', {
      organization_id: organization_id,
      inventory_item_id: inventory_item_id,
      check_type: check_type,
      quantity: quantity,
      created_by: userId,
      condition: null,
      notes: notes,
      status: status,
      location: location,
      event_type: event_type,
      response_data: null
    });
    
    if (error) {
      // Error inserting inventory history
      throw error;
    }
    return data;
  }
};

/**
 * Get inventory history for a given item and month_year
 */
export async function getInventoryHistoryForMonth(inventory_item_id: string, month_year: string) {
  const { data, error } = await supabase
    .from('inventory_history')
    .select('*')
    .eq('inventory_item_id', inventory_item_id)
    .eq('month_year', month_year)
    .single();
  if (error && error.code !== 'PGRST116') {
    // Error fetching inventory history for month
    throw error;
  }
  return data;
}

/**
 * Calculate inventory usage for each month.
 * @param intakeValue - The intake value (initial quantity at intake)
 * @param inventoryHistory - Array of { month_year, quantity } sorted by month_year ascending
 * @returns Array of { month_year, usage }
 */
export function calculateInventoryUsage(
  intakeValue: number,
  inventoryHistory: { month_year: string; quantity: number }[]
): { month_year: string; usage: number }[] {
  if (!inventoryHistory || inventoryHistory.length === 0) return [];
  const result: { month_year: string; usage: number }[] = [];
  let prev = intakeValue;
  for (const entry of inventoryHistory) {
    const usage = prev - entry.quantity;
    result.push({ month_year: entry.month_year, usage });
    prev = entry.quantity;
  }
  return result;
}

/**
 * Create a monthly inventory check for an existing inventory item
 * This is the correct function to use for periodic inventory checks, NOT createInventoryItem
 */
export const createMonthlyInventoryCheck = async (
  inventoryItemId: string,
  checkData: {
    quantity: number;
    location?: string;
    notes?: string;
    status?: string;
    check_date?: Date;
    response_data?: any; // Additional form data
  }
): Promise<any> => {
  try {
    // Get inventory item details
    const { data: inventoryItem, error: itemError } = await supabase
      .from('inventory_items')
      .select('organization_id, asset_id, asset_type_id')
      .eq('id', inventoryItemId)
      .single();
      
    if (itemError) {
      // Error fetching inventory item
      throw new Error(`Inventory item with ID ${inventoryItemId} not found.`);
    }
    
    // Get current user
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    
    // Create history record for this month
    const checkDate = checkData.check_date || new Date();
    
    // Use database function to bypass Supabase client schema issues
    const { data: historyRecord, error: historyError } = await (supabase as any).rpc('insert_inventory_history_simple', {
      organization_id: inventoryItem.organization_id,
      inventory_item_id: inventoryItemId,
      check_type: 'periodic',
      quantity: checkData.quantity,
      created_by: userId,
      condition: null,
      notes: checkData.notes || 'Monthly inventory check',
      status: checkData.status || 'active',
      location: checkData.location || '',
      event_type: 'audit',
      response_data: checkData.response_data || null
    });
      
    if (historyError) {
      // Error creating inventory history record
      throw historyError;
    }
    
    // Also update the quantity in the main inventory item
    const { error: quantityError } = await supabase
      .from('inventory_items')
      .update({
        quantity: checkData.quantity,
        location: checkData.location || undefined,
        status: checkData.status || undefined,
        updated_at: new Date().toISOString()
      })
      .eq('id', inventoryItemId);
      
    if (quantityError) {
      // Error updating inventory quantity
    }
    
    return historyRecord;
  } catch (error) {
    // Error creating monthly inventory check
    throw error;
  }
};

/**
 * Create an asset with initial inventory record and form data
 * This function combines asset creation with inventory record creation
 * and processes inventory_actions from the intake form.
 */
export const createAssetAndInitialInventory = async (
  assetData: any, // Contains main asset fields, including potentially a base current_inventory
  assetTypeId: string,
  organizationId: string,
  intakeFormData: { // Data from the dynamic intake form submission
    quantity?: number; // This might be deprecated if all quantity comes from response_data
    location?: string;
    notes?: string;
    status?: string;
    response_data?: any; // Full intake form values { field_id: value, ... }
  },
  intakeFormSchema?: any // The schema of the intake form used { fields: [{id, inventory_action,...}] }
): Promise<any> => {
  // ENTRY POINT: createAssetAndInitialInventory called
  
  try {
    // Get the current user's ID
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    // 1. Create the asset record
    const { data: newAsset, error: assetError } = await supabase
      .from('assets')
      .insert({
        ...assetData, // Spread main asset data first
        asset_type_id: assetTypeId,
        organization_id: organizationId,
        created_by: userId,
        created_at: new Date().toISOString(),
        // Ensure metadata from assetData is preserved, and not clobbered if intakeFormData has metadata too
        metadata: { ...(assetData.metadata || {}), ...(intakeFormData.response_data || {}) } 
      })
      .select()
      .single();

    if (assetError) {
      // Error creating asset
      throw assetError;
    }

    // Calculate the initial quantity based on form actions and response_data
    // Use assetData.current_inventory as a potential base if no 'set' action overrides it.
    // If intakeFormData.quantity is still relevant, it could be the base.
    // For simplicity, let's assume a base of 0 unless an explicit 'set' action or primary quantity field is found.
    let initialQuantity = 0; 
    if (intakeFormSchema && intakeFormData.response_data) {
      const { newQuantity, foundAction } = computeNewInventoryQuantity(
        0, // Start with a base of 0 for dynamic form contributions
        intakeFormSchema,
        intakeFormData.response_data
      );
      if (foundAction) {
        initialQuantity = newQuantity;
      } else {
        // Fallback to intakeFormData.quantity if no actions found, or assetData.current_inventory
        initialQuantity = intakeFormData.quantity !== undefined ? intakeFormData.quantity : (assetData.current_inventory || 0);
      }
    } else {
      // Fallback if no schema or response_data for dynamic form
      initialQuantity = intakeFormData.quantity !== undefined ? intakeFormData.quantity : (assetData.current_inventory || 0);
    }
    
    // 2. Create the initial inventory_items record for this asset
    const { data: inventoryItem, error: inventoryError } = await supabase
      .from('inventory_items')
      .insert({
        name: assetData.name,
        description: assetData.description,
        organization_id: organizationId,
        asset_id: newAsset.id,
        asset_type_id: assetTypeId,
        quantity: initialQuantity, // Use the calculated quantity
        location: intakeFormData.location || assetData.location, // Prioritize intake form location
        status: intakeFormData.status || assetData.status || 'active',
        created_by: userId,
        created_at: new Date().toISOString(),
        // Store a subset of intake form data as metadata on inventory_item if needed,
        // but primary storage is in inventory_history.response_data
        metadata: intakeFormData.response_data ? { ...intakeFormData.response_data } : null 
      })
      .select()
      .single();

    if (inventoryError) {
      // Error creating inventory item
      // Consider if asset should be rolled back or marked as needing attention
      throw inventoryError;
    }
    
    // 3. Create the initial inventory_history record with full form response data
    const now = new Date();
    
    // DEBUG: Log the exact data being inserted
    const historyInsertData = {
      organization_id: organizationId,
      inventory_item_id: inventoryItem.id,
      location: inventoryItem.location || '', // Use location from created inventory item
      quantity: initialQuantity, // Use the calculated quantity
      check_type: 'initial',
      event_type: 'intake',
      notes: intakeFormData.notes || 'Initial intake via dynamic form',
      status: inventoryItem.status || 'active',
      check_date: now.toISOString(),
      month_year: now.toISOString().slice(0, 7),
      created_by: userId,
      created_at: now.toISOString(),
      response_data: intakeFormData.response_data || null // Store all submitted dynamic form values
    };
    
    // DEBUG: About to insert inventory_history record
    
    // Use database function to bypass Supabase client schema issues
    const { data: historyRecord, error: historyError } = await (supabase as any).rpc('insert_inventory_history_simple', {
      organization_id: historyInsertData.organization_id,
      inventory_item_id: historyInsertData.inventory_item_id,
      check_type: historyInsertData.check_type,
      quantity: historyInsertData.quantity,
      created_by: historyInsertData.created_by,
      condition: null,
      notes: historyInsertData.notes,
      status: historyInsertData.status,
      location: historyInsertData.location,
      event_type: historyInsertData.event_type,
      response_data: historyInsertData.response_data
    });
      
    if (historyError) {
      // ERROR creating inventory history record
      // Consider if asset/inventory_item should be rolled back or marked
      throw historyError;
    }

    // 4. Log initial price if cost is available in assetData.metadata
    if (assetData.metadata && typeof assetData.metadata.cost === 'number' && inventoryItem && inventoryItem.id) {
      try {
        await supabase
          .from('inventory_price_history')
          .insert({
            inventory_item_id: inventoryItem.id,
            organization_id: organizationId,
            price: assetData.metadata.cost,
            currency: assetData.metadata.currency || 'USD', // Assuming currency might also be in metadata or default
            effective_date: now.toISOString(),
            created_by: userId,
            notes: 'Initial purchase price from asset creation'
          });
      } catch (priceHistoryError) {
        // Error creating initial inventory price history record
        // Non-fatal, allow asset creation to succeed but log the error
      }
    }
    
    return {
      asset: newAsset,
      inventoryItem: inventoryItem,
      historyRecord: historyRecord
    };
  } catch (error) {
    // Error in createAssetAndInitialInventory
    throw error;
  }
};

/**
 * Get all inventory history for a given inventory item
 */
export async function getAllInventoryHistory(inventory_item_id: string) {
  try {
    const { data, error } = await supabase
      .from('inventory_history')
      .select('*')
      .eq('inventory_item_id', inventory_item_id)
      .order('month_year', { ascending: true });
      
    if (error) {
      // Error fetching all inventory history
      throw error;
    }
    
    return data || [];
  } catch (error) {
    // Error in getAllInventoryHistory
    return [];
  }
}

// Helper to compute new inventory quantity based on inventory_action fields
// This function is now more critical.
// Base quantity can be the current quantity of an item before actions are applied.
function computeNewInventoryQuantity(
  baseQuantity: number, 
  formSchema: any, // { fields: [{id, inventory_action, type}, ...] }
  formValues: any  // { field_id: value, ... }
) {
  let newQuantity = baseQuantity;
  let foundAction = false; // Renamed from 'found' for clarity
  
  if (!formSchema || !formSchema.fields || !formValues) {
    return { newQuantity: baseQuantity, foundAction: false };
  }

  // First, check for any 'set' actions, as they take precedence.
  const setActionField = formSchema.fields.find(
    (field: any) => field.inventory_action === 'set' && typeof formValues[field.id] === 'number'
  );

  if (setActionField) {
    newQuantity = formValues[setActionField.id];
    foundAction = true;
  }

  // Process 'add' and 'subtract' actions
  for (const field of formSchema.fields) {
    const action = field.inventory_action;
    const value = formValues[field.id];

    if (typeof value === 'number') {
      if (action === 'add') {
        if (!setActionField || field.id !== setActionField.id) {
             newQuantity += value;
        }
        foundAction = true;
      } else if (action === 'subtract') {
         if (!setActionField || field.id !== setActionField.id) {
            newQuantity -= value;
         }
        foundAction = true;
      } else if (action === 'set' && field.id !== setActionField?.id) {
        // Multiple 'set' inventory_actions found
      }
    }
  }
  
  if (!foundAction && baseQuantity !== 0 && !setActionField) {
      newQuantity = baseQuantity;
  }

  return { newQuantity, foundAction };
}

// 1. Ensure createAssetAndInitialInventory is only used for initial intake (one inventory_items per asset)
// 2. Add recordNewInventoryCheck: creates a new inventory_history record for periodic checks and updates parent inventory_items
export const recordNewInventoryCheck = async (
  inventoryItemId: string,
  checkData: {
    quantity?: number; // Optional: can be purely driven by form actions
    location?: string;
    notes?: string;
    status?: string;
    check_date?: Date;
    response_data?: any; // Submitted form values
    form_schema?: any;   // Schema of the form used for the check
  }
): Promise<any> => {
  try {
    // Get inventory item details
    const { data: inventoryItem, error: itemError } = await supabase
      .from('inventory_items')
      .select('organization_id, quantity, asset_id, asset_type_id, location, status') // Added location, status
      .eq('id', inventoryItemId)
      .single();
    if (itemError) throw new Error('Inventory item not found for ID: ' + inventoryItemId);
    
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    const checkDate = checkData.check_date || new Date();
    const month_year = checkDate.toISOString().slice(0, 7);

    let finalQuantity = inventoryItem.quantity; // Start with current quantity

    if (checkData.form_schema && checkData.response_data) {
      const { newQuantity, foundAction } = computeNewInventoryQuantity(
        inventoryItem.quantity, // Base is the current quantity of the item
        checkData.form_schema,
        checkData.response_data
      );
      if (foundAction) {
        finalQuantity = newQuantity;
      }
      // If no actions found, and checkData.quantity is provided, use it as an explicit override.
      // Otherwise, finalQuantity remains inventoryItem.quantity (no change from form actions).
      else if (checkData.quantity !== undefined) {
        finalQuantity = checkData.quantity;
      }
    } else if (checkData.quantity !== undefined) {
      // No dynamic form, but an explicit quantity was passed for the check
      finalQuantity = checkData.quantity;
    }

    // Create a new history record for this check
    const { data: historyRecord, error: historyError } = await (supabase as any).rpc('insert_inventory_history_simple', {
      organization_id: inventoryItem.organization_id,
      inventory_item_id: inventoryItemId,
      check_type: 'periodic',
      quantity: finalQuantity,
      created_by: userId,
      condition: null,
      notes: checkData.notes || 'Periodic inventory check',
      status: checkData.status || inventoryItem.status || 'active',
      location: checkData.location || inventoryItem.location || '',
      event_type: 'audit',
      response_data: checkData.response_data || null
    });

    if (historyError) {
      // Error creating inventory history record for check
      throw historyError;
    }

    // Update the main inventory_items record with the new quantity and status
    const { error: updateError } = await supabase
      .from('inventory_items')
      .update({
        quantity: finalQuantity,
        location: historyRecord.location, // Sync location from the history record
        status: historyRecord.status,       // Sync status
        updated_at: new Date().toISOString()
      })
      .eq('id', inventoryItemId);

    if (updateError) {
      // Error updating inventory_items record after check
      // Non-fatal for the history record, but log it.
    }

    return historyRecord;
  } catch (error) {
    // Error in recordNewInventoryCheck
    throw error;
  }
};

// 3. Add updateHistoricalInventoryCheck: edits a history record and recalculates parent state
export const updateHistoricalInventoryCheck = async (
  historyId: string,
  updatedFormData: {
    quantity?: number; // Optional, might be driven by response_data
    location?: string;
    notes?: string;
    status?: string;
    check_date?: Date; // User might be correcting the date of a past check
    response_data?: any;
    form_schema?: any; // Schema of the form originally used, or the one used for editing
  }
): Promise<any> => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    // Get the original history record to access inventory_item_id and old values
    const { data: originalHistory, error: fetchError } = await supabase
      .from('inventory_history')
      .select('*')
      .eq('id', historyId)
      .single();

    if (fetchError || !originalHistory) {
      // Error fetching original history record
      throw new Error('Original history record not found.');
    }

    let newQuantityForHistory = originalHistory.quantity;
    if (updatedFormData.form_schema && updatedFormData.response_data) {
        // To accurately recalculate, we need the quantity *before* this specific historical event.
        // This is complex. For now, let's assume computeNewInventoryQuantity can take a base of 0
        // if the form contains a 'set' action, or it adjusts based on originalHistory.quantity if not.
        // This part needs careful thought on how to properly re-evaluate a point in time.
        // A simpler approach: the form used for editing *must* determine the final quantity.
        const { newQuantity, foundAction } = computeNewInventoryQuantity(
            originalHistory.quantity, // Or a re-fetched quantity before this event
            updatedFormData.form_schema, 
            updatedFormData.response_data
        );
        if (foundAction) {
            newQuantityForHistory = newQuantity;
        } else if (updatedFormData.quantity !== undefined) {
            newQuantityForHistory = updatedFormData.quantity;
        }
    } else if (updatedFormData.quantity !== undefined) {
        newQuantityForHistory = updatedFormData.quantity;
    }

    const checkDate = updatedFormData.check_date || new Date(originalHistory.check_date);
    const month_year = checkDate.toISOString().slice(0, 7);

    // Update the specific inventory_history record
    const { data: updatedHistory, error: updateHistoryError } = await supabase
      .from('inventory_history')
      .update({
        quantity: newQuantityForHistory,
        location: updatedFormData.location || originalHistory.location,
        notes: updatedFormData.notes || originalHistory.notes,
        status: updatedFormData.status || originalHistory.status,
        check_date: checkDate.toISOString(),
        month_year: month_year,
        response_data: updatedFormData.response_data || originalHistory.response_data,
      })
      .eq('id', historyId)
      .select()
      .single();

    if (updateHistoryError) {
      // Error updating inventory history record
      throw updateHistoryError;
    }

    // After updating a historical record, the main inventory_item.quantity might need recalculation.
    // This should be based on the *latest chronological* history entry for that item.
    const { data: latestHistory, error: latestHistoryError } = await supabase
      .from('inventory_history')
      .select('quantity, location, status') // This selects from inventory_history, which is correct
      .eq('inventory_item_id', originalHistory.inventory_item_id)
      .order('check_date', { ascending: false })
      .limit(1)
      .single();

    if (latestHistoryError) {
              // Error fetching latest history record for recalculation
      // Continue, but log that main item quantity might be stale.
    } else if (latestHistory) {
      const { error: updateItemError } = await supabase
        .from('inventory_items')
        .update({
          quantity: latestHistory.quantity,
          location: latestHistory.location, // This should be safe as it comes from latestHistory
          status: latestHistory.status,       // This should be safe as it comes from latestHistory
          updated_at: new Date().toISOString(),
        })
        .eq('id', originalHistory.inventory_item_id);

      if (updateItemError) {
        // Error updating inventory_items after historical edit
      }
    }

    return updatedHistory;
  } catch (error) {
    // Error in updateHistoricalInventoryCheck
    throw error;
  }
}; 