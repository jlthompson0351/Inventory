import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  FileSpreadsheet, 
  MoreVertical, 
  Plus, 
  FileText, 
  Download,
  Search,
  Loader2,
  Package2,
  Boxes,
  ClipboardList,
  ArrowRight,
  BarChart,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { getReports, deleteReport, executeReport, Report } from "@/services/reportService";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InventoryAggregationReport } from "@/components/inventory/InventoryAggregationReport";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useOrganization } from "@/hooks/useOrganization";

const Reports = () => {
  console.log("Reports component rendering");
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentOrganization, isLoading: orgLoading } = useOrganization();
  const [searchTerm, setSearchTerm] = useState("");
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("aggregation"); // Default to aggregation tab
  
  console.log("Reports - Auth state:", { 
    user: user ? "LOGGED_IN" : "NOT_LOGGED_IN",
    orgLoading,
    organization: currentOrganization
  });
  
  useEffect(() => {
    const fetchReports = async () => {
      if (!currentOrganization?.id) {
        console.log("Reports - No organization ID, skipping reports fetch");
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError(null);
      try {
        console.log(`Reports - Fetching reports for org: ${currentOrganization.id}`);
        const data = await getReports(currentOrganization.id);
        console.log(`Reports - Fetched ${data.length} reports`);
        setReports(data);
      } catch (error) {
        console.error("Failed to fetch reports:", error);
        setError("Failed to load reports. Please try again.");
        toast({
          title: "Error",
          description: "Failed to load reports. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchReports();
  }, [currentOrganization?.id, toast]);
  
  // Filter reports based on search term
  const filteredReports = reports.filter(report => 
    report.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (report.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  );
  
  const runReport = async (reportId: string, reportName: string) => {
    const report = reports.find(r => r.id === reportId);
    if (!report) return;
    
    toast({
      title: "Generating Report",
      description: "Please wait while we generate your report..."
    });
    
    try {
      const result = await executeReport(report);
      toast({
        title: "Report Generated",
        description: `${reportName} has been generated with ${result.length} rows of data.`
      });
      
      // In a real app, you might want to display the results in a modal or navigate to a results page
      console.log("Report results:", result);
    } catch (error) {
      console.error("Error running report:", error);
      toast({
        title: "Error",
        description: "Failed to generate report. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleDeleteReport = async (reportId: string, reportName: string) => {
    if (confirm(`Are you sure you want to delete "${reportName}"? This action cannot be undone.`)) {
      try {
        const success = await deleteReport(reportId);
        if (success) {
          setReports(reports.filter(report => report.id !== reportId));
          toast({
            title: "Report Deleted",
            description: `${reportName} has been deleted successfully.`
          });
        } else {
          throw new Error("Failed to delete report");
        }
      } catch (error) {
        console.error("Error deleting report:", error);
        toast({
          title: "Error",
          description: "Failed to delete report. Please try again.",
          variant: "destructive",
        });
      }
    }
  };
  
  const downloadCsv = async (reportId: string, reportName: string) => {
    const report = reports.find(r => r.id === reportId);
    if (!report) return;
    
    toast({
      title: "Preparing Download",
      description: `${reportName} is being prepared for download.`
    });
    
    try {
      const results = await executeReport(report);
      
      // Extract headers based on report configuration
      const headers = report.report_config.columns.map(col => {
        // Convert field names to user-friendly headers
        return col.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
      });
      
      // Convert results to CSV data
      const data = results.map(item => {
        return report.report_config.columns.map(col => {
          // Handle nested data with dot notation
          if (col.includes('.')) {
            const [parent, child] = col.split('.');
            return item[parent]?.[child] || '';
          }
          return item[col] || '';
        });
      });
      
      const csvContent = [
        headers.join(","),
        ...data.map(row => row.join(","))
      ].join("\n");
      
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `${reportName.replace(/\s+/g, "_")}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Download Started",
        description: `${reportName} is being downloaded.`
      });
    } catch (error) {
      console.error("Error generating CSV:", error);
      toast({
        title: "Error",
        description: "Failed to generate CSV file. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Helper function to get icon for report subject
  const getSubjectIcon = (subject: string | undefined) => {
    switch (subject) {
      case 'inventory_items':
        return <Package2 className="h-4 w-4 text-primary" />;
      case 'assets':
        return <Boxes className="h-4 w-4 text-primary" />;
      case 'form_submissions':
        return <ClipboardList className="h-4 w-4 text-primary" />;
      default:
        return <FileText className="h-4 w-4 text-primary" />;
    }
  };
  
  // Helper function to get name for report subject
  const getSubjectName = (subject: string | undefined) => {
    switch (subject) {
      case 'inventory_items':
        return 'Inventory Items';
      case 'assets':
        return 'Assets';
      case 'form_submissions':
        return 'Form Submissions';
      default:
        return 'Unknown';
    }
  };
  
  return (
    <div className="container py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">
            Generate and view reports for your organization
          </p>
        </div>
      </div>
      
      {/* Debug Info - Only visible during development */}
      {process.env.NODE_ENV === 'development' && (
        <Alert className="bg-blue-50 border-blue-200 text-blue-800 mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Debug Information</AlertTitle>
          <AlertDescription>
            <div>Auth State: {user ? "Logged In" : "Not Logged In"}</div>
            <div>Organization Loading: {orgLoading ? "Yes" : "No"}</div>
            <div>Current Org: {currentOrganization?.name || "None"}</div>
          </AlertDescription>
        </Alert>
      )}
      
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {orgLoading ? (
        <div className="flex justify-center my-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="mt-2 text-sm text-muted-foreground">Loading organization data...</p>
          </div>
        </div>
      ) : !currentOrganization ? (
        <Alert className="bg-yellow-50 border-yellow-200 text-yellow-800">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Organization Selected</AlertTitle>
          <AlertDescription>
            Please select an organization to view reports.
          </AlertDescription>
        </Alert>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="aggregation" className="flex items-center">
              <BarChart className="h-4 w-4 mr-2" />
              Inventory Aggregation
            </TabsTrigger>
            <TabsTrigger value="custom" className="flex items-center">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Custom Reports
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="aggregation">
            <InventoryAggregationReport />
          </TabsContent>
          
          <TabsContent value="custom">
            <div className="flex items-center justify-between mb-4">
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search reports"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Button asChild>
                <Link to="/reports/new">
                  <Plus className="mr-2 h-4 w-4" />
                  New Report
                </Link>
              </Button>
            </div>
            
            {loading ? (
              <div className="flex justify-center my-12">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                  <p className="mt-2 text-sm text-muted-foreground">Loading reports...</p>
                </div>
              </div>
            ) : filteredReports.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileSpreadsheet className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Reports Found</h3>
                  <p className="text-muted-foreground text-center max-w-md mb-6">
                    {searchTerm ? 
                      "No reports match your search criteria. Try different keywords or clear the search." : 
                      "You haven't created any reports yet. Create your first report to get started."}
                  </p>
                  <Button asChild>
                    <Link to="/reports/new">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Report
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredReports.map((report) => (
                  <Card key={report.id} className="card-hover">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="rounded-full bg-primary/10 p-1.5 mr-2">
                            {getSubjectIcon(report.report_config.subject)}
                          </div>
                          <CardTitle className="text-lg">{report.name}</CardTitle>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link to={`/reports/${report.id}`}>
                                Edit report
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => runReport(report.id, report.name)}>
                              Run report
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => downloadCsv(report.id, report.name)}>
                              Download CSV
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteReport(report.id, report.name)} className="text-destructive">
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Badge variant="outline" className="mb-2">
                        {getSubjectName(report.report_config.subject)}
                      </Badge>
                      
                      {report.description && (
                        <CardDescription className="text-sm line-clamp-2 mb-2">
                          {report.description}
                        </CardDescription>
                      )}
                      
                      <div className="flex justify-between text-xs text-muted-foreground mt-2">
                        <span>{report.report_config.columns.length} columns</span>
                        <span>Updated {format(new Date(report.updated_at), 'MMM d, yyyy')}</span>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full"
                          onClick={() => runReport(report.id, report.name)}
                        >
                          Run
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full"
                          onClick={() => downloadCsv(report.id, report.name)}
                        >
                          <Download className="mr-1 h-3 w-3" />
                          CSV
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default Reports;
