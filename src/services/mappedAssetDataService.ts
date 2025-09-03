import { supabase } from '@/integrations/supabase/client';

export interface AssetDataDefinition {
  id: string;
  organization_id: string;
  field_name: string;
  field_label: string;
  field_type: string;
  data_source: string;
  source_column: string;
  default_value?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Simple in-memory cache with TTL for performance optimization
 */
const assetDataCache = new Map<string, { data: any; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Type-safe value conversion based on field type
 */
const convertValue = (value: any, fieldType: string): any => {
  if (value === null || value === undefined) return null;
  
  switch (fieldType) {
    case 'number':
    case 'currency':
      return Number(value) || 0;
    case 'text':
      return String(value);
    case 'date':
      return value; // Keep as-is, could add date parsing if needed
    default:
      return value;
  }
};

/**
 * Get all asset data definitions for an organization
 */
export const getAssetDataDefinitions = async (organizationId: string): Promise<AssetDataDefinition[]> => {
  try {
    const { data, error } = await supabase
      .from('mapped_asset_data_definitions')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('field_label');

    if (error) {
      console.error('Error fetching asset data definitions:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getAssetDataDefinitions:', error);
    return [];
  }
};

/**
 * Fetch actual asset data values for a specific asset with bulletproof error handling
 */
export const getAssetDataValues = async (
  assetId: string, 
  organizationId: string
): Promise<Record<string, any>> => {
  try {
    // 1. Get active definitions for this org
    const definitions = await getAssetDataDefinitions(organizationId);

    if (!definitions.length) {
      console.log('No asset data definitions found for organization:', organizationId);
      return {};
    }

    // 2. Initialize result object
    const assetDataValues: Record<string, any> = {};
    
    // 3. Group by data source for efficient batching
    const inventoryFields = definitions.filter(d => d.data_source === 'inventory_items');
    const assetFields = definitions.filter(d => d.data_source === 'assets');
    const formSubmissionFields = definitions.filter(d => d.data_source === 'form_submissions');

    // 4. Fetch inventory data (if needed)
    if (inventoryFields.length > 0) {
      try {
        const columns = inventoryFields.map(f => f.source_column).join(', ');
        const { data: inventoryData, error: inventoryError } = await supabase
          .from('inventory_items')
          .select(columns)
          .eq('asset_id', assetId)
          .eq('organization_id', organizationId)
          .single();

        if (inventoryError) {
          console.warn('Error fetching inventory data for asset:', assetId, inventoryError);
          // Use default values for inventory fields
          inventoryFields.forEach(field => {
            assetDataValues[field.field_name] = convertValue(field.default_value, field.field_type);
          });
        } else {
          inventoryFields.forEach(field => {
            const value = inventoryData?.[field.source_column] ?? field.default_value ?? null;
            assetDataValues[field.field_name] = convertValue(value, field.field_type);
          });
        }
      } catch (error) {
        console.error('Error processing inventory fields:', error);
        // Graceful fallback - use default values
        inventoryFields.forEach(field => {
          assetDataValues[field.field_name] = convertValue(field.default_value, field.field_type);
        });
      }
    }

    // 5. Fetch asset data (if needed)
    if (assetFields.length > 0) {
      try {
        const columns = assetFields.map(f => f.source_column).join(', ');
        const { data: assetData, error: assetError } = await supabase
          .from('assets')
          .select(columns)
          .eq('id', assetId)
          .eq('organization_id', organizationId)
          .single();

        if (assetError) {
          console.warn('Error fetching asset data for asset:', assetId, assetError);
          // Use default values for asset fields
          assetFields.forEach(field => {
            assetDataValues[field.field_name] = convertValue(field.default_value, field.field_type);
          });
        } else {
          assetFields.forEach(field => {
            const value = assetData?.[field.source_column] ?? field.default_value ?? null;
            assetDataValues[field.field_name] = convertValue(value, field.field_type);
          });
        }
      } catch (error) {
        console.error('Error processing asset fields:', error);
        // Graceful fallback - use default values
        assetFields.forEach(field => {
          assetDataValues[field.field_name] = convertValue(field.default_value, field.field_type);
        });
      }
    }

    // 6. Fetch form submission data (if needed) - SPECIAL HANDLING for last month totals
    if (formSubmissionFields.length > 0) {
      try {
        await Promise.all(formSubmissionFields.map(async field => {
          if (field.field_name === 'last_month_total') {
            const lastMonthTotal = await getLastMonthTotal(assetId, organizationId);
            assetDataValues[field.field_name] = lastMonthTotal;
            console.log(`📊 FIXED: Last month total for asset ${assetId}: ${lastMonthTotal} (excludes current month)`);
          } else {
            // Future form submission fields can be added here
            assetDataValues[field.field_name] = convertValue(field.default_value, field.field_type);
          }
        }));
      } catch (error) {
        console.error('Error processing form submission fields:', error);
        // Graceful fallback - use default values
        formSubmissionFields.forEach(field => {
          assetDataValues[field.field_name] = convertValue(field.default_value, field.field_type);
        });
      }
    }

    console.log('Resolved asset data values for asset', assetId, ':', assetDataValues);
    return assetDataValues;

  } catch (error) {
    console.error('Error in getAssetDataValues:', error);
    return {}; // Graceful degradation - form still works without mapped data
  }
};

/**
 * Cached version of getAssetDataValues for performance
 * ENHANCED: Cache now includes month detection for proper invalidation
 */
export const getCachedAssetDataValues = async (
  assetId: string, 
  organizationId: string
): Promise<Record<string, any>> => {
  const cacheKey = `${organizationId}:${assetId}`;
  const cached = assetDataCache.get(cacheKey);
  
  // Check if cache is valid and hasn't crossed month boundary
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  if (cached && cached.expires > Date.now()) {
    // Additional check: invalidate cache if we've moved to a new month
    // This ensures last_month_total updates when month changes
    const cacheTime = new Date(cached.expires - CACHE_TTL);
    const cacheMonth = cacheTime.getMonth();
    const cacheYear = cacheTime.getFullYear();
    
    if (cacheYear === currentYear && cacheMonth === currentMonth) {
      console.log('Returning cached asset data for:', cacheKey);
      return cached.data;
    } else {
      console.log('🗓️ Month boundary crossed - invalidating cache for:', cacheKey);
    }
  }
  
  const data = await getAssetDataValues(assetId, organizationId);
  assetDataCache.set(cacheKey, { data, expires: Date.now() + CACHE_TTL });
  
  return data;
};

/**
 * Clear cache for a specific asset (useful when asset data is updated)
 */
export const clearAssetDataCache = (assetId: string, organizationId: string): void => {
  const cacheKey = `${organizationId}:${assetId}`;
  assetDataCache.delete(cacheKey);
  console.log('Cleared asset data cache for:', cacheKey);
};

/**
 * Clear all cached asset data (useful for testing or memory management)
 */
export const clearAllAssetDataCache = (): void => {
  assetDataCache.clear();
  console.log('Cleared all asset data cache');
};

/**
 * Get the total gallons from last month's submission for an asset
 * Handles gracefully when no submission exists (returns 0)
 * FIXED: Only looks at PREVIOUS calendar month, never current month
 */
const getLastMonthTotal = async (assetId: string, organizationId: string): Promise<number> => {
  try {
    // Calculate PREVIOUS month date range (never includes current month)
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-based (0=Jan, 8=Sep)
    
    // Calculate previous month and year
    let previousMonth = currentMonth - 1;
    let previousYear = currentYear;
    
    // Handle year rollover (if current month is January)
    if (previousMonth < 0) {
      previousMonth = 11; // December
      previousYear = currentYear - 1;
    }
    
    // Create exact date boundaries for PREVIOUS month only
    const firstDayPreviousMonth = new Date(previousYear, previousMonth, 1);
    const lastDayPreviousMonth = new Date(previousYear, previousMonth + 1, 0, 23, 59, 59, 999);
    
    console.log(`📅 STRICT PREVIOUS MONTH ONLY: ${firstDayPreviousMonth.toISOString()} to ${lastDayPreviousMonth.toISOString()}`);
    console.log(`📅 Current month: ${currentYear}-${currentMonth + 1}, Previous month: ${previousYear}-${previousMonth + 1}`);

    // Find ONLY previous month's form submission for this asset
    const { data: submissions, error } = await supabase
      .from('form_submissions')
      .select('submission_data, created_at')
      .eq('asset_id', assetId)
      .eq('organization_id', organizationId)
      .gte('created_at', firstDayPreviousMonth.toISOString())
      .lte('created_at', lastDayPreviousMonth.toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.warn('Error fetching last month submission:', error);
      return 0;
    }

    if (!submissions || submissions.length === 0) {
      console.log('📊 No submission found for previous month, returning 0');
      return 0;
    }

    const submission = submissions[0];
    const submissionData = submission.submission_data || {};
    
    // SAFETY CHECK: Ensure we never accidentally use current month data
    const submissionDate = new Date(submission.created_at);
    const submissionMonth = submissionDate.getMonth();
    const submissionYear = submissionDate.getFullYear();
    
    if (submissionYear === currentYear && submissionMonth === currentMonth) {
      console.warn('🚨 SAFETY CHECK: Found current month data in previous month query - ignoring!');
      return 0;
    }
    
    console.log(`📊 Found valid previous month submission from ${submission.created_at}`);

    // Look for the total field - try multiple strategies
    let totalValue = 0;

    // Strategy 1: Look for field_13 (known total field from form)
    if (submissionData.field_13 !== undefined) {
      totalValue = Number(submissionData.field_13) || 0;
      console.log(`📊 Found field_13 in last month submission: ${totalValue}`);
    } 
    // Strategy 2: Look for common total field patterns
    else {
      const totalField = Object.keys(submissionData).find(key => {
        const lowerKey = key.toLowerCase();
        return lowerKey.includes('total') || 
               lowerKey.includes('ending') || 
               lowerKey.includes('balance') ||
               (lowerKey.includes('gallons') && lowerKey.includes('total'));
      });
      
      if (totalField) {
        totalValue = Number(submissionData[totalField]) || 0;
        console.log(`📊 Found total field '${totalField}' in last month submission: ${totalValue}`);
      } else {
        console.log('📊 No recognizable total field found in last month submission, returning 0');
      }
    }

    return totalValue;

  } catch (error) {
    console.error('Error in getLastMonthTotal:', error);
    return 0; // Graceful fallback
  }
};

/**
 * Admin function to create a new asset data definition
 */
export const createAssetDataDefinition = async (
  definition: Omit<AssetDataDefinition, 'id' | 'created_at' | 'updated_at'>
): Promise<AssetDataDefinition | null> => {
  try {
    const { data, error } = await supabase
      .from('mapped_asset_data_definitions')
      .insert([definition])
      .select()
      .single();

    if (error) {
      console.error('Error creating asset data definition:', error);
      return null;
    }

    // Clear cache since definitions have changed
    assetDataCache.clear();
    
    return data;
  } catch (error) {
    console.error('Error in createAssetDataDefinition:', error);
    return null;
  }
};

/**
 * Admin function to update an asset data definition
 */
export const updateAssetDataDefinition = async (
  id: string,
  updates: Partial<AssetDataDefinition>
): Promise<AssetDataDefinition | null> => {
  try {
    const { data, error } = await supabase
      .from('mapped_asset_data_definitions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating asset data definition:', error);
      return null;
    }

    // Clear cache since definitions have changed
    assetDataCache.clear();
    
    return data;
  } catch (error) {
    console.error('Error in updateAssetDataDefinition:', error);
    return null;
  }
};

/**
 * Admin function to delete an asset data definition
 */
export const deleteAssetDataDefinition = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('mapped_asset_data_definitions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting asset data definition:', error);
      return false;
    }

    // Clear cache since definitions have changed
    assetDataCache.clear();
    
    return true;
  } catch (error) {
    console.error('Error in deleteAssetDataDefinition:', error);
    return false;
  }
};
