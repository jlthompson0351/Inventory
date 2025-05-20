import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Download, BarChart, FileText, Loader2 } from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";
import { getAssetTypes } from "@/services/assetTypeService";
import { getAggregatableFields } from "@/services/formulaMappingService";

interface InventoryAggregationReportProps {
  className?: string;
}

export function InventoryAggregationReport({ className }: InventoryAggregationReportProps) {
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();
  const [loading, setLoading] = useState(false);
  const [assetTypes, setAssetTypes] = useState<any[]>([]);
  const [selectedAssetType, setSelectedAssetType] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [reportData, setReportData] = useState<any | null>(null);
  const [aggregatableFields, setAggregatableFields] = useState<any[]>([]);
  
  useEffect(() => {
    if (currentOrganization?.id) {
      loadAssetTypes();
      loadAggregatableFields();
    }
  }, [currentOrganization]);
  
  const loadAssetTypes = async () => {
    try {
      if (currentOrganization?.id) {
        const types = await getAssetTypes(currentOrganization.id);
        setAssetTypes(types);
      }
    } catch (error) {
      console.error("Error loading asset types:", error);
    }
  };
  
  const loadAggregatableFields = async () => {
    try {
      if (currentOrganization?.id) {
        const fields = await getAggregatableFields(currentOrganization.id);
        setAggregatableFields(fields);
      }
    } catch (error) {
      console.error("Error loading aggregatable fields:", error);
    }
  };
  
  const generateReport = async () => {
    if (!currentOrganization?.id) return;
    
    try {
      setLoading(true);
      
      // Call the server function to generate the report
      const { data, error } = await supabase.rpc(
        'get_monthly_inventory_report',
        {
          p_organization_id: currentOrganization.id,
          p_year: selectedYear,
          p_month: selectedMonth,
          p_asset_type_id: selectedAssetType === "all" ? null : selectedAssetType
        }
      );
      
      if (error) throw error;
      
      setReportData(data);
      
    } catch (error) {
      console.error("Error generating report:", error);
      toast({
        title: "Error",
        description: "Failed to generate report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const downloadReportAsCsv = () => {
    if (!reportData || !reportData.aggregated_values) return;
    
    try {
      // Create CSV content
      const headers = ["Field", "Value"];
      const rows = Object.entries(reportData.aggregated_values).map(([field, value]) => {
        // Find the field description if available
        const fieldMapping = aggregatableFields.find(f => f.target_field === field);
        const fieldName = fieldMapping ? 
          `${field} (${fieldMapping.description || 'No description'})` : 
          field;
        
        return [fieldName, value];
      });
      
      // Combine headers and rows
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');
      
      // Create and download the file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `inventory-report-${selectedYear}-${selectedMonth}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error downloading report:", error);
      toast({
        title: "Error",
        description: "Failed to download report.",
        variant: "destructive",
      });
    }
  };
  
  // Generate a list of available years (current year and 3 years back)
  const years = Array.from({ length: 4 }, (_, i) => new Date().getFullYear() - i);
  
  // Month names for dropdown
  const months = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];
  
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center">
          <BarChart className="mr-2 h-5 w-5" />
          Inventory Aggregation Report
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Asset Type</label>
              <Select
                value={selectedAssetType}
                onValueChange={setSelectedAssetType}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select asset type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Asset Types</SelectItem>
                  {assetTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Year</label>
              <Select
                value={selectedYear.toString()}
                onValueChange={(value) => setSelectedYear(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Month</label>
              <Select
                value={selectedMonth.toString()}
                onValueChange={(value) => setSelectedMonth(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value.toString()}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Button 
            onClick={generateReport} 
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Report...
              </>
            ) : (
              <>
                <Calendar className="mr-2 h-4 w-4" />
                Generate Report
              </>
            )}
          </Button>
          
          {reportData && (
            <div className="space-y-4 mt-6 border-t pt-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  {reportData.report_period} Report
                </h3>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={downloadReportAsCsv}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download CSV
                </Button>
              </div>
              
              <div className="text-sm text-muted-foreground">
                {reportData.asset_type_name} • Generated {new Date(reportData.generated_at).toLocaleString()}
              </div>
              
              {Object.keys(reportData.aggregated_values).length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[300px]">Field</TableHead>
                      <TableHead>Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(reportData.aggregated_values).map(([field, value]: [string, any]) => {
                      const fieldMapping = aggregatableFields.find(f => f.target_field === field);
                      
                      return (
                        <TableRow key={field}>
                          <TableCell className="font-medium">
                            {field}
                            {fieldMapping?.description && (
                              <div className="text-xs text-muted-foreground">
                                {fieldMapping.description}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {parseFloat(value).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="bg-muted/50 p-6 text-center rounded-md">
                  <FileText className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                  <h3 className="text-lg font-medium mb-1">No Data Available</h3>
                  <p className="text-sm text-muted-foreground">
                    No aggregatable fields with data were found for this period.
                    <br />
                    Make sure you have marked fields as "Include in reports" in your formula mappings.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 