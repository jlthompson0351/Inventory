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
  
  // Handle file uploads
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
  assetId?: string
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
            updated_at: new Date()
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
            created_at: new Date(),
            updated_at: new Date()
          })
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

    // Inventory logic: apply inventory_action fields
    if (assetTypeId && asset) {
      // Find the inventory item for this asset
      const { data: inventoryItem, error: invItemError } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('asset_id', asset.id)
        .single();
      if (invItemError || !inventoryItem) throw invItemError || new Error('Inventory item not found');

      let newQuantity = inventoryItem.quantity;
      // For each mapped field with inventory_action, update quantity
      assetTypeMappedFields.forEach((field) => {
        const value = processedData[field.field_id];
        if (value !== undefined && field.inventory_action) {
          switch (field.inventory_action) {
            case 'add':
              newQuantity += Number(value);
              break;
            case 'subtract':
              newQuantity -= Number(value);
              break;
            case 'set':
              newQuantity = Number(value);
              break;
            // 'none' or undefined: do nothing
          }
        }
      });
      // Update inventory item
      await supabase
        .from('inventory_items')
        .update({ quantity: newQuantity, updated_at: new Date() })
        .eq('id', inventoryItem.id);

      // Record in inventory_history
      await supabase
        .from('inventory_history')
        .insert({
          inventory_item_id: inventoryItem.id,
          organization_id: organizationId,
          quantity: newQuantity,
          event_type: form.purpose || 'generic',
          check_type: form.purpose || 'generic',
          response_data: processedData,
          created_by: (await supabase.auth.getUser()).data.user?.id,
          created_at: new Date(),
          month_year: new Date().toISOString().slice(0, 7)
        });
    }

    // Save form submission
    const { data: submission, error: submissionError } = await supabase
      .from('form_submissions')
      .insert({
        form_id: formId,
        asset_id: asset?.id || assetId,
        asset_type_id: assetTypeId,
        organization_id: organizationId,
        submitted_by: (await supabase.auth.getUser()).data.user?.id,
        submission_data: processedData,
        status: 'submitted',
        created_at: new Date(),
        updated_at: new Date()
      })
      .select()
      .single();
    if (submissionError) throw submissionError;

    return { asset, submission };
  } catch (error) {
    console.error('Form submission failed:', error);
    throw error;
  }
} 