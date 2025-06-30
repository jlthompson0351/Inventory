import React, { useMemo, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Target,
  Brain,
  Lightbulb,
  BarChart3,
  Users,
  Calendar,
  Zap,
  Shield,
  DollarSign,
  Clock,
  AlertCircle
} from 'lucide-react';
// Import our bulletproof inventory utilities
import { 
  getInventoryReportingData, 
  validateInventoryConsistency, 
  getLastMonthTotal 
} from '@/services/inventoryReportingUtils';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { format } from 'date-fns';

interface SmartInsightsProps {
  data: any[];
  columns: string[];
  formFields: any[];
  reportConfig: any;
  // New optional prop for standalone inventory analysis
  enableInventoryAnalysis?: boolean;
}

interface Insight {
  id: string;
  type: 'trend' | 'anomaly' | 'recommendation' | 'summary' | 'business' | 'optimization' | 'inventory_quality';
  severity: 'info' | 'warning' | 'success' | 'error' | 'critical';
  title: string;
  description: string;
  value?: string | number;
  icon: React.ReactNode;
  action?: string;
  actionable?: boolean;
  businessImpact?: 'low' | 'medium' | 'high';
  estimatedSavings?: number;
  priority?: number;
  dataQualityScore?: number;
}

export function SmartInsights({ 
  data, 
  columns, 
  formFields, 
  reportConfig, 
  enableInventoryAnalysis = false 
}: SmartInsightsProps) {
  const { currentOrganization } = useOrganization();
  const [inventoryQualityData, setInventoryQualityData] = useState<any[]>([]);
  const [isLoadingInventoryAnalysis, setIsLoadingInventoryAnalysis] = useState(false);
  
  // Load comprehensive inventory quality analysis
  useEffect(() => {
    if (enableInventoryAnalysis && currentOrganization?.id) {
      loadInventoryQualityAnalysis();
    }
  }, [enableInventoryAnalysis, currentOrganization?.id]);

  const loadInventoryQualityAnalysis = async () => {
    setIsLoadingInventoryAnalysis(true);
    try {
      // Get all inventory items for quality analysis
      const { data: inventoryItems, error } = await supabase
        .from('inventory_items')
        .select(`
          id,
          name,
          sku,
          quantity,
          status,
          asset_types(name),
          assets(id, name)
        `)
        .eq('organization_id', currentOrganization!.id);

      if (error) throw error;

      const currentMonth = format(new Date(), 'yyyy-MM');
      const qualityPromises = inventoryItems?.map(async (item) => {
        try {
          const qualityData = await getInventoryReportingData(item.id, currentMonth);
          return {
            ...item,
            quality_data: qualityData
          };
        } catch (error) {
          console.warn(`Could not get quality data for item ${item.id}:`, error);
          return {
            ...item,
            quality_data: null
          };
        }
      }) || [];

      const qualityResults = await Promise.allSettled(qualityPromises);
      const validResults = qualityResults
        .filter(result => result.status === 'fulfilled')
        .map(result => (result as PromiseFulfilledResult<any>).value);

      setInventoryQualityData(validResults);
    } catch (error) {
      console.error('Error loading inventory quality analysis:', error);
    } finally {
      setIsLoadingInventoryAnalysis(false);
    }
  };
  
  const insights = useMemo((): Insight[] => {
    const allInsights: Insight[] = [];
    
    // Enhanced Inventory Quality Analysis (NEW)
    if (enableInventoryAnalysis && inventoryQualityData.length > 0) {
      // Overall system quality score
      const qualityScores = inventoryQualityData
        .filter(item => item.quality_data?.data_quality_score)
        .map(item => item.quality_data.data_quality_score);
      
      if (qualityScores.length > 0) {
        const avgQualityScore = qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length;
        
        allInsights.push({
          id: 'system-quality-score',
          type: 'inventory_quality',
          severity: avgQualityScore >= 80 ? 'success' : avgQualityScore >= 60 ? 'warning' : 'error',
          title: 'System Data Quality',
          description: `Overall inventory data quality score`,
          value: `${avgQualityScore.toFixed(1)}/100`,
          icon: avgQualityScore >= 80 ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />,
          action: avgQualityScore < 70 ? 'Review data collection processes and implement quality improvements' : 'Maintain current data standards',
          actionable: avgQualityScore < 70,
          businessImpact: avgQualityScore < 60 ? 'high' : avgQualityScore < 80 ? 'medium' : 'low',
          priority: avgQualityScore < 60 ? 10 : avgQualityScore < 80 ? 7 : 3,
          dataQualityScore: avgQualityScore
        });
      }
      
      // Items with missing last month data
      const itemsWithMissingData = inventoryQualityData.filter(item => 
        item.quality_data?.last_month_total?.source === 'none' || 
        !item.quality_data?.last_month_total?.amount
      );
      
      if (itemsWithMissingData.length > 0) {
        const percentage = (itemsWithMissingData.length / inventoryQualityData.length) * 100;
        allInsights.push({
          id: 'missing-last-month-data',
          type: 'inventory_quality',
          severity: percentage > 50 ? 'error' : percentage > 25 ? 'warning' : 'info',
          title: 'Missing Historical Data',
          description: `${itemsWithMissingData.length} items lack reliable last month inventory data`,
          value: `${percentage.toFixed(1)}% of inventory`,
          icon: <Calendar className="h-4 w-4" />,
          action: 'Establish baseline inventory tracking for these items',
          actionable: true,
          businessImpact: percentage > 50 ? 'high' : 'medium',
          priority: percentage > 50 ? 9 : 6
        });
      }
      
      // Data consistency issues
      const inconsistentItems = inventoryQualityData.filter(item => 
        item.quality_data?.consistency_check?.isConsistent === false
      );
      
      if (inconsistentItems.length > 0) {
        const percentage = (inconsistentItems.length / inventoryQualityData.length) * 100;
        allInsights.push({
          id: 'data-consistency-issues',
          type: 'inventory_quality',
          severity: 'warning',
          title: 'Data Consistency Alert',
          description: `${inconsistentItems.length} items show discrepancies between sources`,
          value: `${percentage.toFixed(1)}% inconsistent`,
          icon: <AlertTriangle className="h-4 w-4" />,
          action: 'Audit and reconcile inventory data sources',
          actionable: true,
          businessImpact: 'high',
          priority: 8
        });
      }
      
      // High-confidence items
      const highConfidenceItems = inventoryQualityData.filter(item => 
        item.quality_data?.data_quality_score >= 90
      );
      
      if (highConfidenceItems.length > 0) {
        const percentage = (highConfidenceItems.length / inventoryQualityData.length) * 100;
        allInsights.push({
          id: 'high-confidence-data',
          type: 'inventory_quality',
          severity: 'success',
          title: 'High-Quality Data Assets',
          description: `${highConfidenceItems.length} items have excellent data quality (90%+)`,
          value: `${percentage.toFixed(1)}% excellent`,
          icon: <CheckCircle className="h-4 w-4" />,
          action: 'Use these items as examples for best practices',
          actionable: false,
          businessImpact: 'low',
          priority: 2
        });
      }
    }

    // Only proceed with report-based analysis if we have data
    if (!data.length) {
      return allInsights.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    }

    // 1. ENHANCED Data Quality Insights
    const missingDataFields = columns.filter(col => {
      const missingCount = data.filter(row => !row[col] || row[col] === '' || row[col] === null).length;
      return missingCount > data.length * 0.1; // More than 10% missing
    });

    if (missingDataFields.length > 0) {
      allInsights.push({
        id: 'missing-data',
        type: 'anomaly',
        severity: 'warning',
        title: 'Data Quality Alert',
        description: `${missingDataFields.length} field(s) have significant missing data (>10%)`,
        icon: <AlertTriangle className="h-4 w-4" />,
        action: 'Review data collection processes and form validation',
        actionable: true,
        businessImpact: 'medium',
        priority: 8
      });
    }

    // 2. NEW: Business Intelligence Insights for Inventory
    const inventoryFields = formFields.filter(f => 
      f.field_label.toLowerCase().includes('quantity') || 
      f.field_label.toLowerCase().includes('stock') ||
      f.field_label.toLowerCase().includes('inventory')
    );

    if (inventoryFields.length > 0) {
      inventoryFields.forEach(field => {
        const values = data
          .map(row => parseFloat(row[field.id]))
          .filter(val => !isNaN(val) && val !== null);
        
        if (values.length > 0) {
          const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
          const lowStockItems = values.filter(val => val < avg * 0.2).length; // Less than 20% of average
          
          if (lowStockItems > 0) {
            allInsights.push({
              id: `low-stock-${field.id}`,
              type: 'business',
              severity: 'warning',
              title: 'Low Stock Alert',
              description: `${lowStockItems} items show critically low inventory levels`,
              value: `${((lowStockItems / values.length) * 100).toFixed(1)}% of items`,
              icon: <AlertCircle className="h-4 w-4" />,
              action: 'Review reorder points and supplier lead times',
              actionable: true,
              businessImpact: 'high',
              estimatedSavings: lowStockItems * 50, // Estimated cost per stockout
              priority: 9
            });
          }
        }
      });
    }

    // 3. NEW: Financial Impact Analysis
    const costFields = formFields.filter(f => 
      f.field_type === 'currency' || 
      f.field_label.toLowerCase().includes('cost') ||
      f.field_label.toLowerCase().includes('price') ||
      f.field_label.toLowerCase().includes('value')
    );

    if (costFields.length > 0) {
      costFields.forEach(field => {
        const values = data
          .map(row => parseFloat(row[field.id]))
          .filter(val => !isNaN(val) && val > 0);
        
        if (values.length > 0) {
          const totalValue = values.reduce((sum, val) => sum + val, 0);
          const avg = totalValue / values.length;
          const highValueItems = values.filter(val => val > avg * 3).length; // 3x above average
          
          if (highValueItems > 0) {
            allInsights.push({
              id: `high-value-items-${field.id}`,
              type: 'business',
              severity: 'info',
              title: 'High-Value Assets Identified',
              description: `${highValueItems} items are significantly above average value`,
              value: `Total value: $${totalValue.toLocaleString()}`,
              icon: <DollarSign className="h-4 w-4" />,
              action: 'Consider enhanced security and insurance for high-value items',
              actionable: true,
              businessImpact: 'medium',
              priority: 6
            });
          }
        }
      });
    }

    // 4. NEW: Performance Optimization Insights
    if (reportConfig.dataSources?.length > 3) {
      allInsights.push({
        id: 'complex-query',
        type: 'optimization',
        severity: 'warning',
        title: 'Query Complexity Alert',
        description: 'Multiple data sources may impact performance',
        icon: <Zap className="h-4 w-4" />,
        action: 'Consider breaking into focused reports or using data views',
        actionable: true,
        businessImpact: 'low',
        priority: 4
      });
    }

    // 5. NEW: Compliance and Audit Insights
    const dateFields = formFields.filter(f => 
      ['date', 'datetime'].includes(f.field_type) && 
      (f.field_label.toLowerCase().includes('audit') || 
       f.field_label.toLowerCase().includes('inspection') ||
       f.field_label.toLowerCase().includes('maintenance'))
    );

    dateFields.forEach(field => {
      const dates = data
        .map(row => row[field.id] ? new Date(row[field.id]) : null)
        .filter(date => date && !isNaN(date.getTime()));
      
      if (dates.length > 0) {
        const today = new Date();
        const overdueItems = dates.filter(date => {
          const daysDiff = Math.ceil((today.getTime() - date!.getTime()) / (1000 * 60 * 60 * 24));
          return daysDiff > 90; // More than 90 days old
        }).length;
        
        if (overdueItems > 0) {
          allInsights.push({
            id: `overdue-${field.id}`,
            type: 'business',
            severity: 'error',
            title: 'Compliance Risk Detected',
            description: `${overdueItems} items have overdue ${field.field_label.toLowerCase()}`,
            value: `${((overdueItems / dates.length) * 100).toFixed(1)}% overdue`,
            icon: <Shield className="h-4 w-4" />,
            action: 'Schedule immediate inspections to maintain compliance',
            actionable: true,
            businessImpact: 'high',
            estimatedSavings: overdueItems * 200, // Estimated cost per compliance violation
            priority: 10
          });
        }
      }
    });

    // 6. Record Count Insights (Enhanced)
    if (data.length < 10) {
      allInsights.push({
        id: 'low-data',
        type: 'summary',
        severity: 'info',
        title: 'Limited Data Set',
        description: `Only ${data.length} records found`,
        icon: <BarChart3 className="h-4 w-4" />,
        action: 'Consider expanding date range or removing restrictive filters',
        actionable: true,
        businessImpact: 'low',
        priority: 3
      });
    } else if (data.length > 1000) {
      allInsights.push({
        id: 'large-dataset',
        type: 'summary',
        severity: 'success',
        title: 'Rich Data Set',
        description: `Analyzing ${data.length.toLocaleString()} records - excellent data coverage`,
        icon: <CheckCircle className="h-4 w-4" />,
        businessImpact: 'low',
        priority: 2
      });
    }

    // 7. NEW: Trend Analysis
    const numericFields = formFields.filter(f => ['number', 'currency'].includes(f.field_type));
    numericFields.forEach(field => {
      const values = data
        .map(row => parseFloat(row[field.id]))
        .filter(val => !isNaN(val) && val !== null);
      
      if (values.length > 5) {
        // Simple trend detection - compare first half to second half
        const midpoint = Math.floor(values.length / 2);
        const firstHalf = values.slice(0, midpoint);
        const secondHalf = values.slice(midpoint);
        
        const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
        const percentChange = ((secondAvg - firstAvg) / firstAvg) * 100;
        
        if (Math.abs(percentChange) > 20) {
          allInsights.push({
            id: `trend-${field.id}`,
            type: 'trend',
            severity: percentChange > 0 ? 'success' : 'warning',
            title: `${percentChange > 0 ? 'Positive' : 'Negative'} Trend Detected`,
            description: `${field.field_label} shows ${Math.abs(percentChange).toFixed(1)}% ${percentChange > 0 ? 'increase' : 'decrease'}`,
            icon: percentChange > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />,
            action: percentChange > 0 ? 'Monitor for sustainability' : 'Investigate root causes',
            actionable: true,
            businessImpact: Math.abs(percentChange) > 50 ? 'high' : 'medium',
            priority: Math.abs(percentChange) > 50 ? 8 : 5
          });
        }
      }
    });

    // 8. NEW: Utilization Insights
    const utilizationRate = (columns.filter(col => {
      const nonEmptyCount = data.filter(row => row[col] && row[col] !== '').length;
      return nonEmptyCount > 0;
    }).length / columns.length * 100);
    
    if (utilizationRate < 50) {
      allInsights.push({
        id: 'low-utilization',
        type: 'optimization',
        severity: 'warning',
        title: 'Low Field Utilization',
        description: `Only ${utilizationRate.toFixed(1)}% of selected fields contain data`,
        icon: <Target className="h-4 w-4" />,
        action: 'Remove unused columns to improve report clarity and performance',
        actionable: true,
        businessImpact: 'low',
        priority: 3
      });
    }

    // Sort insights by priority (highest first)
    return allInsights.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }, [data, columns, formFields, reportConfig, inventoryQualityData, enableInventoryAnalysis]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-red-500 bg-red-100 text-red-900';
      case 'error': return 'border-red-200 bg-red-50 text-red-800';
      case 'warning': return 'border-yellow-200 bg-yellow-50 text-yellow-800';
      case 'success': return 'border-green-200 bg-green-50 text-green-800';
      case 'info':
      default: return 'border-blue-200 bg-blue-50 text-blue-800';
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'error': return 'destructive';
      case 'warning': return 'secondary';
      case 'success': return 'default';
      case 'info':
      default: return 'outline';
    }
  };

  const getBusinessImpactBadge = (impact?: string) => {
    switch (impact) {
      case 'high': return { variant: 'destructive' as const, label: 'High Impact' };
      case 'medium': return { variant: 'secondary' as const, label: 'Medium Impact' };
      case 'low': return { variant: 'outline' as const, label: 'Low Impact' };
      default: return null;
    }
  };

  // Group insights by type for better organization
  const groupedInsights = insights.reduce((acc, insight) => {
    if (!acc[insight.type]) acc[insight.type] = [];
    acc[insight.type].push(insight);
    return acc;
  }, {} as Record<string, Insight[]>);

  const typeLabels = {
    business: '💼 Business Insights',
    optimization: '⚡ Performance',
    anomaly: '🚨 Data Quality',
    trend: '📈 Trends',
    summary: '📊 Summary',
    recommendation: '💡 Recommendations',
    inventory_quality: '🎯 Inventory Quality'
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Brain className="mr-2 h-5 w-5" />
            Smart Insights
          </div>
          <Badge variant="outline" className="text-xs">
            {insights.length} insights
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoadingInventoryAnalysis ? (
          <div className="text-center py-8 text-muted-foreground">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
            <p>Analyzing inventory data quality...</p>
            <p className="text-sm mt-1">This may take a moment for large inventories</p>
          </div>
        ) : insights.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Brain className="mx-auto h-12 w-12 mb-3 opacity-50" />
            <p>No insights available</p>
            <p className="text-sm mt-1">
              {enableInventoryAnalysis 
                ? "Enable inventory analysis or generate a report preview to see insights" 
                : "Generate a report preview to see AI-powered insights"
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedInsights).map(([type, typeInsights]) => (
              <div key={type}>
                <h4 className="font-medium text-sm mb-2 text-muted-foreground">
                  {typeLabels[type as keyof typeof typeLabels] || type}
                </h4>
                <div className="space-y-3">
                  {typeInsights.map((insight) => (
                    <div
                      key={insight.id}
                      className={`p-4 rounded-lg border ${getSeverityColor(insight.severity)}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-grow">
                          <div className="flex-shrink-0 mt-0.5">
                            {insight.icon}
                          </div>
                          <div className="flex-grow min-w-0">
                            <div className="flex items-center space-x-2 mb-1 flex-wrap">
                              <h4 className="font-medium text-sm">{insight.title}</h4>
                              <Badge variant={getSeverityBadge(insight.severity) as any} className="text-xs">
                                {insight.type}
                              </Badge>
                              {getBusinessImpactBadge(insight.businessImpact) && (
                                <Badge 
                                  variant={getBusinessImpactBadge(insight.businessImpact)!.variant} 
                                  className="text-xs"
                                >
                                  {getBusinessImpactBadge(insight.businessImpact)!.label}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm mb-2">{insight.description}</p>
                            {insight.value && (
                              <p className="text-xs font-mono mb-2 opacity-75 bg-white/50 p-1 rounded">
                                {insight.value}
                              </p>
                            )}
                            {insight.estimatedSavings && (
                              <p className="text-xs mb-2 font-medium text-green-700">
                                💰 Potential savings: ${insight.estimatedSavings.toLocaleString()}
                              </p>
                            )}
                            {insight.action && (
                              <div className="mt-2">
                                <p className="text-xs font-medium text-gray-700 mb-1">💡 Recommended Action:</p>
                                <p className="text-xs bg-white/70 p-2 rounded border">{insight.action}</p>
                                {insight.actionable && (
                                  <Button size="sm" variant="outline" className="mt-2 text-xs h-7">
                                    Take Action
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 