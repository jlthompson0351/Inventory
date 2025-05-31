import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Search,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Calendar,
  Package,
  AlertTriangle,
  Edit,
  Clock,
  Target,
  Zap
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { getAllInventoryHistory, getInventoryItem } from "@/services/inventoryService";
import { applyInventoryFix, markEventAsVerified } from "@/services/inventoryFixService";
import { 
  detectInventoryAnomalies, 
  calculateTrendPredictions, 
  getAnomalySeverityColors,
  AnomalyDetection,
  InventoryEvent as AnomalyInventoryEvent
} from "@/utils/anomalyDetection";
import { QuickFixCard } from "@/components/inventory/QuickFixCard";

interface InventoryEvent {
  id: string;
  month_year: string;
  check_date: string;
  event_type: string;
  check_type: string;
  quantity: number;
  location?: string;
  notes?: string;
  status?: string;
  response_data?: any;
  created_at: string;
}

interface InventoryStats {
  avgMonthlyUsage: number;
  totalEvents: number;
  peakUsage: { month: string; amount: number };
  lowPoint: { month: string; amount: number };
  currentStock: number;
  lastCheckDate: string;
  daysSinceCheck: number;
  totalUsage: number;
}

interface EventWithAnomalies extends InventoryEvent {
  anomalies: AnomalyDetection[];
  change?: {
    value: number;
    isPositive: boolean;
    previous: number;
    current: number;
  };
}

export default function InventoryHistory() {
  const { inventoryItemId } = useParams<{ inventoryItemId: string }>();
  const navigate = useNavigate();
  
  const [inventoryItem, setInventoryItem] = useState<any>(null);
  const [allEvents, setAllEvents] = useState<InventoryEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<EventWithAnomalies[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dismissedAnomalies, setDismissedAnomalies] = useState<Set<string>>(new Set());
  const [verifiedEvents, setVerifiedEvents] = useState<Set<string>>(new Set());
  
  // Filters
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showOnlyAnomalies, setShowOnlyAnomalies] = useState(false);

  // Performance optimization: Pre-calculate event index map
  const eventIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    allEvents.forEach((event, index) => {
      map.set(event.id, index);
    });
    return map;
  }, [allEvents]);

  // Calculate trend predictions using CLEAN data only
  const trendPrediction = useMemo(() => {
    if (allEvents.length === 0) return null;
    
    // Filter out obvious anomalies for accurate trend calculation
    const cleanEvents = allEvents.filter(event => {
      // Remove events with quantities > 100 (likely anomalies for this paint asset)
      return event.quantity <= 100;
    });
    
    if (cleanEvents.length < 2) return null;
    
    const anomalyEvents: AnomalyInventoryEvent[] = cleanEvents.map(event => ({
      id: event.id,
      quantity: event.quantity,
      event_type: event.event_type,
      check_date: event.check_date,
      notes: event.notes,
      response_data: event.response_data
    }));
    
    return calculateTrendPredictions(anomalyEvents);
  }, [allEvents]);

  // Load data
  useEffect(() => {
    if (inventoryItemId) {
      loadInventoryData();
    }
  }, [inventoryItemId]);

  const loadInventoryData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load inventory item details
      const item = await getInventoryItem(inventoryItemId!);
      setInventoryItem(item);
      
      // Load all history events
      const events = await getAllInventoryHistory(inventoryItemId!);
      const sortedEvents = events.sort((a: any, b: any) => 
        new Date(b.check_date).getTime() - new Date(a.check_date).getTime()
      );
      setAllEvents(sortedEvents);
      
    } catch (err) {
      console.error("Error loading inventory data:", err);
      setError("Failed to load inventory history");
    } finally {
      setLoading(false);
    }
  };

  // Enhanced anomaly detection with asset type
  const getQuantityChangeWithAnomalies = (event: InventoryEvent, eventIndex: number): {
    change?: { value: number; isPositive: boolean; previous: number; current: number };
    anomalies: AnomalyDetection[];
  } => {
    if (eventIndex === allEvents.length - 1) {
      return { anomalies: [] }; // First event (intake)
    }
    
    const previousEvent = allEvents[eventIndex + 1];
    const change = event.quantity - previousEvent.quantity;
    
    // Convert to anomaly detection format
    const currentAnomalyEvent: AnomalyInventoryEvent = {
      id: event.id,
      quantity: event.quantity,
      event_type: event.event_type,
      check_date: event.check_date,
      notes: event.notes,
      response_data: event.response_data
    };
    
    const previousAnomalyEvent: AnomalyInventoryEvent = {
      id: previousEvent.id,
      quantity: previousEvent.quantity,
      event_type: previousEvent.event_type,
      check_date: previousEvent.check_date,
      notes: previousEvent.notes,
      response_data: previousEvent.response_data
    };
    
    // Get recent events for systematic error detection
    const recentEvents = allEvents.slice(Math.max(0, eventIndex - 5), eventIndex + 1)
      .map(e => ({
        id: e.id,
        quantity: e.quantity,
        event_type: e.event_type,
        check_date: e.check_date,
        notes: e.notes,
        response_data: e.response_data
      }));
    
    // Detect anomalies using smart thresholds
    const anomalies = detectInventoryAnomalies(
      currentAnomalyEvent,
      previousAnomalyEvent,
      inventoryItem?.asset?.asset_type?.name || 'unknown',
      recentEvents
    );
    
    return {
      change: {
        value: Math.abs(change),
        isPositive: change >= 0,
        previous: previousEvent.quantity,
        current: event.quantity
      },
      anomalies
    };
  };

  // Event type mapping
  const getEventTypeInfo = (eventType: string) => {
    const types = {
      'intake': { label: 'Intake', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: '📦' },
      'check': { label: 'Check', color: 'bg-green-100 text-green-800 border-green-200', icon: '✅' },
      'audit': { label: 'Audit', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: '🔍' },
      'addition': { label: 'Addition', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: '➕' },
      'removal': { label: 'Removal', color: 'bg-red-100 text-red-800 border-red-200', icon: '➖' },
      'transfer': { label: 'Transfer', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: '🔄' },
      'disposal': { label: 'Disposal', color: 'bg-gray-100 text-gray-800 border-gray-200', icon: '🗑️' },
      'adjustment': { label: 'Adjustment', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: '⚖️' },
    };
    return types[eventType as keyof typeof types] || { 
      label: eventType, 
      color: 'bg-gray-100 text-gray-800 border-gray-200', 
      icon: '📋' 
    };
  };

  // Process events with anomalies
  const processedEvents = useMemo(() => {
    return allEvents.map((event, index) => {
      const eventIndex = eventIndexMap.get(event.id) ?? index;
      const { change, anomalies } = getQuantityChangeWithAnomalies(event, eventIndex);
      
      return {
        ...event,
        change,
        anomalies: verifiedEvents.has(event.id) ? [] : anomalies // Clear anomalies for verified events
      } as EventWithAnomalies;
    });
  }, [allEvents, eventIndexMap, verifiedEvents, inventoryItem]);

  // Filter events based on selected filters
  useEffect(() => {
    let filtered = processedEvents;

    // Filter by event type
    if (eventTypeFilter !== "all") {
      filtered = filtered.filter(event => event.event_type === eventTypeFilter);
    }

    // Filter by year
    if (yearFilter !== "all") {
      filtered = filtered.filter(event => 
        new Date(event.check_date).getFullYear().toString() === yearFilter
      );
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(event => 
        event.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.event_type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter to show only anomalies
    if (showOnlyAnomalies) {
      filtered = filtered.filter(event => 
        event.anomalies.length > 0 && !dismissedAnomalies.has(event.id)
      );
    }

    setFilteredEvents(filtered);
  }, [processedEvents, eventTypeFilter, yearFilter, searchTerm, showOnlyAnomalies, dismissedAnomalies]);

  // Calculate enhanced statistics
  const stats: InventoryStats = useMemo(() => {
    if (allEvents.length === 0) {
      return {
        avgMonthlyUsage: 0,
        totalEvents: 0,
        peakUsage: { month: '', amount: 0 },
        lowPoint: { month: '', amount: 0 },
        currentStock: 0,
        lastCheckDate: '',
        daysSinceCheck: 0,
        totalUsage: 0
      };
    }

    // Filter out anomalous data for accurate statistics
    const cleanEvents = allEvents.filter((event, index) => {
      const eventWithAnomalies = processedEvents[index];
      return !eventWithAnomalies.anomalies.some(a => a.severity === 'critical');
    });

    const usageData = [];
    for (let i = 1; i < cleanEvents.length; i++) {
      const current = cleanEvents[i];
      const previous = cleanEvents[i - 1];
      const usage = previous.quantity - current.quantity;
      if (usage > 0) {
        usageData.push({ month: current.month_year, usage });
      }
    }

    const avgUsage = usageData.length > 0 
      ? usageData.reduce((sum, item) => sum + item.usage, 0) / usageData.length 
      : 0;

    const peakUsage = usageData.length > 0 
      ? usageData.reduce((max, item) => item.usage > max.usage ? item : max)
      : { month: '', usage: 0 };

    const sortedByQuantity = [...cleanEvents].sort((a, b) => a.quantity - b.quantity);
    const lowPoint = sortedByQuantity[0] || { month_year: '', quantity: 0 };

    const lastEvent = allEvents[0];
    const daysSince = lastEvent 
      ? Math.floor((Date.now() - new Date(lastEvent.check_date).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return {
      avgMonthlyUsage: Math.round(avgUsage * 10) / 10,
      totalEvents: allEvents.length,
      peakUsage: { month: peakUsage.month, amount: peakUsage.usage || 0 },
      lowPoint: { month: lowPoint.month_year, amount: lowPoint.quantity },
      currentStock: inventoryItem?.quantity || 0,
      lastCheckDate: lastEvent?.check_date || '',
      daysSinceCheck: daysSince,
      totalUsage: usageData.reduce((sum, item) => sum + item.usage, 0)
    };
  }, [allEvents, processedEvents, inventoryItem]);

  // Get available years for filter
  const availableYears = useMemo(() => {
    const years = new Set(
      allEvents.map(event => new Date(event.check_date).getFullYear().toString())
    );
    return Array.from(years).sort().reverse();
  }, [allEvents]);

  // Count total anomalies
  const totalAnomalies = useMemo(() => {
    return processedEvents.reduce((count, event) => 
      count + (event.anomalies.length > 0 && !dismissedAnomalies.has(event.id) ? 1 : 0), 0
    );
  }, [processedEvents, dismissedAnomalies]);

  // Handle quick fix application
  const handleFixApplied = async (eventId: string, newQuantity: number, reason: string) => {
    try {
      // Apply the fix using the real API
      const result = await applyInventoryFix(inventoryItemId!, {
        eventId,
        newQuantity,
        reason,
        fixType: reason.includes('Auto-fix') ? 'auto' : 'manual',
        confidence: reason.includes('confidence') ? 
          parseInt(reason.match(/(\d+)% confidence/)?.[1] || '0') : undefined
      });
      
      if (result.success) {
        // Mark as verified since fix was applied
        setVerifiedEvents(prev => new Set(prev).add(eventId));
        
        // Reload data to show updated quantities
        await loadInventoryData();
        
        console.log('Fix applied successfully:', result.message);
      } else {
        console.error('Fix failed:', result.message);
        alert(`Failed to apply fix: ${result.message}`);
      }
    } catch (error) {
      console.error('Failed to apply fix:', error);
      alert('An unexpected error occurred while applying the fix');
    }
  };

  // Handle mark as verified
  const handleMarkVerified = async (eventId: string) => {
    try {
      const result = await markEventAsVerified(eventId);
      
      if (result.success) {
        setVerifiedEvents(prev => new Set(prev).add(eventId));
        console.log('Event verified successfully:', result.message);
      } else {
        console.error('Verification failed:', result.message);
        alert(`Failed to verify event: ${result.message}`);
      }
    } catch (error) {
      console.error('Failed to verify event:', error);
      alert('An unexpected error occurred while verifying the event');
    }
  };

  // Handle dismiss anomaly
  const handleDismissAnomaly = (eventId: string) => {
    setDismissedAnomalies(prev => new Set(prev).add(eventId));
  };

  if (loading) {
    return (
      <div className="container py-6">
        <div className="flex items-center justify-center h-48">
          <Spinner size="lg" />
          <span className="ml-2">Loading inventory history...</span>
        </div>
      </div>
    );
  }

  if (error || !inventoryItem) {
    return (
      <div className="container py-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error || "Inventory item not found"}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Inventory History</h1>
          <p className="text-muted-foreground">{inventoryItem.name}</p>
        </div>
        
        {/* Anomaly Summary */}
        {totalAnomalies > 0 && (
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <Badge variant="destructive">
              {totalAnomalies} {totalAnomalies === 1 ? 'Issue' : 'Issues'} Detected
            </Badge>
          </div>
        )}
      </div>

      {/* Enhanced Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Filters</span>
            {totalAnomalies > 0 && (
              <Button
                variant={showOnlyAnomalies ? "default" : "outline"}
                size="sm"
                onClick={() => setShowOnlyAnomalies(!showOnlyAnomalies)}
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Issues Only
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Event Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                <SelectItem value="intake">Intake</SelectItem>
                <SelectItem value="check">Check</SelectItem>
                <SelectItem value="audit">Audit</SelectItem>
                <SelectItem value="addition">Addition</SelectItem>
                <SelectItem value="removal">Removal</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
                <SelectItem value="disposal">Disposal</SelectItem>
                <SelectItem value="adjustment">Adjustment</SelectItem>
              </SelectContent>
            </Select>

            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {availableYears.map(year => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search notes, location, or event type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metadata Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Current Stock</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.currentStock}
                </p>
                <p className="text-xs text-muted-foreground">units</p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Daily Usage</p>
                <p className="text-2xl font-bold text-green-600">
                  {trendPrediction?.dailyUsage?.toFixed(1) || '0'}
                </p>
                <p className="text-xs text-muted-foreground">units/day</p>
              </div>
              <TrendingDown className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Days Remaining</p>
                <p className="text-2xl font-bold text-amber-600">
                  {trendPrediction?.daysUntilEmpty || '∞'}
                </p>
                <p className="text-xs text-muted-foreground">at current usage</p>
              </div>
              <Clock className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Last Check</p>
                <p className="text-2xl font-bold text-red-600">
                  {stats.daysSinceCheck}
                </p>
                <p className="text-xs text-muted-foreground">days ago</p>
              </div>
              <Calendar className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reorder Alert */}
      {trendPrediction?.shouldReorder && (
        <Alert className="mb-4 border-amber-300 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            📦 <strong>Reorder Recommended:</strong> Stock is getting low. Consider reordering when you reach {trendPrediction.reorderPoint} units.
          </AlertDescription>
        </Alert>
      )}

      {/* Event Cards Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Event History</span>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{filteredEvents.length} events</Badge>
              {totalAnomalies > 0 && (
                <Badge variant="destructive">
                  {totalAnomalies} issues
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>No events found matching your filters</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Quick Fix Cards for events with anomalies */}
              {filteredEvents
                .filter(event => event.anomalies.length > 0 && !dismissedAnomalies.has(event.id))
                .map(event => (
                  <QuickFixCard
                    key={`anomaly-${event.id}`}
                    anomalies={event.anomalies}
                    currentQuantity={event.quantity}
                    previousQuantity={event.change?.previous || 0}
                    eventId={event.id}
                    onFixApplied={(newQuantity, reason) => handleFixApplied(event.id, newQuantity, reason)}
                    onMarkVerified={handleMarkVerified}
                    onDismiss={() => handleDismissAnomaly(event.id)}
                  />
                ))}
              
              {/* Regular Event Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredEvents.map((event) => {
                  const eventInfo = getEventTypeInfo(event.event_type);
                  const hasUnDismissedAnomalies = event.anomalies.length > 0 && !dismissedAnomalies.has(event.id);
                  const highestSeverity = hasUnDismissedAnomalies ? 
                    event.anomalies.reduce((highest, current) => {
                      const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
                      return severityOrder[current.severity] > severityOrder[highest.severity] ? current : highest;
                    }).severity : 'low';
                  
                  const colors = hasUnDismissedAnomalies ? getAnomalySeverityColors(highestSeverity) : null;
                  
                  return (
                    <Card key={event.id} className={`overflow-hidden hover:shadow-md transition-shadow ${
                      hasUnDismissedAnomalies ? `${colors?.background} ${colors?.border}` : ''
                    }`}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge className={eventInfo.color}>
                              {eventInfo.icon} {eventInfo.label}
                            </Badge>
                            {hasUnDismissedAnomalies && (
                              <div className="flex items-center gap-1">
                                <AlertTriangle className={`h-4 w-4 ${colors?.icon}`} />
                                <Badge variant="secondary" className="text-xs">
                                  {event.anomalies.length}
                                </Badge>
                              </div>
                            )}
                            {verifiedEvents.has(event.id) && (
                              <Badge variant="outline" className="text-xs text-green-600">
                                ✓ Verified
                              </Badge>
                            )}
                          </div>
                          {event.event_type !== 'intake' && (
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <Edit className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        <p className="text-sm font-medium">
                          {format(new Date(event.check_date), 'MMM d, yyyy')}
                        </p>
                      </CardHeader>
                      
                      <CardContent className="pt-0 space-y-3">
                        {/* Quantity Change */}
                        <div className="space-y-2">
                          {event.change && (
                            <div className="text-xs text-muted-foreground">
                              Start: {event.change.previous} → End: {event.change.current}
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between">
                            <span className="text-lg font-bold">{event.quantity} units</span>
                            {event.change && (
                              <div className={`flex items-center gap-1 ${
                                hasUnDismissedAnomalies
                                  ? colors?.icon
                                  : event.change.isPositive ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {event.change.isPositive ? (
                                  <ArrowUp className="h-3 w-3" />
                                ) : (
                                  <ArrowDown className="h-3 w-3" />
                                )}
                                <span className="text-xs font-medium">
                                  {event.change.isPositive ? '+' : '-'}{event.change.value}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <Separator />

                        {/* Event Details */}
                        <div className="space-y-1 text-xs">
                          {event.location && (
                            <div className="text-muted-foreground">
                              📍 {event.location}
                            </div>
                          )}
                          {event.notes && (
                            <div className="text-muted-foreground line-clamp-2">
                              💬 {event.notes}
                            </div>
                          )}
                          {event.status && (
                            <Badge variant="outline" className="text-xs">
                              {event.status}
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 