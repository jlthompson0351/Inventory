import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { 
  CheckCircle, 
  AlertTriangle, 
  Edit3, 
  X
} from 'lucide-react';
import { AnomalyDetection, getAnomalySeverityColors } from '@/utils/anomalyDetection';

interface QuickFixCardProps {
  anomalies: AnomalyDetection[];
  currentQuantity: number;
  previousQuantity: number;
  eventId: string;
  onFixApplied: (newQuantity: number, reason: string) => void;
  onMarkVerified: (eventId: string) => void;
  onDismiss: () => void;
}

export const QuickFixCard: React.FC<QuickFixCardProps> = ({
  anomalies,
  currentQuantity,
  previousQuantity,
  eventId,
  onFixApplied,
  onMarkVerified,
  onDismiss
}) => {
  const [customQuantity, setCustomQuantity] = useState<string>(currentQuantity.toString());
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Get the main issue in simple terms
  const getSimpleMessage = () => {
    const change = currentQuantity - previousQuantity;
    
    if (change > 100) {
      return `Jumped from ${previousQuantity} to ${currentQuantity} - looks like a typo?`;
    }
    if (change === 100) {
      return `Added exactly 100 units - might be an extra zero?`;
    }
    if (change > 50) {
      return `Big increase (+${change}) - double check this number`;
    }
    return `Something looks off with this entry`;
  };

  // Get suggested fix
  const getSuggestedFix = () => {
    const autoFixable = anomalies.find(a => a.autoFixable && a.suggestedFix);
    return autoFixable?.suggestedFix;
  };

  const handleQuickFix = () => {
    const fix = getSuggestedFix();
    if (fix) {
      onFixApplied(fix, `Fixed likely typo`);
    }
  };

  const handleCustomFix = () => {
    const newQuantity = parseFloat(customQuantity);
    if (!isNaN(newQuantity) && newQuantity >= 0) {
      onFixApplied(newQuantity, `Manual correction`);
    }
  };

  const suggestedFix = getSuggestedFix();

  return (
    <Alert className="border-orange-300 bg-orange-50 mb-3">
      <AlertTriangle className="h-4 w-4 text-orange-600" />
      <AlertDescription>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="font-medium text-orange-900 text-sm">
              ⚠️ {getSimpleMessage()}
            </div>
            {suggestedFix && (
              <div className="text-xs text-orange-700 mt-1">
                Suggested fix: {suggestedFix} units
              </div>
            )}
          </div>
          
          <div className="flex gap-2 ml-4">
            {suggestedFix && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleQuickFix}
                className="h-7 text-xs"
              >
                Fix to {suggestedFix}
              </Button>
            )}
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowCustomInput(!showCustomInput)}
              className="h-7 text-xs"
            >
              <Edit3 className="h-3 w-3 mr-1" />
              Edit
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => onMarkVerified(eventId)}
              className="h-7 text-xs"
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              It's Correct
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={onDismiss}
              className="h-7 w-7 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
        
        {showCustomInput && (
          <div className="mt-3 flex gap-2">
            <Input
              type="number"
              value={customQuantity}
              onChange={(e) => setCustomQuantity(e.target.value)}
              className="h-8 text-sm w-24"
              placeholder="Correct amount"
            />
            <Button size="sm" onClick={handleCustomFix} className="h-8">
              Update
            </Button>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}; 