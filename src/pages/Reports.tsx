
import { useState } from "react";
import { Link } from "react-router-dom";
import { 
  FileSpreadsheet, 
  MoreVertical, 
  Plus, 
  FileText, 
  Download,
  Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";

// Mock reports data
const mockReports = [
  { 
    id: 1, 
    name: "Monthly Inventory Status", 
    description: "Overview of all inventory items with current stock levels", 
    columns: ["Item Name", "SKU", "Category", "Quantity", "Status"], 
    created: "2023-05-12", 
    lastRun: "2023-06-01",
    assetTypes: ["General", "Equipment", "Furniture"]
  },
  { 
    id: 2, 
    name: "Low Stock Items", 
    description: "Items that need to be restocked soon", 
    columns: ["Item Name", "SKU", "Quantity", "Reorder Level"], 
    created: "2023-04-20", 
    lastRun: "2023-05-28",
    assetTypes: ["General"]
  },
  { 
    id: 3, 
    name: "Asset Value Report", 
    description: "Total value of all inventory assets by category", 
    columns: ["Category", "Item Count", "Total Value", "Average Value"], 
    created: "2023-06-05", 
    lastRun: "2023-06-10",
    assetTypes: ["Equipment", "Furniture", "IT Assets"]
  },
  { 
    id: 4, 
    name: "Equipment Maintenance Schedule", 
    description: "Schedule of upcoming maintenance for all equipment", 
    columns: ["Item Name", "Last Maintenance", "Next Maintenance", "Status"], 
    created: "2023-03-15", 
    lastRun: "2023-06-08",
    assetTypes: ["Equipment", "Machinery"]
  }
];

const Reports = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [reports] = useState(mockReports);
  
  // Filter reports based on search term
  const filteredReports = reports.filter(report => 
    report.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    report.description.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const runReport = (reportId: number, reportName: string) => {
    // In a real app, this would trigger the report generation
    toast({
      title: "Report Generated",
      description: `${reportName} has been generated and is ready for download.`
    });
  };
  
  const deleteReport = (reportId: number, reportName: string) => {
    if (confirm(`Are you sure you want to delete "${reportName}"? This action cannot be undone.`)) {
      // In a real app, this would delete the report
      toast({
        title: "Report Deleted",
        description: `${reportName} has been deleted successfully.`
      });
    }
  };
  
  const downloadCsv = (reportId: number, reportName: string) => {
    // In a real app, this would download the actual report
    toast({
      title: "Download Started",
      description: `${reportName} is being downloaded.`
    });
    
    // Simulate download after a short delay
    setTimeout(() => {
      // Create a simple CSV file
      const csvContent = "Column 1,Column 2,Column 3\nData 1,Data 2,Data 3\nData 4,Data 5,Data 6";
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `${reportName.replace(/\s+/g, "_")}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }, 500);
  };
  
  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground">Create and manage inventory reports</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Button asChild>
            <Link to="/reports/new">
              <Plus className="mr-2 h-4 w-4" />
              New Report
            </Link>
          </Button>
        </div>
      </div>

      <div className="mb-6">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search reports..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="border-dashed border-2 hover:border-primary/50 transition-colors cursor-pointer">
          <CardContent className="p-6 flex flex-col items-center justify-center h-full min-h-[220px]">
            <div className="rounded-full bg-primary/10 p-3 mb-4">
              <FileSpreadsheet className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Create New Report</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Build a custom report for your inventory data
            </p>
            <Button asChild variant="outline" size="sm">
              <Link to="/reports/new">
                <Plus className="mr-2 h-4 w-4" />
                New Report
              </Link>
            </Button>
          </CardContent>
        </Card>
        
        {filteredReports.map((report) => (
          <Card key={report.id} className="card-hover">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="rounded-full bg-primary/10 p-1.5 mr-2">
                    <FileText className="h-4 w-4 text-primary" />
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
                    <DropdownMenuItem onClick={() => deleteReport(report.id, report.name)} className="text-destructive">
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                {report.description}
              </p>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Columns:</span>
                  <span>{report.columns.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Asset Types:</span>
                  <span>{report.assetTypes.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Last Run:</span>
                  <span>{new Date(report.lastRun).toLocaleDateString()}</span>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t flex justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                >
                  <Link to={`/reports/${report.id}`}>
                    Edit
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadCsv(report.id, report.name)}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {filteredReports.length === 0 && searchTerm && (
        <div className="text-center p-8">
          <p className="text-muted-foreground">No reports matching "{searchTerm}"</p>
          <Button variant="outline" className="mt-4" onClick={() => setSearchTerm("")}>
            Clear Search
          </Button>
        </div>
      )}
    </div>
  );
};

export default Reports;
