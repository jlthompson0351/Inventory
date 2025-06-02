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
  Zap,
  RefreshCw
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
import { supabase } from "@/integrations/supabase/client";
import { clearAssetCacheForOrg } from "@/components/inventory/AssetList";
import { useToast } from "@/components/ui/use-toast";

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
  const { toast } = useToast();
  
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
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [verificationFilter, setVerificationFilter] = useState<string>("all");
  const [quantityFilter, setQuantityFilter] = useState<string>("all");

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
      // Remove the massive intake event (15514) and other obvious anomalies
      // Keep only normal measurement events (under 1000 units for paint)
      return event.quantity <= 1000 && event.event_type !== 'intake';
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
    if (!inventoryItemId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Clear any cached data to force fresh fetch
      if (inventoryItem?.asset?.organization_id) {
        clearAssetCacheForOrg(inventoryItem.asset.organization_id);
      }
      
      // Force refresh inventory item details from database
      const { data: freshInventoryItem, error: itemError } = await supabase
        .from('inventory_items')
        .select(`
          *,
          asset:assets(
            id,
            name,
            organization_id,
            asset_type:asset_types(
              id, 
              name,
              intake_form_id,
              inventory_form_id
            )
          )
        `)
        .eq('id', inventoryItemId)
        .single();
        
      if (itemError) {
        throw new Error(`Failed to load inventory item: ${itemError.message}`);
      }
      
      setInventoryItem(freshInventoryItem);
      
      // Clear cache for this organization too
      if (freshInventoryItem?.asset?.organization_id) {
        clearAssetCacheForOrg(freshInventoryItem.asset.organization_id);
      }
      
      // Load all inventory history
      const history = await getAllInventoryHistory(inventoryItemId);
      setAllEvents(history);
      
      // Check for verified events in the database
      const verifiedEventIds = new Set<string>();
      history.forEach(event => {
        try {
          const responseData = event.response_data;
          if (responseData && typeof responseData === 'object') {
            const data = responseData as Record<string, any>;
            // Mark as verified if explicitly verified OR if a fix has been applied
            if (data.verified?.status === 'verified' || data.fix_applied) {
              verifiedEventIds.add(event.id);
            }
          }
        } catch (e) {
          // Ignore parsing errors
        }
      });
      setVerifiedEvents(verifiedEventIds);
      
    } catch (err) {
      console.error('Failed to load inventory data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  // Handler for manual refresh button
  const handleRefresh = async () => {
    await loadInventoryData();
    toast({
      title: "Data Refreshed",
      description: "Inventory data has been updated successfully",
    });
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

    // Filter by verification status
    if (verificationFilter !== "all") {
      filtered = filtered.filter(event => {
        const isVerified = verifiedEvents.has(event.id);
        const hasAnomalies = event.anomalies.length > 0 && !dismissedAnomalies.has(event.id);
        
        switch (verificationFilter) {
          case 'verified':
            return isVerified;
          case 'has_issues':
            return hasAnomalies;
          case 'normal':
            return !isVerified && !hasAnomalies;
          default:
            return true;
        }
      });
    }

    // Filter by quantity range
    if (quantityFilter !== "all") {
      filtered = filtered.filter(event => {
        switch (quantityFilter) {
          case 'low':
            return event.quantity < 100;
          case 'medium':
            return event.quantity >= 100 && event.quantity < 1000;
          case 'high':
            return event.quantity >= 1000;
          case 'exact_measurements':
            return event.response_data?.exact_quantity !== undefined;
          default:
            return true;
        }
      });
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

    // Apply sort order
    filtered.sort((a, b) => {
      const dateA = new Date(a.check_date).getTime();
      const dateB = new Date(b.check_date).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    setFilteredEvents(filtered);
  }, [processedEvents, eventTypeFilter, yearFilter, verificationFilter, quantityFilter, searchTerm, showOnlyAnomalies, sortOrder, dismissedAnomalies, verifiedEvents]);

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

  // Helper to safely get exact quantity from response_data
  const getExactQuantity = (event: InventoryEvent): string => {
    try {
      if (event.response_data && typeof event.response_data === 'object') {
        const data = event.response_data as Record<string, any>;
        if (data.exact_quantity && typeof data.exact_quantity === 'number') {
          // Check if this is a liquid asset (paint, chemical, etc.)
          const isLiquidAsset = inventoryItem?.asset?.asset_type?.name?.toLowerCase().includes('paint') ||
                               inventoryItem?.asset?.asset_type?.name?.toLowerCase().includes('chemical') ||
                               inventoryItem?.asset?.asset_type?.name?.toLowerCase().includes('coating');
          
          if (isLiquidAsset) {
            return `${data.exact_quantity} gallons`;
          }
        }
      }
    } catch (e) {
      // Ignore errors and fall back to default
    }
    return `${event.quantity} units`;
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
          <p className="text-muted-foreground">
            {inventoryItem?.name} - Current: {inventoryItem?.quantity ? `${inventoryItem.quantity} units` : 'Loading...'}
          </p>
        </div>
        
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
        
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
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            {/* Sort Order */}
            <Select value={sortOrder} onValueChange={(value: 'newest' | 'oldest') => setSortOrder(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Sort Order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">🕒 Newest First</SelectItem>
                <SelectItem value="oldest">⏰ Oldest First</SelectItem>
              </SelectContent>
            </Select>

            {/* Event Type */}
            <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Event Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                <SelectItem value="intake">📦 Intake</SelectItem>
                <SelectItem value="check">✅ Check</SelectItem>
                <SelectItem value="audit">🔍 Audit</SelectItem>
                <SelectItem value="addition">➕ Addition</SelectItem>
                <SelectItem value="removal">➖ Removal</SelectItem>
                <SelectItem value="transfer">🔄 Transfer</SelectItem>
                <SelectItem value="disposal">🗑️ Disposal</SelectItem>
                <SelectItem value="adjustment">⚖️ Adjustment</SelectItem>
              </SelectContent>
            </Select>

            {/* Verification Status */}
            <Select value={verificationFilter} onValueChange={setVerificationFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="verified">✅ Verified</SelectItem>
                <SelectItem value="has_issues">⚠️ Has Issues</SelectItem>
                <SelectItem value="normal">📋 Normal</SelectItem>
              </SelectContent>
            </Select>

            {/* Quantity Range */}
            <Select value={quantityFilter} onValueChange={setQuantityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Quantity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Quantities</SelectItem>
                <SelectItem value="low">🔻 Low (&lt;100)</SelectItem>
                <SelectItem value="medium">📊 Medium (100-1000)</SelectItem>
                <SelectItem value="high">📈 High (&gt;1000)</SelectItem>
                <SelectItem value="exact_measurements">🎯 Exact Measurements</SelectItem>
              </SelectContent>
            </Select>

            {/* Year Filter */}
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

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search notes, location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          
          {/* Filter Summary */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Showing {filteredEvents.length} of {allEvents.length} events</span>
              {sortOrder === 'newest' && <span>• Newest first</span>}
              {sortOrder === 'oldest' && <span>• Oldest first</span>}
            </div>
            
            {/* Clear Filters Button */}
            {(eventTypeFilter !== 'all' || yearFilter !== 'all' || verificationFilter !== 'all' || 
              quantityFilter !== 'all' || searchTerm || showOnlyAnomalies) && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setEventTypeFilter('all');
                  setYearFilter('all');
                  setVerificationFilter('all');
                  setQuantityFilter('all');
                  setSearchTerm('');
                  setShowOnlyAnomalies(false);
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
          
          {/* Quick Filter Buttons */}
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
            <span className="text-sm font-medium text-muted-foreground mr-2">Quick Filters:</span>
            
            <Button
              variant={quantityFilter === 'exact_measurements' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setQuantityFilter(quantityFilter === 'exact_measurements' ? 'all' : 'exact_measurements')}
            >
              🎯 Exact Measurements
            </Button>
            
            <Button
              variant={verificationFilter === 'verified' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setVerificationFilter(verificationFilter === 'verified' ? 'all' : 'verified')}
            >
              ✅ Verified Only
            </Button>
            
            <Button
              variant={eventTypeFilter === 'audit' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setEventTypeFilter(eventTypeFilter === 'audit' ? 'all' : 'audit')}
            >
              🔍 Audits Only
            </Button>
            
            <Button
              variant={quantityFilter === 'high' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setQuantityFilter(quantityFilter === 'high' ? 'all' : 'high')}
            >
              📈 High Quantities
            </Button>
            
            <Button
              variant={sortOrder === 'oldest' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'oldest' ? 'newest' : 'oldest')}
            >
              {sortOrder === 'oldest' ? '⏰ Oldest First' : '🕒 Newest First'}
            </Button>
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
                  {inventoryItem?.quantity ? `${inventoryItem.quantity} units` : 'Loading...'}
                </p>
                <p className="text-xs text-muted-foreground">
                  from database
                </p>
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

      {/* High Stock Alert */}
      {inventoryItem?.quantity > 1000 && (
        <Alert className="mb-4 border-green-300 bg-green-50">
          <Package className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            📦 <strong>High Stock Level:</strong> Current inventory ({inventoryItem.quantity} units) is well above normal levels due to recent intake. No reordering needed.
          </AlertDescription>
        </Alert>
      )}

      {/* Event Cards Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>Event History</span>
              <Badge variant="outline" className="text-xs">
                {sortOrder === 'newest' ? '🕒 Newest First' : '⏰ Oldest First'}
              </Badge>
            </div>
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
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0"
                              onClick={() => {
                                // Determine the correct form ID based on event type
                                let formId = event.response_data?.form_id;
                                
                                if (!formId && inventoryItem?.asset?.asset_type) {
                                  // Use inventory form for audit/check events, intake form for others
                                  if (['audit', 'check'].includes(event.event_type)) {
                                    formId = inventoryItem.asset.asset_type.inventory_form_id;
                                  } else {
                                    formId = inventoryItem.asset.asset_type.intake_form_id;
                                  }
                                }
                                
                                if (formId) {
                                  navigate(`/forms/submit/${formId}?asset_id=${inventoryItem?.asset_id}&action=edit-history&history_id=${event.id}`);
                                } else {
                                  toast({
                                    title: "Form Not Found",
                                    description: "Could not find the form for this event type",
                                    variant: "destructive"
                                  });
                                }
                              }}
                              title="Edit this entry"
                            >
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
                            <span className="text-lg font-bold">{getExactQuantity(event)}</span>
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