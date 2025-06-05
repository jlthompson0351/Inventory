import { supabase } from '@/integrations/supabase/client';
import { 
  FormRow, FormInsert, FormUpdate,
  FormCategoryRow, FormCategoryInsert, FormCategoryUpdate,
  FormValidationRuleRow, FormValidationRuleInsert, FormValidationRuleUpdate,
  FormFieldDependencyRow, FormFieldDependencyInsert, FormFieldDependencyUpdate,
  FormCategoryMappingRow, FormCategoryMappingInsert, FormCategoryMappingUpdate
} from '@/integrations/supabase/types';

export type Form = FormRow;
export type FormCategory = FormCategoryRow;
export type FormValidationRule = FormValidationRuleRow;
export type FormFieldDependency = FormFieldDependencyRow;
export type FormCategoryMapping = FormCategoryMappingRow;

/**
 * Get all forms for an organization
 */
export async function getForms(organizationId: string) {
  const { data, error } = await supabase
    .from('forms')
    .select('*')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('name');

  if (error) {
    console.error('Error fetching forms:', error);
    throw error;
  }

  // Handle backward compatibility for form_data/schema
  if (data) {
    data.forEach(form => {
      // @ts-ignore legacy schema field - or use type assertion if preferred
      if ((form as any).schema && !form.form_data) {
        // @ts-ignore
        form.form_data = (form as any).schema;
      }
    });
  }

  return data;
}

/**
 * Get all ARCHIVED forms for an organization (soft-deleted)
 */
export async function getArchivedForms(organizationId: string): Promise<Form[] | null> {
  const { data, error } = await supabase
    .from('forms')
    .select('*')
    .eq('organization_id', organizationId)
    .not('deleted_at', 'is', null) // Fetch where deleted_at is NOT NULL
    .order('name');

  if (error) {
    console.error('[formService] Error fetching archived forms:', error);
    throw error;
  }

  // Handle backward compatibility for form_data/schema
  if (data) {
    data.forEach(form => {
      if ((form as any).schema && !form.form_data) {
        (form as any).form_data = (form as any).schema;
      }
    });
  }
      // Fetched archived forms
  return data;
}

/**
 * Get form templates for an organization
 */
export async function getFormTemplates(organizationId: string) {
  const { data, error } = await supabase
    .from('forms')
    .select('*')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .eq('is_template', true)
    .order('name');

  if (error) {
    console.error('Error fetching form templates:', error);
    throw error;
  }

  return data;
}

/**
 * Get forms filtered by status
 */
export async function getFormsByStatus(organizationId: string, status: 'draft' | 'published' | 'archived') {
  const { data, error } = await supabase
    .from('forms')
    .select('*')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .eq('status', status)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching forms by status:', error);
    throw error;
  }

  return data;
}

/**
 * Get forms for specific asset types
 */
export async function getFormsByAssetType(organizationId: string, assetTypeId: string) {
  const { data, error } = await supabase
    .from('forms')
    .select('*')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .contains('asset_types', [assetTypeId])
    .order('name');

  if (error) {
    console.error('Error fetching forms by asset type:', error);
    throw error;
  }

  return data;
}

/**
 * Get a single form by ID
 */
export async function getFormById(formId: string) {
  if (!formId) {
    console.error('Form ID is required');
    return null;
  }
  
  try {
    const { data, error } = await supabase
      .from('forms')
      .select('*')
      .eq('id', formId)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // This is the "not found" error code for single()
        // Form not found
        return null;
      }
      console.error('Error fetching form:', error);
      throw error;
    }

    // Handle backward compatibility between schema and form_data
    if (data) {
      // @ts-ignore legacy schema field - or use type assertion
      if ((data as any).schema && !data.form_data) {
        // @ts-ignore
        (data as any).form_data = (data as any).schema;
      }
    }

    return data;
  } catch (err) {
    console.error('Exception in getFormById:', err);
    return null;
  }
}

/**
 * Get a form with all related data (validation rules, dependencies, categories)
 */
export async function getFormWithRelatedData(formId: string) {
  console.log(`Starting getFormWithRelatedData for formId: ${formId}`);
  
  if (!formId) {
    console.error('Form ID is required for getFormWithRelatedData');
    throw new Error('Form ID is required');
  }

  try {
    // First get the form
    const { data: form, error: formError } = await supabase
      .from('forms')
      .select('*')
      .eq('id', formId)
      .is('deleted_at', null)
      .single();

    if (formError) {
      console.error('Error fetching form:', formError);
      
      if (formError.code === 'PGRST116') {
        // This is the "not found" error code for single()
        console.log(`Form with ID ${formId} not found`);
        return { form: null, validationRules: [], fieldDependencies: [], categories: [] };
      }
      
      throw formError;
    }

    console.log('Form fetched successfully:', form);

    // Handle form_data formatting
    if (form) {
      // Handle backward compatibility between schema and form_data
      if (form.schema && !form.form_data) {
        form.form_data = form.schema;
      }
      
      // Parse form_data if it's a string
      if (typeof form.form_data === 'string') {
        try {
          form.form_data = JSON.parse(form.form_data);
        } catch (parseError) {
          console.error("Error parsing form_data JSON:", parseError);
          // Don't fail the whole operation if we can't parse form_data
          form.form_data = { fields: [] };
        }
      }
    }

    // Get validation rules
    const { data: validationRules, error: validationError } = await supabase
      .from('form_validation_rules')
      .select('*')
      .eq('form_id', formId);

    if (validationError) {
      console.error('Error fetching validation rules:', validationError);
      // Don't throw here, continue with empty rules
      return { 
        form,
        validationRules: [],
        fieldDependencies: [],
        categories: []
      };
    }

    // Get field dependencies
    const { data: fieldDependencies, error: dependenciesError } = await supabase
      .from('form_field_dependencies')
      .select('*')
      .eq('form_id', formId);

    if (dependenciesError) {
      console.error('Error fetching field dependencies:', dependenciesError);
      // Don't throw here, continue with empty dependencies
      return { 
        form,
        validationRules: validationRules || [],
        fieldDependencies: [],
        categories: []
      };
    }

    // Get category mappings
    const { data: categoryMappings, error: categoriesError } = await supabase
      .from('form_category_mappings')
      .select('category_id')
      .eq('form_id', formId);

    if (categoriesError) {
      console.error('Error fetching category mappings:', categoriesError);
      // Don't throw here, continue with empty categories
      return { 
        form,
        validationRules: validationRules || [],
        fieldDependencies: fieldDependencies || [],
        categories: []
      };
    }

    // If we have category mappings, fetch the actual categories
    let categories = [];
    if (categoryMappings && categoryMappings.length > 0) {
      const categoryIds = categoryMappings.map(mapping => mapping.category_id);
      const { data: categoriesData, error: fetchCategoriesError } = await supabase
        .from('form_categories')
        .select('*')
        .in('id', categoryIds);

      if (fetchCategoriesError) {
        console.error('Error fetching categories:', fetchCategoriesError);
      } else {
        categories = categoriesData || [];
      }
    }

    console.log('getFormWithRelatedData completed successfully');
    return {
      form,
      validationRules: validationRules || [],
      fieldDependencies: fieldDependencies || [],
      categories
    };
  } catch (error) {
    console.error('Exception in getFormWithRelatedData:', error);
    throw error;
  }
}

/**
 * Create a new form
 */
export async function createForm(form: FormInsert) {
  try {
    const formToInsert = { ...form } as any; // Use type assertion for schema access
    if (formToInsert.schema && !formToInsert.form_data) {
      formToInsert.form_data = formToInsert.schema;
      delete formToInsert.schema;
    }

    // Ensure required fields are present
    if (!formToInsert.organization_id) {
      throw new Error('Organization ID is required');
    }

    if (!formToInsert.name) {
      throw new Error('Form name is required');
    }

    // Ensure form_data is stored as a JSONB object or string
    if (formToInsert.form_data && typeof formToInsert.form_data !== 'string' && typeof formToInsert.form_data !== 'object') {
      throw new Error('Form data must be a valid JSON object or string');
    }

    // If form_data is an object, no need to stringify as Supabase handles this
    // Only stringify if it's already a string to ensure it's valid JSON

    const { data, error } = await supabase
      .from('forms')
      .insert(formToInsert)
      .select('*')  // Ensure we select all columns including the ID
      .single();

    if (error) {
      console.error('Error creating form:', error);
      throw error;
    }

    console.log('Form created successfully:', data.id);
    return data;  // Return the complete form data including the ID
  } catch (err) {
    console.error('Exception in createForm:', err);
    throw err;
  }
}

/**
 * Update an existing form
 */
export async function updateForm(formId: string, form: FormUpdate) {
  try {
    if (!formId) {
      throw new Error('Form ID is required');
    }

    const formToUpdate = { ...form } as any; // Use type assertion for schema access
    if (formToUpdate.schema && !formToUpdate.form_data) {
      formToUpdate.form_data = formToUpdate.schema;
      delete formToUpdate.schema;
    }

    // Don't stringify form_data if it's an object, Supabase handles this automatically
    // Only handle the case where it's a string to ensure it's valid JSON

    // Set updated_at timestamp
    formToUpdate.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('forms')
      .update(formToUpdate)
      .eq('id', formId)
      .select('*')  // Ensure we select all columns including the ID
      .single();

    if (error) {
      console.error(`Error updating form ${formId}:`, error);
      throw error;
    }

    console.log('Form updated successfully:', formId);
    return data;  // Return the complete form data
  } catch (err) {
    console.error(`Exception in updateForm for ${formId}:`, err);
    throw err;
  }
}

/**
 * Delete a form (Soft delete by setting deleted_at)
 * This existing function already performs a soft delete and handles dependencies.
 */
export async function deleteForm(formId: string) {
  try {
    // First check if the form is referenced by any asset types as an intake form
    const { data: intakeRefs, error: intakeError } = await supabase
      .from('asset_types')
      .select('id')
      .eq('intake_form_id', formId);
    
    if (intakeError) {
      console.error('Error checking intake form references:', intakeError);
      throw intakeError;
    }
    
    // Then check if the form is referenced by any asset types as an inventory form
    const { data: inventoryRefs, error: inventoryError } = await supabase
      .from('asset_types')
      .select('id')
      .eq('inventory_form_id', formId);
    
    if (inventoryError) {
      console.error('Error checking inventory form references:', inventoryError);
      throw inventoryError;
    }
    
    // If the form is referenced as an intake form, update those references to null
    if (intakeRefs && intakeRefs.length > 0) {
      const { error: updateIntakeError } = await supabase
        .from('asset_types')
        .update({ intake_form_id: null })
        .eq('intake_form_id', formId);
      
      if (updateIntakeError) {
        console.error('Error removing intake form references:', updateIntakeError);
        throw updateIntakeError;
      }
    }
    
    // If the form is referenced as an inventory form, update those references to null
    if (inventoryRefs && inventoryRefs.length > 0) {
      const { error: updateInventoryError } = await supabase
        .from('asset_types')
        .update({ inventory_form_id: null })
        .eq('inventory_form_id', formId);
      
      if (updateInventoryError) {
        console.error('Error removing inventory form references:', updateInventoryError);
        throw updateInventoryError;
      }
    }
    
    // Delete mapped fields associated with this form
    const { error: mappedFieldsError } = await supabase
      .from('mapped_fields')
      .delete()
      .eq('form_id', formId);
    
    if (mappedFieldsError) {
      console.error('Error deleting mapped fields:', mappedFieldsError);
      throw mappedFieldsError;
    }
    
    // Delete form validation rules
    const { error: validationRulesError } = await supabase
      .from('form_validation_rules')
      .delete()
      .eq('form_id', formId);
    
    if (validationRulesError) {
      console.error('Error deleting validation rules:', validationRulesError);
      throw validationRulesError;
    }
    
    // Delete form field dependencies
    const { error: dependenciesError } = await supabase
      .from('form_field_dependencies')
      .delete()
      .eq('form_id', formId);
    
    if (dependenciesError) {
      console.error('Error deleting field dependencies:', dependenciesError);
      throw dependenciesError;
    }
    
    // Delete form category mappings
    const { error: categoryMappingsError } = await supabase
      .from('form_category_mappings')
      .delete()
      .eq('form_id', formId);
    
    if (categoryMappingsError) {
      console.error('Error deleting category mappings:', categoryMappingsError);
      throw categoryMappingsError;
    }
    
    // Now that all references have been cleared, delete the form
    const { error } = await supabase
      .from('forms')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', formId);

    if (error) {
      console.error('Error deleting form:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error deleting form:', error);
    throw error;
  }
}

/**
 * Restores a soft-deleted form by setting deleted_at to null.
 * It might also be prudent to set its status (e.g., to 'draft') if it was also 'archived' by status.
 */
export async function restoreForm(formId: string): Promise<Form | null> {
  if (!formId) {
    console.warn('[formService] restoreForm called with no ID.');
    return null;
  }
  try {
    // First, update deleted_at to null
    const { data, error } = await supabase
      .from('forms')
      .update({ deleted_at: null /*, status: 'draft' */ }) // Consider resetting status
      .eq('id', formId)
      .select('*')
      .single();

    if (error) {
      console.error('[formService] Error restoring form:', error);
      // Check for unique constraint violation (code 23505 in PostgreSQL)
      if (error.code === '23505') {
        throw new Error('An active form with the same name already exists in this organization.');
      }
      throw error;
    }
    console.log(`[formService] Form ${formId} restored successfully.`);
    return data;
  } catch (error) {
    console.error(`[formService] Failed to restore form ${formId}:`, error);
    throw error; // Re-throw to be caught by UI
  }
}

/**
 * Publish a form (change status from draft to published)
 */
export async function publishForm(formId: string) {
  const { data, error } = await supabase
    .from('forms')
    .update({ status: 'published' })
    .eq('id', formId)
    .select()
    .single();

  if (error) {
    console.error('Error publishing form:', error);
    throw error;
  }

  return data;
}

/**
 * Archive a form
 */
export async function archiveForm(formId: string) {
  const { data, error } = await supabase
    .from('forms')
    .update({ status: 'archived' })
    .eq('id', formId)
    .select()
    .single();

  if (error) {
    console.error('Error archiving form:', error);
    throw error;
  }

  return data;
}

/**
 * Create a new version of a form
 */
export async function createFormVersion(formId: string) {
  // First get the current form
  const { data: currentForm, error: fetchError } = await supabase
    .from('forms')
    .select('*')
    .eq('id', formId)
    .single();

  if (fetchError) {
    console.error('Error fetching form for versioning:', fetchError);
    throw fetchError;
  }

  // Create a new form with incremented version
  const newForm = {
    ...currentForm,
    version: currentForm.version + 1,
    status: 'draft' as const,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  
  // Remove id from the new form so Supabase will generate a new one
  delete newForm.id;

  const { data: insertedForm, error: insertError } = await supabase
    .from('forms')
    .insert(newForm)
    .select()
    .single();

  if (insertError) {
    console.error('Error creating new form version:', insertError);
    throw insertError;
  }

  return insertedForm;
}

/**
 * Get all form categories for an organization
 */
export async function getFormCategories(organizationId: string) {
  const { data, error } = await supabase
    .from('form_categories')
    .select('*')
    .eq('organization_id', organizationId)
    .order('name');

  if (error) {
    console.error('Error fetching form categories:', error);
    throw error;
  }

  return data;
}

/**
 * Create a new form category
 */
export async function createFormCategory(category: FormCategoryInsert) {
  const { data, error } = await supabase
    .from('form_categories')
    .insert(category)
    .select()
    .single();

  if (error) {
    console.error('Error creating form category:', error);
    throw error;
  }

  return data;
}

/**
 * Update a form category
 */
export async function updateFormCategory(categoryId: string, category: FormCategoryUpdate) {
  const { data, error } = await supabase
    .from('form_categories')
    .update(category)
    .eq('id', categoryId)
    .select()
    .single();

  if (error) {
    console.error('Error updating form category:', error);
    throw error;
  }

  return data;
}

/**
 * Delete a form category
 */
export async function deleteFormCategory(categoryId: string) {
  const { error } = await supabase
    .from('form_categories')
    .delete()
    .eq('id', categoryId);

  if (error) {
    console.error('Error deleting form category:', error);
    throw error;
  }
}

/**
 * Assign categories to a form
 */
export async function assignCategoriesToForm(formId: string, categoryIds: string[]) {
  // First remove existing category mappings
  const { error: deleteError } = await supabase
    .from('form_category_mappings')
    .delete()
    .eq('form_id', formId);

  if (deleteError) {
    console.error('Error removing existing category mappings:', deleteError);
    throw deleteError;
  }

  // Then create new mappings
  if (categoryIds.length > 0) {
    const mappings = categoryIds.map(categoryId => ({
      form_id: formId,
      category_id: categoryId
    }));

    const { error: insertError } = await supabase
      .from('form_category_mappings')
      .insert(mappings);

    if (insertError) {
      console.error('Error assigning categories to form:', insertError);
      throw insertError;
    }
  }

  return true;
}

/**
 * Create form validation rules
 */
export async function createFormValidationRules(rules: FormValidationRuleInsert[]) {
  if (rules.length === 0) return [];

  const { data, error } = await supabase
    .from('form_validation_rules')
    .insert(rules)
    .select();

  if (error) {
    console.error('Error creating form validation rules:', error);
    throw error;
  }

  return data;
}

/**
 * Update a form validation rule
 */
export async function updateFormValidationRule(ruleId: string, rule: FormValidationRuleUpdate) {
  const { data, error } = await supabase
    .from('form_validation_rules')
    .update(rule)
    .eq('id', ruleId)
    .select()
    .single();

  if (error) {
    console.error('Error updating form validation rule:', error);
    throw error;
  }

  return data;
}

/**
 * Delete a form validation rule
 */
export async function deleteFormValidationRule(ruleId: string) {
  const { error } = await supabase
    .from('form_validation_rules')
    .delete()
    .eq('id', ruleId);

  if (error) {
    console.error('Error deleting form validation rule:', error);
    throw error;
  }
}

/**
 * Create form field dependencies
 */
export async function createFormFieldDependencies(dependencies: FormFieldDependencyInsert[]) {
  if (dependencies.length === 0) return [];

  const { data, error } = await supabase
    .from('form_field_dependencies')
    .insert(dependencies)
    .select();

  if (error) {
    console.error('Error creating form field dependencies:', error);
    throw error;
  }

  return data;
}

/**
 * Update a form field dependency
 */
export async function updateFormFieldDependency(dependencyId: string, dependency: FormFieldDependencyUpdate) {
  const { data, error } = await supabase
    .from('form_field_dependencies')
    .update(dependency)
    .eq('id', dependencyId)
    .select()
    .single();

  if (error) {
    console.error('Error updating form field dependency:', error);
    throw error;
  }

  return data;
}

/**
 * Delete a form field dependency
 */
export async function deleteFormFieldDependency(dependencyId: string) {
  const { error } = await supabase
    .from('form_field_dependencies')
    .delete()
    .eq('id', dependencyId);

  if (error) {
    console.error('Error deleting form field dependency:', error);
    throw error;
  }
} 