import { supabase } from '@/integrations/supabase/client';
import { DashboardStats } from '@/types/stats';

export async function getDashboardStats(organizationId: string): Promise<DashboardStats> {
  try {
    // Get inventory count
    const { count: inventoryCount } = await supabase
      .from('inventory_items')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    // Get form count
    const { count: formCount } = await supabase
      .from('forms')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    // Get asset type count
    const { count: assetTypeCount } = await supabase
      .from('asset_types')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    // Get team member count
    const { count: teamMemberCount } = await supabase
      .from('organization_members')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    // Get inventory status
    const { data: inventoryStatus } = await supabase
      .from('inventory_items')
      .select('status')
      .eq('organization_id', organizationId);

    const inStock = inventoryStatus?.filter(item => item.status === 'in_stock').length || 0;
    const lowStock = inventoryStatus?.filter(item => item.status === 'low_stock').length || 0;

    // Since we don't have an activity_logs table, we'll simulate recent activities
    // from inventory changes
    const { data: recentInventoryChanges } = await supabase
      .from('inventory_items')
      .select('description, created_at')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Get popular asset types
    const { data: popularAssetTypes } = await supabase
      .from('asset_types')
      .select(`
        name,
        inventory_items (id)
      `)
      .eq('organization_id', organizationId)
      .limit(6);

    // Get recent forms
    const { data: recentForms } = await supabase
      .from('forms')
      .select('name, created_at')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(5);

    return {
      inventoryCount: inventoryCount || 0,
      formCount: formCount || 0,
      assetTypeCount: assetTypeCount || 0,
      teamMemberCount: teamMemberCount || 0,
      inventoryStatus: {
        inStock,
        lowStock
      },
      recentActivities: recentInventoryChanges?.map(activity => ({
        description: activity.description || 'Item updated',
        timestamp: new Date(activity.created_at).toLocaleDateString()
      })) || [],
      popularAssetTypes: popularAssetTypes?.map(type => ({
        name: type.name,
        itemCount: (type.inventory_items as any[])?.length || 0
      })) || [],
      recentForms: recentForms?.map(form => ({
        name: form.name,
        createdAt: new Date(form.created_at).toLocaleDateString()
      })) || []
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return {
      inventoryCount: 0,
      formCount: 0,
      assetTypeCount: 0,
      teamMemberCount: 0,
      inventoryStatus: {
        inStock: 0,
        lowStock: 0
      },
      recentActivities: [],
      popularAssetTypes: [],
      recentForms: []
    };
  }
} 