/**
 * Asset Inventory History Page - FULL FEATURED
 * 
 * Restored from original InventoryHistory.tsx with asset-centric approach
 * Shows EVERYTHING with anomaly detection, validation, and error highlighting
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { 
  ArrowLeft, 
  Calendar, 
  User, 
  MapPin, 
  FileText, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  Edit,
  Eye,
  X,
  AlertCircle,
  Plus,
  Package,
  Filter,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getAssetWithInventory, getAssetInventoryHistory } from '@/services/assetInventoryService';
import { format } from 'date-fns';

export default function AssetInventoryHistory() {
  const { assetId } = useParams<{ assetId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [asset, setAsset] = useState<any>(null);
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dismissedAnomalies, setDismissedAnomalies] = useState<Set<string>>(new Set());
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<string>('all');
  const [showAnomaliesOnly, setShowAnomaliesOnly] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!assetId) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Get asset info with inventory
        const assetData = await getAssetWithInventory(assetId);
        if (!assetData) {
          setError('Asset not found');
          return;
        }
        setAsset(assetData);
        
        // If no inventory, show empty state
        if (!assetData.has_inventory || !assetData.inventory_item_id) {
          setAllEvents([]);
          return;
        }
        
        // Get ALL inventory history using the new optimized function
        const historyData = await getAssetInventoryHistory(assetId);
        
        setAllEvents(historyData);
        
        // Load dismissed anomalies from localStorage (persistent across reloads)
        const storageKey = `dismissed_anomalies_${assetId}`;
        const savedDismissed = localStorage.getItem(storageKey);
        if (savedDismissed) {
          try {
            const dismissedIds = JSON.parse(savedDismissed);
            setDismissedAnomalies(new Set(dismissedIds));
          } catch (e) {
            console.error('Error loading dismissed anomalies:', e);
          }
        }
        
      } catch (err) {
        console.error('Error loading asset inventory history:', err);
        setError('Failed to load inventory history');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [assetId]);

  // Anomaly detection functions (ported from original)
  const detectAnomalies = (event: any, index: number, events: any[]) => {
    const anomalies: string[] = [];
    
    // Large quantity changes
    if (event.response_data?._previous_quantity) {
      const change = Math.abs(event.quantity - event.response_data._previous_quantity);
      if (change > 100) {
        anomalies.push(`Large quantity change: ${event.response_data._previous_quantity} → ${event.quantity}`);
      }
    }
    
    // Manual fixes applied
    if (event.response_data?.fix_applied) {
      anomalies.push(`Manual fix: ${event.response_data.fix_applied.reason}`);
    }
    
    // Multiple edits on same record
    if (event.edit_history && event.edit_history.length > 0) {
      anomalies.push(`Edited ${event.edit_history.length} times`);
    }
    
    // Validation issues
    if (event.validation_status === 'pending') {
      anomalies.push('Needs validation');
    }
    
    // Suspicious patterns
    if (event.quantity > 10000) {
      anomalies.push('Unusually high quantity');
    }
    
    return anomalies;
  };

  const handleDismissAnomaly = (eventId: string) => {
    // Update state
    setDismissedAnomalies(prev => {
      const newSet = new Set(prev).add(eventId);
      
      // Save to localStorage for persistence across reloads
      const storageKey = `dismissed_anomalies_${assetId}`;
      localStorage.setItem(storageKey, JSON.stringify(Array.from(newSet)));
      
      return newSet;
    });
    
    toast({
      title: "Dismissed",
      description: "Anomaly dismissed and will stay hidden",
    });
  };

  const toggleEventExpansion = (eventId: string) => {
    setExpandedEvents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  };

  const getExactQuantity = (event: any): string => {
    try {
      if (event.response_data?.exact_quantity && typeof event.response_data.exact_quantity === 'number') {
        return event.response_data.exact_quantity.toString();
      }
    } catch (error) {
      console.error('Error getting exact quantity:', error);
    }
    return event.quantity?.toString() || '0';
  };

  // Filter events based on user selections
  const filteredEvents = allEvents.filter(event => {
    if (filterType !== 'all' && event.event_type !== filterType) return false;
    
    if (showAnomaliesOnly) {
      const anomalies = detectAnomalies(event, 0, allEvents);
      if (anomalies.length === 0 || dismissedAnomalies.has(event.id)) return false;
    }
    
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
        <span className="ml-2">Loading inventory history...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="container mx-auto p-4">
        <Alert>
          <AlertDescription>Asset not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  const getEventTypeInfo = (eventType: string) => {
    switch (eventType) {
      case 'intake':
        return { label: 'Initial Intake', color: 'bg-green-100 text-green-800 border-green-200', icon: Plus };
      case 'audit':
        return { label: 'Audit Check', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Calendar };
      case 'check':
        return { label: 'Inventory Check', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: Eye };
      case 'adjustment':
        return { label: 'Adjustment', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Edit };
      default:
        return { label: eventType, color: 'bg-gray-100 text-gray-800 border-gray-200', icon: FileText };
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button 
          variant="ghost" 
          onClick={() => navigate(`/assets/${assetId}`)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Asset
        </Button>
        
        <Button 
          onClick={() => navigate(`/assets/${assetId}/inventory/check`)}
        >
          <Calendar className="mr-2 h-4 w-4" />
          Record New Check
        </Button>
      </div>

      {/* Asset Summary */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Inventory History: {asset.asset_name}
          </CardTitle>
          <CardDescription>
            Complete audit trail with anomaly detection • {allEvents.length} events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Current Quantity</p>
              <p className="text-2xl font-bold">{asset.current_quantity}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Location</p>
              <p className="font-semibold">{asset.asset_location || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant="outline">{asset.inventory_status || 'Active'}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Last Check</p>
              <p className="font-semibold">
                {asset.last_check_date ? format(new Date(asset.last_check_date), 'MMM d, yyyy') : 'Never'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compact Event History with Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Event History</CardTitle>
              <CardDescription>
                {filteredEvents.length} of {allEvents.length} events
              </CardDescription>
            </div>
            
            {/* Filters */}
            <div className="flex items-center gap-2">
              <Button
                variant={showAnomaliesOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setShowAnomaliesOnly(!showAnomaliesOnly)}
                className="text-xs"
              >
                <AlertTriangle className="h-3 w-3 mr-1" />
                Anomalies Only
              </Button>
              
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  <SelectItem value="intake">Intake</SelectItem>
                  <SelectItem value="audit">Audits</SelectItem>
                  <SelectItem value="check">Checks</SelectItem>
                  <SelectItem value="adjustment">Adjustments</SelectItem>
                </SelectContent>
              </Select>
              
              {dismissedAnomalies.size > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDismissedAnomalies(new Set());
                    const storageKey = `dismissed_anomalies_${assetId}`;
                    localStorage.removeItem(storageKey);
                    toast({
                      title: "Reset",
                      description: "All dismissed anomalies are now visible again",
                    });
                  }}
                  className="text-xs text-muted-foreground"
                >
                  Show Dismissed ({dismissedAnomalies.size})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {!asset.has_inventory ? (
            <div className="text-center py-12">
              <Package className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-xl font-medium mb-2">No Inventory Setup</p>
              <p className="text-muted-foreground mb-6">
                This asset doesn't have inventory tracking enabled yet.
              </p>
              <Button onClick={() => navigate(`/assets/${assetId}/inventory/create`)}>
                <Plus className="mr-2 h-4 w-4" />
                Set Up Inventory
              </Button>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-xl font-medium mb-2">No Events Match Filter</p>
              <p>Try adjusting your filters</p>
            </div>
          ) : (
            /* COMPACT TABLE-LIKE FORMAT */
            <div className="divide-y">
              {filteredEvents.map((event, index) => {
                const eventInfo = getEventTypeInfo(event.event_type);
                const EventIcon = eventInfo.icon;
                const anomalies = detectAnomalies(event, index, allEvents);
                const hasAnomalies = anomalies.length > 0 && !dismissedAnomalies.has(event.id);
                const isExpanded = expandedEvents.has(event.id);
                const exactQuantity = getExactQuantity(event);
                
                // Show corrected quantity if available, otherwise original
                const displayQuantity = event.has_corrections && event.corrections?.length > 0 ? 
                  event.corrections[0].corrected_quantity : event.quantity;
                
                return (
                  <div key={event.id} className={`p-3 hover:bg-muted/50 ${hasAnomalies ? 'bg-red-50 border-l-4 border-l-red-400' : ''}`}>
                    {/* COMPACT ROW - All key info in one line */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Event Type Icon + Badge */}
                        <div className="flex items-center gap-2 w-32">
                          <EventIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <Badge variant="outline" className={`${eventInfo.color} text-xs`}>
                            {event.event_type}
                          </Badge>
                        </div>
                        
                        {/* Date */}
                        <div className="w-24 text-xs text-muted-foreground">
                          {format(new Date(event.check_date), 'MMM d, yyyy')}
                        </div>
                        
                        {/* Quantity with change indicator */}
                        <div className="w-20 text-center">
                          <div className={`font-semibold text-sm ${event.has_corrections ? 'text-purple-700' : ''}`}>
                            {displayQuantity}
                            {event.has_corrections && <span className="text-purple-500 ml-1">*</span>}
                          </div>
                          {event.response_data?._previous_quantity && (
                            <div className="flex items-center justify-center gap-1">
                              {displayQuantity > event.response_data._previous_quantity ? (
                                <TrendingUp className="h-3 w-3 text-green-600" />
                              ) : (
                                <TrendingDown className="h-3 w-3 text-red-600" />
                              )}
                              <span className="text-xs text-muted-foreground">
                                {displayQuantity > event.response_data._previous_quantity ? '+' : ''}{displayQuantity - event.response_data._previous_quantity}
                              </span>
                            </div>
                          )}
                          {event.has_corrections && (
                            <div className="text-xs text-purple-600">Corrected</div>
                          )}
                        </div>
                        
                        {/* Notes (truncated) */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground truncate" title={event.notes || ''}>
                            {event.notes || `${event.check_type} check`}
                          </p>
                        </div>
                        
                        {/* Status indicators - compact */}
                        <div className="flex items-center gap-1">
                          {hasAnomalies && <AlertTriangle className="h-4 w-4 text-red-500" />}
                          {event.edit_history?.length > 0 && <Edit className="h-4 w-4 text-yellow-600" />}
                          {event.has_corrections && <Badge variant="outline" className="text-xs bg-purple-100 text-purple-800">Corrected</Badge>}
                        </div>
                      </div>
                      
                      {/* Action buttons */}
                      <div className="flex items-center gap-1 ml-2">
                        {/* Edit button - for all events except intake */}
                        {event.event_type !== 'intake' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/assets/${assetId}/inventory/correct/${event.id}`)}
                            className="h-6 px-2 text-xs"
                            title="Correct this record"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        )}
                        
                        {hasAnomalies && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDismissAnomaly(event.id)}
                            className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
                            title="Dismiss this anomaly"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                        
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleEventExpansion(event.id)}
                          className="h-6 px-1"
                        >
                          {isExpanded ? 
                            <ChevronDown className="h-3 w-3" /> : 
                            <ChevronRight className="h-3 w-3" />
                          }
                        </Button>
                      </div>
                    </div>

                    {/* EXPANDABLE DETAILS - Only shown when clicked */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t space-y-3">
                        {/* Full event details */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                          <div>
                            <span className="text-muted-foreground">Full Date:</span>
                            <p className="font-medium">{format(new Date(event.check_date), 'MMM d, yyyy h:mm a')}</p>
                          </div>
                          {event.location && (
                            <div>
                              <span className="text-muted-foreground">Location:</span>
                              <p className="font-medium">{event.location}</p>
                            </div>
                          )}
                          <div>
                            <span className="text-muted-foreground">Validation:</span>
                            <p className="font-medium">{event.validation_status || 'Pending'}</p>
                          </div>
                          {exactQuantity !== event.quantity.toString() && (
                            <div>
                              <span className="text-muted-foreground">Exact Qty:</span>
                              <p className="font-medium">{exactQuantity}</p>
                            </div>
                          )}
                        </div>

                        {/* Anomalies - Compact */}
                        {hasAnomalies && (
                          <div className="p-2 bg-red-100 border border-red-200 rounded text-xs">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-red-800">🚨 {anomalies.length} Anomalies</span>
                              <Button
                                size="sm"
                                variant="outline" 
                                onClick={() => handleDismissAnomaly(event.id)}
                                className="h-5 px-2 text-xs text-red-600 hover:text-red-700"
                              >
                                <X className="h-3 w-3 mr-1" />
                                Dismiss
                              </Button>
                            </div>
                            <ul className="text-red-700 space-y-0.5">
                              {anomalies.map((anomaly, i) => (
                                <li key={i}>• {anomaly}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Inventory Changes - Compact */}
                        {event.response_data?._inventory_changes && (
                          <div className="text-xs">
                            <span className="text-muted-foreground font-medium">Changes:</span>
                            {event.response_data._inventory_changes.map((change: any, i: number) => (
                              <div key={i} className="ml-2">• {change.description}</div>
                            ))}
                          </div>
                        )}

                        {/* Edit History - Super Compact */}
                        {event.edit_history?.length > 0 && (
                          <div className="text-xs">
                            <span className="text-muted-foreground font-medium">Edits:</span>
                            <span className="ml-2">{event.edit_history.length} edit(s) - Click to view details</span>
                          </div>
                        )}

                        {/* Corrections - Show correction timeline */}
                        {event.has_corrections && event.corrections && (
                          <div className="space-y-2">
                            <div className="text-xs text-muted-foreground font-medium">
                              📝 {event.corrections.length} Correction(s) Applied:
                            </div>
                            {event.corrections.map((correction: any, i: number) => (
                              <div key={correction.id} className="p-2 bg-purple-50 border border-purple-200 rounded text-xs">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-medium text-purple-800">
                                    Correction #{i + 1} • {format(new Date(correction.created_at), 'MMM d, h:mm a')}
                                  </span>
                                  <Badge variant="outline" className="bg-purple-100 text-purple-800 text-xs">
                                    {correction.approval_status}
                                  </Badge>
                                </div>
                                
                                <div className="space-y-1">
                                  <p><strong>Reason:</strong> {correction.correction_reason}</p>
                                  
                                  {correction.original_quantity !== correction.corrected_quantity && (
                                    <p>
                                      <strong>Quantity:</strong> {correction.original_quantity} → {correction.corrected_quantity}
                                    </p>
                                  )}
                                  
                                  {correction.original_location !== correction.corrected_location && (
                                    <p>
                                      <strong>Location:</strong> "{correction.original_location}" → "{correction.corrected_location}"
                                    </p>
                                  )}
                                  
                                  {correction.original_notes !== correction.corrected_notes && (
                                    <p>
                                      <strong>Notes:</strong> Updated
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
