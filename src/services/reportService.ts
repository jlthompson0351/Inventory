import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/types/database.types';
import { calculateInventoryUsage } from './inventoryService';

export interface ReportConfig {
  subject: string;
  dataSources: string[];
  columns: string[];
  filters: FilterRule[];
  sorts: SortRule[];
  assetTypes?: string[];
  joins?: JoinConfig[];
}

export interface FilterRule {
  id: string;
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';
  value: string;
}

export interface SortRule {
  id: string;
  field: string;
  direction: 'asc' | 'desc';
}

export interface JoinConfig {
  table: string;
  condition: string;
  type: 'inner' | 'left' | 'right';
}

export interface ColumnDefinition {
  id: string;
  label: string;
  type: string;
  source: string;
  table: string;
  column: string;
  description?: string;
}

export interface DataSourceDefinition {
  primaryTable: string;
  columns: {
    id: string;
    label: string;
    type: string;
    table: string;
    column: string;
  }[];
  joins?: {
    table: string;
    condition: string;
    type: 'inner' | 'left' | 'right';
  }[];
}

export type Report = {
  id: string;
  name: string;
  description: string | null;
  report_config: ReportConfig;
  organization_id: string;
  created_at: string;
  updated_at: string;
  is_favorite?: boolean;
  is_template?: boolean;
  template_category?: string;
  last_run_at?: string;
};

export type ReportInsert = {
  name: string;
  description?: string | null;
  report_config: ReportConfig;
  organization_id: string;
  is_favorite?: boolean;
  is_template?: boolean;
  template_category?: string;
};

export type ReportUpdate = {
  name?: string;
  description?: string | null;
  report_config?: ReportConfig;
  is_favorite?: boolean;
  is_template?: boolean;
  template_category?: string;
};

export type ReportRun = {
  id: string;
  report_id: string;
  run_by: string;
  run_at: string;
  row_count?: number;
  execution_time_ms?: number;
  export_format?: string;
  status: 'completed' | 'failed' | 'cancelled';
  error_message?: string;
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

export const createReport = async (report: ReportInsert): Promise<Report> => {
  const { data, error } = await supabase
    .from('reports')
    .insert({
      ...report,
      report_config: report.report_config as unknown as Json
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating report:', error);
    throw error;
  }

  // Convert the JSON back to our specific ReportConfig type
  return {
    ...data,
    report_config: data.report_config as unknown as ReportConfig
  };
};

export const updateReport = async (id: string, updates: ReportUpdate): Promise<Report> => {
  const { data, error } = await supabase
    .from('reports')
    .update({
      ...updates,
      report_config: updates.report_config as unknown as Json,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating report:', error);
    throw error;
  }

  // Convert the JSON back to our specific ReportConfig type
  return {
    ...data,
    report_config: data.report_config as unknown as ReportConfig
  };
};

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

export async function toggleReportFavorite(id: string, isFavorite: boolean): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('reports')
      .update({ is_favorite: isFavorite })
      .eq('id', id);

    if (error) {
      console.error('Error toggling favorite:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Failed to toggle favorite:', error);
    return false;
  }
}

export async function getReportTemplates(organizationId: string): Promise<Report[]> {
  try {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_template', true)
      .order('template_category', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching report templates:', error);
      throw error;
    }

    return (data || []).map(item => ({
      ...item,
      report_config: item.report_config as unknown as ReportConfig
    }));
  } catch (error) {
    console.error('Failed to fetch report templates:', error);
    return [];
  }
}

export async function trackReportRun(
  reportId: string,
  rowCount: number,
  executionTimeMs: number,
  exportFormat?: string,
  status: 'completed' | 'failed' | 'cancelled' = 'completed',
  errorMessage?: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('report_runs')
      .insert({
        report_id: reportId,
        run_by: (await supabase.auth.getUser()).data.user?.id,
        row_count: rowCount,
        execution_time_ms: executionTimeMs,
        export_format: exportFormat,
        status,
        error_message: errorMessage
      });

    if (error) {
      console.error('Error tracking report run:', error);
      // Don't throw here - we don't want to break the report execution
    }
  } catch (error) {
    console.error('Failed to track report run:', error);
    // Don't throw here - we don't want to break the report execution
  }
}

export async function getReportRuns(reportId: string, limit: number = 10): Promise<ReportRun[]> {
  try {
    const { data, error } = await supabase
      .from('report_runs')
      .select('*')
      .eq('report_id', reportId)
      .order('run_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching report runs:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Failed to fetch report runs:', error);
    return [];
  }
}

export async function executeReport(report: Report, limit?: number): Promise<any[]> {
  try {
    const { dataSources, columns, filters, sorts, assetTypes } = report.report_config;
    const results: any[] = [];
    
    // Process each data source
    for (const dataSource of dataSources) {
      let query;
      let sourceData: any[] = [];
      
      switch (dataSource) {
        case 'assets':
          query = supabase
            .from('assets')
            .select(`
              id,
              name,
              description,
              status,
              serial_number,
              barcode,
              acquisition_date,
              created_at,
              updated_at,
              asset_type_id,
              asset_types(id, name, description, color)
            `)
            .eq('organization_id', report.organization_id)
            .is('deleted_at', null);
          
          // Apply asset type filtering if specified
          if (assetTypes && assetTypes.length > 0) {
            query = query.in('asset_type_id', assetTypes);
          }
          
          // Apply filters
          if (filters && filters.length > 0) {
            filters.forEach(filter => {
              if (filter.field.startsWith('assets.')) {
                const fieldName = filter.field.replace('assets.', '');
                switch (filter.operator) {
                  case 'equals':
                    query = query.eq(fieldName, filter.value);
                    break;
                  case 'not_equals':
                    query = query.neq(fieldName, filter.value);
                    break;
                  case 'greater_than':
                    query = query.gt(fieldName, filter.value);
                    break;
                  case 'less_than':
                    query = query.lt(fieldName, filter.value);
                    break;
                  case 'contains':
                    query = query.ilike(fieldName, `%${filter.value}%`);
                    break;
                }
              }
            });
          }
          
          const { data, error } = await query;
          if (error) throw error;
          
          // Transform data to flat structure with proper field mapping
          sourceData = (data || []).map(item => ({
            record_source: 'Assets',
            'assets.id': item.id,
            'assets.name': item.name,
            'assets.description': item.description,
            'assets.status': item.status,
            'assets.serial_number': item.serial_number,
            'assets.barcode': item.barcode,
            'assets.acquisition_date': item.acquisition_date,
            'assets.created_at': item.created_at,
            'assets.updated_at': item.updated_at,
            'assets.asset_type_id': item.asset_type_id,
            'asset_types.id': item.asset_types?.id,
            'asset_types.name': item.asset_types?.name,
            'asset_types.description': item.asset_types?.description,
            'asset_types.color': item.asset_types?.color,
          }));
          break;
          
        case 'asset_types':
          query = supabase
            .from('asset_types')
            .select('*')
            .eq('organization_id', report.organization_id);
          
          // Apply filters
          if (filters && filters.length > 0) {
            filters.forEach(filter => {
              if (filter.field.startsWith('asset_types.')) {
                const fieldName = filter.field.replace('asset_types.', '');
                switch (filter.operator) {
                  case 'equals':
                    query = query.eq(fieldName, filter.value);
                    break;
                  case 'not_equals':
                    query = query.neq(fieldName, filter.value);
                    break;
                  case 'greater_than':
                    query = query.gt(fieldName, filter.value);
                    break;
                  case 'less_than':
                    query = query.lt(fieldName, filter.value);
                    break;
                  case 'contains':
                    query = query.ilike(fieldName, `%${filter.value}%`);
                    break;
                }
              }
            });
          }
          
          const { data: assetTypesData, error: assetTypesError } = await query;
          if (assetTypesError) throw assetTypesError;
          
          sourceData = (assetTypesData || []).map(item => ({
            record_source: 'Asset Types',
            'asset_types.id': item.id,
            'asset_types.name': item.name,
            'asset_types.description': item.description,
            'asset_types.color': item.color,
          }));
          break;
          
        case 'inventory_items':
          query = supabase
            .from('inventory_items')
            .select(`
              id,
              name,
              sku,
              quantity,
              current_price,
              created_at,
              updated_at,
              asset_type_id,
              asset_types(id, name, description, color)
            `)
            .eq('organization_id', report.organization_id);
          
          // Apply asset type filtering if specified
          if (assetTypes && assetTypes.length > 0) {
            query = query.in('asset_type_id', assetTypes);
          }
          
          // Apply filters
          if (filters && filters.length > 0) {
            filters.forEach(filter => {
              if (filter.field.startsWith('inventory_items.')) {
                const fieldName = filter.field.replace('inventory_items.', '');
                switch (filter.operator) {
                  case 'equals':
                    query = query.eq(fieldName, filter.value);
                    break;
                  case 'not_equals':
                    query = query.neq(fieldName, filter.value);
                    break;
                  case 'greater_than':
                    query = query.gt(fieldName, filter.value);
                    break;
                  case 'less_than':
                    query = query.lt(fieldName, filter.value);
                    break;
                  case 'contains':
                    query = query.ilike(fieldName, `%${filter.value}%`);
                    break;
                }
              }
            });
          }
          
          const { data: invData, error: invError } = await query;
          if (invError) throw invError;
          
          sourceData = (invData || []).map(item => ({
            record_source: 'Inventory Items',
            'inventory_items.id': item.id,
            'inventory_items.name': item.name,
            'inventory_items.sku': item.sku,
            'inventory_items.quantity': item.quantity,
            'inventory_items.current_price': item.current_price,
            'inventory_items.created_at': item.created_at,
            'inventory_items.updated_at': item.updated_at,
            'asset_types.id': item.asset_types?.id,
            'asset_types.name': item.asset_types?.name,
            'asset_types.description': item.asset_types?.description,
            'asset_types.color': item.asset_types?.color,
          }));
          break;
          
        case 'form_submissions':
          query = supabase
            .from('form_submissions')
            .select(`
              id,
              form_id,
              submission_data,
              created_at,
              updated_at,
              forms(id, name, description)
            `)
            .eq('organization_id', report.organization_id);
          
          // Apply filters
          if (filters && filters.length > 0) {
            filters.forEach(filter => {
              if (filter.field.startsWith('form_submissions.')) {
                const fieldName = filter.field.replace('form_submissions.', '');
                switch (filter.operator) {
                  case 'equals':
                    query = query.eq(fieldName, filter.value);
                    break;
                  case 'not_equals':
                    query = query.neq(fieldName, filter.value);
                    break;
                  case 'greater_than':
                    query = query.gt(fieldName, filter.value);
                    break;
                  case 'less_than':
                    query = query.lt(fieldName, filter.value);
                    break;
                  case 'contains':
                    query = query.ilike(fieldName, `%${filter.value}%`);
                    break;
                }
              }
            });
          }
          
          const { data: formData, error: formError } = await query;
          if (formError) throw formError;
          
          sourceData = (formData || []).map(item => ({
            record_source: 'Form Submissions',
            'form_submissions.id': item.id,
            'form_submissions.form_id': item.form_id,
            'form_submissions.created_at': item.created_at,
            'form_submissions.updated_at': item.updated_at,
            submission_data: item.submission_data,
            'forms.name': item.forms?.name,
            'forms.description': item.forms?.description,
            // Flatten submission_data fields
            ...Object.entries(item.submission_data || {}).reduce((acc, [key, value]) => ({
              ...acc,
              [`submission.${key}`]: value
            }), {})
          }));
          break;
          
        case 'intake_forms':
        case 'inventory_forms':
        case 'mapping_forms':
          // These are handled through form_submissions with filtering
          const formType = dataSource.replace('_forms', '');
          query = supabase
            .from('form_submissions')
            .select(`
              id,
              form_id,
              submission_data,
              created_at,
              updated_at,
              forms!inner(id, name, description, purpose)
            `)
            .eq('organization_id', report.organization_id)
            .eq('forms.purpose', formType);
          
          const { data: specificFormData, error: specificFormError } = await query;
          if (specificFormError) throw specificFormError;
          
          sourceData = (specificFormData || []).map(item => ({
            record_source: `${formType.charAt(0).toUpperCase() + formType.slice(1)} Forms`,
            'form_submissions.id': item.id,
            'form_submissions.form_id': item.form_id,
            'form_submissions.created_at': item.created_at,
            submission_data: item.submission_data,
            'forms.name': item.forms?.name,
            'forms.description': item.forms?.description,
            // Flatten submission_data fields
            ...Object.entries(item.submission_data || {}).reduce((acc, [key, value]) => ({
              ...acc,
              [`submission.${key}`]: value
            }), {})
          }));
          break;
          
        default:
          console.warn(`Unknown data source: ${dataSource}`);
          continue;
      }
      
      // Add source data to results
      results.push(...sourceData);
    }
    
    // Apply sorting across all results
    if (sorts && sorts.length > 0) {
      results.sort((a, b) => {
        for (const sort of sorts) {
          const aVal = a[sort.field];
          const bVal = b[sort.field];
          
          if (aVal === bVal) continue;
          
          if (aVal === null || aVal === undefined) return 1;
          if (bVal === null || bVal === undefined) return -1;
          
          const comparison = aVal < bVal ? -1 : 1;
          return sort.direction === 'asc' ? comparison : -comparison;
        }
        return 0;
      });
    }
    
    // Apply limit if specified
    if (limit) {
      return results.slice(0, limit);
    }
    
    return results;
  } catch (error) {
    console.error('Failed to execute report:', error);
    throw error;
  }
}

// Data source definitions (MaintainX style)
export const DATA_SOURCE_DEFINITIONS: Record<string, DataSourceDefinition> = {
  assets: {
    primaryTable: 'assets',
    columns: [
      { id: 'asset_id', label: 'Asset ID', type: 'text', table: 'assets', column: 'id' },
      { id: 'asset_name', label: 'Asset Name', type: 'text', table: 'assets', column: 'name' },
      { id: 'asset_description', label: 'Asset Description', type: 'text', table: 'assets', column: 'description' },
      { id: 'asset_serial_number', label: 'Serial Number', type: 'text', table: 'assets', column: 'serial_number' },
      { id: 'asset_created_at', label: 'Asset Created', type: 'datetime', table: 'assets', column: 'created_at' },
      { id: 'asset_type_id', label: 'Asset Type ID', type: 'text', table: 'assets', column: 'asset_type_id' },
    ],
    joins: [
      { table: 'asset_types', condition: 'assets.asset_type_id = asset_types.id', type: 'left' as const }
    ]
  },
  asset_types: {
    primaryTable: 'asset_types',
    columns: [
      { id: 'asset_type_id', label: 'Asset Type ID', type: 'text', table: 'asset_types', column: 'id' },
      { id: 'asset_type_name', label: 'Asset Type Name', type: 'text', table: 'asset_types', column: 'name' },
      { id: 'asset_type_description', label: 'Asset Type Description', type: 'text', table: 'asset_types', column: 'description' },
      { id: 'asset_type_color', label: 'Asset Type Color', type: 'text', table: 'asset_types', column: 'color' },
      { id: 'asset_type_created_at', label: 'Asset Type Created', type: 'datetime', table: 'asset_types', column: 'created_at' },
    ]
  },
  inventory_items: {
    primaryTable: 'inventory_items',
    columns: [
      { id: 'inventory_id', label: 'Inventory ID', type: 'text', table: 'inventory_items', column: 'id' },
      { id: 'inventory_quantity', label: 'Quantity', type: 'number', table: 'inventory_items', column: 'quantity' },
      { id: 'inventory_price', label: 'Price', type: 'number', table: 'inventory_items', column: 'price' },
      { id: 'inventory_created_at', label: 'Inventory Created', type: 'datetime', table: 'inventory_items', column: 'created_at' },
      { id: 'inventory_asset_id', label: 'Asset ID', type: 'text', table: 'inventory_items', column: 'asset_id' },
    ],
    joins: [
      { table: 'assets', condition: 'inventory_items.asset_id = assets.id', type: 'left' as const },
      { table: 'asset_types', condition: 'assets.asset_type_id = asset_types.id', type: 'left' as const }
    ]
  },
  form_submissions: {
    primaryTable: 'form_submissions',
    columns: [
      { id: 'submission_id', label: 'Submission ID', type: 'text', table: 'form_submissions', column: 'id' },
      { id: 'submission_data', label: 'Submission Data', type: 'json', table: 'form_submissions', column: 'submission_data' },
      { id: 'submission_created_at', label: 'Submitted At', type: 'datetime', table: 'form_submissions', column: 'created_at' },
      { id: 'submission_form_id', label: 'Form ID', type: 'text', table: 'form_submissions', column: 'form_id' },
    ],
    joins: [
      { table: 'forms', condition: 'form_submissions.form_id = forms.id', type: 'left' as const },
      { table: 'assets', condition: 'form_submissions.asset_id = assets.id', type: 'left' as const }
    ]
  }
};

/**
 * Get available columns based on selected data sources (MaintainX style)
 */
export const getAvailableColumnsForDataSources = async (
  dataSources: string[]
): Promise<ColumnDefinition[]> => {
  const columns: ColumnDefinition[] = [];
  
  // Add base columns from selected data sources
  dataSources.forEach(sourceId => {
    const source = DATA_SOURCE_DEFINITIONS[sourceId as keyof typeof DATA_SOURCE_DEFINITIONS];
    if (source) {
      source.columns.forEach(col => {
        columns.push({
          ...col,
          source: sourceId
        });
      });
    }
  });
  
  // TODO: Add dynamic form field columns based on selected forms
  // This would query the database for form fields from selected form types
  
  return columns;
};

/**
 * Build dynamic query based on selected data sources and columns (MaintainX style)
 */
export const buildDynamicQuery = (config: ReportConfig): string => {
  const { dataSources, columns, filters, sorts } = config;
  
  // Determine primary table and joins
  let primaryTable = 'assets'; // Default
  const requiredJoins = new Set<string>();
  
  // Analyze which tables we need based on selected columns
  columns.forEach(columnId => {
    dataSources.forEach(sourceId => {
      const source = DATA_SOURCE_DEFINITIONS[sourceId as keyof typeof DATA_SOURCE_DEFINITIONS];
      if (source) {
        const column = source.columns.find(col => col.id === columnId);
        if (column) {
          // Add required joins for this column (if joins exist)
          if (source.joins) {
            source.joins.forEach(join => {
              requiredJoins.add(`${join.type.toUpperCase()} JOIN ${join.table} ON ${join.condition}`);
            });
          }
        }
      }
    });
  });
  
  // Build SELECT clause
  const selectColumns = columns.map(columnId => {
    // Find the actual column definition
    for (const sourceId of dataSources) {
      const source = DATA_SOURCE_DEFINITIONS[sourceId as keyof typeof DATA_SOURCE_DEFINITIONS];
      if (source) {
        const column = source.columns.find(col => col.id === columnId);
        if (column) {
          return `${column.table}.${column.column} as ${column.id}`;
        }
      }
    }
    return columnId; // Fallback
  }).join(', ');
  
  // Build query
  let query = `SELECT ${selectColumns} FROM ${primaryTable}`;
  
  // Add joins
  Array.from(requiredJoins).forEach(join => {
    query += ` ${join}`;
  });
  
  // Add WHERE clause for filters
  if (filters.length > 0) {
    const whereConditions = filters.map(filter => {
      const operator = getOperatorSQL(filter.operator);
      return `${filter.field} ${operator} '${filter.value}'`;
    }).join(' AND ');
    query += ` WHERE ${whereConditions}`;
  }
  
  // Add ORDER BY clause
  if (sorts.length > 0) {
    const orderBy = sorts.map(sort => 
      `${sort.field} ${sort.direction.toUpperCase()}`
    ).join(', ');
    query += ` ORDER BY ${orderBy}`;
  }
  
  return query;
};

const getOperatorSQL = (operator: string): string => {
  switch (operator) {
    case 'equals': return '=';
    case 'not_equals': return '!=';
    case 'greater_than': return '>';
    case 'less_than': return '<';
    case 'contains': return 'ILIKE';
    default: return '=';
  }
}; 