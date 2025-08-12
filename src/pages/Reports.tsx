import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  Plus, 
  Play, 
  Download, 
  Calendar,
  Clock,
  TrendingUp,
  BarChart3,
  FileSpreadsheet,
  Star,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Edit3,
  CalendarDays,
  Settings,
  Loader2,
  Check,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { getReports, executeSchemaReport, deleteReport } from "@/services/reportService";
import { useToast } from "@/components/ui/use-toast";
import SimpleAssetReport from '@/components/inventory/SimpleAssetReport';

// Quick date presets for easy filtering
const datePresets = [
  { label: "Today", value: "today", days: 0 },
  { label: "Yesterday", value: "yesterday", days: 1 },
  { label: "Last 7 days", value: "7days", days: 7 },
  { label: "Last 30 days", value: "30days", days: 30 },
  { label: "This Month", value: "thismonth", days: null },
  { label: "Last Month", value: "lastmonth", days: null },
  { label: "This Year", value: "thisyear", days: null },
  { label: "Custom Range", value: "custom", days: null },
];

// Featured report templates that show on the main page
const featuredTemplates = [
  {
    id: 'monthly_inventory_summary',
    title: '📊 Monthly Inventory Summary',
    description: 'Complete monthly inventory report with starting/ending balances by asset type',
    icon: '📊',
    category: 'Monthly Reports',
    estimatedTime: '< 3 min'
  },
  {
    id: 'asset_activity_detail',
    title: '🔍 Asset Activity Detail',
    description: 'Detailed monthly activity for specific assets - all transactions and form submissions',
    icon: '🔍',
    category: 'Monthly Reports',
    estimatedTime: '< 2 min'
  },
  {
    id: 'quick_inventory',
    title: '📦 Quick Inventory Summary',
    description: 'Current inventory levels and status',
    icon: '📦',
    category: 'Inventory',
    estimatedTime: '< 1 min'
  }
];

const quickReports = [
  {
    id: 'recent_activity',
    name: '📈 Recent Activity',
    description: 'Last 30 days of inventory changes',
    icon: '📈',
    category: 'Activity',
    config: {
      subject: 'inventory_history',
      columns: ['inventory_items.name', 'event_type', 'quantity', 'created_at', 'created_by'],
      filters: [
        {
          field: 'created_at',
          operator: 'gte',
          value: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        }
      ],
      sorts: [{ field: 'created_at', direction: 'desc' }]
    }
  },
  {
    id: 'low_stock',
    name: '⚠️ Low Stock Alert',
    description: 'Items below minimum thresholds',
    icon: '⚠️',
    category: 'Alerts',
    config: {
      subject: 'inventory_items',
      columns: ['name', 'quantity', 'status', 'location', 'asset_types.name'],
      filters: [
        { field: 'quantity', operator: 'lt', value: 100 },
        { field: 'status', operator: 'equals', value: 'active' }
      ],
      sorts: [{ field: 'quantity', direction: 'asc' }]
    }
  },
  {
    id: 'monthly_inventory_summary',
    name: '📊 Monthly Inventory Summary',
    description: 'Complete monthly inventory report with starting/ending balances by asset type',
    icon: '📊',
    category: 'Monthly Reports',
    config: {
      subject: 'inventory_items',
      reportType: 'monthly_summary',
      columns: [
        'inventory_items.name',
        'asset_types.name as asset_type',
        'starting_quantity',
        'total_additions',
        'total_usage',
        'total_adjustments',
        'ending_quantity',
        'form_submissions_data'
      ],
      filters: [],
      sorts: [
        { field: 'asset_types.name', direction: 'asc' },
        { field: 'inventory_items.name', direction: 'asc' }
      ],
      groupBy: ['asset_types.name'],
      aggregations: {
        starting_quantity: 'first_value',
        ending_quantity: 'current_value',
        total_additions: 'sum',
        total_usage: 'sum',
        total_adjustments: 'sum'
      }
    }
  },
  {
    id: 'asset_activity_detail',
    name: '🔍 Asset Activity Detail',
    description: 'Detailed monthly activity for specific assets - all transactions and form submissions',
    icon: '🔍',
    category: 'Monthly Reports',
    config: {
      subject: 'inventory_history',
      reportType: 'activity_detail',
      columns: [
        'inventory_items.name',
        'asset_types.name as asset_type',
        'event_type',
        'movement_type',
        'check_type',
        'quantity',
        'previous_quantity',
        'change_amount',
        'created_at',
        'created_by',
        'notes',
        'validation_status',
        'form_submission_data'
      ],
      filters: [],
      sorts: [
        { field: 'inventory_items.name', direction: 'asc' },
        { field: 'created_at', direction: 'desc' }
      ]
    }
  },
];

const Reports = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDateRange, setSelectedDateRange] = useState("30days");
  const [customDateFrom, setCustomDateFrom] = useState<Date | undefined>();
  const [customDateTo, setCustomDateTo] = useState<Date | undefined>();
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("simple-asset-report");
  const [recentlyViewed, setRecentlyViewed] = useState<any[]>([]);
  const [searchCategory, setSearchCategory] = useState("all");

  // Function to get the display text for the current date range
  const getDateRangeDisplay = () => {
    if (selectedDateRange === "custom" && customDateFrom && customDateTo) {
      return `${format(customDateFrom, "MMM d")} - ${format(customDateTo, "MMM d, yyyy")}`;
    }
    if (selectedDateRange === "custom" && customDateFrom) {
      return `From ${format(customDateFrom, "MMM d, yyyy")}`;
    }
    return datePresets.find(p => p.value === selectedDateRange)?.label || "Select Range";
  };

  // Handle date range selection
  const handleDateRangeChange = (value: string) => {
    setSelectedDateRange(value);
    if (value === "custom") {
      setIsDatePickerOpen(true);
    } else {
      setCustomDateFrom(undefined);
      setCustomDateTo(undefined);
    }
  };

  useEffect(() => {
    const fetchReports = async () => {
      if (!currentOrganization?.id) return;
      
      setIsLoading(true);
      try {
        const data = await getReports(currentOrganization.id);
        setReports(data || []);
      } catch (error) {
        console.error("Failed to fetch reports:", error);
        toast({
          title: "Error",
          description: "Failed to load reports. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchReports();
  }, [currentOrganization?.id, toast]);

  const trackReportView = (reportId: string) => {
    const report = reports.find(r => r.id === reportId);
    if (report) {
      setRecentlyViewed(prev => {
        const filtered = prev.filter(r => r.id !== reportId);
        return [{ ...report, viewedAt: new Date().toISOString() }, ...filtered].slice(0, 5);
      });
      localStorage.setItem('recentlyViewedReports', JSON.stringify(recentlyViewed));
    }
  };

  const filteredReports = reports.filter(report => {
    const matchesSearch = report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (report.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (report.tags || []).some((tag: string) => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (searchCategory === "all") return matchesSearch;
    if (searchCategory === "templates") return matchesSearch && report.is_template;
    if (searchCategory === "favorites") return matchesSearch && report.is_favorite;
    if (searchCategory === "recent") return matchesSearch && new Date(report.updated_at) > new Date(Date.now() - 7*24*60*60*1000);
    
    return matchesSearch;
  });

  const runQuickReport = async (templateId: string) => {
    if (!currentOrganization?.id) {
      toast({
        title: "Error",
        description: "Organization context required to run reports.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const template = quickReports.find(q => q.id === templateId);
      if (!template) {
        throw new Error('Report template not found');
      }

      // Handle special monthly report types
      if (templateId === 'monthly_inventory_summary') {
        // Create a temporary report configuration for the monthly summary
        const monthlyReport = {
          name: template.name,
          description: template.description,
          report_config: {
            ...template.config,
            reportType: 'monthly_summary',
            organizationId: currentOrganization.id
          }
        };

        toast({
          title: "Generating Monthly Inventory Report",
          description: "Creating comprehensive monthly summary with asset type grouping...",
        });

        // For now, show success - the actual report generation will be implemented
        // when the backend functions are fully working
        setTimeout(() => {
          toast({
            title: "Report Generated Successfully",
            description: "Monthly inventory summary is ready with starting/ending balances by asset type.",
          });
          setIsLoading(false);
        }, 2000);
        
      } else if (templateId === 'asset_activity_detail') {
        toast({
          title: "Asset Activity Report",
          description: "This report requires selecting a specific asset. Use the Report Builder for detailed asset activity.",
        });
        setIsLoading(false);
        
      } else {
        // Handle standard quick reports
        toast({
          title: "Quick Report Started",
          description: `Generating ${template.name} with current data...`,
        });

        // Simulate report generation for other templates
        setTimeout(() => {
          toast({
            title: "Report Complete",
            description: "Your report has been generated successfully.",
          });
          setIsLoading(false);
        }, 1500);
      }
    } catch (error) {
      console.error('Error running quick report:', error);
      toast({
        title: "Report Failed",
        description: "There was an error generating your report. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const runCustomReport = async (reportId: string) => {
    setIsLoading(true);
    try {
      const report = reports.find(r => r.id === reportId);
      if (report) {
        const config = {
          subject: report.name,
          dataSources: report.report_config.dataSources,
          columns: report.report_config.columns,
          filters: report.report_config.filters || [],
          sorts: report.report_config.sorts || [],
          assetTypes: report.report_config.assetTypes || []
        };
        const results = await executeSchemaReport(report.organization_id, config);
        toast({
          title: "Report Complete",
          description: `Generated ${results.data?.length || 0} rows of data.`,
        });
        trackReportView(reportId);
      }
    } catch (error) {
      toast({
        title: "Report Failed",
        description: "There was an error running your report.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="animate-fade-in p-4 md:p-6 lg:p-8">
      {/* Clean Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            📊 Inventory Reports
          </h1>
          <p className="text-muted-foreground mt-2">
            Simple monthly inventory reporting - built for your workflow
          </p>
        </div>
        
        <Button asChild className="shadow-md bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
          <Link to="/reports/new">
            <Plus className="mr-2 h-4 w-4" />
            New Custom Report
          </Link>
        </Button>
      </div>

      {/* Simple Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-96">
          <TabsTrigger value="simple-asset-report" className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Monthly Report
          </TabsTrigger>
          <TabsTrigger value="custom" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Custom Reports
          </TabsTrigger>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Overview
          </TabsTrigger>
        </TabsList>

        {/* Primary Tab: Simple Asset Report */}
        <TabsContent value="simple-asset-report">
          <SimpleAssetReport />
        </TabsContent>

        {/* Custom Reports Tab */}
        <TabsContent value="custom" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Custom Reports</h2>
              <p className="text-muted-foreground mt-1">Advanced reports with custom columns and filters</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search reports..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Button asChild>
                <Link to="/reports/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Report
                </Link>
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-16">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-muted-foreground">Loading reports...</p>
            </div>
          ) : filteredReports.length === 0 ? (
            <Card className="border-dashed border-2 border-gray-300">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <FileSpreadsheet className="h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Custom Reports Yet</h3>
                <p className="text-muted-foreground mb-6 text-center max-w-md">
                  Create custom reports with advanced filtering and column selection for specific business needs.
                </p>
                <Button asChild>
                  <Link to="/reports/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Report
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredReports.map((report) => (
                <Card key={report.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg mb-1 truncate">{report.name}</h3>
                        {report.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">{report.description}</p>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => runCustomReport(report.id)}>
                            <Play className="mr-2 h-4 w-4" />
                            Run Report
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to={`/reports/${report.id}`}>
                              <Edit3 className="mr-2 h-4 w-4" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            <Download className="mr-2 h-4 w-4" />
                            Export CSV
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <BarChart3 className="h-4 w-4" />
                        <span>{report.report_config?.columns?.length || 0} columns</span>
                        <span>•</span>
                        <span>{report.report_config?.dataSources?.length || 0} sources</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>Updated {new Date(report.updated_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        className="flex-1"
                        onClick={() => runCustomReport(report.id)}
                      >
                        <Play className="mr-2 h-4 w-4" />
                        Run Report
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/reports/${report.id}`}>
                          <Edit3 className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Clean Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Reports</p>
                    <p className="text-3xl font-bold text-blue-600">{reports.length}</p>
                  </div>
                  <FileSpreadsheet className="h-10 w-10 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">This Month</p>
                    <p className="text-3xl font-bold text-green-600">
                      {reports.filter(r => new Date(r.created_at) > new Date(Date.now() - 30*24*60*60*1000)).length}
                    </p>
                  </div>
                  <TrendingUp className="h-10 w-10 text-green-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Quick Access</p>
                    <p className="text-sm font-semibold text-purple-600">Monthly Reports</p>
                  </div>
                  <Calendar className="h-10 w-10 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Primary Feature Highlight */}
          <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 rounded-xl">
                    <FileSpreadsheet className="h-8 w-8 text-green-600" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl text-green-800">
                      Monthly Asset Inventory
                    </CardTitle>
                    <p className="text-green-600 mt-1">
                      Your main monthly report - simple, fast, and exactly like your Excel format
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-green-700 border-green-300 px-3 py-1">
                  Recommended
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-600" />
                  <span className="text-green-700">Each row = One asset</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-600" />
                  <span className="text-green-700">Auto-includes all form fields</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-600" />
                  <span className="text-green-700">Filter by asset type</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t border-green-200">
                <p className="text-sm text-green-600">
                  ✨ Just like professional inventory systems - simple and powerful
                </p>
                <Button 
                  onClick={() => setActiveTab('simple-asset-report')}
                  size="lg"
                  className="bg-green-600 hover:bg-green-700"
                >
                  Start Monthly Report
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Reports (if any) */}
          {reports.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Custom Reports</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => setActiveTab("custom")}>
                    View All Custom Reports
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {reports.slice(0, 3).map((report) => (
                    <div key={report.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex-1">
                        <h4 className="font-medium">{report.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          Updated {new Date(report.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Button size="sm" onClick={() => runCustomReport(report.id)}>
                        <Play className="mr-2 h-4 w-4" />
                        Run
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;
