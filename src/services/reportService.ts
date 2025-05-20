import { supabase } from '@/integrations/supabase/client';
import { calculateInventoryUsage } from './inventoryService';

export type ReportConfig = {
  subject: string; // Primary data source (e.g., 'inventory_items', 'assets', 'form_submissions')
  columns: string[];
  filters?: {
    field: string;
    operator: string;
    value: string;
  }[];
  sorts?: {
    field: string;
    direction: 'asc' | 'desc';
  }[];
  assetTypes?: string[];
};

export type Report = {
  id: string;
  name: string;
  description: string | null;
  report_config: ReportConfig;
  organization_id: string;
  created_at: string;
  updated_at: string;
};

export type ReportInsert = {
  name: string;
  description?: string | null;
  report_config: ReportConfig;
  organization_id: string;
};

export type ReportUpdate = {
  name?: string;
  description?: string | null;
  report_config?: ReportConfig;
};

export async function getReports(organizationId: string): Promise<Report[]> {
  try {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name');

    if (error) {
      console.error('Error fetching reports:', error);
      throw error;
    }

    // Convert the JSON to our specific ReportConfig type
    return (data || []).map(item => ({
      ...item,
      report_config: item.report_config as unknown as ReportConfig
    }));
  } catch (error) {
    console.error('Failed to fetch reports:', error);
    return [];
  }
}

export async function getReport(id: string): Promise<Report | null> {
  try {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching report:', error);
      throw error;
    }

    if (!data) return null;

    // Convert the JSON to our specific ReportConfig type
    return {
      ...data,
      report_config: data.report_config as unknown as ReportConfig
    };
  } catch (error) {
    console.error('Failed to fetch report:', error);
    return null;
  }
}

export async function createReport(report: ReportInsert): Promise<Report | null> {
  try {
    const { data, error } = await supabase
      .from('reports')
      .insert(report)
      .select()
      .single();

    if (error) {
      console.error('Error creating report:', error);
      throw error;
    }

    if (!data) return null;

    // Convert the JSON to our specific ReportConfig type
    return {
      ...data,
      report_config: data.report_config as unknown as ReportConfig
    };
  } catch (error) {
    console.error('Failed to create report:', error);
    return null;
  }
}

export async function updateReport(id: string, updates: ReportUpdate): Promise<Report | null> {
  try {
    const { data, error } = await supabase
      .from('reports')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating report:', error);
      throw error;
    }

    if (!data) return null;

    // Convert the JSON to our specific ReportConfig type
    return {
      ...data,
      report_config: data.report_config as unknown as ReportConfig
    };
  } catch (error) {
    console.error('Failed to update report:', error);
    return null;
  }
}

export async function deleteReport(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('reports')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting report:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Failed to delete report:', error);
    return false;
  }
}

export async function executeReport(report: Report, limit?: number): Promise<any[]> {
  try {
    // Get subject from report config
    const subject = report.report_config.subject || 'inventory_items';
    const columns = report.report_config.columns || [];
    let query;
    
    switch (subject) {
      case 'inventory_items':
        query = supabase
          .from('inventory_items')
          .select(`
            *,
            asset_type:asset_types(name)
          `)
          .eq('organization_id', report.organization_id);
        break;
      case 'assets':
        query = supabase
          .from('assets')
          .select(`
            *,
            asset_type:asset_types(name),
            form_responses(*)
          `)
          .eq('organization_id', report.organization_id)
          .is('deleted_at', null);
        break;
      case 'form_submissions':
        query = supabase
          .from('form_submissions')
          .select(`
            *,
            form:forms(name),
            asset:assets(name, id, asset_type_id, asset_types(name))
          `)
          .eq('organization_id', report.organization_id);
        break;
      default:
        query = supabase
          .from('inventory_items')
          .select(`
            *,
            asset_type:asset_types(name)
          `)
          .eq('organization_id', report.organization_id);
    }

    // Add filters if any
    if (report.report_config.filters && report.report_config.filters.length > 0) {
      report.report_config.filters.forEach(filter => {
        switch (filter.operator) {
          case 'equals':
            query = query.eq(filter.field, filter.value);
            break;
          case 'not_equals':
            query = query.neq(filter.field, filter.value);
            break;
          case 'greater_than':
            query = query.gt(filter.field, filter.value);
            break;
          case 'less_than':
            query = query.lt(filter.field, filter.value);
            break;
          case 'contains':
            query = query.ilike(filter.field, `%${filter.value}%`);
            break;
          default:
            break;
        }
      });
    }

    // Apply asset type filtering if specified
    if (report.report_config.assetTypes && report.report_config.assetTypes.length > 0) {
      query = query.in('asset_type_id', report.report_config.assetTypes);
    }

    // Apply sorting if specified
    if (report.report_config.sorts && report.report_config.sorts.length > 0) {
      report.report_config.sorts.forEach(sort => {
        query = query.order(sort.field, { ascending: sort.direction === 'asc' });
      });
    }
    
    // Apply limit if specified
    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error executing report:', error);
      throw error;
    }

    let results = data || [];

    // If usage is requested in columns and subject is inventory_items, calculate usage
    if (subject === 'inventory_items' && columns.includes('usage')) {
      // For each item, fetch intake value and inventory history, then calculate usage
      const monthFilter = report.report_config.filters?.find(f => f.field === 'month_year' && f.operator === 'equals');
      const monthYear = monthFilter ? monthFilter.value : null;
      results = await Promise.all(results.map(async (item: any) => {
        // Intake value: try metadata.intake_value, fallback to 0
        const intakeValue = item.metadata?.intake_value ?? 0;
        // Fetch inventory history for this item
        const { data: history, error: historyError } = await supabase
          .from('inventory_history')
          .select('month_year, quantity')
          .eq('inventory_item_id', item.id)
          .order('month_year', { ascending: true });
        if (historyError) {
          console.error('Error fetching inventory history for report:', historyError);
          item.usage = null;
          return item;
        }
        // Calculate usage array
        const usageArr = calculateInventoryUsage(intakeValue, history || []);
        if (monthYear) {
          // If filtering by month, attach only that month's usage
          const found = usageArr.find(u => u.month_year === monthYear);
          item.usage = found ? found.usage : null;
        } else {
          // Otherwise, attach the full usage array
          item.usage = usageArr;
        }
        return item;
      }));
    }

    return results;
  } catch (error) {
    console.error('Failed to execute report:', error);
    return [];
  }
} 