import { supabase } from '@/integrations/supabase/client';

export interface InventoryFixRequest {
  eventId: string;
  newQuantity: number;
  reason: string;
  confidence?: number;
  fixType: 'auto' | 'manual' | 'verified';
}

export interface InventoryFixResponse {
  success: boolean;
  message: string;
  updatedEvent?: any;
  rollbackData?: any;
}

/**
 * Apply a fix to an inventory history record
 */
export const applyInventoryFix = async (
  inventoryItemId: string, 
  fixRequest: InventoryFixRequest
): Promise<InventoryFixResponse> => {
  try {
    const { eventId, newQuantity, reason, confidence, fixType } = fixRequest;
    
    // Get the current event
    const { data: currentEvent, error: fetchError } = await supabase
      .from('inventory_history')
      .select('*')
      .eq('id', eventId)
      .single();
      
    if (fetchError || !currentEvent) {
      return {
        success: false,
        message: 'Failed to find inventory event'
      };
    }
    
    // Store rollback data
    const rollbackData = {
      originalQuantity: currentEvent.quantity,
      originalNotes: currentEvent.notes,
      originalResponseData: currentEvent.response_data
    };
    
    // Prepare updated data
    const updatedNotes = `${currentEvent.notes || ''}\n\n[${fixType.toUpperCase()} FIX APPLIED] ${reason}${confidence ? ` (${confidence}% confidence)` : ''}`;
    const updatedResponseData = {
      ...currentEvent.response_data,
      fix_applied: {
        timestamp: new Date().toISOString(),
        original_quantity: currentEvent.quantity,
        new_quantity: newQuantity,
        reason,
        fix_type: fixType,
        confidence
      }
    };
    
    // Update the inventory history record
    const { data: updatedEvent, error: updateError } = await supabase
      .from('inventory_history')
      .update({
        quantity: newQuantity,
        notes: updatedNotes,
        response_data: updatedResponseData,
      })
      .eq('id', eventId)
      .select()
      .single();
      
    if (updateError) {
      return {
        success: false,
        message: `Failed to update inventory record: ${updateError.message}`
      };
    }
    
    // Update the main inventory item if this was the most recent event
    const { data: allEvents, error: eventsError } = await supabase
      .from('inventory_history')
      .select('quantity, check_date')
      .eq('inventory_item_id', inventoryItemId)
      .order('check_date', { ascending: false })
      .limit(1);
      
    if (!eventsError && allEvents && allEvents[0]) {
      const mostRecentQuantity = allEvents[0].quantity;
      
      // Update the inventory item current quantity
      await supabase
        .from('inventory_items')
        .update({ quantity: mostRecentQuantity })
        .eq('id', inventoryItemId);
    }
    
    return {
      success: true,
      message: `Inventory fix applied successfully. Updated quantity from ${currentEvent.quantity} to ${newQuantity} units.`,
      updatedEvent,
      rollbackData
    };
    
  } catch (error) {
    console.error('Error applying inventory fix:', error);
    return {
      success: false,
      message: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

/**
 * Mark an inventory event as verified (no anomaly)
 * Uses database function to bypass client-side schema issues
 */
export const markEventAsVerified = async (eventId: string): Promise<InventoryFixResponse> => {
  try {
    // Use bulletproof database function instead of client update
    const { data, error } = await supabase.rpc('mark_inventory_event_verified', {
      p_event_id: eventId
    });
    
    if (error) {
      console.error('Database function error:', error);
      return {
        success: false,
        message: `Database error: ${error.message}`
      };
    }
    
    // The function returns the result directly
    if (data && typeof data === 'object') {
      return {
        success: data.success || false,
        message: data.message || 'Unknown response'
      };
    }
    
    // Fallback if data format is unexpected
    return {
      success: true,
      message: 'Event verified successfully'
    };
    
  } catch (error) {
    console.error('Error verifying event:', error);
    return {
      success: false,
      message: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

/**
 * Rollback a previously applied fix
 */
export const rollbackInventoryFix = async (
  inventoryItemId: string,
  eventId: string,
  rollbackData: any
): Promise<InventoryFixResponse> => {
  try {
    // Restore original data
    const { data: restoredEvent, error: rollbackError } = await supabase
      .from('inventory_history')
      .update({
        quantity: rollbackData.originalQuantity,
        notes: rollbackData.originalNotes,
        response_data: rollbackData.originalResponseData,
      })
      .eq('id', eventId)
      .select()
      .single();
      
    if (rollbackError) {
      return {
        success: false,
        message: `Failed to rollback fix: ${rollbackError.message}`
      };
    }
    
    // Update inventory item quantity if needed
    const { data: allEvents, error: eventsError } = await supabase
      .from('inventory_history')
      .select('quantity, check_date')
      .eq('inventory_item_id', inventoryItemId)
      .order('check_date', { ascending: false })
      .limit(1);
      
    if (!eventsError && allEvents && allEvents[0]) {
      await supabase
        .from('inventory_items')
        .update({ quantity: allEvents[0].quantity })
        .eq('id', inventoryItemId);
    }
    
    return {
      success: true,
      message: 'Fix rolled back successfully',
      updatedEvent: restoredEvent
    };
    
  } catch (error) {
    console.error('Error rolling back fix:', error);
    return {
      success: false,
      message: `Rollback failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}; 