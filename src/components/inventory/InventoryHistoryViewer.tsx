import React, { useState, useEffect } from 'react';
import { format, subMonths, addMonths, parseISO } from 'date-fns';
import { Calendar, ChevronLeft, ChevronRight, LineChart, ArrowUp, ArrowDown, History, FileText, ChevronDown, ChevronUp, Code } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { getInventoryHistoryForMonth, getAllInventoryHistory, updateHistoricalInventoryCheck, getInventoryItem } from '@/services/inventoryService';
import { Spinner } from '@/components/ui/spinner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DynamicForm from '@/components/forms/DynamicForm';

interface InventoryHistoryViewerProps {
  inventoryItemId: string;
}

export const InventoryHistoryViewer: React.FC<InventoryHistoryViewerProps> = ({ inventoryItemId }) => {
  const [currentMonth, setCurrentMonth] = useState(() => format(new Date(), 'yyyy-MM'));
  const [history, setHistory] = useState<any | null>(null);
  const [allHistory, setAllHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDetailedData, setShowDetailedData] = useState(false);
  const [showRawDialog, setShowRawDialog] = useState(false);
  const [editRecord, setEditRecord] = useState<any | null>(null);
  const [editFormValues, setEditFormValues] = useState<any>({});
  const [editLoading, setEditLoading] = useState(false);
  const [showUsageSummary, setShowUsageSummary] = useState(false);

  // Function to load history for a specific month
  const loadHistoryForMonth = async (monthYear: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getInventoryHistoryForMonth(inventoryItemId, monthYear);
      setHistory(data);
    } catch (err) {
      console.error('Error loading inventory history:', err);
      setError('Failed to load inventory history');
    } finally {
      setLoading(false);
    }
  };

  // Load history for the current month
  useEffect(() => {
    if (inventoryItemId) {
      loadHistoryForMonth(currentMonth);
    }
  }, [inventoryItemId, currentMonth]);

  // Load all history for the timeline
  useEffect(() => {
    const loadAllHistory = async () => {
      setLoading(true);
      try {
        // Get all history records for this inventory item using the service function
        const historyData = await getAllInventoryHistory(inventoryItemId);
        
        // Sort by month_year
        const sortedHistory = historyData.sort((a: any, b: any) => {
          return a.month_year.localeCompare(b.month_year);
        });
        
        setAllHistory(sortedHistory);
      } catch (err) {
        console.error('Error loading all inventory history:', err);
      } finally {
        setLoading(false);
      }
    };
    
    if (inventoryItemId) {
      loadAllHistory();
    }
  }, [inventoryItemId]);

  // Navigate to previous month
  const goToPreviousMonth = () => {
    const date = parseISO(`${currentMonth}-01`);
    const previousMonth = subMonths(date, 1);
    setCurrentMonth(format(previousMonth, 'yyyy-MM'));
  };

  // Navigate to next month
  const goToNextMonth = () => {
    const date = parseISO(`${currentMonth}-01`);
    const nextMonth = addMonths(date, 1);
    const now = new Date();
    
    // Don't allow navigating to future months
    if (nextMonth <= now) {
      setCurrentMonth(format(nextMonth, 'yyyy-MM'));
    }
  };

  // Update getEventTypeLabel to support all event types
  const getEventTypeLabel = (eventType: string) => {
    switch (eventType) {
      case 'intake': return { label: 'Intake', color: 'bg-blue-100 text-blue-800' };
      case 'addition': return { label: 'Addition', color: 'bg-green-100 text-green-800' };
      case 'audit': return { label: 'Audit', color: 'bg-yellow-100 text-yellow-800' };
      case 'adjustment': return { label: 'Adjustment', color: 'bg-amber-100 text-amber-800' };
      case 'removal': return { label: 'Removal', color: 'bg-red-100 text-red-800' };
      case 'transfer': return { label: 'Transfer', color: 'bg-purple-100 text-purple-800' };
      case 'disposal': return { label: 'Disposal', color: 'bg-gray-300 text-gray-800' };
      case 'deleted': return { label: 'Deleted', color: 'bg-gray-400 text-gray-900' };
      case 'check': return { label: 'Inventory Check', color: 'bg-cyan-100 text-cyan-800' };
      default: return { label: eventType.charAt(0).toUpperCase() + eventType.slice(1), color: 'bg-gray-100 text-gray-800' };
    }
  };

  // Calculate quantity change (if previous month exists)
  const getQuantityChange = () => {
    if (!history) return null;
    
    const currentIndex = allHistory.findIndex(h => h.month_year === currentMonth);
    if (currentIndex <= 0) return null; // No previous month
    
    const previousMonth = allHistory[currentIndex - 1];
    const change = history.quantity - previousMonth.quantity;
    
    return {
      value: change,
      isPositive: change >= 0
    };
  };

  // Format field keys to be more readable (convert snake_case to Title Case)
  const formatFieldKey = (key: string) => {
    // Skip these common fields that we handle separately
    if (['quantity', 'location', 'notes', 'status'].includes(key)) {
      return null;
    }
    
    return key
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase());
  };

  // Check if a value appears to be a URL
  const isUrl = (value: string) => {
    try {
      return value.startsWith('http://') || value.startsWith('https://');
    } catch (e) {
      return false;
    }
  };

  // Format a value for display
  const formatFieldValue = (value: any) => {
    if (value === null || value === undefined) return 'N/A';
    
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    
    if (typeof value === 'number') {
      return value.toString();
    }
    
    if (typeof value === 'string') {
      if (isUrl(value)) {
        return (
          <a 
            href={value} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            {value}
          </a>
        );
      }
      
      // Check if it looks like a date (YYYY-MM-DD or ISO format)
      if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
        try {
          return format(new Date(value), 'PPP');
        } catch (e) {
          return value;
        }
      }
      
      return value;
    }
    
    if (Array.isArray(value)) {
      return value.map(i => formatFieldValue(i)).join(', ');
    }
    
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    
    return String(value);
  };

  const quantityChange = getQuantityChange();

  // Calculate monthly usage summary
  const getUsageSummary = () => {
    if (allHistory.length < 2) return null;
    
    const usageData = [];
    for (let i = 1; i < allHistory.length; i++) {
      const current = allHistory[i];
      const previous = allHistory[i - 1];
      const usage = previous.quantity - current.quantity;
      
      usageData.push({
        month: current.month_year,
        usage: usage,
        startQuantity: previous.quantity,
        endQuantity: current.quantity,
        eventType: current.event_type
      });
    }
    
    return usageData.reverse(); // Show most recent first
  };

  const usageSummary = getUsageSummary();

  // Filter out form data we want to display at the top level
  const getFormattedResponseData = () => {
    if (!history || !history.response_data) return {};
    
    const result: Record<string, any> = {};
    const excludedKeys = ['quantity', 'location', 'notes', 'status'];
    
    Object.entries(history.response_data).forEach(([key, value]) => {
      if (!excludedKeys.includes(key)) {
        result[key] = value;
      }
    });
    
    return result;
  };

  const formattedResponseData = getFormattedResponseData();
  const hasDetailedData = history?.response_data && Object.keys(formattedResponseData).length > 0;

  // Handler for saving edits
  const handleEditSave = async () => {
    if (!editRecord) return;
    setEditLoading(true);
    try {
      await updateHistoricalInventoryCheck(editRecord.id, {
        quantity: editFormValues.quantity,
        location: editFormValues.location,
        notes: editFormValues.notes,
        status: editFormValues.status,
        check_date: editRecord.check_date,
        response_data: editFormValues
      });
      setEditRecord(null);
      setEditFormValues({});
      // Refresh history
      await loadHistoryForMonth(currentMonth);
      const all = await getAllInventoryHistory(inventoryItemId);
      setAllHistory(all.sort((a: any, b: any) => a.month_year.localeCompare(b.month_year)));
    } catch (err) {
      // Handle error (could add toast)
    } finally {
      setEditLoading(false);
    }
  };

  // When rendering history, filter out deleted events:
  const filteredHistory = allHistory.filter(h => h.event_type !== 'deleted');

  return (
    <div className="space-y-4">
      {/* Month Selector */}
      <div className="flex items-center justify-between bg-muted p-2 rounded-lg">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={goToPreviousMonth}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>
        
        <div className="flex items-center">
          <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
          <span className="font-medium">
            {format(parseISO(`${currentMonth}-01`), 'MMMM yyyy')}
          </span>
        </div>
        
        <Button 
          variant="ghost" 
          size="sm"
          onClick={goToNextMonth}
          disabled={format(new Date(), 'yyyy-MM') === currentMonth}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
      
      {/* History Timeline */}
      <div className="bg-muted/50 rounded-lg p-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <LineChart className="h-4 w-4 mr-2 text-muted-foreground" />
            <span className="text-sm font-medium">History Timeline</span>
          </div>
          {usageSummary && usageSummary.length > 0 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowUsageSummary(!showUsageSummary)}
              className="h-7"
            >
              {showUsageSummary ? 'Hide' : 'Show'} Usage Summary
            </Button>
          )}
        </div>

        {/* Usage Summary Card */}
        {usageSummary && usageSummary.length > 0 && showUsageSummary && (
          <Card className="mb-4 border-l-4 border-l-amber-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                Monthly Usage Summary
                <Badge variant="outline" className="text-xs">
                  {usageSummary.length} months tracked
                </Badge>
              </CardTitle>
              <CardDescription>
                Track consumption patterns and usage trends over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {usageSummary.slice(0, 6).map((item, index) => (
                  <div 
                    key={`usage-${item.month}-${index}`} 
                    className={`p-3 rounded-md border ${
                      item.usage > 0 ? 'bg-red-50 border-red-200' : 
                      item.usage < 0 ? 'bg-green-50 border-green-200' : 
                      'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">
                        {format(parseISO(`${item.month}-01`), 'MMM yyyy')}
                      </span>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          item.usage > 0 ? 'border-red-300 text-red-700' : 
                          item.usage < 0 ? 'border-green-300 text-green-700' : 
                          'border-gray-300 text-gray-700'
                        }`}
                      >
                        {item.eventType === 'check' ? 'Monthly Check' : item.eventType}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Started:</span>
                        <span className="font-medium">{item.startQuantity}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Ended:</span>
                        <span className="font-medium">{item.endQuantity}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">
                          {item.usage > 0 ? 'Used:' : item.usage < 0 ? 'Added:' : 'Change:'}
                        </span>
                        <span className={`font-bold ${
                          item.usage > 0 ? 'text-red-600' : 
                          item.usage < 0 ? 'text-green-600' : 
                          'text-gray-600'
                        }`}>
                          {item.usage > 0 ? `${item.usage}` : 
                           item.usage < 0 ? `+${Math.abs(item.usage)}` : 
                           '0'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {usageSummary.length > 6 && (
                <div className="mt-3 text-center">
                  <Button variant="ghost" size="sm" className="text-xs">
                    View all {usageSummary.length} months →
                  </Button>
                </div>
              )}
              
              {/* Quick Stats */}
              {usageSummary.length > 1 && (
                <div className="mt-4 pt-3 border-t border-amber-200">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-xs text-muted-foreground">Avg Monthly Usage</div>
                      <div className="font-semibold text-red-600">
                        {(usageSummary.filter(u => u.usage > 0).reduce((sum, u) => sum + u.usage, 0) / 
                          Math.max(1, usageSummary.filter(u => u.usage > 0).length)).toFixed(1)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Highest Usage</div>
                      <div className="font-semibold text-red-600">
                        {Math.max(...usageSummary.map(u => u.usage), 0)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Total Used</div>
                      <div className="font-semibold text-red-600">
                        {usageSummary.filter(u => u.usage > 0).reduce((sum, u) => sum + u.usage, 0)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Timeline Navigation */}
        <div className="overflow-x-auto">
          <div className="flex space-x-2 py-2 min-w-max">
            {filteredHistory.map((historyItem, index) => (
              <div key={`timeline-${historyItem.id}-${index}`} className="flex items-center space-x-1">
                <Button
                  variant={historyItem.month_year === currentMonth ? "default" : "outline"}
                  size="sm"
                  className="px-3 py-1 h-auto"
                  onClick={() => setCurrentMonth(historyItem.month_year)}
                >
                  <Badge 
                    variant="outline" 
                    className={`mr-2 ${
                      historyItem.event_type === 'intake' ? 'bg-blue-50 border-blue-200' : 
                      historyItem.event_type === 'check' ? 'bg-green-50 border-green-200' : 
                      'bg-gray-50 border-gray-200'
                    }`}
                  >
                    {historyItem.event_type === 'intake' ? 'I' : 
                     historyItem.event_type === 'check' ? 'C' : 'O'}
                  </Badge>
                  {format(parseISO(`${historyItem.month_year}-01`), 'MMM yyyy')}
                </Button>
              </div>
            ))}
            {filteredHistory.length === 0 && !loading && (
              <div className="text-sm text-muted-foreground">No history records found</div>
            )}
          </div>
        </div>
      </div>
      
      {/* Current Month Details */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner size="md" />
        </div>
      ) : error ? (
        <div className="bg-destructive/20 text-destructive p-4 rounded-lg">
          {error}
        </div>
      ) : history ? (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-lg">{format(parseISO(`${currentMonth}-01`), 'MMMM yyyy')}</CardTitle>
                <CardDescription>
                  Inventory check on {format(new Date(history.check_date), 'MMMM d, yyyy')}
                </CardDescription>
              </div>
              
              <Badge className={
                history.event_type ? 
                getEventTypeLabel(history.event_type).color : 
                "bg-gray-100 text-gray-800"
              }>
                {history.event_type ? 
                  getEventTypeLabel(history.event_type).label : 
                  history.check_type || "Check"
                }
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm text-muted-foreground">Quantity</div>
                  <div className="text-2xl font-bold">{history.quantity}</div>
                </div>
                
                {quantityChange && (
                  <div className={`flex items-center rounded-full px-2 py-1 ${
                    quantityChange.isPositive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {quantityChange.isPositive ? (
                      <ArrowUp className="h-3 w-3 mr-1" />
                    ) : (
                      <ArrowDown className="h-3 w-3 mr-1" />
                    )}
                    <span className="text-xs font-medium">
                      {Math.abs(quantityChange.value)} 
                      {quantityChange.isPositive ? ' added' : ' removed'}
                    </span>
                  </div>
                )}
              </div>
              
              <Separator />
              
              <div>
                <div className="text-sm text-muted-foreground mb-1">Location</div>
                <div>{history.location || 'No location specified'}</div>
              </div>
              
              {history.notes && (
                <>
                  <Separator />
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Notes</div>
                    <div>{history.notes}</div>
                  </div>
                </>
              )}
              
              {hasDetailedData && (
                <>
                  <Separator />
                  <div>
                    <div className="flex justify-between items-center">
                      <div className="text-sm font-medium mb-2">Form Data</div>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => setShowDetailedData(!showDetailedData)}
                        >
                          {showDetailedData ? (
                            <>
                              <ChevronUp className="h-3.5 w-3.5 mr-1" />
                              Hide Details
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-3.5 w-3.5 mr-1" />
                              Show Details
                            </>
                          )}
                        </Button>
                        
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => setShowRawDialog(true)}
                        >
                          <Code className="h-3.5 w-3.5 mr-1" />
                          View Raw
                        </Button>
                      </div>
                    </div>
                    
                    {showDetailedData && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                        {Object.entries(formattedResponseData).map(([key, value]) => {
                          const formattedKey = formatFieldKey(key);
                          if (!formattedKey) return null;
                          
                          return (
                            <div key={key} className="bg-gray-50 p-3 rounded-md">
                              <div className="text-xs text-muted-foreground mb-1">
                                {formattedKey}
                              </div>
                              <div className="text-sm break-words">
                                {formatFieldValue(value)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <History className="h-12 w-12 mx-auto mb-2 opacity-30" />
          <p>No inventory check for {format(parseISO(`${currentMonth}-01`), 'MMMM yyyy')}</p>
        </div>
      )}
      
      {/* Raw Response Data Dialog */}
      <Dialog open={showRawDialog} onOpenChange={setShowRawDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Complete Response Data</DialogTitle>
            <DialogDescription>
              Raw form data from this inventory check
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="formatted" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="formatted">Formatted View</TabsTrigger>
              <TabsTrigger value="raw">JSON View</TabsTrigger>
            </TabsList>
            
            <TabsContent value="formatted" className="mt-4">
              {history?.response_data ? (
                <div className="bg-gray-50 rounded-md p-4 space-y-4">
                  {Object.entries(history.response_data).map(([key, value]) => (
                    <div key={key}>
                      <div className="font-medium">{formatFieldKey(key) || key}</div>
                      <div className="mt-1">{formatFieldValue(value)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  No detailed response data available
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="raw" className="mt-4">
              {history?.response_data ? (
                <pre className="bg-gray-950 text-gray-100 p-4 rounded-md overflow-x-auto">
                  {JSON.stringify(history.response_data, null, 2)}
                </pre>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  No response data available
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      {editRecord && (
        <Dialog open={!!editRecord} onOpenChange={() => setEditRecord(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Inventory History</DialogTitle>
              <DialogDescription>
                Edit the form data for this inventory check.
              </DialogDescription>
            </DialogHeader>
            <DynamicForm
              formSchema={{ fields: Object.keys(editFormValues).map(key => ({ id: key, label: key, type: typeof editFormValues[key] === 'number' ? 'number' : 'text' })) }}
              initialValues={editFormValues}
              onChange={setEditFormValues}
            />
            <div className="flex justify-end mt-4">
              <Button variant="outline" onClick={() => setEditRecord(null)} disabled={editLoading}>Cancel</Button>
              <Button onClick={handleEditSave} disabled={editLoading} className="ml-2">
                {editLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default InventoryHistoryViewer; 