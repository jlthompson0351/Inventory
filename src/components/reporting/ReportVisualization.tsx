import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
  ScatterChart,
  Scatter
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  PieChart as PieChartIcon, 
  TrendingUp, 
  Download,
  Eye,
  Settings
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ReportVisualizationProps {
  data: any[];
  columns: string[];
  formFields: any[];
  reportName: string;
  onExportChart?: (chartType: string, chartData: any) => void;
}

const CHART_COLORS = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', 
  '#d084d0', '#ffb347', '#87ceeb', '#dda0dd', '#98fb98'
];

const ChartTypeOptions = [
  { value: 'bar', label: 'Bar Chart', icon: BarChart3 },
  { value: 'line', label: 'Line Chart', icon: TrendingUp },
  { value: 'area', label: 'Area Chart', icon: TrendingUp },
  { value: 'pie', label: 'Pie Chart', icon: PieChartIcon },
];

export function ReportVisualization({ 
  data, 
  columns, 
  formFields, 
  reportName,
  onExportChart 
}: ReportVisualizationProps) {
  const [selectedChartType, setSelectedChartType] = React.useState('bar');
  const [xAxisField, setXAxisField] = React.useState('');
  const [yAxisField, setYAxisField] = React.useState('');

  // Get numeric and text fields for chart axes
  const numericFields = useMemo(() => {
    return formFields.filter(field => 
      ['number', 'currency'].includes(field.field_type) && 
      columns.includes(field.id)
    );
  }, [formFields, columns]);

  const categoryFields = useMemo(() => {
    return formFields.filter(field => 
      ['text', 'select', 'radio'].includes(field.field_type) && 
      columns.includes(field.id)
    );
  }, [formFields, columns]);

  // Process data for charts
  const chartData = useMemo(() => {
    if (!xAxisField || !yAxisField || !data.length) return [];

    // Group by x-axis field and aggregate y-axis field
    const grouped = data.reduce((acc, item) => {
      const xValue = String(item[xAxisField] || 'Unknown');
      const yValue = parseFloat(item[yAxisField]) || 0;
      
      if (!acc[xValue]) {
        acc[xValue] = { name: xValue, value: 0, count: 0 };
      }
      acc[xValue].value += yValue;
      acc[xValue].count += 1;
      return acc;
    }, {} as Record<string, any>);

    return Object.values(grouped).slice(0, 20); // Limit to top 20 for readability
  }, [data, xAxisField, yAxisField]);

  // Auto-select reasonable defaults
  React.useEffect(() => {
    if (!xAxisField && categoryFields.length > 0) {
      setXAxisField(categoryFields[0].id);
    }
    if (!yAxisField && numericFields.length > 0) {
      setYAxisField(numericFields[0].id);
    }
  }, [categoryFields, numericFields, xAxisField, yAxisField]);

  const renderChart = () => {
    if (!chartData.length) {
      return (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          <div className="text-center">
            <BarChart3 className="mx-auto h-12 w-12 mb-3 opacity-50" />
            <p>Select fields to generate visualization</p>
          </div>
        </div>
      );
    }

    const commonProps = {
      data: chartData,
      margin: { top: 20, right: 30, left: 20, bottom: 60 }
    };

    switch (selectedChartType) {
      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis 
              dataKey="name" 
              angle={-45}
              textAnchor="end"
              height={80}
              fontSize={12}
            />
            <YAxis fontSize={12} />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}
            />
            <Bar 
              dataKey="value" 
              fill={CHART_COLORS[0]}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        );

      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis 
              dataKey="name" 
              angle={-45}
              textAnchor="end"
              height={80}
              fontSize={12}
            />
            <YAxis fontSize={12} />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}
            />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke={CHART_COLORS[0]}
              strokeWidth={3}
              dot={{ fill: CHART_COLORS[0], strokeWidth: 2, r: 4 }}
            />
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis 
              dataKey="name" 
              angle={-45}
              textAnchor="end"
              height={80}
              fontSize={12}
            />
            <YAxis fontSize={12} />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}
            />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke={CHART_COLORS[0]}
              fill={CHART_COLORS[0]}
              fillOpacity={0.3}
            />
          </AreaChart>
        );

      case 'pie':
        return (
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}
            />
          </PieChart>
        );

      default:
        return null;
    }
  };

  if (!data.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="mr-2 h-5 w-5" />
            Report Visualization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <p>No data available for visualization</p>
            <p className="text-sm mt-1">Run your report to see charts</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <BarChart3 className="mr-2 h-5 w-5" />
            {reportName} - Visualization
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Badge variant="outline">{data.length} records</Badge>
            {onExportChart && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onExportChart(selectedChartType, chartData)}
              >
                <Download className="mr-1 h-4 w-4" />
                Export
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Chart Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg">
          <div>
            <label className="text-sm font-medium mb-2 block">Chart Type</label>
            <Select value={selectedChartType} onValueChange={setSelectedChartType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ChartTypeOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center">
                      <option.icon className="mr-2 h-4 w-4" />
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              {selectedChartType === 'pie' ? 'Category Field' : 'X-Axis (Categories)'}
            </label>
            <Select value={xAxisField} onValueChange={setXAxisField}>
              <SelectTrigger>
                <SelectValue placeholder="Select field" />
              </SelectTrigger>
              <SelectContent>
                {categoryFields.map(field => (
                  <SelectItem key={field.id} value={field.id}>
                    {field.field_label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              {selectedChartType === 'pie' ? 'Value Field' : 'Y-Axis (Values)'}
            </label>
            <Select value={yAxisField} onValueChange={setYAxisField}>
              <SelectTrigger>
                <SelectValue placeholder="Select field" />
              </SelectTrigger>
              <SelectContent>
                {numericFields.map(field => (
                  <SelectItem key={field.id} value={field.id}>
                    {field.field_label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Chart Display */}
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </div>

        {/* Chart Insights */}
        {chartData.length > 0 && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-sm mb-2">📊 Quick Insights</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Total Categories:</span>
                <span className="ml-1 font-medium">{chartData.length}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Total Value:</span>
                                 <span className="ml-1 font-medium">
                   {chartData.reduce((sum, item: any) => sum + (item.value || 0), 0).toLocaleString()}
                 </span>
               </div>
               <div>
                 <span className="text-muted-foreground">Average:</span>
                 <span className="ml-1 font-medium">
                   {chartData.length > 0 ? (Number(chartData.reduce((sum, item: any) => sum + (item.value || 0), 0)) / chartData.length).toFixed(2) : '0'}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 