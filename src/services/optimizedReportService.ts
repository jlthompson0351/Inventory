import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/types/database.types';

// 🚀 ENTERPRISE REPORTING TYPES
export interface OptimizedReportConfig {
  subject: string;
  dataSources: string[];
  columns: string[];
  filters: AdvancedFilterRule[];
  sorts: SortRule[];
  assetTypes?: string[];
  aggregations?: AggregationConfig[];
  calculations?: CalculationConfig[];
  pagination?: PaginationConfig;
  caching?: CachingConfig;
}

export interface AdvancedFilterRule {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'not_contains' | 
           'starts_with' | 'ends_with' | 'in' | 'not_in' | 'between' | 'is_null' | 'is_not_null' | 
           'regex' | 'fuzzy_match';
  value: any;
  secondValue?: any;
  caseSensitive?: boolean;
  logic?: 'AND' | 'OR';
}

export interface AggregationConfig {
  field: string;
  function: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'median' | 'stddev';
  alias: string;
  groupBy?: string[];
}

export interface CalculationConfig {
  id: string;
  label: string;
  expression: string;
  type: 'formula' | 'percentage' | 'difference' | 'running_total';
  dependencies: string[];
}

export interface PaginationConfig {
  page: number;
  limit: number;
  totalCount?: number;
}

export interface CachingConfig {
  enabled: boolean;
  ttl: number;
  refreshOnDataChange?: boolean;
}

export interface SortRule {
  field: string;
  direction: 'asc' | 'desc';
  nullsFirst?: boolean;
}

export interface ExecutionStats {
  executionTime: number;
  rowCount: number;
  cacheHit: boolean;
  queryComplexity: 'low' | 'medium' | 'high' | 'extreme';
  dataSourcesUsed: string[];
  bytesProcessed: number;
  parallelProcessingUsed: boolean;
}

export interface OptimizedReport {
  id: string;
  name: string;
  description: string | null;
  report_config: OptimizedReportConfig;
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
}

// 🚀 ADVANCED CACHE MANAGER
class ReportCacheManager {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number; size: number }>();
  private maxCacheSize = 100;
  private maxMemoryMB = 50;

  generateCacheKey(config: OptimizedReportConfig, organizationId: string): string {
    const configString = JSON.stringify({
      ...config,
      organizationId,
      pagination: undefined // Don't cache pagination
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
    const dataSize = JSON.stringify(data).length;
    const sizeInMB = dataSize / (1024 * 1024);
    
    // Don't cache if data is too large
    if (sizeInMB > 10) return;
    
    // Cleanup old/large entries if needed
    this.cleanup();
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      size: dataSize
    });
  }

  private cleanup(): void {
    // Remove expired entries
    for (const [key, value] of this.cache.entries()) {
      if (Date.now() - value.timestamp > value.ttl * 1000) {
        this.cache.delete(key);
      }
    }
    
    // If still over memory limit, remove oldest entries
    while (this.getTotalSizeMB() > this.maxMemoryMB && this.cache.size > 0) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
  }

  private getTotalSizeMB(): number {
    let totalSize = 0;
    for (const value of this.cache.values()) {
      totalSize += value.size;
    }
    return totalSize / (1024 * 1024);
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
      totalSizeMB: this.getTotalSizeMB(),
      maxMemoryMB: this.maxMemoryMB,
      hitRate: 0 // Would need to track hits/misses
    };
  }
}

// Global cache instance
const optimizedReportCache = new ReportCacheManager();

// 🚀 PARALLEL DATA PROCESSOR
class OptimizedDataProcessor {
  static async processDataSourcesInParallel(
    dataSources: string[],
    config: OptimizedReportConfig,
    organizationId: string
  ): Promise<{ data: any[]; processingTime: number }> {
    const startTime = performance.now();
    
    // Process up to 3 data sources in parallel for optimal performance
    const chunks = this.chunkArray(dataSources, Math.min(3, dataSources.length));
    const results: any[] = [];
    
    for (const chunk of chunks) {
      const chunkPromises = chunk.map(dataSource => 
        this.processDataSourceOptimized(dataSource, config, organizationId)
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
    
    const processingTime = performance.now() - startTime;
    return { data: results, processingTime };
  }

  private static chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private static async processDataSourceOptimized(
    dataSource: string,
    config: OptimizedReportConfig,
    organizationId: string
  ): Promise<any[]> {
    switch (dataSource) {
      case 'assets':
        return this.processAssetsOptimized(config, organizationId);
      case 'asset_types':
        return this.processAssetTypesOptimized(config, organizationId);
      case 'inventory_items':
        return this.processInventoryItemsOptimized(config, organizationId);
      case 'form_submissions':
        return this.processFormSubmissionsOptimized(config, organizationId);
      default:
        // Unknown data source
        return [];
    }
  }

  private static async processAssetsOptimized(
    config: OptimizedReportConfig, 
    organizationId: string
  ): Promise<any[]> {
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

    // Apply optimized filtering
    query = this.applyOptimizedFilters(query, config.filters, 'assets');
    
    // Apply asset type filtering
    if (config.assetTypes?.length) {
      query = query.in('asset_type_id', config.assetTypes);
    }

    // Apply sorting
    query = this.applyOptimizedSorting(query, config.sorts, 'assets');

    // Apply pagination for performance
    if (config.pagination) {
      const offset = (config.pagination.page - 1) * config.pagination.limit;
      query = query.range(offset, offset + config.pagination.limit - 1);
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
            'asset_types.description': item.asset_types?.description,      'asset_types.color': item.asset_types?.color,      ...this.processConversionFieldsOptimized(item, item.asset_types?.conversion_fields as any[])
    }));
  }

  private static async processAssetTypesOptimized(
    config: OptimizedReportConfig, 
    organizationId: string
  ): Promise<any[]> {
    let query = supabase
      .from('asset_types')
      .select('*')
      .eq('organization_id', organizationId);

    query = this.applyOptimizedFilters(query, config.filters, 'asset_types');
    query = this.applyOptimizedSorting(query, config.sorts, 'asset_types');

    if (config.assetTypes?.length) {
      query = query.in('id', config.assetTypes);
    }

    if (config.pagination) {
      const offset = (config.pagination.page - 1) * config.pagination.limit;
      query = query.range(offset, offset + config.pagination.limit - 1);
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

  private static async processInventoryItemsOptimized(
    config: OptimizedReportConfig, 
    organizationId: string
  ): Promise<any[]> {
    let query = supabase
      .from('inventory_items')
      .select(`
        *,
        asset_types!inner(id, name, description, color, conversion_fields)
      `)
      .eq('organization_id', organizationId);

    query = this.applyOptimizedFilters(query, config.filters, 'inventory_items');
    query = this.applyOptimizedSorting(query, config.sorts, 'inventory_items');

    if (config.assetTypes?.length) {
      query = query.in('asset_type_id', config.assetTypes);
    }

    if (config.pagination) {
      const offset = (config.pagination.page - 1) * config.pagination.limit;
      query = query.range(offset, offset + config.pagination.limit - 1);
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
            'asset_types.id': item.asset_types?.id,      'asset_types.name': item.asset_types?.name,      ...this.processConversionFieldsOptimized(item, item.asset_types?.conversion_fields as any[])
    }));
  }

  private static async processFormSubmissionsOptimized(
    config: OptimizedReportConfig, 
    organizationId: string
  ): Promise<any[]> {
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

    query = this.applyOptimizedFilters(query, config.filters, 'form_submissions');
    query = this.applyOptimizedSorting(query, config.sorts, 'form_submissions');

    if (config.pagination) {
      const offset = (config.pagination.page - 1) * config.pagination.limit;
      query = query.range(offset, offset + config.pagination.limit - 1);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(item => ({
      record_source: 'Form Submissions',
      'form_submissions.id': item.id,
      'form_submissions.form_id': item.form_id,
      'form_submissions.created_at': item.created_at,
      'form_submissions.updated_at': item.updated_at,
      'forms.name': item.forms?.name,
      'forms.description': item.forms?.description,
      submission_data: item.submission_data,
      ...Object.entries(item.submission_data || {}).reduce((acc, [key, value]) => ({
        ...acc,
        [`submission.${key}`]: value
      }), {})
    }));
  }

  private static applyOptimizedFilters(query: any, filters: AdvancedFilterRule[], tablePrefix: string): any {
    if (!filters?.length) return query;

    filters.forEach(filter => {
      if (!filter.field.startsWith(`${tablePrefix}.`)) return;
      
      const fieldName = filter.field.replace(`${tablePrefix}.`, '');
      
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
          query = filter.caseSensitive 
            ? query.like(fieldName, `%${filter.value}%`)
            : query.ilike(fieldName, `%${filter.value}%`);
          break;
        case 'starts_with':
          query = filter.caseSensitive 
            ? query.like(fieldName, `${filter.value}%`)
            : query.ilike(fieldName, `${filter.value}%`);
          break;
        case 'ends_with':
          query = filter.caseSensitive 
            ? query.like(fieldName, `%${filter.value}`)
            : query.ilike(fieldName, `%${filter.value}`);
          break;
        case 'in':
          query = query.in(fieldName, Array.isArray(filter.value) ? filter.value : [filter.value]);
          break;
        case 'between':
          query = query.gte(fieldName, filter.value).lte(fieldName, filter.secondValue);
          break;
        case 'is_null':
          query = query.is(fieldName, null);
          break;
        case 'is_not_null':
          query = query.not('is', fieldName, null);
          break;
      }
    });

    return query;
  }

  private static applyOptimizedSorting(query: any, sorts: SortRule[], tablePrefix: string): any {
    if (!sorts?.length) return query;

    sorts.forEach(sort => {
      if (!sort.field.startsWith(`${tablePrefix}.`)) return;
      
      const fieldName = sort.field.replace(`${tablePrefix}.`, '');
      query = query.order(fieldName, { 
        ascending: sort.direction === 'asc',
        nullsFirst: sort.nullsFirst 
      });
    });

    return query;
  }

  private static processConversionFieldsOptimized(item: any, conversionFields: any[]): Record<string, any> {
    const result: Record<string, any> = {};
    
    if (!conversionFields?.length) return result;

    conversionFields.forEach(field => {
      const fieldId = `conversion.${item.asset_types?.id || item.asset_type_id}.${field.field_name}`;
      const hasData = item.metadata?.[field.field_name] !== undefined && 
                     item.metadata?.[field.field_name] !== null && 
                     item.metadata?.[field.field_name] !== '';
      
      result[fieldId] = hasData ? (item.asset_types?.name || 'Unknown') : '';
    });

    return result;
  }
}

// 🚀 CALCULATION ENGINE
class CalculationEngine {
  static applyCalculations(data: any[], calculations: CalculationConfig[]): any[] {
    if (!calculations?.length) return data;

    return data.map(row => {
      const calculatedRow = { ...row };
      
      calculations.forEach(calc => {
        try {
          calculatedRow[calc.id] = this.evaluateCalculation(calc, row, data);
        } catch (error) {
          console.error(`Error calculating ${calc.id}:`, error);
          calculatedRow[calc.id] = null;
        }
      });
      
      return calculatedRow;
    });
  }

  private static evaluateCalculation(calc: CalculationConfig, row: any, allData: any[]): any {
    switch (calc.type) {
      case 'formula':
        return this.evaluateFormula(calc.expression, row);
      
      case 'percentage':
        const [numerator, denominator] = calc.dependencies;
        const num = parseFloat(row[numerator]) || 0;
        const denom = parseFloat(row[denominator]) || 0;
        return denom !== 0 ? (num / denom) * 100 : 0;
      
      case 'difference':
        const [value1, value2] = calc.dependencies;
        return (parseFloat(row[value1]) || 0) - (parseFloat(row[value2]) || 0);
      
      case 'running_total':
        // For running totals, we'd need row context
        return 0;
      
      default:
        return null;
    }
  }

  private static evaluateFormula(expression: string, row: any): any {
    try {
      let formula = expression;
      
      // Replace field references with values
      Object.keys(row).forEach(field => {
        const value = parseFloat(row[field]) || 0;
        formula = formula.replace(new RegExp(`\\b${field}\\b`, 'g'), value.toString());
      });
      
      // Simple evaluation (in production, use a safe expression evaluator)
      return Function(`"use strict"; return (${formula})`)();
    } catch (error) {
      return null;
    }
  }
}

// 🚀 MAIN OPTIMIZED EXECUTION ENGINE
export async function executeOptimizedReport(
  report: OptimizedReport,
  options: {
    limit?: number;
    useCache?: boolean;
    forceRefresh?: boolean;
  } = {}
): Promise<{
  data: any[];
  stats: ExecutionStats;
  pagination?: {
    page: number;
    limit: number;
    totalCount: number;
    hasNextPage: boolean;
  };
}> {
  const startTime = performance.now();
  const { limit, useCache = true, forceRefresh = false } = options;
  
  let cacheHit = false;
  let results: any[] = [];
  
  try {
    // Generate cache key
    const cacheKey = optimizedReportCache.generateCacheKey(
      report.report_config, 
      report.organization_id
    );
    
    // Check cache first (unless force refresh)
    if (useCache && !forceRefresh) {
      const cachedResults = optimizedReportCache.get(cacheKey);
      if (cachedResults) {
        cacheHit = true;
        results = cachedResults;
        
        // Apply limit if specified
        if (limit && results.length > limit) {
          results = results.slice(0, limit);
        }
      }
    }
    
    // Process data if not cached
    if (!cacheHit) {
      const { data, processingTime } = await OptimizedDataProcessor.processDataSourcesInParallel(
        report.report_config.dataSources,
        report.report_config,
        report.organization_id
      );
      
      results = data;
      
      // Apply calculations
      if (report.report_config.calculations) {
        results = CalculationEngine.applyCalculations(results, report.report_config.calculations);
      }
      
      // Cache results (before applying limit)
      if (useCache) {
        const cacheTTL = report.report_config.caching?.ttl || 300; // 5 minutes default
        optimizedReportCache.set(cacheKey, results, cacheTTL);
      }
      
      // Apply limit if specified
      if (limit && results.length > limit) {
        results = results.slice(0, limit);
      }
    }
    
    const endTime = performance.now();
    const executionTime = Math.round(endTime - startTime);
    
    // Calculate stats
    const stats: ExecutionStats = {
      executionTime,
      rowCount: results.length,
      cacheHit,
      queryComplexity: estimateQueryComplexity(report.report_config),
      dataSourcesUsed: report.report_config.dataSources,
      bytesProcessed: JSON.stringify(results).length,
      parallelProcessingUsed: report.report_config.dataSources.length > 1
    };
    
    // Log execution
    await logOptimizedReportExecution(report, stats);
    
    // Build pagination info if needed
    let pagination;
    if (report.report_config.pagination) {
      pagination = {
        page: report.report_config.pagination.page,
        limit: report.report_config.pagination.limit,
        totalCount: results.length, // This would be total before pagination in real impl
        hasNextPage: results.length === report.report_config.pagination.limit
      };
    }
    
    return { data: results, stats, pagination };
    
  } catch (error) {
    console.error('Error executing optimized report:', error);
    throw error;
  }
}

// 🚀 UTILITY FUNCTIONS
function estimateQueryComplexity(config: OptimizedReportConfig): 'low' | 'medium' | 'high' | 'extreme' {
  let score = 0;
  
  score += config.dataSources.length * 10;
  score += config.columns.length * 2;
  score += (config.filters?.length || 0) * 5;
  score += (config.sorts?.length || 0) * 3;
  score += (config.aggregations?.length || 0) * 15;
  score += (config.calculations?.length || 0) * 10;
  
  if (score < 30) return 'low';
  if (score < 70) return 'medium';
  if (score < 150) return 'high';
  return 'extreme';
}

async function logOptimizedReportExecution(report: OptimizedReport, stats: ExecutionStats): Promise<void> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user?.id) return;
    
    await supabase
      .from('report_runs')
      .insert({
        report_id: report.id,
        run_by: user.user.id,
        row_count: stats.rowCount,
        execution_time_ms: stats.executionTime,
        status: 'completed',
        cache_hit: stats.cacheHit,
        bytes_processed: stats.bytesProcessed
      });
  } catch (error) {
    console.error('Failed to log optimized report execution:', error);
  }
}

// Export cache for monitoring
export { optimizedReportCache }; 