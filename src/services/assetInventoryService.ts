/**
 * Asset-Centric Inventory Service
 * 
 * This service implements the clean asset-centric model where:
 * - Everything starts with asset_id
 * - 1:1 relationship between assets and inventory
 * - Consistent navigation patterns
 * - Unified data access
 */

import { supabase } from '@/integrations/supabase/client';
import { getOrganizationForms } from './formService'; 
import { getCorrectionsByHistoryIds } from './inventoryCorrectionService';

// Clean interfaces for the new model
export interface AssetWithInventory {
  asset_id: string;
  asset_name: string;
  asset_description: string | null;
  asset_status: string | null;
  asset_location: string | null;
  asset_type_id: string | null;
  asset_type_name: string | null;
  asset_type_color?: string | null;
  has_inventory: boolean;
  inventory_item_id: string | null;
  current_quantity: number;
  last_check_date: string | null;
  inventory_status: string | null;
  created_at?: string | null;
}

export interface InventoryCheckData {
  quantity: number;
  location?: string;
  notes?: string;
  status?: string;
  condition?: string;
  response_data?: Record<string, any>;
  form_schema?: any;
}

/**
 * Get a single asset with its inventory status
 * This is the primary function for asset-based operations
 */
export const getAssetWithInventory = async (assetId: string): Promise<AssetWithInventory | null> => {
  try {
    const { data, error } = await supabase.rpc('get_asset_with_inventory_status', {
      p_asset_id: assetId
    });

    if (error) {
      console.error('Error fetching asset with inventory:', error);
      throw error;
    }

    return data?.[0] || null;
  } catch (error) {
    console.error('Failed to get asset with inventory:', error);
    return null;
  }
};

/**
 * Get all assets with inventory status for an organization
 * This replaces the old getInventoryItems function
 */
export const getOrganizationAssetsWithInventory = async (
  organizationId: string
): Promise<AssetWithInventory[]> => {
  try {
    const { data, error } = await supabase.rpc('get_organization_assets_with_inventory', {
      p_organization_id: organizationId
    });

    if (error) {
      console.error('Error fetching organization assets with inventory:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Failed to get organization assets with inventory:', error);
    return [];
  }
};

/**
 * Create inventory for an asset (if it doesn't exist)
 * This ensures every asset has exactly one inventory record
 */
export const createInventoryForAsset = async (
  assetId: string,
  initialData: {
    quantity?: number;
    location?: string;
    status?: string;
    notes?: string;
  } = {}
): Promise<{ success: boolean; inventory_item_id?: string; message?: string }> => {
  try {
    // Get current user
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    // Get asset details
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .select('id, name, description, organization_id, asset_type_id, status')
      .eq('id', assetId)
      .single();

    if (assetError || !asset) {
      return { success: false, message: 'Asset not found' };
    }

    // Check if inventory already exists
    const { data: existingInventory } = await supabase
      .from('inventory_items')
      .select('id')
      .eq('asset_id', assetId)
      .eq('is_deleted', false)
      .maybeSingle();

    if (existingInventory) {
      return { 
        success: false, 
        message: 'Inventory already exists for this asset',
        inventory_item_id: existingInventory.id
      };
    }

    // Create inventory record
    const { data: inventoryItem, error: inventoryError } = await supabase
      .from('inventory_items')
      .insert({
        name: asset.name,
        description: asset.description,
        organization_id: asset.organization_id,
        asset_id: asset.id,
        asset_type_id: asset.asset_type_id,
        quantity: initialData.quantity || 0,
        location: initialData.location || '',
        status: initialData.status || asset.status || 'active',
        created_by: userId,
      })
      .select()
      .single();

    if (inventoryError) {
      console.error('Error creating inventory:', inventoryError);
      return { success: false, message: inventoryError.message };
    }

    // Create initial history record using the simple function
    await supabase.rpc('insert_inventory_history_simple', {
      organization_id: asset.organization_id,
      inventory_item_id: inventoryItem.id,
      check_type: 'initial',
      quantity: initialData.quantity || 0,
      created_by: userId,
      condition: null,
      notes: initialData.notes || 'Initial inventory setup',
      status: inventoryItem.status,
      location: inventoryItem.location,
      event_type: 'intake',
      response_data: null
    });

    return { 
      success: true, 
      inventory_item_id: inventoryItem.id,
      message: 'Inventory created successfully'
    };

  } catch (error) {
    console.error('Failed to create inventory for asset:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Record an inventory check for an asset
 * This handles both new inventory creation and existing inventory updates
 */
export const recordAssetInventoryCheck = async (
  assetId: string,
  checkData: InventoryCheckData
): Promise<{ success: boolean; message: string; data?: any }> => {
  try {
    // Get asset with current inventory status
    const assetWithInventory = await getAssetWithInventory(assetId);
    
    if (!assetWithInventory) {
      return { success: false, message: 'Asset not found' };
    }

    let inventoryItemId = assetWithInventory.inventory_item_id;

    // Create inventory if it doesn't exist
    if (!assetWithInventory.has_inventory) {
      const createResult = await createInventoryForAsset(assetId, {
        quantity: checkData.quantity,
        location: checkData.location,
        status: checkData.status,
        notes: checkData.notes
      });

      if (!createResult.success) {
        return { success: false, message: createResult.message || 'Failed to create inventory' };
      }

      inventoryItemId = createResult.inventory_item_id!;
    }

    // Get current user
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    // Calculate final quantity based on form actions if schema provided
    let finalQuantity = checkData.quantity;
    let calculatedFormValues = checkData.response_data;
    
    if (checkData.form_schema && checkData.response_data) {
      try {
        // Use database calculation for superior performance and accuracy
        const { data: formCalculationResult, error: calcError } = await supabase.rpc('calculate_form_formulas', {
          p_form_schema: checkData.form_schema,
          p_submission_data: checkData.response_data
        });
        
        if (calcError) {
          console.warn('Database formula calculation failed, using original values:', calcError);
        } else if (formCalculationResult) {
          // Merge calculated values with original form data
          calculatedFormValues = { ...checkData.response_data, ...formCalculationResult };
          console.log('Database calculated formula values:', formCalculationResult);
        }
      } catch (error) {
        console.warn('Error calling database formula calculation:', error);
      }
      
      // Now process inventory actions using calculated values
      const { newQuantity, foundAction } = await computeInventoryQuantity(
        assetWithInventory.current_quantity,
        checkData.form_schema,
        calculatedFormValues, // Use calculated values instead of raw values
        {} // Asset metadata not needed since formulas are pre-calculated
      );
      
      if (foundAction) {
        finalQuantity = newQuantity;
      }
    }

    // Get organization_id from the asset
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .select('organization_id')
      .eq('id', assetId)
      .single();

    if (assetError || !asset) {
      return { success: false, message: 'Failed to get asset organization' };
    }

    // Record the check using our simple function
    const { data: historyRecord, error: historyError } = await supabase.rpc('insert_inventory_history_simple', {
      organization_id: asset.organization_id,
      inventory_item_id: inventoryItemId,
      check_type: 'periodic',
      quantity: finalQuantity,
      created_by: userId,
      condition: checkData.condition || null,
      notes: checkData.notes || 'Asset inventory check',
      status: checkData.status || assetWithInventory.inventory_status || 'active',
      location: checkData.location || assetWithInventory.asset_location || '',
      event_type: 'audit',
      response_data: calculatedFormValues || null
    });

    if (historyError) {
      console.error('Error recording inventory check:', historyError);
      return { success: false, message: historyError.message };
    }

    // Update the inventory item with new values
    const { error: updateError } = await supabase
      .from('inventory_items')
      .update({
        quantity: finalQuantity,
        location: checkData.location,
        status: checkData.status,
        updated_at: new Date().toISOString()
      })
      .eq('id', inventoryItemId);

    if (updateError) {
      console.warn('Error updating inventory item:', updateError);
      // Non-fatal - history is recorded, just item sync failed
    }

    return { 
      success: true, 
      message: 'Inventory check recorded successfully',
      data: historyRecord
    };

  } catch (error) {
    console.error('Failed to record asset inventory check:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Get complete inventory history for an asset with anomaly detection
 * This preserves all the rich functionality from the original InventoryHistory component
 */
export const getAssetInventoryHistory = async (assetId: string) => {
  try {
    const assetWithInventory = await getAssetWithInventory(assetId);
    
    if (!assetWithInventory?.inventory_item_id) {
      return []; // No inventory = no history
    }

    // Use the same query structure as the original InventoryHistory component
    const { data, error } = await supabase
      .from('inventory_history')
      .select(`
        *,
        inventory_item:inventory_items!inner(
          id,
          name,
          asset:assets!inner(
            id,
            name,
            organization_id,
            asset_type:asset_types(
              id, 
              name,
              intake_form_id,
              inventory_form_id
            )
          )
        )
      `)
      .eq('inventory_item_id', assetWithInventory.inventory_item_id)
      .eq('is_deleted', false)
      .order('check_date', { ascending: false });

    if (error) {
      console.error('Error fetching asset inventory history:', error);
      throw error;
    }

    const historyData = data || [];
    const historyIds = historyData.map(event => event.id);

    // Fetch all corrections in a single query
    const corrections = await getCorrectionsByHistoryIds(historyIds);
    const correctionsMap = new Map<string, any[]>();
    corrections.forEach(correction => {
      const historyId = correction.original_history_id;
      if (!correctionsMap.has(historyId)) {
        correctionsMap.set(historyId, []);
      }
      correctionsMap.get(historyId)!.push(correction);
    });

    // Enrich data with anomaly detection and corrections
    const enrichedHistory = historyData.map(event => {
      const eventCorrections = correctionsMap.get(event.id) || [];
      
      // Detect anomalies based on quantity changes
      const hasLargeQuantityChange = event.response_data?._previous_quantity && 
        Math.abs(event.quantity - event.response_data._previous_quantity) > 100;
      
      const hasManualFix = event.response_data?.fix_applied;
      const isEdited = event.edit_history && event.edit_history.length > 0;
      const needsValidation = event.validation_status === 'pending';
      
      return {
        ...event,
        corrections: eventCorrections,
        has_corrections: eventCorrections.length > 0,
        // Anomaly flags
        hasAnomaly: hasLargeQuantityChange || hasManualFix || needsValidation,
        anomalyType: hasLargeQuantityChange ? 'large_change' : 
                    hasManualFix ? 'manual_fix' : 
                    needsValidation ? 'needs_validation' : null,
        isEdited,
        // User info (handle both old and new user reference patterns)
        created_by_name: event.inventory_item?.asset?.organization_id ? 
          'Organization User' : 'Unknown User' // We'll enhance this
      };
    });

    return enrichedHistory;
  } catch (error) {
    console.error('Failed to get asset inventory history:', error);
    return [];
  }
};

/**
 * Helper function to compute inventory quantity based on form actions
 * Moved from inventoryService.ts for consistency
 */
async function computeInventoryQuantity(
  baseQuantity: number,
  formSchema: any,
  formValues: any,
  assetMetadata: any = {} // Asset metadata for formula calculations
): Promise<{ newQuantity: number; foundAction: boolean }> {
  let newQuantity = baseQuantity;
  let foundAction = false;
  
  if (!formSchema?.fields || !formValues) {
    return { newQuantity: baseQuantity, foundAction: false };
  }

  // CRITICAL FIX: Evaluate formula fields using asset metadata before processing inventory actions
  // This ensures calculated fields that reference asset data are properly evaluated
  const evaluatedFormValues = { ...formValues };
  
  // Create mapped fields context for asset data (same as frontend)
  const mappedFields: Record<string, any> = {};
  if (assetMetadata && typeof assetMetadata === 'object') {
    Object.entries(assetMetadata).forEach(([key, value]) => {
      mappedFields[`mapped.${key}`] = Number(value) || 0;
    });
  }
  
  // CRITICAL FIX: Also need to resolve conversion field names from asset type
  // Asset metadata might have field_1, field_2, etc. but formulas reference actual field names
  if (assetMetadata && assetMetadata.asset_id) {
    try {
      // Get asset details to find asset_type_id
      // Use the already imported supabase instance
      const { data: asset } = await supabase
        .from('assets')
        .select('asset_type_id')
        .eq('id', assetMetadata.asset_id)
        .single();
      
      if (asset?.asset_type_id) {
        // Fetch asset type conversion fields to map field names properly
        const { data: assetType } = await supabase
          .from('asset_types')
          .select('conversion_fields')
          .eq('id', asset.asset_type_id)
          .single();
        
        if (assetType?.conversion_fields && Array.isArray(assetType.conversion_fields)) {
          console.log('🔧 AssetInventory - Found conversion fields:', assetType.conversion_fields);
          
          // Use for...of instead of forEach to handle async properly
          for (let index = 0; index < assetType.conversion_fields.length; index++) {
            const conversionField = assetType.conversion_fields[index];
            
            // Try multiple approaches to find the value:
            
            // 1. Direct field name match (preferred)
            if (conversionField.field_name && assetMetadata[conversionField.field_name] !== undefined) {
              mappedFields[`mapped.${conversionField.field_name}`] = Number(assetMetadata[conversionField.field_name]) || 0;
              console.log(`✅ AssetInventory - Direct mapped ${conversionField.field_name} = ${assetMetadata[conversionField.field_name]}`);
              continue;
            }
            
            // 2. Try with convert_ prefix
            const convertFieldName = `convert_${conversionField.field_name}`;
            if (assetMetadata[convertFieldName] !== undefined) {
              mappedFields[`mapped.${conversionField.field_name}`] = Number(assetMetadata[convertFieldName]) || 0;
              console.log(`✅ AssetInventory - Convert prefix mapped ${conversionField.field_name} = ${assetMetadata[convertFieldName]}`);
              continue;
            }
            
            // 3. Try generic field names (field_1, field_2, etc.) based on index or ID
            const genericFieldName = `field_${index + 1}`;
            if (assetMetadata[genericFieldName] !== undefined) {
              mappedFields[`mapped.${conversionField.field_name}`] = Number(assetMetadata[genericFieldName]) || 0;
              console.log(`✅ AssetInventory - Generic field mapped ${conversionField.field_name} from ${genericFieldName} = ${assetMetadata[genericFieldName]}`);
              continue;
            }
            
            // 4. Try using the conversion field ID if it exists
            if (conversionField.id && assetMetadata[conversionField.id] !== undefined) {
              mappedFields[`mapped.${conversionField.field_name}`] = Number(assetMetadata[conversionField.id]) || 0;
              console.log(`✅ AssetInventory - ID mapped ${conversionField.field_name} from ${conversionField.id} = ${assetMetadata[conversionField.id]}`);
              continue;
            }
            
            console.log(`❌ AssetInventory - Could not find value for conversion field ${conversionField.field_name}`);
          }
        }
      }
    } catch (error) {
      console.error('AssetInventory - Error loading asset type conversion fields for backend formula evaluation:', error);
    }
  }
  
  // DEBUG: Log what we're working with
  console.log('🔍 AssetInventory Backend Formula Debug:');
  console.log('- Asset metadata:', assetMetadata);
  console.log('- Mapped fields created:', mappedFields);
  console.log('- Form values:', formValues);
  
  // NOTE: Formula evaluation now handled by frontend (real-time) and database (server-side)
  // This eliminates duplicate calculation logic and import errors

  // Check for 'set' actions first (they override everything)
  const setField = formSchema.fields.find(
    (field: any) => field.inventory_action === 'set' && typeof evaluatedFormValues[field.id] === 'number'
  );

  if (setField) {
    newQuantity = evaluatedFormValues[setField.id];
    foundAction = true;
  } else {
    // Process add/subtract actions
    for (const field of formSchema.fields) {
      const action = field.inventory_action;
      const value = evaluatedFormValues[field.id];

      if (typeof value === 'number') {
        if (action === 'add') {
          newQuantity += value;
          foundAction = true;
        } else if (action === 'subtract') {
          newQuantity -= value;
          foundAction = true;
        }
      }
    }
  }

  return { newQuantity, foundAction };
}

/**
 * Delete inventory for an asset (soft delete)
 */
export const deleteAssetInventory = async (assetId: string): Promise<{ success: boolean; message: string }> => {
  try {
    const assetWithInventory = await getAssetWithInventory(assetId);
    
    if (!assetWithInventory?.inventory_item_id) {
      return { success: false, message: 'No inventory found for this asset' };
    }

    // Soft delete the inventory item
    const { error } = await supabase
      .from('inventory_items')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString()
      })
      .eq('id', assetWithInventory.inventory_item_id);

    if (error) {
      console.error('Error deleting inventory:', error);
      return { success: false, message: error.message };
    }

    return { success: true, message: 'Inventory deleted successfully' };
  } catch (error) {
    console.error('Failed to delete asset inventory:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Get inventory statistics for organization
 * Uses the optimized RPC function for better performance
 */
export const getInventoryStats = async (organizationId: string) => {
  try {
    const { data, error } = await supabase.rpc('get_inventory_stats', {
      org_id: organizationId
    });

    if (error) {
      console.error('Error fetching inventory stats:', error);
      throw error;
    }

    return {
      totalAssets: data.totalAssets,
      assetsWithInventory: data.assetsWithInventory,
      lowStockItems: data.lowStockItems,
      outOfStockItems: data.outOfStockItems,
      totalItems: data.totalItems,
      inventoryPercentage: data.inventoryPercentage
    };
  } catch (error) {
    console.error('Failed to get inventory stats:', error);
    return {
      totalAssets: 0,
      assetsWithInventory: 0,
      lowStockItems: 0,
      outOfStockItems: 0,
      totalItems: 0,
      inventoryPercentage: 0
    };
  }
};
