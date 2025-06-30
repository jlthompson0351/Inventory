import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/types/database.types';
import { calculateInventoryUsage } from './inventoryService';

// 🚀 ADVANCED REPORTING CONFIGURATION
export interface ReportConfig {
  subject: string;
  dataSources: string[];
  columns: string[];
  filters: FilterRule[];
  sorts: SortRule[];
  assetTypes?: string[];
  joins?: JoinConfig[];
  aggregations?: AggregationConfig[];
  calculations?: CalculationConfig[];
  pagination?: PaginationConfig;
  caching?: CachingConfig;
}

export interface FilterRule {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with' | 'in' | 'not_in' | 'between' | 'is_null' | 'is_not_null' | 'regex' | 'fuzzy_match';
  value: any;
  secondValue?: any; // For 'between' operator
  caseSensitive?: boolean;
  logic?: 'AND' | 'OR';
}

export interface SortRule {
  field: string;
  direction: 'asc' | 'desc';
  nullsFirst?: boolean;
}

export interface AggregationConfig {
  field: string;
  function: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'median' | 'stddev' | 'variance';
  alias: string;
  groupBy?: string[];
}

export interface CalculationConfig {
  id: string;
  label: string;
  expression: string;
  type: 'formula' | 'percentage' | 'difference' | 'running_total' | 'rank';
  dependencies: string[];
}

export interface PaginationConfig {
  page: number;
  limit: number;
  offset?: number;
}

export interface CachingConfig {
  enabled: boolean;
  ttl: number; // Time to live in seconds
  key?: string;
  refreshOnDataChange?: boolean;
}

export interface JoinConfig {
  table: string;
  condition: string;
  type: 'inner' | 'left' | 'right' | 'full';
  alias?: string;
}

export interface ColumnDefinition {
  id: string;
  label: string;
  type: string;
  source: string;
  table: string;
  column: string;
  description?: string;
  aggregatable?: boolean;
  sortable?: boolean;
  filterable?: boolean;
  format?: 'currency' | 'percentage' | 'date' | 'datetime' | 'number' | 'text';
}

export interface DataSourceDefinition {
  primaryTable: string;
  columns: ColumnDefinition[];
  joins?: JoinConfig[];
  indexes?: string[];
  constraints?: string[];
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
  execution_stats?: ExecutionStats;
  version?: number;
  tags?: string[];
};

export interface ExecutionStats {
  executionTime: number;
  rowCount: number;
  cacheHit: boolean;
  queryComplexity: 'low' | 'medium' | 'high' | 'extreme';
  dataSourcesUsed: string[];
  bytesProcessed: number;
}

export type ReportInsert = {
  name: string;
  description?: string | null;
  report_config: ReportConfig;
  organization_id: string;
  is_favorite?: boolean;
  is_template?: boolean;
  template_category?: string;
  version?: number;
  tags?: string[];
};

export type ReportUpdate = {
  name?: string;
  description?: string | null;
  report_config?: ReportConfig;
  is_favorite?: boolean;
  is_template?: boolean;
  template_category?: string;
  version?: number;
  tags?: string[];
};

export type ReportRun = {
  id: string;
  report_id: string;
  run_by: string;
  run_at: string;
  row_count?: number;
  execution_time_ms?: number;
  export_format?: string;
  status: 'completed' | 'failed' | 'cancelled' | 'running' | 'queued';
  error_message?: string;
  cache_hit?: boolean;
  query_hash?: string;
  bytes_processed?: number;
};

// 🚀 ENTERPRISE REPORT CACHE MANAGER
class ReportCacheManager {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private maxCacheSize = 100; // Maximum number of cached reports

  generateCacheKey(config: ReportConfig, organizationId: string): string {
    const configString = JSON.stringify({
      ...config,
      organizationId,
      // Remove pagination from cache key to allow different pages to share base data
      pagination: undefined
    });
    return btoa(configString).replace(/[^a-zA-Z0-9]/g, '').substring(0, 50);
  }

  get(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > cached.ttl * 1000) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  set(key: string, data: any, ttl: number = 300): void {
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }
    
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      entries: Array.from(this.cache.entries()).map(([key, value]) => ({
        key,
        size: JSON.stringify(value.data).length,
        age: Date.now() - value.timestamp,
        ttl: value.ttl
      }))
    };
  }
}

// Global cache instance
const reportCache = new ReportCacheManager();

// 🚀 ADVANCED QUERY BUILDER
class QueryBuilder {
  private config: ReportConfig;
  private organizationId: string;
  private tableAliases = new Map<string, string>();
  private aliasCounter = 0;

  constructor(config: ReportConfig, organizationId: string) {
    this.config = config;
    this.organizationId = organizationId;
  }

  private getTableAlias(table: string): string {
    if (!this.tableAliases.has(table)) {
      this.tableAliases.set(table, `t${this.aliasCounter++}`);
    }
    return this.tableAliases.get(table)!;
  }

  async buildQuery(): Promise<{
    sql: string;
    params: any[];
    estimatedComplexity: 'low' | 'medium' | 'high' | 'extreme';
  }> {
    const { dataSources, columns, filters, sorts, aggregations, joins } = this.config;
    
    // Determine primary table and required joins
    const primaryDataSource = this.determinePrimaryDataSource();
    const requiredJoins = this.calculateRequiredJoins();
    
    // Build SELECT clause
    const selectColumns = await this.buildSelectClause();
    
    // Build FROM clause with joins
    const fromClause = this.buildFromClause(primaryDataSource, requiredJoins);
    
    // Build WHERE clause
    const { whereClause, params } = this.buildWhereClause();
    
    // Build GROUP BY clause (if aggregations exist)
    const groupByClause = this.buildGroupByClause();
    
    // Build HAVING clause (for aggregation filters)
    const havingClause = this.buildHavingClause();
    
    // Build ORDER BY clause
    const orderByClause = this.buildOrderByClause();
    
    // Build LIMIT and OFFSET
    const limitClause = this.buildLimitClause();
    
    // Combine everything
    const sql = `
      SELECT ${selectColumns}
      FROM ${fromClause}
      ${whereClause ? `WHERE ${whereClause}` : ''}
      ${groupByClause ? `GROUP BY ${groupByClause}` : ''}
      ${havingClause ? `HAVING ${havingClause}` : ''}
      ${orderByClause ? `ORDER BY ${orderByClause}` : ''}
      ${limitClause}
    `.trim().replace(/\s+/g, ' ');
    
    const complexity = this.estimateQueryComplexity(sql, requiredJoins.length);
    
    return { sql, params, estimatedComplexity: complexity };
  }

  private determinePrimaryDataSource(): string {
    // Logic to determine the best primary table based on data sources and columns
    const { dataSources, columns } = this.config;
    
    // Count column references per data source
    const sourceWeights = new Map<string, number>();
    dataSources.forEach(source => sourceWeights.set(source, 0));
    
    columns.forEach(columnId => {
      dataSources.forEach(source => {
        if (columnId.startsWith(source)) {
          sourceWeights.set(source, (sourceWeights.get(source) || 0) + 1);
        }
      });
    });
    
    // Return the source with the most column references
    let maxWeight = 0;
    let primarySource = dataSources[0];
    
    for (const [source, weight] of sourceWeights) {
      if (weight > maxWeight) {
        maxWeight = weight;
        primarySource = source;
      }
    }
    
    return primarySource;
  }

  private calculateRequiredJoins(): JoinConfig[] {
    const { dataSources, columns } = this.config;
    const requiredJoins: JoinConfig[] = [];
    const primaryDataSource = this.determinePrimaryDataSource();
    
    // Add joins based on data source relationships
    dataSources.forEach(source => {
      if (source !== primaryDataSource) {
        const joinConfig = this.getJoinConfigForDataSource(source, primaryDataSource);
        if (joinConfig) {
          requiredJoins.push(joinConfig);
        }
      }
    });
    
    // Add any custom joins from config
    if (this.config.joins) {
      requiredJoins.push(...this.config.joins);
    }
    
    return requiredJoins;
  }

  private getJoinConfigForDataSource(source: string, primarySource: string): JoinConfig | null {
    // Define common join patterns
    const joinPatterns: Record<string, Record<string, JoinConfig>> = {
      'assets': {
        'asset_types': {
          table: 'asset_types',
          condition: 'assets.asset_type_id = asset_types.id',
          type: 'left'
        },
        'inventory_items': {
          table: 'inventory_items',
          condition: 'assets.id = inventory_items.asset_id',
          type: 'left'
        }
      },
      'inventory_items': {
        'assets': {
          table: 'assets',
          condition: 'inventory_items.asset_id = assets.id',
          type: 'left'
        },
        'asset_types': {
          table: 'asset_types',
          condition: 'inventory_items.asset_type_id = asset_types.id',
          type: 'left'
        }
      },
      'form_submissions': {
        'forms': {
          table: 'forms',
          condition: 'form_submissions.form_id = forms.id',
          type: 'left'
        },
        'assets': {
          table: 'assets',
          condition: 'form_submissions.asset_id = assets.id',
          type: 'left'
        }
      }
    };
    
    return joinPatterns[primarySource]?.[source] || null;
  }

  private async buildSelectClause(): Promise<string> {
    const { columns, aggregations, calculations } = this.config;
    const selectItems: string[] = [];
    
    // Add regular columns
    for (const columnId of columns) {
      const columnDef = await this.getColumnDefinition(columnId);
      if (columnDef) {
        selectItems.push(`${columnDef.table}.${columnDef.column} as "${columnId}"`);
      }
    }
    
    // Add aggregations
    if (aggregations) {
      for (const agg of aggregations) {
        selectItems.push(`${agg.function.toUpperCase()}(${agg.field}) as "${agg.alias}"`);
      }
    }
    
    // Add calculations (will be processed post-query)
    if (calculations) {
      for (const calc of calculations) {
        // For now, mark calculations to be processed after query execution
        selectItems.push(`'__CALCULATION__' as "${calc.id}"`);
      }
    }
    
    return selectItems.join(', ') || '*';
  }

  private buildFromClause(primaryDataSource: string, joins: JoinConfig[]): string {
    const primaryAlias = this.getTableAlias(primaryDataSource);
    let fromClause = `${primaryDataSource} ${primaryAlias}`;
    
    for (const join of joins) {
      const joinAlias = join.alias || this.getTableAlias(join.table);
      fromClause += ` ${join.type.toUpperCase()} JOIN ${join.table} ${joinAlias} ON ${join.condition}`;
    }
    
    return fromClause;
  }

  private buildWhereClause(): { whereClause: string; params: any[] } {
    const { filters } = this.config;
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;
    
    // Add organization filter (always required)
    conditions.push(`organization_id = $${paramIndex}`);
    params.push(this.organizationId);
    paramIndex++;
    
    // Add custom filters
    for (const filter of filters) {
      const condition = this.buildFilterCondition(filter, paramIndex);
      if (condition) {
        conditions.push(condition.sql);
        params.push(...condition.params);
        paramIndex += condition.params.length;
      }
    }
    
    // Add asset type filters if specified
    if (this.config.assetTypes && this.config.assetTypes.length > 0) {
      conditions.push(`asset_type_id = ANY($${paramIndex})`);
      params.push(this.config.assetTypes);
      paramIndex++;
    }
    
    return {
      whereClause: conditions.length > 0 ? conditions.join(' AND ') : '',
      params
    };
  }

  private buildFilterCondition(filter: FilterRule, paramIndex: number): { sql: string; params: any[] } | null {
    const { field, operator, value, secondValue, caseSensitive } = filter;
    const params: any[] = [];
    
    switch (operator) {
      case 'equals':
        return { sql: `${field} = $${paramIndex}`, params: [value] };
      
      case 'not_equals':
        return { sql: `${field} != $${paramIndex}`, params: [value] };
      
      case 'greater_than':
        return { sql: `${field} > $${paramIndex}`, params: [value] };
      
      case 'less_than':
        return { sql: `${field} < $${paramIndex}`, params: [value] };
      
      case 'contains':
        const containsOp = caseSensitive ? 'LIKE' : 'ILIKE';
        return { sql: `${field} ${containsOp} $${paramIndex}`, params: [`%${value}%`] };
      
      case 'not_contains':
        const notContainsOp = caseSensitive ? 'NOT LIKE' : 'NOT ILIKE';
        return { sql: `${field} ${notContainsOp} $${paramIndex}`, params: [`%${value}%`] };
      
      case 'starts_with':
        const startsOp = caseSensitive ? 'LIKE' : 'ILIKE';
        return { sql: `${field} ${startsOp} $${paramIndex}`, params: [`${value}%`] };
      
      case 'ends_with':
        const endsOp = caseSensitive ? 'LIKE' : 'ILIKE';
        return { sql: `${field} ${endsOp} $${paramIndex}`, params: [`%${value}`] };
      
      case 'in':
        return { sql: `${field} = ANY($${paramIndex})`, params: [Array.isArray(value) ? value : [value]] };
      
      case 'not_in':
        return { sql: `${field} != ALL($${paramIndex})`, params: [Array.isArray(value) ? value : [value]] };
      
      case 'between':
        return { 
          sql: `${field} BETWEEN $${paramIndex} AND $${paramIndex + 1}`, 
          params: [value, secondValue] 
        };
      
      case 'is_null':
        return { sql: `${field} IS NULL`, params: [] };
      
      case 'is_not_null':
        return { sql: `${field} IS NOT NULL`, params: [] };
      
      case 'regex':
        return { sql: `${field} ~ $${paramIndex}`, params: [value] };
      
      case 'fuzzy_match':
        return { sql: `${field} % $${paramIndex}`, params: [value] };
      
      default:
        return null;
    }
  }

  private buildGroupByClause(): string {
    const { aggregations } = this.config;
    if (!aggregations || aggregations.length === 0) return '';
    
    // Extract group by fields from aggregations
    const groupByFields = new Set<string>();
    aggregations.forEach(agg => {
      if (agg.groupBy) {
        agg.groupBy.forEach(field => groupByFields.add(field));
      }
    });
    
    return Array.from(groupByFields).join(', ');
  }

  private buildHavingClause(): string {
    // TODO: Implement HAVING clause for aggregation filters
    return '';
  }

  private buildOrderByClause(): string {
    const { sorts } = this.config;
    if (!sorts || sorts.length === 0) return '';
    
    return sorts.map(sort => {
      const nullsOrder = sort.nullsFirst ? 'NULLS FIRST' : 'NULLS LAST';
      return `${sort.field} ${sort.direction.toUpperCase()} ${nullsOrder}`;
    }).join(', ');
  }

  private buildLimitClause(): string {
    const { pagination } = this.config;
    if (!pagination) return '';
    
    const offset = pagination.offset || (pagination.page - 1) * pagination.limit;
    return `LIMIT ${pagination.limit} OFFSET ${offset}`;
  }

  private async getColumnDefinition(columnId: string): Promise<ColumnDefinition | null> {
    // This would lookup column definitions from our data source definitions
    // For now, simple parsing
    if (columnId.includes('.')) {
      const [table, column] = columnId.split('.');
      return {
        id: columnId,
        label: column,
        type: 'text',
        source: table,
        table,
        column
      };
    }
    return null;
  }

  private estimateQueryComplexity(sql: string, joinCount: number): 'low' | 'medium' | 'high' | 'extreme' {
    let complexity = 0;
    
    // Base complexity factors
    complexity += joinCount * 10;
    complexity += (sql.match(/GROUP BY/gi) || []).length * 20;
    complexity += (sql.match(/HAVING/gi) || []).length * 15;
    complexity += (sql.match(/DISTINCT/gi) || []).length * 10;
    complexity += (sql.match(/UNION/gi) || []).length * 25;
    complexity += (sql.match(/SUBQUERY|EXISTS|IN \(/gi) || []).length * 15;
    
    if (complexity < 20) return 'low';
    if (complexity < 50) return 'medium';
    if (complexity < 100) return 'high';
    return 'extreme';
  }
}

// 🚀 PARALLEL DATA PROCESSOR
class ParallelDataProcessor {
  static async processDataSources(
    dataSources: string[],
    config: ReportConfig,
    organizationId: string
  ): Promise<any[]> {
    const chunks = this.chunkArray(dataSources, Math.min(3, dataSources.length)); // Process max 3 in parallel
    const results: any[] = [];
    
    for (const chunk of chunks) {
      const chunkPromises = chunk.map(dataSource => 
        this.processDataSource(dataSource, config, organizationId)
      );
      
      const chunkResults = await Promise.allSettled(chunkPromises);
      
      chunkResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(...result.value);
        } else {
          console.error(`Failed to process data source ${chunk[index]}:`, result.reason);
        }
      });
    }
    
    return results;
  }

  private static chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private static async processDataSource(
    dataSource: string,
    config: ReportConfig,
    organizationId: string
  ): Promise<any[]> {
    // Enhanced data source processing with optimized queries
    switch (dataSource) {
      case 'assets':
        return this.processAssetsDataSource(config, organizationId);
      
      case 'asset_types':
        return this.processAssetTypesDataSource(config, organizationId);
      
      case 'inventory_items':
        return this.processInventoryItemsDataSource(config, organizationId);
      
      case 'inventory_history':
        return this.processInventoryHistoryDataSource(config, organizationId);
        
      case 'inventory_price_history':
        return this.processPriceHistoryDataSource(config, organizationId);
        
      case 'forms':
        return this.processFormsDataSource(config, organizationId);
      
      case 'form_submissions':
        return this.processFormSubmissionsDataSource(config, organizationId);
        
      case 'form_responses':
        return this.processFormResponsesDataSource(config, organizationId);
        
      case 'organizations':
        return this.processOrganizationsDataSource(config, organizationId);
        
      case 'organization_members':
        return this.processOrgMembersDataSource(config, organizationId);
        
      case 'users':
        return this.processUsersDataSource(config, organizationId);
        
      case 'locations':
        return this.processLocationsDataSource(config, organizationId);
        
      case 'system_logs':
        return this.processSystemLogsDataSource(config, organizationId);
        
      case 'asset_formulas':
        return this.processAssetFormulasDataSource(config, organizationId);
        
      case 'asset_type_forms':
        return this.processAssetTypeFormsDataSource(config, organizationId);
      
      default:
        console.warn(`Unknown data source: ${dataSource}`);
        return [];
    }
  }

  private static async processAssetsDataSource(config: ReportConfig, organizationId: string): Promise<any[]> {
    let query = supabase
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
        metadata,
        asset_types!inner(id, name, description, color, conversion_fields)
      `)
      .eq('organization_id', organizationId)
      .is('deleted_at', null);

    // Apply asset type filtering
    if (config.assetTypes && config.assetTypes.length > 0) {
      query = query.in('asset_type_id', config.assetTypes);
    }

    // Apply filters specific to assets
    if (config.filters) {
      config.filters.forEach(filter => {
        if (filter.field.startsWith('assets.')) {
          const fieldName = filter.field.replace('assets.', '');
          query = this.applyFilterToQuery(query, fieldName, filter);
        }
      });
    }

    // Apply sorting
    if (config.sorts) {
      config.sorts.forEach(sort => {
        if (sort.field.startsWith('assets.')) {
          const fieldName = sort.field.replace('assets.', '');
          query = query.order(fieldName, { ascending: sort.direction === 'asc' });
        }
      });
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(item => ({
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
      'asset_types.id': item.asset_types?.id,
      'asset_types.name': item.asset_types?.name,
      'asset_types.description': item.asset_types?.description,
      'asset_types.color': item.asset_types?.color,
      // Process conversion fields
      ...this.processConversionFields(item, Array.isArray(item.asset_types?.conversion_fields) ? item.asset_types.conversion_fields : [])
    }));
  }

  private static async processAssetTypesDataSource(config: ReportConfig, organizationId: string): Promise<any[]> {
    let query = supabase
      .from('asset_types')
      .select('*')
      .eq('organization_id', organizationId);

    // Apply asset type filtering
    if (config.assetTypes && config.assetTypes.length > 0) {
      query = query.in('id', config.assetTypes);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(item => ({
      record_source: 'Asset Types',
      'asset_types.id': item.id,
      'asset_types.name': item.name,
      'asset_types.description': item.description,
      'asset_types.color': item.color,
      'asset_types.created_at': item.created_at,
      'asset_types.updated_at': item.updated_at
    }));
  }

  private static async processInventoryItemsDataSource(config: ReportConfig, organizationId: string): Promise<any[]> {
    let query = supabase
      .from('inventory_items')
      .select(`
        *,
        asset_types!inner(id, name, description, color, conversion_fields)
      `)
      .eq('organization_id', organizationId);

    // Apply asset type filtering
    if (config.assetTypes && config.assetTypes.length > 0) {
      query = query.in('asset_type_id', config.assetTypes);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(item => ({
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
      // Process conversion fields
      ...this.processConversionFields(item, Array.isArray(item.asset_types?.conversion_fields) ? item.asset_types.conversion_fields : [])
    }));
  }

  private static async processInventoryHistoryDataSource(config: ReportConfig, organizationId: string): Promise<any[]> {
    const query = supabase
      .from('inventory_history')
      .select('*')
      .eq('organization_id', organizationId);

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(item => ({
      record_source: 'Inventory History',
      'inventory_history.id': item.id,
      'inventory_history.inventory_item_id': item.inventory_item_id,
      'inventory_history.event_type': item.event_type,
      'inventory_history.check_type': item.check_type,
      'inventory_history.quantity': item.quantity,
      'inventory_history.condition': item.condition,
      'inventory_history.location': item.location,
      'inventory_history.status': item.status,
      'inventory_history.notes': item.notes,
      'inventory_history.check_date': item.check_date,
      'inventory_history.month_year': item.month_year,
      'inventory_history.created_at': item.created_at,
      'inventory_history.created_by': item.created_by
    }));
  }

  private static async processPriceHistoryDataSource(config: ReportConfig, organizationId: string): Promise<any[]> {
    const query = supabase
      .from('inventory_price_history')
      .select('*')
      .eq('organization_id', organizationId);

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(item => ({
      record_source: 'Price History',
      'inventory_price_history.id': item.id,
      'inventory_price_history.inventory_item_id': item.inventory_item_id,
      'inventory_price_history.price': item.price,
      'inventory_price_history.currency': item.currency,
      'inventory_price_history.effective_date': item.effective_date,
      'inventory_price_history.created_at': item.created_at
    }));
  }

  private static async processFormsDataSource(config: ReportConfig, organizationId: string): Promise<any[]> {
    const query = supabase
      .from('forms')
      .select('*')
      .eq('organization_id', organizationId);

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(item => ({
      record_source: 'Forms',
      'forms.id': item.id,
      'forms.name': item.name,
      'forms.description': item.description,
      'forms.form_type': item.form_type,
      'forms.purpose': item.purpose,
      'forms.status': item.status,
      'forms.is_template': item.is_template,
      'forms.version': item.version,
      'forms.created_at': item.created_at,
      'forms.updated_at': item.updated_at
    }));
  }

  private static async processFormSubmissionsDataSource(config: ReportConfig, organizationId: string): Promise<any[]> {
    let query = supabase
      .from('form_submissions')
      .select(`
        id,
        form_id,
        submission_data,
        created_at,
        updated_at,
        forms!inner(id, name, description)
      `)
      .eq('organization_id', organizationId);

    // Apply filters specific to form submissions
    if (config.filters) {
      config.filters.forEach(filter => {
        if (filter.field.startsWith('form_submissions.')) {
          const fieldName = filter.field.replace('form_submissions.', '');
          query = this.applyFilterToQuery(query, fieldName, filter);
        }
      });
    }

    // Apply sorting
    if (config.sorts) {
      config.sorts.forEach(sort => {
        if (sort.field.startsWith('form_submissions.')) {
          const fieldName = sort.field.replace('form_submissions.', '');
          query = query.order(fieldName, { ascending: sort.direction === 'asc' });
        }
      });
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(item => {
      const submissionFields: Record<string, any> = {};
      
      // Create form_field keys that match ReportBuilder expectations
      if (item.submission_data && typeof item.submission_data === 'object') {
        Object.entries(item.submission_data).forEach(([key, value]) => {
          submissionFields[`form_field.${item.form_id}.${key}`] = value;
        });
      }

      return {
        record_source: 'Form Submissions',
        'form_submissions.id': item.id,
        'form_submissions.form_id': item.form_id,
        'form_submissions.created_at': item.created_at,
        'form_submissions.updated_at': item.updated_at,
        'forms.name': item.forms?.name,
        'forms.description': item.forms?.description,
        ...submissionFields
      };
    });
  }

  private static async processFormResponsesDataSource(config: ReportConfig, organizationId: string): Promise<any[]> {
    const query = supabase
      .from('form_responses')
      .select('*')
      .eq('organization_id', organizationId);

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(item => ({
      record_source: 'Form Responses',
      'form_responses.id': item.id,
      'form_responses.form_id': item.form_id,
      'form_responses.inventory_item_id': item.inventory_item_id,
      'form_responses.response_data': item.response_data,
      'form_responses.created_at': item.created_at,
      'form_responses.updated_at': item.updated_at
    }));
  }

  private static async processOrganizationsDataSource(config: ReportConfig, organizationId: string): Promise<any[]> {
    // Organizations can only see their own org data
    const query = supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId);

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(item => ({
      record_source: 'Organizations',
      'organizations.id': item.id,
      'organizations.name': item.name,
      'organizations.description': item.description,
      'organizations.is_mothership': item.is_mothership,
      'organizations.created_at': item.created_at,
      'organizations.updated_at': item.updated_at
    }));
  }

  private static async processOrgMembersDataSource(config: ReportConfig, organizationId: string): Promise<any[]> {
    const query = supabase
      .from('organization_members')
      .select('*')
      .eq('organization_id', organizationId);

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(item => ({
      record_source: 'Organization Members',
      'organization_members.id': item.id,
      'organization_members.user_id': item.user_id,
      'organization_members.role': item.role,
      'organization_members.created_at': item.created_at,
      'organization_members.updated_at': item.updated_at
    }));
  }

  private static async processUsersDataSource(config: ReportConfig, organizationId: string): Promise<any[]> {
    // Get organization members with user details from users_view
    const query = supabase
      .from('organization_members')
      .select(`
        *,
        users_view!inner (
          id,
          email,
          full_name
        )
      `)
      .eq('organization_id', organizationId);

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(item => ({
      record_source: 'Users',
      'users.id': item.users_view?.id || item.user_id,
      'users.email': item.users_view?.email || null,
      'users.full_name': item.users_view?.full_name || null,
      'users.created_at': item.created_at,
      'organization_members.role': item.role,
      'organization_members.joined_at': item.created_at
    }));
  }

  private static async processLocationsDataSource(config: ReportConfig, organizationId: string): Promise<any[]> {
    const query = supabase
      .from('locations')
      .select('*')
      .eq('organization_id', organizationId);

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(item => ({
      record_source: 'Locations',
      'locations.id': item.id,
      'locations.name': item.name,
      'locations.parent_id': item.parent_id,
      'locations.created_at': item.created_at,
      'locations.updated_at': item.updated_at
    }));
  }

  private static async processSystemLogsDataSource(config: ReportConfig, organizationId: string): Promise<any[]> {
    const query = supabase
      .from('system_logs')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(item => ({
      record_source: 'System Logs',
      'system_logs.id': item.id,
      'system_logs.type': item.type,
      'system_logs.message': item.message,
      'system_logs.actor_id': item.actor_id,
      'system_logs.created_at': item.created_at
    }));
  }

  private static async processAssetFormulasDataSource(config: ReportConfig, organizationId: string): Promise<any[]> {
    const query = supabase
      .from('asset_formulas')
      .select('*')
      .eq('organization_id', organizationId);

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(item => ({
      record_source: 'Asset Formulas',
      'asset_formulas.id': item.id,
      'asset_formulas.asset_type_id': item.asset_type_id,
      'asset_formulas.inventory_item_id': item.inventory_item_id,
      'asset_formulas.source_field': item.source_field,
      'asset_formulas.target_field': item.target_field,
      'asset_formulas.formula': item.formula,
      'asset_formulas.created_at': item.created_at,
      'asset_formulas.updated_at': item.updated_at
    }));
  }

  private static async processAssetTypeFormsDataSource(config: ReportConfig, organizationId: string): Promise<any[]> {
    const query = supabase
      .from('asset_type_forms')
      .select('*, asset_types!inner(name), forms!inner(name)')
      .eq('organization_id', organizationId);

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(item => ({
      record_source: 'Asset Type Forms',
      'asset_type_forms.id': item.id,
      'asset_type_forms.asset_type_id': item.asset_type_id,
      'asset_type_forms.form_id': item.form_id,
      'asset_type_forms.purpose': item.purpose,
      'asset_type_forms.created_at': item.created_at,
      'asset_types.name': item.asset_types?.name,
      'forms.name': item.forms?.name
    }));
  }

  private static processConversionFields(item: any, conversionFields: any[]): Record<string, any> {
    const result: Record<string, any> = {};
    
    if (!conversionFields || !Array.isArray(conversionFields)) {
      return result;
    }

    conversionFields.forEach(field => {
      // Ensure field_name and asset_type_id are present
      const assetTypeId = item.asset_types?.id || item.asset_type_id;
      if (field.field_name && assetTypeId) {
        const fieldId = `conversion.${assetTypeId}.${field.field_name}`;
        // Get the actual value from metadata instead of asset type name
        const value = item.metadata?.[field.field_name];
        result[fieldId] = value !== undefined && value !== null ? value : '';
      }
    });

    return result;
  }

  private static applyFilterToQuery(query: any, fieldName: string, filter: FilterRule): any {
    switch (filter.operator) {
      case 'equals':
        return query.eq(fieldName, filter.value);
      case 'not_equals':
        return query.neq(fieldName, filter.value);
      case 'greater_than':
        return query.gt(fieldName, filter.value);
      case 'less_than':
        return query.lt(fieldName, filter.value);
      case 'contains':
        return query.ilike(fieldName, `%${filter.value}%`);
      case 'not_contains':
        return query.not('or', `${fieldName}.ilike.%${filter.value}%`);
      case 'starts_with':
        return query.ilike(fieldName, `${filter.value}%`);
      case 'ends_with':
        return query.ilike(fieldName, `%${filter.value}`);
      case 'in':
        return query.in(fieldName, Array.isArray(filter.value) ? filter.value : [filter.value]);
      case 'not_in':
        return query.not('in', fieldName, Array.isArray(filter.value) ? filter.value : [filter.value]);
      case 'between':
        return query.gte(fieldName, filter.value).lte(fieldName, filter.secondValue);
      case 'is_null':
        return query.is(fieldName, null);
      case 'is_not_null':
        return query.not('is', fieldName, null);
      default:
        return query;
    }
  }
}

// 🚀 CORE FUNCTIONS

export async function getReports(organizationId: string): Promise<Report[]> {
  try {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('organization_id', organizationId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching reports:', error);
      throw error;
    }

    return (data || []).map(report => ({
      ...report,
      report_config: report.report_config as unknown as ReportConfig
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
      report_config: report.report_config as unknown as Json,
      version: 1
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating report:', error);
    throw error;
  }

  // Invalidate cache for this organization
  reportCache.invalidate(report.organization_id);

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
      updated_at: new Date().toISOString(),
      // version will be incremented server-side
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating report:', error);
    throw error;
  }

  // Invalidate cache for this report
  reportCache.invalidate(id);

  return {
    ...data,
    report_config: data.report_config as unknown as ReportConfig
  };
};

export const deleteReport = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('reports')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting report:', error);
      throw error;
    }

    // Invalidate cache for this report
    reportCache.invalidate(id);
    return true;
  } catch (error) {
    console.error('Failed to delete report:', error);
    return false;
  }
};

// 🚀 MAIN EXECUTION ENGINE
export async function executeReport(
  report: Report, 
  limit?: number,
  useCache: boolean = true
): Promise<{
  data: any[];
  stats: ExecutionStats;
}> {
  const startTime = performance.now();
  let cacheHit = false;
  
  try {
    // Check cache first
    const cacheKey = reportCache.generateCacheKey(report.report_config, report.organization_id);
    let results: any[] = [];
    
    if (useCache) {
      const cachedResults = reportCache.get(cacheKey);
      if (cachedResults) {
        cacheHit = true;
        results = cachedResults;
        
        // Apply limit if specified
        if (limit && results.length > limit) {
          results = results.slice(0, limit);
        }
      }
    }
    
    if (!cacheHit) {
      // Use new parallel processing
      results = await ParallelDataProcessor.processDataSources(
        report.report_config.dataSources,
        report.report_config,
        report.organization_id
      );
      
      // Apply post-processing calculations
      results = await applyPostProcessingCalculations(results, report.report_config);
      
      // Apply client-side sorting if needed
      results = applySorting(results, report.report_config.sorts || []);
      
      // Cache results (before applying limit)
      if (useCache) {
        const cacheTTL = report.report_config.caching?.ttl || 300; // 5 minutes default
        reportCache.set(cacheKey, results, cacheTTL);
      }
      
      // Apply limit if specified
      if (limit && results.length > limit) {
        results = results.slice(0, limit);
      }
    }
    
    const endTime = performance.now();
    const executionTime = Math.round(endTime - startTime);
    
    // Calculate query complexity
    const complexity = estimateComplexity(report.report_config);
    
    // Record execution stats
    const stats: ExecutionStats = {
      executionTime,
      rowCount: results.length,
      cacheHit,
      queryComplexity: complexity,
      dataSourcesUsed: report.report_config.dataSources,
      bytesProcessed: JSON.stringify(results).length
    };
    
    // Log execution to report_runs table
    await logReportExecution(report, stats);
    
    return { data: results, stats };
    
  } catch (error) {
    console.error('Error executing report:', error);
    throw error;
  }
}

// 🚀 UTILITY FUNCTIONS

async function applyPostProcessingCalculations(data: any[], config: ReportConfig): Promise<any[]> {
  if (!config.calculations || config.calculations.length === 0) {
    return data;
  }
  
  // Apply calculations to each row
  return data.map(row => {
    const calculatedRow = { ...row };
    
    config.calculations!.forEach(calc => {
      try {
        calculatedRow[calc.id] = evaluateCalculation(calc, row, data);
      } catch (error) {
        console.error(`Error calculating ${calc.id}:`, error);
        calculatedRow[calc.id] = null;
      }
    });
    
    return calculatedRow;
  });
}

function evaluateCalculation(calc: CalculationConfig, row: any, allData: any[]): any {
  switch (calc.type) {
    case 'formula':
      return evaluateFormula(calc.expression, row);
    
    case 'percentage':
      const [numerator, denominator] = calc.dependencies;
      const num = parseFloat(row[numerator]) || 0;
      const denom = parseFloat(row[denominator]) || 0;
      return denom !== 0 ? (num / denom) * 100 : 0;
    
    case 'difference':
      const [value1, value2] = calc.dependencies;
      return (parseFloat(row[value1]) || 0) - (parseFloat(row[value2]) || 0);
    
    case 'running_total':
      // Would need row index and previous rows for running total
      return 0; // Placeholder
    
    case 'rank':
      // Would need to rank within the dataset
      return 0; // Placeholder
    
    default:
      return null;
  }
}

function evaluateFormula(expression: string, row: any): any {
  // Simple formula evaluator - in production, use a more robust solution
  try {
    // Replace field references with values
    let formula = expression;
    Object.keys(row).forEach(field => {
      const value = parseFloat(row[field]) || 0;
      formula = formula.replace(new RegExp(`\\b${field}\\b`, 'g'), value.toString());
    });
    
    // Evaluate safely (in production, use a proper expression evaluator)
    return Function(`"use strict"; return (${formula})`)();
  } catch (error) {
    return null;
  }
}

function applySorting(data: any[], sorts: SortRule[]): any[] {
  if (!sorts || sorts.length === 0) {
    return data;
  }
  
  return data.sort((a, b) => {
    for (const sort of sorts) {
      const aVal = a[sort.field];
      const bVal = b[sort.field];
      
      // Handle nulls
      if (aVal == null && bVal == null) continue;
      if (aVal == null) return sort.nullsFirst ? -1 : 1;
      if (bVal == null) return sort.nullsFirst ? 1 : -1;
      
      // Compare values
      let comparison = 0;
      if (aVal < bVal) comparison = -1;
      else if (aVal > bVal) comparison = 1;
      
      if (comparison !== 0) {
        return sort.direction === 'desc' ? -comparison : comparison;
      }
    }
    return 0;
  });
}

function estimateComplexity(config: ReportConfig): 'low' | 'medium' | 'high' | 'extreme' {
  let score = 0;
  
  score += config.dataSources.length * 10;
  score += config.columns.length * 2;
  score += (config.filters?.length || 0) * 5;
  score += (config.sorts?.length || 0) * 3;
  score += (config.aggregations?.length || 0) * 15;
  score += (config.calculations?.length || 0) * 10;
  score += (config.joins?.length || 0) * 20;
  
  if (score < 30) return 'low';
  if (score < 70) return 'medium';
  if (score < 150) return 'high';
  return 'extreme';
}

async function logReportExecution(report: Report, stats: ExecutionStats): Promise<void> {
  // TODO: Implement when report_runs table is created
  console.debug('Report execution stats:', {
    reportId: report.id,
    executionTime: stats.executionTime,
    rowCount: stats.rowCount,
    cacheHit: stats.cacheHit
  });
}

export async function getReportRuns(reportId: string, limit: number = 10): Promise<ReportRun[]> {
  // TODO: Implement when report_runs table is created
  console.warn('Report runs tracking not yet implemented');
  return [];
}

// 🚀 ENHANCED DATA SOURCE DEFINITIONS
export const DATA_SOURCE_DEFINITIONS: Record<string, DataSourceDefinition> = {
  assets: {
    primaryTable: 'assets',
    columns: [
      { id: 'assets.id', label: 'Asset ID', type: 'uuid', source: 'assets', table: 'assets', column: 'id', description: 'Unique asset identifier' },
      { id: 'assets.name', label: 'Asset Name', type: 'text', source: 'assets', table: 'assets', column: 'name', description: 'Asset name', sortable: true, filterable: true },
      { id: 'assets.description', label: 'Description', type: 'text', source: 'assets', table: 'assets', column: 'description', description: 'Asset description', filterable: true },
      { id: 'assets.status', label: 'Status', type: 'text', source: 'assets', table: 'assets', column: 'status', description: 'Current status', sortable: true, filterable: true },
      { id: 'assets.serial_number', label: 'Serial Number', type: 'text', source: 'assets', table: 'assets', column: 'serial_number', description: 'Serial number', sortable: true, filterable: true },
      { id: 'assets.barcode', label: 'Barcode', type: 'text', source: 'assets', table: 'assets', column: 'barcode', description: 'Barcode', sortable: true, filterable: true },
      { id: 'assets.acquisition_date', label: 'Acquisition Date', type: 'date', source: 'assets', table: 'assets', column: 'acquisition_date', description: 'When acquired', format: 'date', sortable: true, filterable: true },
      { id: 'assets.created_at', label: 'Created Date', type: 'datetime', source: 'assets', table: 'assets', column: 'created_at', description: 'When created', format: 'datetime', sortable: true },
      { id: 'assets.updated_at', label: 'Updated Date', type: 'datetime', source: 'assets', table: 'assets', column: 'updated_at', description: 'Last updated', format: 'datetime', sortable: true }
    ],
    joins: [
      { table: 'asset_types', condition: 'assets.asset_type_id = asset_types.id', type: 'left' }
    ],
    indexes: ['assets_organization_id_idx', 'assets_asset_type_id_idx', 'assets_status_idx']
  },
  
  asset_types: {
    primaryTable: 'asset_types',
    columns: [
      { id: 'asset_types.id', label: 'Asset Type ID', type: 'uuid', source: 'asset_types', table: 'asset_types', column: 'id', description: 'Unique identifier' },
      { id: 'asset_types.name', label: 'Asset Type Name', type: 'text', source: 'asset_types', table: 'asset_types', column: 'name', description: 'Type name', sortable: true, filterable: true },
      { id: 'asset_types.description', label: 'Description', type: 'text', source: 'asset_types', table: 'asset_types', column: 'description', description: 'Type description', filterable: true },
      { id: 'asset_types.color', label: 'Color', type: 'text', source: 'asset_types', table: 'asset_types', column: 'color', description: 'Display color', filterable: true },
      { id: 'asset_types.created_at', label: 'Created Date', type: 'datetime', source: 'asset_types', table: 'asset_types', column: 'created_at', description: 'When created', format: 'datetime', sortable: true }
    ],
    indexes: ['asset_types_organization_id_idx', 'asset_types_name_idx']
  },
  
  inventory_items: {
    primaryTable: 'inventory_items',
    columns: [
      { id: 'inventory_items.id', label: 'Inventory ID', type: 'uuid', source: 'inventory_items', table: 'inventory_items', column: 'id', description: 'Unique identifier' },
      { id: 'inventory_items.name', label: 'Item Name', type: 'text', source: 'inventory_items', table: 'inventory_items', column: 'name', description: 'Item name', sortable: true, filterable: true },
      { id: 'inventory_items.sku', label: 'SKU', type: 'text', source: 'inventory_items', table: 'inventory_items', column: 'sku', description: 'Stock keeping unit', sortable: true, filterable: true },
      { id: 'inventory_items.quantity', label: 'Quantity', type: 'number', source: 'inventory_items', table: 'inventory_items', column: 'quantity', description: 'Current stock', aggregatable: true, sortable: true, filterable: true },
      { id: 'inventory_items.current_price', label: 'Current Price', type: 'number', source: 'inventory_items', table: 'inventory_items', column: 'current_price', description: 'Price per unit', format: 'currency', aggregatable: true, sortable: true, filterable: true },
      { id: 'inventory_items.created_at', label: 'Created Date', type: 'datetime', source: 'inventory_items', table: 'inventory_items', column: 'created_at', description: 'When created', format: 'datetime', sortable: true },
      { id: 'inventory_items.updated_at', label: 'Updated Date', type: 'datetime', source: 'inventory_items', table: 'inventory_items', column: 'updated_at', description: 'Last updated', format: 'datetime', sortable: true }
    ],
    joins: [
      { table: 'assets', condition: 'inventory_items.asset_id = assets.id', type: 'left' },
      { table: 'asset_types', condition: 'inventory_items.asset_type_id = asset_types.id', type: 'left' }
    ],
    indexes: ['inventory_items_organization_id_idx', 'inventory_items_asset_type_id_idx', 'inventory_items_sku_idx']
  },
  
  form_submissions: {
    primaryTable: 'form_submissions',
    columns: [
      { id: 'form_submissions.id', label: 'Submission ID', type: 'uuid', source: 'form_submissions', table: 'form_submissions', column: 'id', description: 'Unique identifier' },
      { id: 'form_submissions.form_id', label: 'Form ID', type: 'uuid', source: 'form_submissions', table: 'form_submissions', column: 'form_id', description: 'Form template ID', filterable: true },
      { id: 'form_submissions.submission_data', label: 'Submission Data', type: 'json', source: 'form_submissions', table: 'form_submissions', column: 'submission_data', description: 'Form response data' },
      { id: 'form_submissions.created_at', label: 'Submitted Date', type: 'datetime', source: 'form_submissions', table: 'form_submissions', column: 'created_at', description: 'When submitted', format: 'datetime', sortable: true, filterable: true },
      { id: 'form_submissions.updated_at', label: 'Updated Date', type: 'datetime', source: 'form_submissions', table: 'form_submissions', column: 'updated_at', description: 'Last updated', format: 'datetime', sortable: true }
    ],
    joins: [
      { table: 'forms', condition: 'form_submissions.form_id = forms.id', type: 'left' },
      { table: 'assets', condition: 'form_submissions.asset_id = assets.id', type: 'left' }
    ],
    indexes: ['form_submissions_organization_id_idx', 'form_submissions_form_id_idx', 'form_submissions_created_at_idx']
  }
};

// 🚀 COMPLETE DATA SOURCE REGISTRY
export const AVAILABLE_DATA_SOURCES = [
  // Core tables
  {
    id: "assets",
    name: "Assets",
    description: "All asset records including equipment, tools, materials",
    icon: "📦",
    table: "assets"
  },
  {
    id: "asset_types",
    name: "Asset Types",
    description: "Asset type configurations and categories",
    icon: "🏷️",
    table: "asset_types"
  },
  {
    id: "inventory_items",
    name: "Inventory Items",
    description: "Current inventory levels and stock information",
    icon: "📋",
    table: "inventory_items"
  },
  {
    id: "inventory_history",
    name: "Inventory History",
    description: "Historical inventory changes and movements",
    icon: "📊",
    table: "inventory_history"
  },
  {
    id: "inventory_price_history",
    name: "Price History",
    description: "Historical price changes for inventory items",
    icon: "💰",
    table: "inventory_price_history"
  },
  {
    id: "forms",
    name: "Forms",
    description: "All form definitions and templates",
    icon: "📄",
    table: "forms"
  },
  {
    id: "form_submissions",
    name: "Form Submissions",
    description: "All submitted form data",
    icon: "📝",
    table: "form_submissions"
  },
  {
    id: "form_responses",
    name: "Form Responses",
    description: "Individual form response data",
    icon: "✍️",
    table: "form_responses"
  },
  {
    id: "organizations",
    name: "Organizations",
    description: "Organization information",
    icon: "🏢",
    table: "organizations"
  },
  {
    id: "organization_members",
    name: "Organization Members",
    description: "Team members and their roles",
    icon: "👥",
    table: "organization_members"
  },
  {
    id: "users",
    name: "Users",
    description: "User profiles and information",
    icon: "👤",
    table: "users"
  },
  {
    id: "locations",
    name: "Locations",
    description: "Physical locations and hierarchies",
    icon: "📍",
    table: "locations"
  },
  {
    id: "mapped_fields",
    name: "Mapped Fields",
    description: "Form field mappings and configurations",
    icon: "🔗",
    table: "mapped_fields"
  },
  {
    id: "asset_formulas",
    name: "Asset Formulas",
    description: "Calculation formulas for assets",
    icon: "🧮",
    table: "asset_formulas"
  },
  {
    id: "asset_formula_mappings",
    name: "Formula Mappings",
    description: "Asset type formula field mappings",
    icon: "🗺️",
    table: "asset_formula_mappings"
  },
  {
    id: "asset_type_forms",
    name: "Asset Type Forms",
    description: "Forms linked to asset types",
    icon: "📎",
    table: "asset_type_forms"
  },
  {
    id: "system_logs",
    name: "System Logs",
    description: "Audit trail and system activity logs",
    icon: "📜",
    table: "system_logs"
  },
  {
    id: "form_categories",
    name: "Form Categories",
    description: "Form categorization and grouping",
    icon: "🗂️",
    table: "form_categories"
  },
  {
    id: "form_schedules",
    name: "Form Schedules",
    description: "Scheduled form submissions and recurring forms",
    icon: "📅",
    table: "form_schedules"
  },
  {
    id: "organization_invitations",
    name: "Invitations",
    description: "Pending organization invitations",
    icon: "✉️",
    table: "organization_invitations"
  }
];

// 🚀 COMPLETE COLUMN REGISTRY
export const DATA_SOURCE_COLUMNS: Record<string, ColumnDefinition[]> = {
  assets: [
    { id: 'assets.id', label: 'Asset ID', type: 'text', source: 'assets', table: 'assets', column: 'id', description: 'Unique asset identifier' },
    { id: 'assets.name', label: 'Asset Name', type: 'text', source: 'assets', table: 'assets', column: 'name', description: 'Name of the asset' },
    { id: 'assets.description', label: 'Description', type: 'text', source: 'assets', table: 'assets', column: 'description', description: 'Asset description' },
    { id: 'assets.status', label: 'Status', type: 'text', source: 'assets', table: 'assets', column: 'status', description: 'Current status (active/inactive/maintenance)' },
    { id: 'assets.serial_number', label: 'Serial Number', type: 'text', source: 'assets', table: 'assets', column: 'serial_number', description: 'Asset serial number' },
    { id: 'assets.barcode', label: 'Barcode', type: 'text', source: 'assets', table: 'assets', column: 'barcode', description: 'Asset barcode' },
    { id: 'assets.barcode_type', label: 'Barcode Type', type: 'text', source: 'assets', table: 'assets', column: 'barcode_type', description: 'Type of barcode (QR/Code128)' },
    { id: 'assets.acquisition_date', label: 'Acquisition Date', type: 'date', source: 'assets', table: 'assets', column: 'acquisition_date', description: 'Date asset was acquired' },
    { id: 'assets.asset_type_id', label: 'Asset Type ID', type: 'text', source: 'assets', table: 'assets', column: 'asset_type_id', description: 'Related asset type' },
    { id: 'assets.parent_asset_id', label: 'Parent Asset ID', type: 'text', source: 'assets', table: 'assets', column: 'parent_asset_id', description: 'Parent asset for hierarchical assets' },
    { id: 'assets.organization_id', label: 'Organization ID', type: 'text', source: 'assets', table: 'assets', column: 'organization_id', description: 'Owning organization' },
    { id: 'assets.created_at', label: 'Created Date', type: 'date', source: 'assets', table: 'assets', column: 'created_at', description: 'Creation timestamp' },
    { id: 'assets.updated_at', label: 'Updated Date', type: 'date', source: 'assets', table: 'assets', column: 'updated_at', description: 'Last update timestamp' },
    { id: 'assets.created_by', label: 'Created By', type: 'text', source: 'assets', table: 'assets', column: 'created_by', description: 'User who created the asset' },
    { id: 'assets.deleted_at', label: 'Deleted Date', type: 'date', source: 'assets', table: 'assets', column: 'deleted_at', description: 'Soft deletion timestamp' }
  ],
  asset_types: [
    { id: 'asset_types.id', label: 'Asset Type ID', type: 'text', source: 'asset_types', table: 'asset_types', column: 'id', description: 'Unique identifier' },
    { id: 'asset_types.name', label: 'Type Name', type: 'text', source: 'asset_types', table: 'asset_types', column: 'name', description: 'Asset type name' },
    { id: 'asset_types.description', label: 'Description', type: 'text', source: 'asset_types', table: 'asset_types', column: 'description', description: 'Type description' },
    { id: 'asset_types.color', label: 'Color', type: 'text', source: 'asset_types', table: 'asset_types', column: 'color', description: 'Display color' },
    { id: 'asset_types.icon', label: 'Icon', type: 'text', source: 'asset_types', table: 'asset_types', column: 'icon', description: 'Display icon' },
    { id: 'asset_types.enable_barcodes', label: 'Barcodes Enabled', type: 'boolean', source: 'asset_types', table: 'asset_types', column: 'enable_barcodes', description: 'Whether barcodes are enabled' },
    { id: 'asset_types.barcode_type', label: 'Barcode Type', type: 'text', source: 'asset_types', table: 'asset_types', column: 'barcode_type', description: 'Default barcode type' },
    { id: 'asset_types.barcode_prefix', label: 'Barcode Prefix', type: 'text', source: 'asset_types', table: 'asset_types', column: 'barcode_prefix', description: 'Barcode prefix pattern' },
    { id: 'asset_types.organization_id', label: 'Organization ID', type: 'text', source: 'asset_types', table: 'asset_types', column: 'organization_id', description: 'Owning organization' },
    { id: 'asset_types.created_at', label: 'Created Date', type: 'date', source: 'asset_types', table: 'asset_types', column: 'created_at', description: 'Creation timestamp' },
    { id: 'asset_types.updated_at', label: 'Updated Date', type: 'date', source: 'asset_types', table: 'asset_types', column: 'updated_at', description: 'Last update timestamp' },
    { id: 'asset_types.deleted_at', label: 'Deleted Date', type: 'date', source: 'asset_types', table: 'asset_types', column: 'deleted_at', description: 'Soft deletion timestamp' }
  ],
  inventory_items: [
    { id: 'inventory_items.id', label: 'Inventory ID', type: 'text', source: 'inventory_items', table: 'inventory_items', column: 'id', description: 'Unique identifier' },
    { id: 'inventory_items.name', label: 'Item Name', type: 'text', source: 'inventory_items', table: 'inventory_items', column: 'name', description: 'Item name' },
    { id: 'inventory_items.sku', label: 'SKU', type: 'text', source: 'inventory_items', table: 'inventory_items', column: 'sku', description: 'Stock keeping unit' },
    { id: 'inventory_items.quantity', label: 'Quantity', type: 'number', source: 'inventory_items', table: 'inventory_items', column: 'quantity', description: 'Current quantity', aggregatable: true },
    { id: 'inventory_items.current_price', label: 'Current Price', type: 'number', source: 'inventory_items', table: 'inventory_items', column: 'current_price', description: 'Current unit price', format: 'currency', aggregatable: true },
    { id: 'inventory_items.currency', label: 'Currency', type: 'text', source: 'inventory_items', table: 'inventory_items', column: 'currency', description: 'Price currency' },
    { id: 'inventory_items.category', label: 'Category', type: 'text', source: 'inventory_items', table: 'inventory_items', column: 'category', description: 'Item category' },
    { id: 'inventory_items.location', label: 'Location', type: 'text', source: 'inventory_items', table: 'inventory_items', column: 'location', description: 'Storage location' },
    { id: 'inventory_items.status', label: 'Status', type: 'text', source: 'inventory_items', table: 'inventory_items', column: 'status', description: 'Item status' },
    { id: 'inventory_items.asset_id', label: 'Asset ID', type: 'text', source: 'inventory_items', table: 'inventory_items', column: 'asset_id', description: 'Related asset' },
    { id: 'inventory_items.asset_type_id', label: 'Asset Type ID', type: 'text', source: 'inventory_items', table: 'inventory_items', column: 'asset_type_id', description: 'Related asset type' },
    { id: 'inventory_items.barcode', label: 'Barcode', type: 'text', source: 'inventory_items', table: 'inventory_items', column: 'barcode', description: 'Item barcode' },
    { id: 'inventory_items.description', label: 'Description', type: 'text', source: 'inventory_items', table: 'inventory_items', column: 'description', description: 'Item description' },
    { id: 'inventory_items.profile_image_url', label: 'Image URL', type: 'text', source: 'inventory_items', table: 'inventory_items', column: 'profile_image_url', description: 'Item image' },
    { id: 'inventory_items.created_at', label: 'Created Date', type: 'date', source: 'inventory_items', table: 'inventory_items', column: 'created_at', description: 'Creation timestamp' },
    { id: 'inventory_items.updated_at', label: 'Updated Date', type: 'date', source: 'inventory_items', table: 'inventory_items', column: 'updated_at', description: 'Last update timestamp' },
    { id: 'inventory_items.created_by', label: 'Created By', type: 'text', source: 'inventory_items', table: 'inventory_items', column: 'created_by', description: 'User who created the item' }
  ],
  inventory_history: [
    { id: 'inventory_history.id', label: 'History ID', type: 'text', source: 'inventory_history', table: 'inventory_history', column: 'id', description: 'Unique identifier' },
    { id: 'inventory_history.inventory_item_id', label: 'Inventory Item ID', type: 'text', source: 'inventory_history', table: 'inventory_history', column: 'inventory_item_id', description: 'Related inventory item' },
    { id: 'inventory_history.event_type', label: 'Event Type', type: 'text', source: 'inventory_history', table: 'inventory_history', column: 'event_type', description: 'Type of inventory event' },
    { id: 'inventory_history.check_type', label: 'Check Type', type: 'text', source: 'inventory_history', table: 'inventory_history', column: 'check_type', description: 'Type of inventory check' },
    { id: 'inventory_history.quantity', label: 'Quantity', type: 'number', source: 'inventory_history', table: 'inventory_history', column: 'quantity', description: 'Quantity changed', aggregatable: true },
    { id: 'inventory_history.condition', label: 'Condition', type: 'text', source: 'inventory_history', table: 'inventory_history', column: 'condition', description: 'Item condition' },
    { id: 'inventory_history.location', label: 'Location', type: 'text', source: 'inventory_history', table: 'inventory_history', column: 'location', description: 'Location at time of event' },
    { id: 'inventory_history.status', label: 'Status', type: 'text', source: 'inventory_history', table: 'inventory_history', column: 'status', description: 'Status at time of event' },
    { id: 'inventory_history.notes', label: 'Notes', type: 'text', source: 'inventory_history', table: 'inventory_history', column: 'notes', description: 'Event notes' },
    { id: 'inventory_history.check_date', label: 'Check Date', type: 'date', source: 'inventory_history', table: 'inventory_history', column: 'check_date', description: 'Date of inventory check' },
    { id: 'inventory_history.month_year', label: 'Month/Year', type: 'text', source: 'inventory_history', table: 'inventory_history', column: 'month_year', description: 'Month and year of event' },
    { id: 'inventory_history.created_at', label: 'Created Date', type: 'date', source: 'inventory_history', table: 'inventory_history', column: 'created_at', description: 'Creation timestamp' },
    { id: 'inventory_history.created_by', label: 'Created By', type: 'text', source: 'inventory_history', table: 'inventory_history', column: 'created_by', description: 'User who created the record' }
  ],
  forms: [
    { id: 'forms.id', label: 'Form ID', type: 'text', source: 'forms', table: 'forms', column: 'id', description: 'Unique identifier' },
    { id: 'forms.name', label: 'Form Name', type: 'text', source: 'forms', table: 'forms', column: 'name', description: 'Form name' },
    { id: 'forms.description', label: 'Description', type: 'text', source: 'forms', table: 'forms', column: 'description', description: 'Form description' },
    { id: 'forms.form_type', label: 'Form Type', type: 'text', source: 'forms', table: 'forms', column: 'form_type', description: 'Type of form' },
    { id: 'forms.purpose', label: 'Purpose', type: 'text', source: 'forms', table: 'forms', column: 'purpose', description: 'Form purpose' },
    { id: 'forms.status', label: 'Status', type: 'text', source: 'forms', table: 'forms', column: 'status', description: 'Form status' },
    { id: 'forms.is_template', label: 'Is Template', type: 'boolean', source: 'forms', table: 'forms', column: 'is_template', description: 'Whether form is a template' },
    { id: 'forms.version', label: 'Version', type: 'number', source: 'forms', table: 'forms', column: 'version', description: 'Form version number' },
    { id: 'forms.created_at', label: 'Created Date', type: 'date', source: 'forms', table: 'forms', column: 'created_at', description: 'Creation timestamp' },
    { id: 'forms.updated_at', label: 'Updated Date', type: 'date', source: 'forms', table: 'forms', column: 'updated_at', description: 'Last update timestamp' }
  ],
  form_submissions: [
    { id: 'form_submissions.id', label: 'Submission ID', type: 'text', source: 'form_submissions', table: 'form_submissions', column: 'id', description: 'Unique identifier' },
    { id: 'form_submissions.form_id', label: 'Form ID', type: 'text', source: 'form_submissions', table: 'form_submissions', column: 'form_id', description: 'Related form' },
    { id: 'form_submissions.asset_id', label: 'Asset ID', type: 'text', source: 'form_submissions', table: 'form_submissions', column: 'asset_id', description: 'Related asset' },
    { id: 'form_submissions.asset_type_id', label: 'Asset Type ID', type: 'text', source: 'form_submissions', table: 'form_submissions', column: 'asset_type_id', description: 'Related asset type' },
    { id: 'form_submissions.status', label: 'Status', type: 'text', source: 'form_submissions', table: 'form_submissions', column: 'status', description: 'Submission status' },
    { id: 'form_submissions.submitted_by', label: 'Submitted By', type: 'text', source: 'form_submissions', table: 'form_submissions', column: 'submitted_by', description: 'User who submitted' },
    { id: 'form_submissions.created_at', label: 'Submitted Date', type: 'date', source: 'form_submissions', table: 'form_submissions', column: 'created_at', description: 'Submission timestamp' },
    { id: 'form_submissions.updated_at', label: 'Updated Date', type: 'date', source: 'form_submissions', table: 'form_submissions', column: 'updated_at', description: 'Last update timestamp' }
  ],
  organizations: [
    { id: 'organizations.id', label: 'Organization ID', type: 'text', source: 'organizations', table: 'organizations', column: 'id', description: 'Unique identifier' },
    { id: 'organizations.name', label: 'Organization Name', type: 'text', source: 'organizations', table: 'organizations', column: 'name', description: 'Organization name' },
    { id: 'organizations.description', label: 'Description', type: 'text', source: 'organizations', table: 'organizations', column: 'description', description: 'Organization description' },
    { id: 'organizations.is_mothership', label: 'Is Mothership', type: 'boolean', source: 'organizations', table: 'organizations', column: 'is_mothership', description: 'Whether this is the main organization' },
    { id: 'organizations.created_at', label: 'Created Date', type: 'date', source: 'organizations', table: 'organizations', column: 'created_at', description: 'Creation timestamp' },
    { id: 'organizations.updated_at', label: 'Updated Date', type: 'date', source: 'organizations', table: 'organizations', column: 'updated_at', description: 'Last update timestamp' }
  ],
  users: [
    { id: 'users.id', label: 'User ID', type: 'text', source: 'users', table: 'users', column: 'id', description: 'Unique identifier' },
    { id: 'users.email', label: 'Email', type: 'text', source: 'users', table: 'users', column: 'email', description: 'User email address' },
    { id: 'users.full_name', label: 'Full Name', type: 'text', source: 'users', table: 'users', column: 'full_name', description: 'User full name' },
    { id: 'users.created_at', label: 'Created Date', type: 'date', source: 'users', table: 'users', column: 'created_at', description: 'Account creation date' }
  ],
  locations: [
    { id: 'locations.id', label: 'Location ID', type: 'text', source: 'locations', table: 'locations', column: 'id', description: 'Unique identifier' },
    { id: 'locations.name', label: 'Location Name', type: 'text', source: 'locations', table: 'locations', column: 'name', description: 'Location name' },
    { id: 'locations.parent_id', label: 'Parent Location ID', type: 'text', source: 'locations', table: 'locations', column: 'parent_id', description: 'Parent location for hierarchy' },
    { id: 'locations.created_at', label: 'Created Date', type: 'date', source: 'locations', table: 'locations', column: 'created_at', description: 'Creation timestamp' },
    { id: 'locations.updated_at', label: 'Updated Date', type: 'date', source: 'locations', table: 'locations', column: 'updated_at', description: 'Last update timestamp' }
  ],
  system_logs: [
    { id: 'system_logs.id', label: 'Log ID', type: 'text', source: 'system_logs', table: 'system_logs', column: 'id', description: 'Unique identifier' },
    { id: 'system_logs.type', label: 'Log Type', type: 'text', source: 'system_logs', table: 'system_logs', column: 'type', description: 'Type of log entry' },
    { id: 'system_logs.message', label: 'Message', type: 'text', source: 'system_logs', table: 'system_logs', column: 'message', description: 'Log message' },
    { id: 'system_logs.actor_id', label: 'Actor ID', type: 'text', source: 'system_logs', table: 'system_logs', column: 'actor_id', description: 'User who performed the action' },
    { id: 'system_logs.created_at', label: 'Log Date', type: 'date', source: 'system_logs', table: 'system_logs', column: 'created_at', description: 'Log timestamp' }
  ]
};

// Export cache manager for external access
export { reportCache }; 

// 🚀 PAINT INVENTORY REPORT TYPES
export interface PaintInventoryReportConfig extends ReportConfig {
  paintInventoryOptions?: {
    includeIntake?: boolean;
    monthFilter?: string;
  };
}

export interface PaintInventoryReportData {
  asset_id: string;
  coating_name: string;
  barcode: string;
  full_drums: number;
  coating_amount_inches: number;
  partial_drums_inches: number;
  tank_amount: number;
  dip_spin_wmv: number;
  wmv_rackspin: number;
  coating_gallons: number;
  tank_gallons: number;
  dip_spin_gallons: number;
  wmv_rackspin_gallons: number;
  total_gallons: number;
  last_audit_date: string;
  intake_date?: string;
  has_recent_data: boolean;
  form_data: any;
}

// 🚀 PAINT INVENTORY REPORT FUNCTION
export async function getPaintInventoryReport(
  organizationId: string,
  assetTypeId: string,
  options: {
    includeIntake?: boolean;
    monthFilter?: string;
  } = {}
): Promise<PaintInventoryReportData[]> {
  try {
    const { data, error } = await supabase.rpc('get_paint_inventory_report', {
      p_organization_id: organizationId,
      p_asset_type_id: assetTypeId,
      p_include_intake: options.includeIntake || false,
      p_month_filter: options.monthFilter || null
    });

    if (error) {
      console.error('Paint inventory report error:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error executing paint inventory report:', error);
    throw error;
  }
}

// 🚀 ENHANCED EXECUTE REPORT FUNCTION
export async function executePaintInventoryReport(
  report: Report | PaintInventoryReportConfig,
  organizationId: string,
  limit?: number,
  useCache: boolean = true
): Promise<{
  data: PaintInventoryReportData[];
  stats: ExecutionStats;
}> {
  const startTime = performance.now();
  let cacheHit = false;

  try {
    // Generate cache key
    const cacheKey = reportCache.generateCacheKey(report.report_config || report, organizationId);
    
    // Check cache if enabled
    if (useCache && (report.report_config?.caching?.enabled ?? true)) {
      const cachedData = reportCache.get(cacheKey);
      if (cachedData) {
        cacheHit = true;
        const endTime = performance.now();
        return {
          data: limit ? cachedData.slice(0, limit) : cachedData,
          stats: {
            executionTime: Math.round(endTime - startTime),
            rowCount: cachedData.length,
            cacheHit: true,
            queryComplexity: 'low',
            dataSourcesUsed: ['paint_inventory_specialized'],
            bytesProcessed: JSON.stringify(cachedData).length
          }
        };
      }
    }

    // Get asset type from config
    const config = report.report_config || report;
    const assetTypeId = config.assetTypes?.[0];
    
    if (!assetTypeId) {
      throw new Error('Asset type is required for paint inventory report');
    }

    // Execute the specialized paint inventory report
    const paintConfig = config as PaintInventoryReportConfig;
    const data = await getPaintInventoryReport(
      organizationId,
      assetTypeId,
      paintConfig.paintInventoryOptions || {}
    );

    // Apply limit if specified
    const results = limit ? data.slice(0, limit) : data;

    // Cache results
    if (useCache && (config.caching?.enabled ?? true)) {
      const cacheTTL = config.caching?.ttl || 300;
      reportCache.set(cacheKey, results, cacheTTL);
    }

    const endTime = performance.now();
    const executionTime = Math.round(endTime - startTime);

    const stats: ExecutionStats = {
      executionTime,
      rowCount: results.length,
      cacheHit,
      queryComplexity: 'medium',
      dataSourcesUsed: ['paint_inventory_specialized', 'assets', 'inventory_history'],
      bytesProcessed: JSON.stringify(results).length
    };

    // Log execution
    await logReportExecution(report as Report, stats);

    return { data: results, stats };

  } catch (error) {
    console.error('Error executing paint inventory report:', error);
    throw error;
  }
}

// 🚀 ASSET INVENTORY REPORT TYPES (Generic for any asset type)
export interface AssetInventoryReportConfig extends ReportConfig {
  assetInventoryOptions?: {
    includeIntake?: boolean;
    monthFilter?: string;
  };
}

export interface AssetInventoryReportData {
  asset_id: string;
  asset_name: string;
  asset_barcode: string;
  asset_type_name: string;
  field_1: number;
  field_2: number;
  field_3: number;
  field_4: number;
  field_5: number;
  field_6: number;
  field_7: number;
  field_8: number;
  field_10: number;
  field_12: number;
  field_13: number;
  converted_field_1: number;
  converted_field_2: number;
  converted_field_3: number;
  converted_field_4: number;
  converted_field_5: number;
  converted_field_6: number;
  total_converted: number;
  last_audit_date: string;
  intake_date?: string;
  has_recent_data: boolean;
  form_data: any;
  conversion_metadata: any;
}

// 🚀 ASSET INVENTORY REPORT FUNCTION (Generic)
export async function getAssetInventoryReport(
  organizationId: string,
  assetTypeId: string,
  options: {
    includeIntake?: boolean;
    monthFilter?: string;
  } = {}
): Promise<AssetInventoryReportData[]> {
  try {
    // Use executeSQL since the function might not be in the generated types yet
    const { data, error } = await supabase.rpc('get_asset_inventory_report' as any, {
      p_organization_id: organizationId,
      p_asset_type_id: assetTypeId,
      p_include_intake: options.includeIntake || false,
      p_month_filter: options.monthFilter || null
    });

    if (error) {
      console.error('Asset inventory report error:', error);
      throw error;
    }

    return (data as AssetInventoryReportData[]) || [];
  } catch (error) {
    console.error('Error executing asset inventory report:', error);
    throw error;
  }
}

// 🚀 ENHANCED EXECUTE REPORT FUNCTION
export async function executeAssetInventoryReport(
  config: AssetInventoryReportConfig,
  organizationId: string,
  limit?: number,
  useCache: boolean = true
): Promise<{
  data: AssetInventoryReportData[];
  stats: ExecutionStats;
}> {
  const startTime = performance.now();
  let cacheHit = false;

  try {
    // Generate cache key
    const cacheKey = reportCache.generateCacheKey(config, organizationId);
    
    // Check cache if enabled
    if (useCache && (config.caching?.enabled ?? true)) {
      const cachedData = reportCache.get(cacheKey);
      if (cachedData) {
        cacheHit = true;
        const endTime = performance.now();
        return {
          data: limit ? cachedData.slice(0, limit) : cachedData,
          stats: {
            executionTime: Math.round(endTime - startTime),
            rowCount: cachedData.length,
            cacheHit: true,
            queryComplexity: 'low',
            dataSourcesUsed: ['asset_inventory_specialized'],
            bytesProcessed: JSON.stringify(cachedData).length
          }
        };
      }
    }

    // Get asset type from config
    const assetTypeId = config.assetTypes?.[0];
    
    if (!assetTypeId) {
      throw new Error('Asset type is required for asset inventory report');
    }

    // Execute the specialized asset inventory report
    const data = await getAssetInventoryReport(
      organizationId,
      assetTypeId,
      config.assetInventoryOptions || {}
    );

    // Apply limit if specified
    const results = limit ? data.slice(0, limit) : data;

    // Cache results
    if (useCache && (config.caching?.enabled ?? true)) {
      const cacheTTL = config.caching?.ttl || 300;
      reportCache.set(cacheKey, results, cacheTTL);
    }

    const endTime = performance.now();
    const executionTime = Math.round(endTime - startTime);

    const stats: ExecutionStats = {
      executionTime,
      rowCount: results.length,
      cacheHit,
      queryComplexity: 'medium',
      dataSourcesUsed: ['asset_inventory_specialized', 'assets', 'inventory_history'],
      bytesProcessed: JSON.stringify(results).length
    };

    return { data: results, stats };

  } catch (error) {
    console.error('Error executing asset inventory report:', error);
    throw error;
  }
}


// 🚀 ENHANCED: Monthly Inventory Report Builder with Bulletproof Last Month Calculation
export async function buildMonthlyInventoryReport(config: any, dateRange: { start: Date; end: Date }) {
  try {
    // Get all inventory items with their asset types
    const { data: inventoryItems, error: itemsError } = await supabase
      .from('inventory_items')
      .select(`
        id,
        name,
        sku,
        quantity,
        current_price,
        currency,
        location,
        status,
        category,
        asset_types!inner(
          id,
          name,
          color,
          icon
        )
      `)
      .eq('is_deleted', false)
      .eq('asset_types.is_deleted', false);

    if (itemsError) throw itemsError;

    // Get inventory history for the reporting period and previous month
    const previousMonthStart = new Date(dateRange.start);
    previousMonthStart.setMonth(previousMonthStart.getMonth() - 1);
    
    const { data: historyData, error: historyError } = await supabase
      .from('inventory_history')
      .select(`
        inventory_item_id,
        event_type,
        quantity,
        previous_quantity,
        created_at,
        validation_status,
        notes
      `)
      .gte('created_at', previousMonthStart.toISOString())
      .lte('created_at', dateRange.end.toISOString())
      .eq('is_deleted', false)
      .order('created_at', { ascending: true });

    if (historyError) throw historyError;

    // Get current month string for last month calculation
    const currentMonth = `${dateRange.start.getFullYear()}-${(dateRange.start.getMonth() + 1).toString().padStart(2, '0')}`;

    // Process data for monthly summary with enhanced last month calculation
    const processedData = await Promise.all((inventoryItems || []).map(async item => {
      // Calculate starting balance (last record before reporting period)
      const itemHistory = (historyData || []).filter(h => h.inventory_item_id === item.id);
      const preReportHistory = itemHistory.filter(h => new Date(h.created_at) < dateRange.start);
      const reportPeriodHistory = itemHistory.filter(h => 
        new Date(h.created_at) >= dateRange.start && 
        new Date(h.created_at) <= dateRange.end
      );

      // Enhanced starting quantity calculation with bulletproof last month total
      let startingQuantity = 0;
      let lastMonthData = null;
      
      try {
        lastMonthData = await getLastMonthTotal(item.id, currentMonth);
        startingQuantity = lastMonthData.amount;
      } catch (error) {
        console.warn(`Failed to get last month total for ${item.name}, falling back to history:`, error);
        // Fallback to original logic
        startingQuantity = preReportHistory.length > 0 
          ? preReportHistory[preReportHistory.length - 1].quantity || 0
          : 0;
      }

      // Calculate period totals
      const additions = reportPeriodHistory
        .filter(h => ['intake', 'addition', 'adjustment_up'].includes(h.event_type))
        .reduce((sum, h) => sum + (Number(h.quantity) || 0), 0);

      const usage = reportPeriodHistory
        .filter(h => ['consumption', 'adjustment_down', 'removal'].includes(h.event_type))
        .reduce((sum, h) => sum + (Number(h.quantity) || 0), 0);

      const adjustments = reportPeriodHistory
        .filter(h => h.event_type === 'adjustment')
        .reduce((sum, h) => sum + (Number(h.quantity) || 0), 0);

      return {
        item_name: item.name,
        sku: item.sku,
        asset_type: item.asset_types?.name,
        asset_type_color: item.asset_types?.color,
        asset_type_icon: item.asset_types?.icon,
        starting_quantity: startingQuantity,
        total_additions: additions,
        total_usage: usage,
        total_adjustments: adjustments,
        ending_quantity: item.quantity,
        current_price: item.current_price,
        currency: item.currency,
        location: item.location,
        status: item.status,
        category: item.category,
        period_activity_count: reportPeriodHistory.length,
        validation_issues: reportPeriodHistory.filter(h => h.validation_status === 'flagged').length,
        // Enhanced data with source tracking
        last_month_data: lastMonthData
      };
    }));

    // Group by asset type
    const groupedData = processedData.reduce((groups: Record<string, any[]>, item) => {
      const assetType = item.asset_type || 'Uncategorized';
      if (!groups[assetType]) {
        groups[assetType] = [];
      }
      groups[assetType].push(item);
      return groups;
    }, {});

    // Format for display with asset type sections
    const formattedData = Object.entries(groupedData).flatMap(([assetType, items]) => [
      // Asset type header row
      {
        _isHeader: true,
        _assetType: assetType,
        item_name: `📦 ${assetType.toUpperCase()}`,
        asset_type: assetType,
        starting_quantity: items.reduce((sum, item) => sum + item.starting_quantity, 0),
        total_additions: items.reduce((sum, item) => sum + item.total_additions, 0),
        total_usage: items.reduce((sum, item) => sum + item.total_usage, 0),
        total_adjustments: items.reduce((sum, item) => sum + item.total_adjustments, 0),
        ending_quantity: items.reduce((sum, item) => sum + item.ending_quantity, 0),
        _itemCount: items.length
      },
      // Individual items
      ...items.sort((a, b) => a.item_name.localeCompare(b.item_name))
    ]);

    return {
      data: formattedData,
      stats: {
        totalItems: processedData.length,
        assetTypes: Object.keys(groupedData).length,
        reportPeriod: `${dateRange.start.toISOString().split('T')[0]} to ${dateRange.end.toISOString().split('T')[0]}`,
        totalStartingValue: processedData.reduce((sum, item) => sum + (item.starting_quantity * (item.current_price || 0)), 0),
        totalEndingValue: processedData.reduce((sum, item) => sum + (item.ending_quantity * (item.current_price || 0)), 0),
        generatedAt: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('Error building monthly inventory report:', error);
    throw new Error(`Failed to generate monthly inventory report: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// 🚀 NEW: Asset Activity Detail Report
export async function buildAssetActivityReport(config: any, assetId: string, dateRange: { start: Date; end: Date }) {
  try {
    // Get detailed activity for specific asset
    const { data: activityData, error: activityError } = await supabase
      .from('inventory_history')
      .select(`
        id,
        event_type,
        check_type,
        quantity,
        previous_quantity,
        created_at,
        notes,
        validation_status,
        created_by,
        inventory_items!inner(
          id,
          name,
          sku,
          asset_types(name, color, icon)
        )
      `)
      .eq('inventory_item_id', assetId)
      .gte('created_at', dateRange.start.toISOString())
      .lte('created_at', dateRange.end.toISOString())
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (activityError) throw activityError;

    // Get form submissions for this asset during the period
    const { data: formData, error: formError } = await supabase
      .from('form_submissions')
      .select(`
        id,
        submission_data,
        created_at,
        submitted_by,
        forms!inner(
          name,
          form_type,
          purpose
        )
      `)
      .eq('asset_id', assetId)
      .gte('created_at', dateRange.start.toISOString())
      .lte('created_at', dateRange.end.toISOString())
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (formError) throw formError;

    // Combine and format data
    const combinedData = [
      // Activity records
      ...(activityData?.map(record => ({
        type: 'activity',
        timestamp: record.created_at,
        description: `${record.event_type} - ${record.check_type}`,
        quantity_before: record.previous_quantity,
        quantity_after: record.quantity,
        change_amount: (record.quantity || 0) - (record.previous_quantity || 0),
        notes: record.notes,
        validation_status: record.validation_status,
        created_by: record.created_by,
        item_name: record.inventory_items?.name,
        asset_type: record.inventory_items?.asset_types?.name
      })) || []),
      
      // Form submissions
      ...(formData?.map(form => ({
        type: 'form_submission',
        timestamp: form.created_at,
        description: `Form: ${form.forms?.name}`,
        form_type: form.forms?.form_type,
        form_purpose: form.forms?.purpose,
        submission_data: form.submission_data,
        submitted_by: form.submitted_by,
        notes: `Form submission - ${form.forms?.form_type}`
      })) || [])
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return {
      data: combinedData,
      stats: {
        totalRecords: combinedData.length,
        activityRecords: activityData?.length || 0,
        formSubmissions: formData?.length || 0,
        reportPeriod: `${dateRange.start.toISOString().split('T')[0]} to ${dateRange.end.toISOString().split('T')[0]}`,
        assetName: activityData?.[0]?.inventory_items?.name,
        assetType: activityData?.[0]?.inventory_items?.asset_types?.name,
        generatedAt: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('Error building asset activity report:', error);
    throw new Error(`Failed to generate asset activity report: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// 🚀 Enhanced executeReport function to handle new report types
export async function executeReportEnhanced(report: any, customDateRange?: { start: Date; end: Date }) {
  try {
    const config = report.report_config || report;
    const reportType = config.reportType;
    
    // Default date range (current month)
    const defaultDateRange = customDateRange || {
      start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
    };

    // Handle specialized report types
    if (reportType === 'monthly_summary') {
      return await buildMonthlyInventoryReport(config, defaultDateRange);
    } else if (reportType === 'activity_detail') {
      // For activity detail, we need an assetId parameter
      const assetId = config.assetId || config.filters?.find((f: any) => f.field === 'asset_id')?.value;
      if (!assetId) {
        throw new Error('Asset ID required for activity detail report');
      }
      return await buildAssetActivityReport(config, assetId, defaultDateRange);
    }

    // Fall back to existing executeReport logic for standard reports
    return await executeReport(report as Report);
  } catch (error) {
    console.error('Error executing enhanced report:', error);
    throw error;
  }
}

// 🚀 BULLETPROOF: Enhanced Last Month Total Calculator with Fallbacks
export async function getLastMonthTotal(inventoryItemId: string, currentMonth: string): Promise<{
  amount: number;
  source: 'form_submission' | 'inventory_history' | 'calculated' | 'none';
  confidence: 'high' | 'medium' | 'low';
  details: string;
}> {
  try {
    // Parse current month to get previous month
    const [year, month] = currentMonth.split('-').map(Number);
    const lastMonth = month === 1 ? 12 : month - 1;
    const lastYear = month === 1 ? year - 1 : year;
    const lastMonthStr = `${lastYear}-${lastMonth.toString().padStart(2, '0')}`;
    
    // METHOD 1: Look for form submissions with total/ending fields (HIGHEST CONFIDENCE)
    const { data: formSubmissions, error: formError } = await supabase
      .from('form_submissions')
      .select(`
        submission_data,
        created_at
      `)
      .eq('asset_id', inventoryItemId)
      .gte('created_at', `${lastYear}-${lastMonth.toString().padStart(2, '0')}-01`)
      .lt('created_at', `${year}-${month.toString().padStart(2, '0')}-01`)
      .order('created_at', { ascending: false });

    if (!formError && formSubmissions && formSubmissions.length > 0) {
      // Look for the most recent form with total/ending field
      for (const submission of formSubmissions) {
        const data = submission.submission_data || {};
        const totalField = Object.keys(data).find(key => {
          const lowerKey = key.toLowerCase();
          return lowerKey.includes('total') || 
                 lowerKey.includes('ending') || 
                 lowerKey.includes('balance') ||
                 key === 'field_13'; // Known total field
        });
        
        if (totalField && data[totalField] !== undefined && data[totalField] !== '') {
          const amount = Number(data[totalField]) || 0;
          return {
            amount,
            source: 'form_submission',
            confidence: 'high',
            details: `Found in form submission from ${submission.created_at}, field: ${totalField}`
          };
        }
      }
    }

    // METHOD 2: Get last inventory_history record from previous month (MEDIUM CONFIDENCE)
    const { data: historyRecords, error: historyError } = await supabase
      .from('inventory_history')
      .select('quantity, created_at, event_type, month_year')
      .eq('inventory_item_id', inventoryItemId)
      .eq('month_year', lastMonthStr)
      .order('created_at', { ascending: false });

    if (!historyError && historyRecords && historyRecords.length > 0) {
      // Get the last record of the previous month
      const lastRecord = historyRecords[0];
      return {
        amount: Number(lastRecord.quantity) || 0,
        source: 'inventory_history',
        confidence: 'medium',
        details: `Last inventory record from ${lastRecord.created_at}, event: ${lastRecord.event_type}`
      };
    }

    // METHOD 3: Get earliest record of current month and use its quantity (LOW CONFIDENCE)
    const { data: currentMonthHistory, error: currentError } = await supabase
      .from('inventory_history')
      .select('quantity, created_at, event_type')
      .eq('inventory_item_id', inventoryItemId)
      .eq('month_year', currentMonth)
      .order('created_at', { ascending: true })
      .limit(1);

    if (!currentError && currentMonthHistory && currentMonthHistory.length > 0) {
      const firstRecord = currentMonthHistory[0];
      return {
        amount: Number(firstRecord.quantity) || 0,
        source: 'calculated',
        confidence: 'low',
        details: `Using first record quantity from current month: ${firstRecord.created_at}`
      };
    }

    // METHOD 4: No data found
    return {
      amount: 0,
      source: 'none',
      confidence: 'low',
      details: 'No previous month data found'
    };

  } catch (error) {
    console.error('Error calculating last month total:', error);
    return {
      amount: 0,
      source: 'none',
      confidence: 'low',
      details: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// 🚀 ENHANCED: Monthly Inventory Report Builder with Bulletproof Last Month Calculation
