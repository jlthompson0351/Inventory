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
  CalendarDays
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
import { getReports, executeReport, deleteReport } from "@/services/reportService";
import { useToast } from "@/components/ui/use-toast";

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
    id: 'quick_inventory',
    title: '📦 Quick Inventory Summary',
    description: 'Current inventory levels and status',
    icon: '📦',
    category: 'Inventory',
    estimatedTime: '< 1 min'
  },
  {
    id: 'asset_overview',
    title: '🏷️ Asset Overview',
    description: 'Complete asset tracking and details',
    icon: '🏷️',
    category: 'Assets',
    estimatedTime: '< 2 min'
  },
  {
    id: 'activity_report',
    title: '📊 Activity Report',
    description: 'Recent form submissions and changes',
    icon: '📊',
    category: 'Activity',
    estimatedTime: '< 1 min'
  }
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
  const [activeTab, setActiveTab] = useState("dashboard");

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

  const filteredReports = reports.filter(report =>
    report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (report.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const runQuickReport = async (templateId: string) => {
    // This would generate and run a quick report based on the template
    toast({
      title: "Quick Report Started",
      description: "Generating your report with current data...",
    });
    // Implementation would go here
  };

  const runCustomReport = async (reportId: string) => {
    // Run an existing custom report
    setIsLoading(true);
    try {
      const report = reports.find(r => r.id === reportId);
      if (report) {
        const results = await executeReport(report);
        // Handle the results - could open a modal or download CSV
        toast({
          title: "Report Complete",
          description: `Generated ${results.length} rows of data.`,
        });
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
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">📊 Reports</h1>
          <p className="text-muted-foreground mt-1">Generate insights and track your organization's data</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Date Range Selector */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedDateRange} onValueChange={handleDateRangeChange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {datePresets.map(preset => (
                  <SelectItem key={preset.value} value={preset.value}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Custom Date Range Picker */}
          {selectedDateRange === "custom" && (
            <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="min-w-[200px] justify-start text-left font-normal"
                >
                  <CalendarDays className="mr-2 h-4 w-4" />
                  {customDateFrom && customDateTo
                    ? `${format(customDateFrom, "MMM d")} - ${format(customDateTo, "MMM d, yyyy")}`
                    : customDateFrom
                    ? `From ${format(customDateFrom, "MMM d, yyyy")}`
                    : "Pick date range"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-4" align="start">
                <div className="space-y-4">
                  <div className="text-sm font-medium">Select Date Range</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-muted-foreground mb-2 block">From Date</label>
                      <CalendarComponent
                        mode="single"
                        selected={customDateFrom}
                        onSelect={(date) => setCustomDateFrom(date)}
                        className="rounded-md border"
                        initialFocus
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-2 block">To Date</label>
                      <CalendarComponent
                        mode="single"
                        selected={customDateTo}
                        onSelect={(date) => setCustomDateTo(date)}
                        disabled={(date) => customDateFrom ? date < customDateFrom : false}
                        className="rounded-md border"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button 
                      size="sm" 
                      onClick={() => setIsDatePickerOpen(false)}
                      disabled={!customDateFrom || !customDateTo}
                      className="flex-1"
                    >
                      Apply Range
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setCustomDateFrom(undefined);
                        setCustomDateTo(undefined);
                        setSelectedDateRange("30days");
                        setIsDatePickerOpen(false);
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}
          
          {/* Create New Report - More Prominent */}
          <Button asChild className="shadow-md">
            <Link to="/reports/new">
              <Plus className="mr-2 h-4 w-4" />
              New Report
            </Link>
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="dashboard">📊 Dashboard</TabsTrigger>
          <TabsTrigger value="custom">🛠️ Custom Reports</TabsTrigger>
          <TabsTrigger value="templates">⚡ Quick Templates</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab - Main overview with quick actions */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* Quick Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Reports</p>
                    <p className="text-2xl font-bold">{reports.length}</p>
                  </div>
                  <FileSpreadsheet className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Reports This Month</p>
                    <p className="text-2xl font-bold">{reports.filter(r => new Date(r.created_at) > new Date(Date.now() - 30*24*60*60*1000)).length}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Date Range</p>
                    <p className="text-sm font-semibold">{getDateRangeDisplay()}</p>
                    {selectedDateRange === "custom" && customDateFrom && customDateTo && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {Math.ceil((customDateTo.getTime() - customDateFrom.getTime()) / (1000 * 60 * 60 * 24))} days selected
                      </p>
                    )}
                  </div>
                  <Calendar className={`h-8 w-8 ${selectedDateRange === "custom" && customDateFrom && customDateTo ? "text-green-500" : "text-purple-500"}`} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Featured Quick Reports */}
          <div>
            <h2 className="text-xl font-semibold mb-4">⚡ Quick Reports</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {featuredTemplates.map((template) => (
                <Card key={template.id} className="hover:shadow-lg transition-shadow cursor-pointer border-dashed border-2">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="text-2xl">{template.icon}</div>
                      <Badge variant="outline" className="text-xs">{template.estimatedTime}</Badge>
                    </div>
                    <h3 className="font-semibold mb-1">{template.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
                    <Button 
                      size="sm" 
                      className="w-full"
                      onClick={() => runQuickReport(template.id)}
                    >
                      <Play className="mr-2 h-3 w-3" />
                      Run Now
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Recent Custom Reports */}
          {reports.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">📋 Recent Reports</h2>
                <Button variant="outline" size="sm" onClick={() => setActiveTab("custom")}>
                  View All
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reports.slice(0, 4).map((report) => (
                  <Card key={report.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold truncate">{report.name}</h3>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
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
                      {report.description && (
                        <p className="text-sm text-muted-foreground mb-3">{report.description}</p>
                      )}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Updated {new Date(report.updated_at).toLocaleDateString()}</span>
                        <Badge variant="secondary" className="text-xs">
                          {report.report_config?.columns?.length || 0} columns
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Custom Reports Tab */}
        <TabsContent value="custom" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">🛠️ Custom Reports</h2>
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
            <div className="text-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading reports...</p>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-16">
              <FileSpreadsheet className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Custom Reports Yet</h3>
              <p className="text-muted-foreground mb-6">Create your first custom report to get started</p>
              <Button asChild>
                <Link to="/reports/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Report
                </Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredReports.map((report) => (
                <Card key={report.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{report.name}</h3>
                        {report.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{report.description}</p>
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
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <BarChart3 className="h-3 w-3" />
                        <span>{report.report_config?.columns?.length || 0} columns</span>
                        <span>•</span>
                        <span>{report.report_config?.dataSources?.length || 0} sources</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>Updated {new Date(report.updated_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        className="flex-1"
                        onClick={() => runCustomReport(report.id)}
                      >
                        <Play className="mr-2 h-3 w-3" />
                        Run
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/reports/${report.id}`}>
                          <Eye className="h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold mb-2">⚡ Report Templates</h2>
            <p className="text-muted-foreground mb-6">Quick-start templates for common reporting needs</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredTemplates.map((template) => (
              <Card key={template.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="text-3xl">{template.icon}</div>
                    <Badge variant="outline">{template.category}</Badge>
                  </div>
                  <h3 className="font-semibold mb-2">{template.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{template.description}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {template.estimatedTime}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1" onClick={() => runQuickReport(template.id)}>
                      <Play className="mr-2 h-3 w-3" />
                      Run Now
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/reports/new?template=${template.id}`}>
                        <Edit3 className="h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;
