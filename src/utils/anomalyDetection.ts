export interface AnomalyDetection {
  type: 'massive_increase' | 'exact_hundred' | 'unexpected_increase' | 'percentage_jump' | 'seasonal_anomaly' | 'systematic_error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  suggestedFix?: number;
  confidence: number; // 0-100
  autoFixable: boolean;
}

export interface AssetThresholds {
  massiveIncreaseThreshold: number;
  percentageJumpThreshold: number;
  unexpectedIncreaseThreshold: number;
  assetType?: string;
}

export interface InventoryEvent {
  id: string;
  quantity: number;
  event_type: string;
  check_date: string;
  notes?: string;
  response_data?: any;
}

// Asset type based thresholds
const getAssetThresholds = (assetType?: string, currentQuantity?: number): AssetThresholds => {
  const baseThreshold = currentQuantity ? Math.max(currentQuantity * 0.5, 20) : 50;
  
  switch (assetType?.toLowerCase()) {
    case 'paint':
    case 'chemical':
    case 'coating':
      return {
        massiveIncreaseThreshold: Math.max(baseThreshold, 30),
        percentageJumpThreshold: 2.0, // 200%
        unexpectedIncreaseThreshold: 15,
        assetType
      };
    case 'parts':
    case 'hardware':
    case 'consumable':
      return {
        massiveIncreaseThreshold: Math.max(baseThreshold * 5, 100),
        percentageJumpThreshold: 3.0, // 300%
        unexpectedIncreaseThreshold: 50,
        assetType
      };
    default:
      return {
        massiveIncreaseThreshold: baseThreshold,
        percentageJumpThreshold: 2.5, // 250%
        unexpectedIncreaseThreshold: 20,
        assetType: 'unknown'
      };
  }
};

// Detect if a number looks like a typing error
const detectTypingError = (current: number, previous: number): { isError: boolean; suggestedFix?: number } => {
  const change = current - previous;
  
  // Check for extra digit errors (10x, 100x increases)
  if (change > 0) {
    const ratio = current / previous;
    
    // Likely extra digit at end (e.g., 64 → 640)
    if (ratio >= 9.5 && ratio <= 10.5) {
      return { isError: true, suggestedFix: Math.floor(current / 10) };
    }
    
    // Likely extra digit at beginning (e.g., 64 → 164)
    if (current > 100 && String(current).startsWith('1') && String(previous).length === String(current).length - 1) {
      const withoutFirstDigit = parseInt(String(current).substring(1));
      if (Math.abs(withoutFirstDigit - previous) <= 5) {
        return { isError: true, suggestedFix: withoutFirstDigit };
      }
    }
    
    // Exact 100 unit increments (common typing error)
    if (change === 100 || change === 1000) {
      return { isError: true, suggestedFix: previous };
    }
  }
  
  return { isError: false };
};

// Main anomaly detection function
export const detectInventoryAnomalies = (
  currentEvent: InventoryEvent, 
  previousEvent: InventoryEvent,
  assetType?: string,
  recentEvents?: InventoryEvent[]
): AnomalyDetection[] => {
  const anomalies: AnomalyDetection[] = [];
  const change = currentEvent.quantity - previousEvent.quantity;
  const thresholds = getAssetThresholds(assetType, previousEvent.quantity);
  
  // 1. Massive unexpected increases
  if (change > thresholds.massiveIncreaseThreshold) {
    const typingError = detectTypingError(currentEvent.quantity, previousEvent.quantity);
    
    anomalies.push({
      type: 'massive_increase',
      severity: change > thresholds.massiveIncreaseThreshold * 2 ? 'critical' : 'high',
      message: `Huge increase (+${change} units) - ${typingError.isError ? 'likely typing error' : 'verify accuracy'}`,
      suggestedFix: typingError.suggestedFix,
      confidence: typingError.isError ? 85 : 70,
      autoFixable: typingError.isError && typingError.suggestedFix !== undefined
    });
  }
  
  // 2. Exact multiples (typing errors)
  if (Math.abs(change) === 100 || Math.abs(change) === 1000) {
    anomalies.push({
      type: 'exact_hundred',
      severity: 'medium',
      message: `Exact ${Math.abs(change)} unit change - possible extra digit?`,
      suggestedFix: previousEvent.quantity,
      confidence: 75,
      autoFixable: true
    });
  }
  
  // 3. Impossible increases without intake
  if (change > thresholds.unexpectedIncreaseThreshold && 
      !['intake', 'addition', 'transfer'].includes(currentEvent.event_type)) {
    anomalies.push({
      type: 'unexpected_increase',
      severity: 'medium',
      message: `Inventory increased (+${change}) without recorded intake`,
      confidence: 80,
      autoFixable: false
    });
  }
  
  // 4. Percentage jumps
  if (previousEvent.quantity > 0 && (currentEvent.quantity / previousEvent.quantity) > thresholds.percentageJumpThreshold) {
    const percentage = Math.round((currentEvent.quantity / previousEvent.quantity) * 100);
    anomalies.push({
      type: 'percentage_jump',
      severity: percentage > 400 ? 'critical' : 'high',
      message: `${percentage}% increase - verify accuracy`,
      confidence: percentage > 300 ? 90 : 70,
      autoFixable: false
    });
  }
  
  // 5. Systematic errors (same user making multiple suspicious entries)
  if (recentEvents && recentEvents.length >= 3) {
    const suspiciousEntries = recentEvents.filter(event => 
      event.response_data?.metadata?.user_id === currentEvent.response_data?.metadata?.user_id
    );
    
    if (suspiciousEntries.length >= 3) {
      anomalies.push({
        type: 'systematic_error',
        severity: 'medium',
        message: 'Multiple large changes by same user - check for systematic error',
        confidence: 60,
        autoFixable: false
      });
    }
  }
  
  return anomalies;
};

// Calculate trend predictions
export const calculateTrendPredictions = (events: InventoryEvent[]) => {
  if (events.length < 3) return null;
  
  // Calculate average daily usage over last 30 days
  const last30Days = events.filter(event => {
    const eventDate = new Date(event.check_date);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return eventDate >= thirtyDaysAgo;
  });
  
  if (last30Days.length < 2) return null;
  
  let totalUsage = 0;
  let days = 0;
  
  for (let i = 1; i < last30Days.length; i++) {
    const current = last30Days[i];
    const previous = last30Days[i - 1];
    const usage = previous.quantity - current.quantity;
    
    if (usage > 0) {
      totalUsage += usage;
      const daysDiff = Math.floor(
        (new Date(previous.check_date).getTime() - new Date(current.check_date).getTime()) / 
        (1000 * 60 * 60 * 24)
      );
      days += Math.max(daysDiff, 1);
    }
  }
  
  if (days === 0) return null;
  
  const dailyUsage = totalUsage / days;
  const currentStock = events[0]?.quantity || 0;
  const daysUntilEmpty = dailyUsage > 0 ? Math.floor(currentStock / dailyUsage) : Infinity;
  const reorderPoint = Math.ceil(dailyUsage * 14); // 2 weeks buffer
  
  return {
    dailyUsage: Math.round(dailyUsage * 100) / 100,
    daysUntilEmpty: daysUntilEmpty === Infinity ? null : daysUntilEmpty,
    reorderPoint,
    shouldReorder: currentStock <= reorderPoint,
    trend: dailyUsage > 0 ? 'decreasing' : 'stable'
  };
};

// Get severity color classes
export const getAnomalySeverityColors = (severity: AnomalyDetection['severity']) => {
  switch (severity) {
    case 'critical':
      return {
        background: 'bg-red-100 border-red-400',
        text: 'text-red-900',
        border: 'border-red-400',
        icon: 'text-red-700'
      };
    case 'high':
      return {
        background: 'bg-red-50 border-red-300',
        text: 'text-red-800',
        border: 'border-red-300',
        icon: 'text-red-600'
      };
    case 'medium':
      return {
        background: 'bg-orange-50 border-orange-300',
        text: 'text-orange-800',
        border: 'border-orange-300',
        icon: 'text-orange-600'
      };
    case 'low':
      return {
        background: 'bg-yellow-50 border-yellow-300',
        text: 'text-yellow-800',
        border: 'border-yellow-300',
        icon: 'text-yellow-600'
      };
  }
}; 