import schemaJson from '@/reporting-schema.json';

// Enhanced types for the business-friendly reporting schema
export interface DataCategory {
  id: string;
  label: string;
  description: string;
  icon: string;
  color: string;
}

export interface QuickReport {
  id: string;
  label: string;
  description: string;
  icon: string;
  category: string;
  entities: string[];
  defaultFields: string[];
  suggested: boolean;
}

export interface DataSource {
  id: string;
  label: string;
  businessLabel: string;
  description: string;
  category: string;
  icon: string;
  table: string;
  primaryFields: string[];
}

export interface ReportField {
  id: string;
  label: string;
  businessLabel: string;
  column: string;
  type: string;
  category: string;
  description?: string;
  sortable: boolean;
  aggregatable: boolean;
  searchable?: boolean;
  filterable?: boolean;
  requiresJoin?: string;
  values?: string[];
  source: string;
}

// UI Field shape expected by existing ReportBuilder components
export interface UIField {
  id: string;
  field_label: string;
  field_type: string;
  form_name: string;
  description?: string;
  aggregatable?: boolean;
  sortable?: boolean;
  filterable?: boolean;
  format?: string;
  category?: string;
  businessLabel?: string;
}

interface ReportingSchema {
  version: string;
  description?: string;
  categories: Record<string, any>;
  quickReports: QuickReport[];
  entities: Record<string, any>;
  guides?: any;
  notes?: any;
}

const reportingSchema = schemaJson as ReportingSchema;

export function getDataCategories(): DataCategory[] {
  return Object.entries(reportingSchema.categories || {}).map(([key, category]: [string, any]) => ({
    id: key,
    label: category.label,
    description: category.description,
    icon: category.icon,
    color: category.color
  }));
}

export function getQuickReports(): QuickReport[] {
  return reportingSchema.quickReports || [];
}

export function getAvailableSources(): DataSource[] {
  return Object.entries(reportingSchema.entities || {}).map(([key, entity]: [string, any]) => ({
    id: key,
    label: entity.displayName || key,
    businessLabel: entity.businessLabel || entity.displayName || key,
    description: entity.description || '',
    category: entity.category || 'other',
    icon: entity.icon || '📊',
    table: entity.table || key,
    primaryFields: entity.primaryFields || []
  }));
}

export function getSourcesByCategory(categoryId: string): DataSource[] {
  const sources = getAvailableSources();
  return sources.filter(source => source.category === categoryId);
}

export function getFieldsForSources(sources: string[], businessMode: boolean = true): ReportField[] {
  const allFields: ReportField[] = [];
  
  for (const source of sources) {
    const entity = reportingSchema.entities?.[source];
    if (entity?.fields) {
      // Add direct fields
      entity.fields.forEach((field: any) => {
        allFields.push({
          id: field.id,
          label: businessMode ? (field.businessLabel || field.label) : field.label,
          businessLabel: field.businessLabel || field.label,
          column: field.column,
          type: field.type,
          category: field.category || 'other',
          description: field.description,
          sortable: field.sortable || false,
          aggregatable: field.aggregatable || false,
          searchable: field.searchable || false,
          filterable: field.filterable || false,
          values: field.values,
          source,
          requiresJoin: field.requiresJoin
        });
      });
    }
  }
  
  return allFields;
}

export function getFieldsByCategory(sources: string[], businessMode: boolean = true): Record<string, ReportField[]> {
  const fields = getFieldsForSources(sources, businessMode);
  const categorizedFields: Record<string, ReportField[]> = {};
  
  // Get all unique categories from selected sources
  const allCategories = new Set<string>();
  sources.forEach(source => {
    const entity = reportingSchema.entities?.[source];
    if (entity?.fieldCategories) {
      Object.keys(entity.fieldCategories).forEach(cat => allCategories.add(cat));
    }
  });
  
  // Initialize categories with proper ordering
  const sortedCategories = Array.from(allCategories).sort((a, b) => {
    // Get order from first source that has this category
    let orderA = 999, orderB = 999;
    for (const source of sources) {
      const entity = reportingSchema.entities?.[source];
      if (entity?.fieldCategories?.[a]) {
        orderA = entity.fieldCategories[a].order || 999;
        break;
      }
    }
    for (const source of sources) {
      const entity = reportingSchema.entities?.[source];
      if (entity?.fieldCategories?.[b]) {
        orderB = entity.fieldCategories[b].order || 999;
        break;
      }
    }
    return orderA - orderB;
  });
  
  // Initialize categories
  sortedCategories.forEach(category => {
    categorizedFields[category] = [];
  });
  
  // Categorize fields
  fields.forEach(field => {
    const category = field.category || 'other';
    if (!categorizedFields[category]) {
      categorizedFields[category] = [];
    }
    categorizedFields[category].push(field);
  });
  
  return categorizedFields;
}

// Legacy function to maintain compatibility with existing ReportBuilder
export async function getFieldsForSources_Legacy(sourceIds: string[]): Promise<UIField[]> {
  const fields = getFieldsForSources(sourceIds, true);
  
  return fields.map(field => ({
    id: field.id,
    field_label: field.label,
    field_type: field.type,
    form_name: field.source,
    description: field.description,
    aggregatable: field.aggregatable,
    sortable: field.sortable,
    filterable: field.filterable,
    category: field.category,
    businessLabel: field.businessLabel
  }));
}

export function getSmartSuggestions(selectedSources: string[], selectedFields: string[]): {
  suggestedFields: ReportField[];
  suggestedJoins: string[];
  warnings: string[];
} {
  const suggestions: ReportField[] = [];
  const suggestedJoins: string[] = [];
  const warnings: string[] = [];
  
  // Suggest primary fields if none selected
  if (selectedFields.length === 0) {
    for (const source of selectedSources) {
      const entity = reportingSchema.entities?.[source];
      if (entity?.primaryFields) {
        const sourceFields = getFieldsForSources([source]);
        const primarySuggestions = sourceFields.filter(field => 
          entity.primaryFields.some((pf: string) => field.id.endsWith(`.${pf}`))
        );
        suggestions.push(...primarySuggestions);
      }
    }
  }
  
  // Suggest complementary fields based on selection
  for (const fieldId of selectedFields) {
    const [table] = fieldId.split('.');
    
    // If selecting asset info, suggest asset type
    if (table === 'assets' && !selectedSources.includes('asset_types')) {
      suggestedJoins.push('asset_types');
    }
    
    // If selecting inventory items, suggest assets
    if (table === 'inventory_items' && !selectedSources.includes('assets')) {
      suggestedJoins.push('assets');
    }
  }
  
  // Warnings for performance
  if (selectedSources.includes('inventory_history') && selectedFields.length > 10) {
    warnings.push('Large history reports may be slow. Consider adding date filters.');
  }
  
  if (selectedFields.length > 15) {
    warnings.push('Reports with many columns may be slow to load and export.');
  }
  
  return {
    suggestedFields: suggestions,
    suggestedJoins,
    warnings
  };
}

export function validateReportConfig(config: any): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Basic validation
  if (!config.dataSources || config.dataSources.length === 0) {
    errors.push('At least one data source must be selected');
  }
  
  if (!config.columns || config.columns.length === 0) {
    errors.push('At least one column must be selected');
  }
  
  // Performance warnings
  if (config.columns && config.columns.length > 20) {
    warnings.push('Reports with many columns may be slow to load');
  }
  
  if (config.dataSources && config.dataSources.length > 3) {
    warnings.push('Reports with many data sources may be complex');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

export function getCategoryLabel(categoryId: string, sourceId?: string): string {
  if (sourceId) {
    const entity = reportingSchema.entities?.[sourceId];
    return entity?.fieldCategories?.[categoryId]?.label || categoryId;
  }
  
  // Fallback to common category names
  const commonLabels: Record<string, string> = {
    basic: 'Basic Information',
    identification: 'Identification',
    status: 'Status & Condition',
    dates: 'Dates',
    classification: 'Classification',
    metrics: 'Quantities & Metrics',
    financial: 'Pricing & Value',
    location: 'Location & Storage',
    transaction: 'Transaction Details',
    notes: 'Notes & Comments'
  };
  
  return commonLabels[categoryId] || categoryId;
}

export function getOperatorsByType(type: string): string[] {
  const operators = reportingSchema.notes?.operators || {};
  return operators[type] || [];
}

// Helper function to get field metadata
export function getFieldMetadata(fieldId: string): ReportField | null {
  const [sourceId, columnName] = fieldId.split('.');
  if (!sourceId || !columnName) return null;
  
  const entity = reportingSchema.entities?.[sourceId];
  if (!entity) return null;
  
  const field = entity.fields?.find((f: any) => f.id === fieldId);
  if (!field) return null;
  
  return {
    id: field.id,
    label: field.businessLabel || field.label,
    businessLabel: field.businessLabel || field.label,
    column: field.column,
    type: field.type,
    category: field.category || 'other',
    description: field.description,
    sortable: field.sortable || false,
    aggregatable: field.aggregatable || false,
    searchable: field.searchable || false,
    filterable: field.filterable || false,
    values: field.values,
    source: sourceId,
    requiresJoin: field.requiresJoin
  };
}