import { supabase } from '@/integrations/supabase/client';

export interface CalculationResult {
  success: boolean;
  newQuantity: number;
  changes: InventoryChange[];
  errors: string[];
  warnings: string[];
  metadata: Record<string, any>;
}

export interface InventoryChange {
  field: string;
  action: 'set' | 'add' | 'subtract';
  value: number;
  previousValue?: number;
  description: string;
  formula?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

/**
 * Enhanced inventory calculation service with improved validation and audit trails
 */
export class InventoryCalculationService {
  
  /**
   * Calculate new inventory quantity with comprehensive validation
   */
  static async calculateInventoryChanges(
    currentQuantity: number,
    formSchema: any,
    formData: Record<string, any>,
    assetMetadata: Record<string, any> = {},
    previousHistory?: any[]
  ): Promise<CalculationResult> {
    const result: CalculationResult = {
      success: false,
      newQuantity: currentQuantity,
      changes: [],
      errors: [],
      warnings: [],
      metadata: {}
    };

    try {
      if (!formSchema?.fields) {
        result.errors.push('Invalid form schema: no fields found');
        return result;
      }

      // Step 1: Validate form data against schema
      const validation = this.validateFormData(formData, formSchema.fields);
      result.errors.push(...validation.errors);
      result.warnings.push(...validation.warnings);

      if (!validation.isValid) {
        return result;
      }

      // Step 2: Process inventory actions in priority order
      const inventoryFields = formSchema.fields.filter(
        (field: any) => field.inventory_action && field.inventory_action !== 'none'
      );

      // Priority 1: SET actions (override everything)
      const setFields = inventoryFields.filter((field: any) => field.inventory_action === 'set');
      if (setFields.length > 0) {
        const setField = setFields[0]; // Use first SET field found
        const setValue = this.parseNumericValue(formData[setField.id]);
        
        if (setValue !== null) {
          const change: InventoryChange = {
            field: setField.label || setField.id,
            action: 'set',
            value: setValue,
            previousValue: currentQuantity,
            description: `Stock count set to ${setValue} (was ${currentQuantity})`,
            formula: setField.formula
          };
          
          result.changes.push(change);
          result.newQuantity = setValue;
          
          // Add usage calculation
          const difference = currentQuantity - setValue;
          if (difference > 0) {
            change.description += `. ${difference} units used/consumed`;
          } else if (difference < 0) {
            change.description += `. ${Math.abs(difference)} units added`;
          }
        }
      } else {
        // Priority 2: ADD/SUBTRACT actions
        let runningQuantity = currentQuantity;
        
        for (const field of inventoryFields) {
          const value = this.parseNumericValue(formData[field.id]);
          if (value !== null && value !== 0) {
            const change: InventoryChange = {
              field: field.label || field.id,
              action: field.inventory_action,
              value: value,
              previousValue: runningQuantity,
              description: '',
              formula: field.formula
            };

            switch (field.inventory_action) {
              case 'add':
                runningQuantity += value;
                change.description = `Added ${value} units via ${field.label}`;
                break;
              case 'subtract':
                runningQuantity -= value;
                change.description = `Subtracted ${value} units via ${field.label}`;
                break;
            }
            
            result.changes.push(change);
          }
        }
        
        result.newQuantity = Math.max(0, runningQuantity);
        
        // Warn if quantity went negative
        if (runningQuantity < 0) {
          result.warnings.push(`Calculated quantity was negative (${runningQuantity}), adjusted to 0`);
        }
      }

      // Step 3: Validate against business rules
      const businessValidation = this.validateBusinessRules(
        currentQuantity,
        result.newQuantity,
        result.changes,
        previousHistory
      );
      result.warnings.push(...businessValidation.warnings);
      result.errors.push(...businessValidation.errors);

      // Step 4: Add calculation metadata
      result.metadata = {
        calculatedAt: new Date().toISOString(),
        formFields: inventoryFields.map(f => ({ id: f.id, label: f.label, action: f.inventory_action })),
        assetMetadataUsed: Object.keys(assetMetadata),
        totalChanges: result.changes.length,
        netChange: result.newQuantity - currentQuantity
      };

      result.success = result.errors.length === 0;
      return result;

    } catch (error) {
      result.errors.push(`Calculation error: ${error.message}`);
      return result;
    }
  }

  /**
   * Validate form data against schema
   */
  private static validateFormData(formData: Record<string, any>, fields: any[]): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    for (const field of fields) {
      const value = formData[field.id];
      
      // Check required fields
      if (field.required && (value === undefined || value === null || value === '')) {
        result.errors.push(`Required field '${field.label}' is missing`);
        result.isValid = false;
      }

      // Validate numeric fields
      if (field.type === 'number' && value !== undefined && value !== null && value !== '') {
        const numValue = this.parseNumericValue(value);
        if (numValue === null) {
          result.errors.push(`Field '${field.label}' must be a valid number`);
          result.isValid = false;
        } else if (numValue < 0 && field.inventory_action === 'set') {
          result.warnings.push(`Field '${field.label}' has negative value (${numValue})`);
        }
      }

      // Validate calculated fields have proper formulas
      if (field.type === 'calculated' && !field.formula) {
        result.warnings.push(`Calculated field '${field.label}' has no formula`);
      }
    }

    return result;
  }

  /**
   * Validate against business rules
   */
  private static validateBusinessRules(
    currentQuantity: number,
    newQuantity: number,
    changes: InventoryChange[],
    previousHistory?: any[]
  ): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    // Check for large quantity changes
    const changePercent = currentQuantity > 0 ? Math.abs(newQuantity - currentQuantity) / currentQuantity : 0;
    if (changePercent > 0.5) { // 50% change
      result.warnings.push(
        `Large quantity change detected: ${currentQuantity} → ${newQuantity} (${(changePercent * 100).toFixed(1)}% change)`
      );
    }

    // Check for unusual patterns in recent history
    if (previousHistory && previousHistory.length > 0) {
      const recentEntries = previousHistory.slice(0, 3);
      const recentQuantities = recentEntries.map(h => h.quantity);
      
      // Check for rapid fluctuations
      if (recentQuantities.length >= 2) {
        const variations = recentQuantities.map((q, i) => 
          i > 0 ? Math.abs(q - recentQuantities[i - 1]) : 0
        ).slice(1);
        
        const avgVariation = variations.reduce((a, b) => a + b, 0) / variations.length;
        const currentVariation = Math.abs(newQuantity - currentQuantity);
        
        if (currentVariation > avgVariation * 2) {
          result.warnings.push(
            `Unusual quantity change compared to recent history (current: ${currentVariation}, avg: ${avgVariation.toFixed(1)})`
          );
        }
      }
    }

    // Suggest validation for large changes
    if (changePercent > 0.3) {
      result.suggestions.push('Consider adding validation notes for this significant quantity change');
    }

    return result;
  }

  /**
   * Parse numeric value with error handling
   */
  private static parseNumericValue(value: any): number | null {
    if (value === undefined || value === null || value === '') {
      return null;
    }
    
    const num = Number(value);
    return isNaN(num) ? null : num;
  }

  /**
   * Update inventory history with enhanced tracking
   */
  static async updateInventoryHistory(
    historyId: string,
    formData: Record<string, any>,
    formSchema: any,
    userId: string,
    validationNotes?: string
  ): Promise<{ success: boolean; errors: string[]; warnings: string[] }> {
    try {
      // Get current history entry
      const { data: currentHistory, error: fetchError } = await supabase
        .from('inventory_history')
        .select('*')
        .eq('id', historyId)
        .single();

      if (fetchError || !currentHistory) {
        return { success: false, errors: ['History entry not found'], warnings: [] };
      }

      // Get current inventory item
      const { data: inventoryItem, error: itemError } = await supabase
        .from('inventory_items')
        .select('quantity')
        .eq('id', currentHistory.inventory_item_id)
        .single();

      if (itemError || !inventoryItem) {
        return { success: false, errors: ['Inventory item not found'], warnings: [] };
      }

      // Calculate new values
      const calculation = await this.calculateInventoryChanges(
        currentHistory.quantity, // Use the historical quantity as base
        formSchema,
        formData
      );

      if (!calculation.success) {
        return { 
          success: false, 
          errors: calculation.errors, 
          warnings: calculation.warnings 
        };
      }

      // Update the history entry
      const updateData: any = {
        response_data: {
          ...formData,
          _inventory_changes: calculation.changes as any,
          _calculation_metadata: calculation.metadata as any,
          _edit_timestamp: new Date().toISOString(),
          _edited_by: userId
        } as any,
        quantity: calculation.newQuantity,
        validation_status: calculation.warnings.length > 0 ? 'flagged' : 'validated',
        updated_at: new Date().toISOString()
      };

      // Only add optional fields if they have values
      if (validationNotes) {
        updateData.validation_notes = validationNotes;
      }
      if (userId) {
        updateData.validated_by = userId;
        updateData.validated_at = new Date().toISOString();
      }
      if (calculation.metadata && Object.keys(calculation.metadata).length > 0) {
        updateData.calculation_metadata = calculation.metadata as any;
      }

      const { error: updateError } = await supabase
        .from('inventory_history')
        .update(updateData)
        .eq('id', historyId);

      if (updateError) {
        return { 
          success: false, 
          errors: [`Update failed: ${updateError.message}`], 
          warnings: calculation.warnings 
        };
      }

      // CRITICAL: Also update the main inventory_items quantity to match the new calculated amount
      const { error: inventoryUpdateError } = await supabase
        .from('inventory_items')
        .update({ 
          quantity: calculation.newQuantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentHistory.inventory_item_id);

      if (inventoryUpdateError) {
        console.warn('Failed to update main inventory quantity:', inventoryUpdateError);
        // Don't fail the whole operation, just warn
        return { 
          success: true, 
          errors: [], 
          warnings: [...calculation.warnings, 'History updated but main inventory sync failed'] 
        };
      }

      console.log(`✅ Updated inventory_items quantity: ${inventoryItem.quantity} → ${calculation.newQuantity}`);

      return { 
        success: true, 
        errors: [], 
        warnings: calculation.warnings 
      };

    } catch (error) {
      return { 
        success: false, 
        errors: [`Unexpected error: ${error.message}`], 
        warnings: [] 
      };
    }
  }
} 