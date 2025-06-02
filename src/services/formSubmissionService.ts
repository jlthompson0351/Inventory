import { supabase } from '@/integrations/supabase/client';
import { uploadFormFile } from './fileUploadService';
import { getMappedFields } from './mappedFieldService';

interface FormSubmissionData {
  [key: string]: any;
}

/**
 * Processes form submission data before saving, handling files and special fields
 * @param formData The form data to process
 * @param organizationId The organization ID
 * @param assetTypeId Optional asset type ID
 * @param assetId Optional asset ID
 * @returns Processed form data with file URLs instead of File objects
 */
async function processFormData(
  formData: FormSubmissionData,
  organizationId: string,
  assetTypeId?: string,
  assetId?: string
): Promise<FormSubmissionData> {
  const processedData = { ...formData };
  const fileUploads = [];
  
  // Handle file uploads and properly serialize complex objects
  for (const [key, value] of Object.entries(formData)) {
    if (value instanceof File) {
      // Queue the file upload and replace the file with placeholder
      fileUploads.push({
        key,
        file: value as File,
        path: assetId ? `assets/${assetId}` : 'forms'
      });
      
      // Replace with placeholder until upload completes
      processedData[key] = {
        pending: true, 
        name: (value as File).name,
        size: (value as File).size,
        type: (value as File).type
      };
    } else if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
      // Properly serialize objects to prevent [object Object] in database
      try {
        // If it's already a plain object with simple properties, keep it
        // Otherwise, convert to JSON string
        if (Array.isArray(value) || (value.constructor === Object && Object.keys(value).length > 0)) {
          processedData[key] = value;
        } else {
          // For other complex objects, stringify them
          processedData[key] = JSON.stringify(value);
        }
      } catch (e) {
        // Fallback to string representation if serialization fails
        processedData[key] = String(value);
      }
    }
  }
  
  // Process all file uploads in parallel
  if (fileUploads.length > 0) {
    const uploadResults = await Promise.all(
      fileUploads.map(async ({ key, file, path }) => {
        const fileUrl = await uploadFormFile(file, organizationId, path);
        return { key, fileUrl };
      })
    );
    
    // Replace placeholders with actual file URLs
    uploadResults.forEach(({ key, fileUrl }) => {
      processedData[key] = {
        url: fileUrl,
        name: (formData[key] as File).name,
        size: (formData[key] as File).size,
        type: (formData[key] as File).type
      };
    });
  }
  
  return processedData;
}

/**
 * Submits a form and creates/updates an asset as needed
 * Updated to use global mapped fields per asset type and robust inventory logic
 */
export async function submitForm(
  formId: string,
  formData: FormSubmissionData,
  organizationId: string,
  assetTypeId?: string,
  assetId?: string,
  formType?: string
) {
  try {
    // First process any file uploads and convert them to URLs
    const processedData = await processFormData(formData, organizationId, assetTypeId, assetId);

    // Fetch the form to get its purpose and validate linkage
    const { data: form, error: formError } = await supabase
      .from('forms')
      .select('*')
      .eq('id', formId)
      .single();
    if (formError || !form) throw formError || new Error('Form not found');

    // Validate the form is linked to the asset type via asset_type_forms
    if (assetTypeId) {
      const { data: atf, error: atfError } = await supabase.rpc(
        'get_forms_for_asset_type',
        { p_asset_type_id: assetTypeId, p_organization_id: organizationId }
      );
      if (atfError) throw atfError;
      const found = (atf || []).some((row) => row.form_id === formId);
      if (!found) throw new Error('Form is not linked to this asset type');
    }

    // Fetch all mapped fields for the organization (global per asset type)
    const mappedFields = await getMappedFields(organizationId);

    // Filter mapped fields for this asset type
    const assetTypeMappedFields = mappedFields.filter(
      (f) => f.form_id && f.organization_id === organizationId
    );

    let asset = null;
    // If this is an asset-related form
    if (assetTypeId) {
      if (assetId) {
        // Update existing asset
        const { data, error } = await supabase
          .from('assets')
          .update({
            metadata: processedData,
            updated_at: new Date().toISOString()
          })
          .eq('id', assetId)
          .is('deleted_at', null)
          .select()
          .single();
        if (error) throw error;
        asset = data;
      } else {
        // Create new asset
        const { data, error } = await supabase
          .from('assets')
          .insert({
            name: processedData.name || processedData.asset_name || 'New Asset',
            description: processedData.description || '',
            asset_type_id: assetTypeId,
            organization_id: organizationId,
            metadata: processedData,
            created_by: (await supabase.auth.getUser()).data.user?.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          } as any) // Type cast to avoid column name issues
          .select()
          .single();
        if (error) throw error;
        asset = data;
        // Always create inventory item with quantity 0 (not from form data)
        const { error: invError } = await supabase
          .from('inventory_items')
          .insert({
            organization_id: organizationId,
            asset_type_id: assetTypeId,
            asset_id: asset.id,
            name: processedData.name || processedData.asset_name || 'New Inventory Item',
            description: processedData.description || '',
            quantity: 0,
            metadata: processedData
          });
        if (invError) throw invError;
      }
    }

    // Inventory logic: apply inventory_action fields (Enhanced)
    if (assetTypeId && asset) {
      // Find the inventory item for this asset
      const { data: inventoryItem, error: invItemError } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('asset_id', asset.id)
        .single();
      if (invItemError || !inventoryItem) throw invItemError || new Error('Inventory item not found');

      // Process inventory actions from the FORM FIELDS (supports calculated fields)
      let newQuantity = inventoryItem.quantity;
      let foundInventoryAction = false;
      let inventoryChanges: Array<{action: string, field: string, value: number, description: string}> = [];
      
      // Get the form schema to find fields with inventory actions
      const formSchema = typeof form.form_data === 'string' ? JSON.parse(form.form_data) : form.form_data;
      
      if (formSchema && formSchema.fields) {
        // Priority 1: Check for 'set' actions first (they override everything)
        const setField = formSchema.fields.find(field => 
          field.inventory_action === 'set' && 
          processedData[field.id] !== undefined &&
          processedData[field.id] !== null
        );
        
        if (setField) {
          const setValue = Number(processedData[setField.id]);
          if (!isNaN(setValue)) {
            const previousQuantity = newQuantity;
            newQuantity = setValue;
            foundInventoryAction = true;
            
            // Calculate usage/difference for history tracking
            const difference = previousQuantity - setValue;
            const changeDescription = difference > 0 
              ? `${difference} units used/consumed` 
              : difference < 0 
                ? `${Math.abs(difference)} units added`
                : 'No change in quantity';
            
            inventoryChanges.push({
              action: 'set',
              field: setField.label || setField.id,
              value: setValue,
              description: `Stock count set to ${setValue} (was ${previousQuantity}). ${changeDescription}`
            });
            
            console.log(`Inventory SET action: ${previousQuantity} → ${setValue} (field: ${setField.label})`);
          }
        } else {
          // Priority 2: Process add/subtract actions
          formSchema.fields.forEach(field => {
            const value = processedData[field.id];
            if (value !== undefined && value !== null && field.inventory_action && field.inventory_action !== 'none') {
              const numValue = Number(value);
              if (!isNaN(numValue) && numValue !== 0) {
                switch (field.inventory_action) {
                  case 'add':
                    newQuantity += numValue;
                    foundInventoryAction = true;
                    inventoryChanges.push({
                      action: 'add',
                      field: field.label || field.id,
                      value: numValue,
                      description: `Added ${numValue} units via ${field.label}`
                    });
                    console.log(`Inventory ADD action: +${numValue} (field: ${field.label})`);
                    break;
                  case 'subtract':
                    newQuantity -= numValue;
                    foundInventoryAction = true;
                    inventoryChanges.push({
                      action: 'subtract',
                      field: field.label || field.id,
                      value: numValue,
                      description: `Subtracted ${numValue} units via ${field.label}`
                    });
                    console.log(`Inventory SUBTRACT action: -${numValue} (field: ${field.label})`);
                    break;
                }
              }
            }
          });
        }
      }
      
      // Update inventory item if any actions were found
      if (foundInventoryAction) {
        // Ensure quantity doesn't go negative
        const finalQuantity = Math.max(0, newQuantity);
        
        await supabase
          .from('inventory_items')
          .update({ 
            quantity: finalQuantity, 
            updated_at: new Date().toISOString() 
          })
          .eq('id', inventoryItem.id);

        // Enhanced history record with detailed change tracking
        const userId = (await supabase.auth.getUser()).data.user?.id;
        const changesSummary = inventoryChanges.map(change => change.description).join('; ');
        const notesWithChanges = `Form: ${form.name}. Changes: ${changesSummary}`;
        
        // Determine the correct event_type based on formType parameter or form purpose
        let eventType = 'audit';
        let checkType = 'form_submission';
        
        if (formType) {
          // Use the formType parameter if provided (from URL or navigation state)
          switch (formType) {
            case 'intake':
              eventType = 'intake';
              checkType = 'intake';
              break;
            case 'inventory':
              eventType = 'audit';
              checkType = 'periodic';
              break;
            case 'audit':
              eventType = 'audit';
              checkType = 'audit';
              break;
            default:
              eventType = 'audit';
              checkType = formType;
          }
        } else if (form.purpose && form.purpose !== 'generic') {
          // Fallback to form purpose if no formType provided
          switch (form.purpose) {
            case 'intake':
              eventType = 'intake';
              checkType = 'intake';
              break;
            case 'inventory':
              eventType = 'audit';
              checkType = 'periodic';
              break;
            case 'audit':
              eventType = 'audit';
              checkType = 'audit';
              break;
            default:
              eventType = 'audit';
              checkType = form.purpose;
          }
        }
        
        await supabase
          .from('inventory_history')
          .insert({
            inventory_item_id: inventoryItem.id,
            organization_id: organizationId,
            quantity: finalQuantity,
            event_type: eventType,
            check_type: checkType,
            notes: notesWithChanges,
            response_data: {
              ...processedData,
              _inventory_changes: inventoryChanges,
              _previous_quantity: inventoryItem.quantity,
              // Add exact_quantity for SET actions to preserve decimal precision
              ...(inventoryChanges.some(c => c.action === 'set') ? { exact_quantity: newQuantity } : {}),
              // Store the form ID for later reference
              form_id: formId
            },
            created_by: userId,
            check_date: new Date().toISOString(),
            month_year: new Date().toISOString().slice(0, 7),
            status: 'active'
          });
          
        console.log(`✅ Inventory updated: ${inventoryItem.quantity} → ${finalQuantity} for asset ${asset.name}`);
        console.log(`📝 Changes tracked: ${changesSummary}`);
        console.log(`🏷️ Event type: ${eventType}, Check type: ${checkType}`);
      }
    }

    // Create form submission record - use the assetId parameter for existing assets
    const { data: submission, error: submissionError } = await supabase
      .from('form_submissions')
      .insert({
        form_id: formId,
        asset_id: assetId || asset?.id, // Use the passed assetId first, then fall back to newly created asset id
        asset_type_id: assetTypeId,
        organization_id: organizationId,
        submission_data: processedData,
        submitted_by: (await supabase.auth.getUser()).data.user?.id,
        created_at: new Date().toISOString(),
        status: 'completed'
      } as any) // Type cast to avoid column name issues
      .select()
      .single();
    if (submissionError) throw submissionError;

    return { asset, submission };
  } catch (error) {
    console.error('Form submission failed:', error);
    throw error;
  }
} 