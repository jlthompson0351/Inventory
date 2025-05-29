import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  Calendar
} from 'lucide-react';

interface SmartInsightsProps {
  data: any[];
  columns: string[];
  formFields: any[];
  reportConfig: any;
}

interface Insight {
  id: string;
  type: 'trend' | 'anomaly' | 'recommendation' | 'summary';
  severity: 'info' | 'warning' | 'success' | 'error';
  title: string;
  description: string;
  value?: string | number;
  icon: React.ReactNode;
  action?: string;
}

export function SmartInsights({ data, columns, formFields, reportConfig }: SmartInsightsProps) {
  
  const insights = useMemo((): Insight[] => {
    if (!data.length) return [];
    
    const allInsights: Insight[] = [];

    // 1. Data Quality Insights
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
        description: `${missingDataFields.length} field(s) have significant missing data`,
        icon: <AlertTriangle className="h-4 w-4" />,
        action: 'Review data collection processes'
      });
    }

    // 2. Record Count Insights
    if (data.length < 10) {
      allInsights.push({
        id: 'low-data',
        type: 'summary',
        severity: 'info',
        title: 'Limited Data Set',
        description: `Only ${data.length} records found`,
        icon: <BarChart3 className="h-4 w-4" />,
        action: 'Consider expanding date range or filters'
      });
    } else if (data.length > 1000) {
      allInsights.push({
        id: 'large-dataset',
        type: 'summary',
        severity: 'success',
        title: 'Rich Data Set',
        description: `Analyzing ${data.length.toLocaleString()} records`,
        icon: <CheckCircle className="h-4 w-4" />
      });
    }

    // 3. Numeric Field Analysis
    const numericFields = formFields.filter(f => 
      ['number', 'currency'].includes(f.field_type) && columns.includes(f.id)
    );

    numericFields.forEach(field => {
      const values = data
        .map(row => parseFloat(row[field.id]))
        .filter(val => !isNaN(val) && val !== null);
      
      if (values.length > 0) {
        const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
        const max = Math.max(...values);
        const min = Math.min(...values);
        
        // Detect outliers (values more than 2 standard deviations from mean)
        const stdDev = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length);
        const outliers = values.filter(val => Math.abs(val - avg) > 2 * stdDev);
        
        if (outliers.length > 0) {
          allInsights.push({
            id: `outliers-${field.id}`,
            type: 'anomaly',
            severity: 'info',
            title: 'Statistical Outliers Detected',
            description: `${outliers.length} unusual values in ${field.field_label}`,
            value: `Range: ${min.toLocaleString()} - ${max.toLocaleString()}`,
            icon: <Target className="h-4 w-4" />
          });
        }
      }
    });

    // 4. Date Field Analysis
    const dateFields = formFields.filter(f => 
      ['date', 'datetime'].includes(f.field_type) && columns.includes(f.id)
    );

    dateFields.forEach(field => {
      const dates = data
        .map(row => row[field.id] ? new Date(row[field.id]) : null)
        .filter(date => date && !isNaN(date.getTime()));
      
      if (dates.length > 0) {
        const sortedDates = dates.sort((a, b) => a!.getTime() - b!.getTime());
        const oldestDate = sortedDates[0];
        const newestDate = sortedDates[sortedDates.length - 1];
        const daysDiff = Math.ceil((newestDate!.getTime() - oldestDate!.getTime()) / (1000 * 60 * 60 * 24));
        
        allInsights.push({
          id: `date-range-${field.id}`,
          type: 'summary',
          severity: 'info',
          title: 'Date Range Analysis',
          description: `Data spans ${daysDiff} days`,
          value: `${oldestDate!.toLocaleDateString()} to ${newestDate!.toLocaleDateString()}`,
          icon: <Calendar className="h-4 w-4" />
        });
      }
    });

    // 5. Category Distribution Insights
    const categoryFields = formFields.filter(f => 
      ['text', 'select'].includes(f.field_type) && columns.includes(f.id)
    );

    categoryFields.forEach(field => {
      const values = data.map(row => row[field.id]).filter(val => val);
      const uniqueValues = [...new Set(values)];
      
      if (uniqueValues.length > 1) {
        const distribution = uniqueValues.reduce((acc, val) => {
          acc[val] = values.filter(v => v === val).length;
          return acc;
        }, {} as Record<string, number>);
        
        const sortedDistribution = Object.entries(distribution)
          .sort(([,a], [,b]) => b - a);
        
        const topCategory = sortedDistribution[0];
        const topPercentage = (topCategory[1] / values.length * 100).toFixed(1);
        
        if (parseFloat(topPercentage) > 70) {
          allInsights.push({
            id: `dominance-${field.id}`,
            type: 'trend',
            severity: 'info',
            title: 'Category Dominance',
            description: `${topPercentage}% of records are "${topCategory[0]}"`,
            icon: <TrendingUp className="h-4 w-4" />
          });
        }
      }
    });

    // 6. Performance Recommendations
    if (columns.length > 15) {
      allInsights.push({
        id: 'too-many-columns',
        type: 'recommendation',
        severity: 'warning',
        title: 'Report Optimization',
        description: 'Consider reducing columns for better performance',
        icon: <Lightbulb className="h-4 w-4" />,
        action: 'Focus on key metrics only'
      });
    }

    if (reportConfig.dataSources?.length > 5) {
      allInsights.push({
        id: 'many-sources',
        type: 'recommendation',
        severity: 'info',
        title: 'Complex Report Detected',
        description: 'Multiple data sources may slow performance',
        icon: <Brain className="h-4 w-4" />,
        action: 'Consider breaking into smaller reports'
      });
    }

    // 7. Usage Insights
    const formFields_with_data = columns.filter(col => {
      const nonEmptyCount = data.filter(row => row[col] && row[col] !== '').length;
      return nonEmptyCount > 0;
    });

    const utilizationRate = (formFields_with_data.length / columns.length * 100).toFixed(1);
    
    if (parseFloat(utilizationRate) < 50) {
      allInsights.push({
        id: 'low-utilization',
        type: 'recommendation',
        severity: 'warning',
        title: 'Low Field Utilization',
        description: `Only ${utilizationRate}% of selected fields contain data`,
        icon: <Target className="h-4 w-4" />,
        action: 'Remove unused columns'
      });
    }

    return allInsights;
  }, [data, columns, formFields, reportConfig]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error': return 'border-red-200 bg-red-50 text-red-800';
      case 'warning': return 'border-yellow-200 bg-yellow-50 text-yellow-800';
      case 'success': return 'border-green-200 bg-green-50 text-green-800';
      case 'info':
      default: return 'border-blue-200 bg-blue-50 text-blue-800';
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'error': return 'destructive';
      case 'warning': return 'secondary';
      case 'success': return 'default';
      case 'info':
      default: return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Brain className="mr-2 h-5 w-5" />
          Smart Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        {insights.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Brain className="mx-auto h-12 w-12 mb-3 opacity-50" />
            <p>No insights available</p>
            <p className="text-sm mt-1">Generate a report preview to see AI-powered insights</p>
          </div>
        ) : (
          <div className="space-y-3">
            {insights.map((insight) => (
              <div
                key={insight.id}
                className={`p-4 rounded-lg border ${getSeverityColor(insight.severity)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {insight.icon}
                    </div>
                    <div className="flex-grow min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium text-sm">{insight.title}</h4>
                        <Badge variant={getSeverityBadge(insight.severity) as any} className="text-xs">
                          {insight.type}
                        </Badge>
                      </div>
                      <p className="text-sm">{insight.description}</p>
                      {insight.value && (
                        <p className="text-xs font-mono mt-1 opacity-75">{insight.value}</p>
                      )}
                      {insight.action && (
                        <p className="text-xs mt-2 font-medium">💡 {insight.action}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 