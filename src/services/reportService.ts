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
    let sql = `
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
    let query = supabase
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
    let query = supabase
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
    let query = supabase
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
    let query = supabase
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
    let query = supabase
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
    let query = supabase
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
    let query = supabase
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
    let query = supabase
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
    let query = supabase
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
    let query = supabase
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
    let query = supabase
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