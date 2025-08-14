import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft, Save, Download, Plus, Settings, Trash2, Play, Pause,
  Filter, SortAsc, ArrowUp, ArrowDown, Loader2, Sparkles, BarChart3,
  Clock, Database, Zap, Eye, TrendingUp, Activity, Target
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { getAvailableSources, getFieldsForSources } from '@/services/reportingSchemaService';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import {
  OptimizedReportConfig,
  OptimizedReport,
  AdvancedFilterRule,
  SortRule,
  AggregationConfig,
  CalculationConfig,
  ExecutionStats,
  executeOptimizedReport,
  optimizedReportCache
} from '@/services/optimizedReportService';

// 🚀 ADVANCED FILTER OPERATORS
const FILTER_OPERATORS = [
  { value: 'equals', label: 'Equals', icon: '=' },
  { value: 'not_equals', label: 'Not Equals', icon: '≠' },
  { value: 'greater_than', label: 'Greater Than', icon: '>' },
  { value: 'less_than', label: 'Less Than', icon: '<' },
  { value: 'contains', label: 'Contains', icon: '⊃' },
  { value: 'not_contains', label: 'Not Contains', icon: '⊅' },
  { value: 'starts_with', label: 'Starts With', icon: '▶' },
  { value: 'ends_with', label: 'Ends With', icon: '◀' },
  { value: 'in', label: 'In List', icon: '∈' },
  { value: 'between', label: 'Between', icon: '↔' },
  { value: 'is_null', label: 'Is Empty', icon: '∅' },
  { value: 'is_not_null', label: 'Is Not Empty', icon: '≠∅' },
  { value: 'regex', label: 'Regex Pattern', icon: '.*' },
  { value: 'fuzzy_match', label: 'Fuzzy Match', icon: '≈' }
];

// 🚀 AGGREGATION FUNCTIONS
const AGGREGATION_FUNCTIONS = [
  { value: 'sum', label: 'Sum', icon: 'Σ' },
  { value: 'avg', label: 'Average', icon: 'x̄' },
  { value: 'count', label: 'Count', icon: '#' },
  { value: 'min', label: 'Minimum', icon: '↓' },
  { value: 'max', label: 'Maximum', icon: '↑' },
  { value: 'median', label: 'Median', icon: '~' },
  { value: 'stddev', label: 'Std Dev', icon: 'σ' }
];

// 🚀 REPORT BUILDER INTERFACE
interface OptimizedReportBuilderProps {
  initialReport?: OptimizedReport;
  onSave?: (report: OptimizedReport) => void;
  onCancel?: () => void;
}

const OptimizedReportBuilder: React.FC<OptimizedReportBuilderProps> = ({
  initialReport,
  onSave,
  onCancel
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const navigate = useNavigate();

  // 🚀 STATE MANAGEMENT
  const [config, setConfig] = useState<OptimizedReportConfig>({
    subject: 'inventory_items',
    dataSources: [],
    columns: [],
    filters: [],
    sorts: [],
    assetTypes: [],
    aggregations: [],
    calculations: [],
    pagination: { page: 1, limit: 100 },
    caching: { enabled: true, ttl: 300 }
  });

  const [reportMetadata, setReportMetadata] = useState({
    name: 'New Optimized Report',
    description: '',
    tags: [] as string[]
  });

  const [previewData, setPreviewData] = useState<any[]>([]);
  const [executionStats, setExecutionStats] = useState<ExecutionStats | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [activeTab, setActiveTab] = useState('sources');
  const [autoPreview, setAutoPreview] = useState(true);
  const [previewLimit, setPreviewLimit] = useState(10);
  
  // Performance monitoring
  const [performanceMetrics, setPerformanceMetrics] = useState({
    avgExecutionTime: 0,
    cacheHitRate: 0,
    totalExecutions: 0,
    dataProcessed: 0
  });

  // Real-time preview with debouncing
  const previewTimeoutRef = useRef<NodeJS.Timeout>();
  const [isPreviewScheduled, setIsPreviewScheduled] = useState(false);

  // Load available sources from schema
  const schemaSources = useMemo(() => getAvailableSources(), []);

  // Helper component: fields for a single source from schema
  const SourceFieldSelector: React.FC<{
    source: string;
    selected: string[];
    onToggle: (columnId: string, checked: boolean) => void;
  }> = ({ source, selected, onToggle }) => {
    const [fields, setFields] = React.useState<any[]>([]);
    React.useEffect(() => {
      (async () => {
        const fs = await getFieldsForSources([source]);
        setFields(fs);
      })();
    }, [source]);
    return (
      <>
        {fields.map((f) => (
          <div key={f.id} className="flex items-center space-x-2">
            <Checkbox
              checked={selected.includes(f.id)}
              onCheckedChange={(checked) => onToggle(f.id, !!checked)}
            />
            <Label className="text-sm">{f.field_label}</Label>
          </div>
        ))}
      </>
    );
  };

  // 🚀 SMART PREVIEW SYSTEM
  const schedulePreview = useCallback(() => {
    if (!autoPreview || config.dataSources.length === 0 || config.columns.length === 0) return;

    setIsPreviewScheduled(true);
    
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }

    previewTimeoutRef.current = setTimeout(() => {
      executePreview();
      setIsPreviewScheduled(false);
    }, 800); // 800ms debounce
  }, [config, autoPreview]);

  // Execute preview with performance tracking
  const executePreview = useCallback(async () => {
    if (!currentOrganization?.id || isExecuting) return;

    setIsExecuting(true);
    
    try {
      const tempReport: OptimizedReport = {
        id: 'preview',
        name: reportMetadata.name,
        description: reportMetadata.description,
        report_config: config,
        organization_id: currentOrganization.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const result = await executeOptimizedReport(tempReport, {
        limit: previewLimit,
        useCache: config.caching?.enabled
      });

      setPreviewData(result.data);
      setExecutionStats(result.stats);

      // Update performance metrics
      setPerformanceMetrics(prev => ({
        avgExecutionTime: (prev.avgExecutionTime * prev.totalExecutions + result.stats.executionTime) / (prev.totalExecutions + 1),
        cacheHitRate: ((prev.cacheHitRate * prev.totalExecutions) + (result.stats.cacheHit ? 1 : 0)) / (prev.totalExecutions + 1),
        totalExecutions: prev.totalExecutions + 1,
        dataProcessed: prev.dataProcessed + result.stats.bytesProcessed
      }));

      const executionTimeColor = result.stats.executionTime < 500 ? 'text-green-600' : 
                                result.stats.executionTime < 2000 ? 'text-yellow-600' : 'text-red-600';
      
      toast({
        title: `Preview Complete ${result.stats.cacheHit ? '⚡' : '🔄'}`,
        description: `Found ${result.data.length} records in ${result.stats.executionTime}ms ${result.stats.cacheHit ? '(cached)' : ''}`,
        className: executionTimeColor
      });

    } catch (error) {
      console.error('Preview failed:', error);
      toast({
        title: 'Preview Failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive'
      });
    } finally {
      setIsExecuting(false);
    }
  }, [config, currentOrganization?.id, reportMetadata, previewLimit, isExecuting]);

  // Auto-preview when config changes
  useEffect(() => {
    schedulePreview();
    return () => {
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
    };
  }, [schedulePreview]);

  // 🚀 CONFIG HANDLERS
  const updateConfig = (updates: Partial<OptimizedReportConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const addFilter = () => {
    const newFilter: AdvancedFilterRule = {
      field: '',
      operator: 'equals',
      value: '',
      logic: 'AND'
    };
    updateConfig({
      filters: [...config.filters, newFilter]
    });
  };

  const updateFilter = (index: number, updates: Partial<AdvancedFilterRule>) => {
    const updatedFilters = [...config.filters];
    updatedFilters[index] = { ...updatedFilters[index], ...updates };
    updateConfig({ filters: updatedFilters });
  };

  const removeFilter = (index: number) => {
    updateConfig({
      filters: config.filters.filter((_, i) => i !== index)
    });
  };

  const addSort = () => {
    const newSort: SortRule = {
      field: '',
      direction: 'asc',
      nullsFirst: false
    };
    updateConfig({
      sorts: [...config.sorts, newSort]
    });
  };

  const updateSort = (index: number, updates: Partial<SortRule>) => {
    const updatedSorts = [...config.sorts];
    updatedSorts[index] = { ...updatedSorts[index], ...updates };
    updateConfig({ sorts: updatedSorts });
  };

  const removeSort = (index: number) => {
    updateConfig({
      sorts: config.sorts.filter((_, i) => i !== index)
    });
  };

  const addAggregation = () => {
    const newAgg: AggregationConfig = {
      field: '',
      function: 'sum',
      alias: `agg_${config.aggregations?.length || 0}`,
      groupBy: []
    };
    updateConfig({
      aggregations: [...(config.aggregations || []), newAgg]
    });
  };

  const addCalculation = () => {
    const newCalc: CalculationConfig = {
      id: `calc_${config.calculations?.length || 0}`,
      label: 'New Calculation',
      expression: '',
      type: 'formula',
      dependencies: []
    };
    updateConfig({
      calculations: [...(config.calculations || []), newCalc]
    });
  };

  // 🚀 PERFORMANCE INDICATOR COMPONENT
  const PerformanceIndicator = () => (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Performance Monitor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <div className="text-muted-foreground">Avg Speed</div>
            <div className="font-semibold flex items-center gap-1">
              {performanceMetrics.avgExecutionTime.toFixed(0)}ms
              {performanceMetrics.avgExecutionTime < 500 ? 
                <Zap className="h-3 w-3 text-green-500" /> : 
                <Clock className="h-3 w-3 text-yellow-500" />
              }
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Cache Hit</div>
            <div className="font-semibold">
              {(performanceMetrics.cacheHitRate * 100).toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Executions</div>
            <div className="font-semibold">{performanceMetrics.totalExecutions}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Data Processed</div>
            <div className="font-semibold">
              {(performanceMetrics.dataProcessed / 1024).toFixed(1)}KB
            </div>
          </div>
        </div>
        
        {executionStats && (
          <div className="pt-2 border-t">
            <div className="text-xs text-muted-foreground mb-1">Last Execution</div>
            <div className="flex items-center gap-2 text-xs">
              <Badge variant={executionStats.cacheHit ? 'secondary' : 'outline'} className="text-xs">
                {executionStats.cacheHit ? '⚡ Cached' : '🔄 Fresh'}
              </Badge>
              <Badge variant={
                executionStats.queryComplexity === 'low' ? 'secondary' :
                executionStats.queryComplexity === 'medium' ? 'outline' :
                executionStats.queryComplexity === 'high' ? 'destructive' : 'destructive'
              } className="text-xs">
                {executionStats.queryComplexity} complexity
              </Badge>
              {executionStats.parallelProcessingUsed && (
                <Badge variant="secondary" className="text-xs">⚡ Parallel</Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  // 🚀 SMART INSIGHTS COMPONENT
  const SmartInsights = () => {
    const insights = useMemo(() => {
      const tips = [];
      
      if (config.dataSources.length > 3) {
        tips.push({
          type: 'warning',
          title: 'Multiple Data Sources',
          message: 'Consider splitting into focused reports for better performance'
        });
      }
      
      if (config.filters.length === 0 && config.dataSources.length > 0) {
        tips.push({
          type: 'suggestion',
          title: 'Add Filters',
          message: 'Filters can significantly improve query performance'
        });
      }
      
      if (executionStats?.executionTime && executionStats.executionTime > 2000) {
        tips.push({
          type: 'performance',
          title: 'Slow Query Detected',
          message: 'Consider adding filters or enabling caching'
        });
      }
      
      if (executionStats?.cacheHit) {
        tips.push({
          type: 'success',
          title: 'Cache Hit',
          message: 'Query served from cache - excellent performance!'
        });
      }

      return tips;
    }, [config, executionStats]);

    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="h-4 w-4" />
            Smart Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {insights.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-4">
              All good! No suggestions at the moment.
            </div>
          ) : (
            insights.map((insight, index) => (
              <div key={index} className={`p-2 rounded text-xs border-l-2 ${
                insight.type === 'warning' ? 'border-l-yellow-500 bg-yellow-50' :
                insight.type === 'performance' ? 'border-l-red-500 bg-red-50' :
                insight.type === 'success' ? 'border-l-green-500 bg-green-50' :
                'border-l-blue-500 bg-blue-50'
              }`}>
                <div className="font-medium">{insight.title}</div>
                <div className="text-muted-foreground">{insight.message}</div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <Input
              value={reportMetadata.name}
              onChange={(e) => setReportMetadata(prev => ({ ...prev, name: e.target.value }))}
              className="text-xl font-bold border-0 bg-transparent p-0 focus-visible:ring-0"
              placeholder="Report Name"
            />
            <Input
              value={reportMetadata.description}
              onChange={(e) => setReportMetadata(prev => ({ ...prev, description: e.target.value }))}
              className="text-sm text-muted-foreground border-0 bg-transparent p-0 focus-visible:ring-0"
              placeholder="Description (optional)"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={executePreview} disabled={isExecuting}>
            {isExecuting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {isExecuting ? 'Running...' : 'Preview'}
          </Button>
          <Button onClick={() => onSave?.({} as OptimizedReport)}>
            <Save className="h-4 w-4 mr-2" />
            Save Report
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Main Content */}
        <div className="col-span-8">
          <Card>
            <CardContent className="p-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-5 w-full mb-6">
                  <TabsTrigger value="sources">Data Sources</TabsTrigger>
                  <TabsTrigger value="columns">Columns</TabsTrigger>
                  <TabsTrigger value="filters">Filters</TabsTrigger>
                  <TabsTrigger value="aggregations">Aggregations</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>

                {/* Data Sources Tab */}
                <TabsContent value="sources" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Select Data Sources</h3>
                    <Badge variant="outline">{config.dataSources.length} selected</Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {schemaSources.map(({ id: source, name, icon, description }) => (
                      <Card key={source} className={`cursor-pointer transition-all ${
                        config.dataSources.includes(source) ? 'ring-2 ring-primary' : ''
                      }`}>
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-3">
                            <Checkbox
                              checked={config.dataSources.includes(source)}
                              onCheckedChange={(checked) => {
                                const newSources = checked 
                                  ? [...config.dataSources, source]
                                  : config.dataSources.filter(s => s !== source);
                                updateConfig({ dataSources: newSources });
                              }}
                            />
                            <div>
                              <div className="font-medium capitalize">{icon} {name}</div>
                              <div className="text-xs text-muted-foreground">{description}</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                {/* Columns Tab */}
                <TabsContent value="columns" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Select Columns</h3>
                    <Badge variant="outline">{config.columns.length} selected</Badge>
                  </div>
                  
                  <div className="space-y-4">
                    {config.dataSources.map(source => (
                      <Card key={source}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm capitalize">{source.replace('_', ' ')}</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-2">
                          {/* Load columns dynamically from schema */}
                          <SourceFieldSelector
                            source={source}
                            selected={config.columns}
                            onToggle={(columnId, checked) => {
                              const newColumns = checked
                                ? [...config.columns, columnId]
                                : config.columns.filter(c => c !== columnId);
                              updateConfig({ columns: newColumns });
                            }}
                          />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                {/* Advanced Filters Tab */}
                <TabsContent value="filters" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Advanced Filters</h3>
                    <Button size="sm" onClick={addFilter}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Filter
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    {config.filters.map((filter, index) => (
                      <Card key={index} className="p-4">
                        <div className="grid grid-cols-4 gap-3">
                          <div>
                            <Label className="text-xs">Field</Label>
                            <Select
                              value={filter.field}
                              onValueChange={(value) => updateFilter(index, { field: value })}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue placeholder="Select field" />
                              </SelectTrigger>
                              <SelectContent>
                                {config.columns.map(col => (
                                  <SelectItem key={col} value={col}>{col}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label className="text-xs">Operator</Label>
                            <Select
                              value={filter.operator}
                              onValueChange={(value: any) => updateFilter(index, { operator: value })}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {FILTER_OPERATORS.map(op => (
                                  <SelectItem key={op.value} value={op.value}>
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-xs">{op.icon}</span>
                                      {op.label}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label className="text-xs">Value</Label>
                            <Input
                              className="h-8"
                              value={filter.value}
                              onChange={(e) => updateFilter(index, { value: e.target.value })}
                              placeholder="Filter value"
                            />
                          </div>
                          
                          <div className="flex items-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => removeFilter(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                {/* Aggregations Tab */}
                <TabsContent value="aggregations" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Aggregations & Calculations</h3>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={addAggregation}>
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Add Aggregation
                      </Button>
                      <Button size="sm" onClick={addCalculation}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Calculation
                      </Button>
                    </div>
                  </div>
                  
                  {config.aggregations && config.aggregations.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-medium">Aggregations</h4>
                      {config.aggregations.map((agg, index) => (
                        <Card key={index} className="p-4">
                          <div className="grid grid-cols-4 gap-3">
                            <div>
                              <Label className="text-xs">Function</Label>
                              <Select value={agg.function}>
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {AGGREGATION_FUNCTIONS.map(func => (
                                    <SelectItem key={func.value} value={func.value}>
                                      <div className="flex items-center gap-2">
                                        <span className="font-mono text-xs">{func.icon}</span>
                                        {func.label}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs">Field</Label>
                              <Select value={agg.field}>
                                <SelectTrigger className="h-8">
                                  <SelectValue placeholder="Select field" />
                                </SelectTrigger>
                                <SelectContent>
                                  {config.columns.map(col => (
                                    <SelectItem key={col} value={col}>{col}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs">Alias</Label>
                              <Input className="h-8" value={agg.alias} placeholder="Result name" />
                            </div>
                            <div className="flex items-end">
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Preview Tab */}
                <TabsContent value="preview" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Live Preview</h3>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={autoPreview}
                          onCheckedChange={setAutoPreview}
                        />
                        <Label className="text-sm">Auto Preview</Label>
                      </div>
                      
                      <Select value={previewLimit.toString()} onValueChange={(v) => setPreviewLimit(parseInt(v))}>
                        <SelectTrigger className="w-20 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="25">25</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Button size="sm" onClick={executePreview} disabled={isExecuting}>
                        {isExecuting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                        Refresh
                      </Button>
                    </div>
                  </div>
                  
                  {isPreviewScheduled && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Preview scheduled...
                    </div>
                  )}
                  
                  {isExecuting && (
                    <Card className="p-8 text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                      <div className="text-lg font-medium">Executing Report...</div>
                      <div className="text-sm text-muted-foreground">Processing {config.dataSources.length} data sources</div>
                    </Card>
                  )}
                  
                  {!isExecuting && previewData.length > 0 && (
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">
                            Results ({previewData.length} records)
                          </CardTitle>
                          {executionStats && (
                            <div className="flex items-center gap-2 text-xs">
                              <Badge variant={executionStats.cacheHit ? 'secondary' : 'outline'}>
                                {executionStats.executionTime}ms
                              </Badge>
                              <Badge variant="outline">{executionStats.queryComplexity}</Badge>
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b">
                                {config.columns.slice(0, 8).map(col => (
                                  <th key={col} className="text-left p-2 font-medium">
                                    {col.split('.').pop()}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {previewData.slice(0, 10).map((row, index) => (
                                <tr key={index} className="border-b">
                                  {config.columns.slice(0, 8).map(col => (
                                    <td key={col} className="p-2 max-w-32 truncate">
                                      {row[col] || '—'}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="col-span-4 space-y-4">
          <PerformanceIndicator />
          <SmartInsights />
          
          {/* Cache Management */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Database className="h-4 w-4" />
                Cache Control
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={config.caching?.enabled}
                  onCheckedChange={(enabled) => updateConfig({
                    caching: { ...config.caching!, enabled: !!enabled }
                  })}
                />
                <Label className="text-sm">Enable Caching</Label>
              </div>
              
              <div>
                <Label className="text-xs">Cache TTL (seconds)</Label>
                <Input
                  type="number"
                  className="h-8"
                  value={config.caching?.ttl || 300}
                  onChange={(e) => updateConfig({
                    caching: { ...config.caching!, ttl: parseInt(e.target.value) || 300 }
                  })}
                />
              </div>
              
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => {
                  optimizedReportCache.invalidate();
                  toast({ title: 'Cache Cleared', description: 'All cached reports have been cleared' });
                }}
              >
                Clear Cache
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default OptimizedReportBuilder; 