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
  Edit
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { getAllInventoryHistory, getInventoryItem } from "@/services/inventoryService";

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

export default function InventoryHistory() {
  const { inventoryItemId } = useParams<{ inventoryItemId: string }>();
  const navigate = useNavigate();
  
  const [inventoryItem, setInventoryItem] = useState<any>(null);
  const [allEvents, setAllEvents] = useState<InventoryEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<InventoryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

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
      setFilteredEvents(sortedEvents);
      
    } catch (err) {
      console.error("Error loading inventory data:", err);
      setError("Failed to load inventory history");
    } finally {
      setLoading(false);
    }
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

  // Filter events based on selected filters
  useEffect(() => {
    let filtered = allEvents;

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

    setFilteredEvents(filtered);
  }, [allEvents, eventTypeFilter, yearFilter, searchTerm]);

  // Calculate statistics
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

    const usageData = [];
    for (let i = 1; i < allEvents.length; i++) {
      const current = allEvents[i];
      const previous = allEvents[i - 1];
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

    const sortedByQuantity = [...allEvents].sort((a, b) => a.quantity - b.quantity);
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
  }, [allEvents, inventoryItem]);

  // Get available years for filter
  const availableYears = useMemo(() => {
    const years = new Set(
      allEvents.map(event => new Date(event.check_date).getFullYear().toString())
    );
    return Array.from(years).sort().reverse();
  }, [allEvents]);

  // Get quantity change for an event
  const getQuantityChange = (event: InventoryEvent, index: number) => {
    if (index === allEvents.length - 1) return null; // First event (intake)
    
    const previousEvent = allEvents[index + 1];
    const change = event.quantity - previousEvent.quantity;
    
    return {
      value: Math.abs(change),
      isPositive: change >= 0,
      previous: previousEvent.quantity,
      current: event.quantity
    };
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
        <div>
          <h1 className="text-2xl font-bold">Inventory History</h1>
          <p className="text-muted-foreground">{inventoryItem.name}</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Filters</CardTitle>
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Stock</p>
                <p className="text-2xl font-bold">{stats.currentStock}</p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Units in inventory
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Usage</p>
                <p className="text-2xl font-bold">{stats.avgMonthlyUsage}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-green-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Units per month
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Peak Usage</p>
                <p className="text-2xl font-bold">{stats.peakUsage.amount}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-amber-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {stats.peakUsage.month ? format(parseISO(`${stats.peakUsage.month}-01`), 'MMM yyyy') : 'No data'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Days Since Check</p>
                <p className="text-2xl font-bold">{stats.daysSinceCheck}</p>
              </div>
              <Calendar className="h-8 w-8 text-red-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Last: {stats.lastCheckDate ? format(new Date(stats.lastCheckDate), 'MMM d') : 'Never'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Event Cards Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Event History</span>
            <Badge variant="secondary">{filteredEvents.length} events</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>No events found matching your filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredEvents.map((event, index) => {
                const eventInfo = getEventTypeInfo(event.event_type);
                const change = getQuantityChange(event, filteredEvents.length - 1 - index);
                
                return (
                  <Card key={event.id} className="overflow-hidden hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between mb-2">
                        <Badge className={eventInfo.color}>
                          {eventInfo.icon} {eventInfo.label}
                        </Badge>
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
                        {change && (
                          <div className="text-xs text-muted-foreground">
                            Start: {change.previous} → End: {change.current}
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-bold">{event.quantity} units</span>
                          {change && (
                            <div className={`flex items-center gap-1 ${
                              change.isPositive ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {change.isPositive ? (
                                <ArrowUp className="h-3 w-3" />
                              ) : (
                                <ArrowDown className="h-3 w-3" />
                              )}
                              <span className="text-xs font-medium">
                                {change.isPositive ? '+' : '-'}{change.value}
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
          )}
        </CardContent>
      </Card>
    </div>
  );
} 