import { supabase } from '@/integrations/supabase/client';

export interface FormTemplate {
  id: string;
  name: string;
  description: string;
  category: 'intake' | 'inventory' | 'inspection' | 'maintenance' | 'custom';
  template_data: {
    title: string;
    description: string;
    fields: any[];
  };
  asset_type_id?: string;
  organization_id: string;
  is_public: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  usage_count: number;
  tags?: string[];
}

export interface CreateFormTemplateParams {
  name: string;
  description: string;
  category: FormTemplate['category'];
  template_data: FormTemplate['template_data'];
  asset_type_id?: string;
  organization_id: string;
  is_public?: boolean;
  tags?: string[];
}

/**
 * Get all form templates for an organization
 */
export async function getFormTemplates(organizationId: string): Promise<FormTemplate[]> {
  try {
    const { data, error } = await supabase
      .from('form_templates')
      .select('*')
      .or(`organization_id.eq.${organizationId},is_public.eq.true`)
      .order('usage_count', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching form templates:', error);
    return [];
  }
}

/**
 * Get form templates by category
 */
export async function getFormTemplatesByCategory(
  organizationId: string, 
  category: FormTemplate['category']
): Promise<FormTemplate[]> {
  try {
    const { data, error } = await supabase
      .from('form_templates')
      .select('*')
      .or(`organization_id.eq.${organizationId},is_public.eq.true`)
      .eq('category', category)
      .order('usage_count', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching form templates by category:', error);
    return [];
  }
}

/**
 * Get form templates for a specific asset type
 */
export async function getFormTemplatesForAssetType(
  organizationId: string,
  assetTypeId: string
): Promise<FormTemplate[]> {
  try {
    const { data, error } = await supabase
      .from('form_templates')
      .select('*')
      .or(`organization_id.eq.${organizationId},is_public.eq.true`)
      .eq('asset_type_id', assetTypeId)
      .order('usage_count', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching form templates for asset type:', error);
    return [];
  }
}

/**
 * Create a new form template
 */
export async function createFormTemplate(params: CreateFormTemplateParams): Promise<FormTemplate | null> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    const templateData = {
      ...params,
      created_by: user.user.id,
      is_public: params.is_public || false,
      usage_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('form_templates')
      .insert(templateData)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating form template:', error);
    return null;
  }
}

/**
 * Update form template
 */
export async function updateFormTemplate(
  templateId: string, 
  updates: Partial<CreateFormTemplateParams>
): Promise<FormTemplate | null> {
  try {
    const { data, error } = await supabase
      .from('form_templates')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', templateId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating form template:', error);
    return null;
  }
}

/**
 * Delete form template
 */
export async function deleteFormTemplate(templateId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('form_templates')
      .delete()
      .eq('id', templateId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting form template:', error);
    return false;
  }
}

/**
 * Increment usage count when template is used
 */
export async function incrementTemplateUsage(templateId: string): Promise<void> {
  try {
    const { error } = await supabase.rpc('increment_template_usage', {
      template_id: templateId
    });

    if (error) throw error;
  } catch (error) {
    console.error('Error incrementing template usage:', error);
  }
}

/**
 * Get popular form templates (high usage count)
 */
export async function getPopularFormTemplates(
  organizationId: string,
  limit: number = 5
): Promise<FormTemplate[]> {
  try {
    const { data, error } = await supabase
      .from('form_templates')
      .select('*')
      .or(`organization_id.eq.${organizationId},is_public.eq.true`)
      .order('usage_count', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching popular form templates:', error);
    return [];
  }
}

/**
 * Search form templates
 */
export async function searchFormTemplates(
  organizationId: string,
  searchTerm: string
): Promise<FormTemplate[]> {
  try {
    const { data, error } = await supabase
      .from('form_templates')
      .select('*')
      .or(`organization_id.eq.${organizationId},is_public.eq.true`)
      .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,tags.cs.{${searchTerm}}`)
      .order('usage_count', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error searching form templates:', error);
    return [];
  }
}

/**
 * Predefined starter templates
 */
export const STARTER_TEMPLATES: Omit<FormTemplate, 'id' | 'organization_id' | 'created_by' | 'created_at' | 'updated_at' | 'usage_count'>[] = [
  {
    name: 'Basic Intake Form',
    description: 'Simple intake form for new assets',
    category: 'intake',
    is_public: true,
    tags: ['basic', 'intake', 'asset'],
    template_data: {
      title: 'Asset Intake Form',
      description: 'Quick form for adding new assets to inventory',
      fields: [
        {
          id: 'field_1',
          label: 'Asset Name',
          type: 'text',
          required: true,
          placeholder: 'Enter asset name',
          mappable: true,
          inventory_action: 'none'
        },
        {
          id: 'field_2',
          label: 'Initial Quantity',
          type: 'number',
          required: true,
          placeholder: 'Enter initial quantity',
          mappable: true,
          inventory_action: 'set'
        },
        {
          id: 'field_3',
          label: 'Location',
          type: 'text',
          required: false,
          placeholder: 'Where is this asset located?',
          mappable: true,
          inventory_action: 'none'
        }
      ]
    }
  },
  {
    name: 'Monthly Inventory Check',
    description: 'Standard monthly inventory counting form',
    category: 'inventory',
    is_public: true,
    tags: ['monthly', 'inventory', 'counting'],
    template_data: {
      title: 'Monthly Inventory Count',
      description: 'Monthly inventory verification and counting',
      fields: [
        {
          id: 'field_1',
          label: 'Current Count',
          type: 'number',
          required: true,
          placeholder: 'Count current inventory',
          mappable: true,
          inventory_action: 'set'
        },
        {
          id: 'field_2',
          label: 'Condition Notes',
          type: 'textarea',
          required: false,
          placeholder: 'Note any condition issues',
          mappable: true,
          inventory_action: 'none'
        },
        {
          id: 'field_3',
          label: 'Last Checked By',
          type: 'text',
          required: true,
          placeholder: 'Your name',
          mappable: true,
          inventory_action: 'none'
        }
      ]
    }
  },
  {
    name: 'Equipment Inspection',
    description: 'General equipment inspection checklist',
    category: 'inspection',
    is_public: true,
    tags: ['inspection', 'equipment', 'safety'],
    template_data: {
      title: 'Equipment Inspection Form',
      description: 'Regular safety and condition inspection',
      fields: [
        {
          id: 'field_1',
          label: 'Overall Condition',
          type: 'select',
          required: true,
          options: ['Excellent', 'Good', 'Fair', 'Poor', 'Needs Repair'],
          mappable: true,
          inventory_action: 'none'
        },
        {
          id: 'field_2',
          label: 'Safety Check Passed',
          type: 'checkbox',
          required: true,
          mappable: true,
          inventory_action: 'none'
        },
        {
          id: 'field_3',
          label: 'Issues Found',
          type: 'textarea',
          required: false,
          placeholder: 'Describe any issues or concerns',
          mappable: true,
          inventory_action: 'none'
        },
        {
          id: 'field_4',
          label: 'Inspector Name',
          type: 'text',
          required: true,
          placeholder: 'Your name',
          mappable: true,
          inventory_action: 'none'
        }
      ]
    }
  }
]; 