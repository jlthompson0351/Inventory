import React from 'react';
import { CheckCircle, ArrowRight, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MobileInventorySuccessDialogProps {
  isOpen: boolean;
  onNextAsset: () => void;
  onComplete: () => void;
  assetName: string;
  formType: string;
  isLoading?: boolean;
}

export function MobileInventorySuccessDialog({
  isOpen,
  onNextAsset,
  onComplete,
  assetName,
  formType,
  isLoading = false
}: MobileInventorySuccessDialogProps) {
  const getFormTypeDisplayName = (type: string) => {
    switch (type) {
      case 'inventory':
        return 'Inventory Check';
      case 'intake':
        return 'Asset Intake';
      case 'continue_inventory':
        return 'Inventory Update';
      default:
        return 'Form Submission';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className={cn(
          "w-[95vw] max-w-md mx-auto",
          "mobile-optimized-dialog",
          "border-0 shadow-2xl",
          "bg-white rounded-2xl",
          "p-0 overflow-hidden"
        )}
      >
        <div className="relative">
          {/* Success Animation Container */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 px-6 py-8 text-center">
            {/* Success Icon with Animation */}
            <div className="relative mb-6">
              <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center animate-pulse">
                <CheckCircle className="h-12 w-12 text-green-600 animate-bounce" />
              </div>
              {/* Ripple Effect */}
              <div className="absolute inset-0 w-20 h-20 mx-auto bg-green-200 rounded-full animate-ping opacity-20"></div>
            </div>

            {/* Success Message */}
            <DialogHeader className="space-y-3">
              <DialogTitle className="text-2xl font-bold text-gray-900">
                {getFormTypeDisplayName(formType)} Complete!
              </DialogTitle>
              <DialogDescription className="text-lg text-gray-600 leading-relaxed">
                <span className="font-semibold text-gray-800">{assetName}</span> has been successfully recorded.
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* Action Buttons */}
          <div className="px-6 pb-6 pt-2 space-y-3">
            {/* Next Asset Button - Primary Action */}
            <Button
              onClick={onNextAsset}
              disabled={isLoading}
              size="lg"
              className={cn(
                "w-full h-14 text-lg font-semibold",
                "bg-blue-600 hover:bg-blue-700",
                "text-white rounded-xl",
                "shadow-lg hover:shadow-xl",
                "transition-all duration-200",
                "active:scale-95",
                "touch-manipulation",
                "min-h-[56px]" // 56px minimum for mobile touch targets
              )}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Loading...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <ArrowRight className="h-5 w-5" />
                  <span>Next Asset</span>
                </div>
              )}
            </Button>

            {/* Done Button - Secondary Action */}
            <Button
              onClick={onComplete}
              disabled={isLoading}
              variant="outline"
              size="lg"
              className={cn(
                "w-full h-12 text-base font-medium",
                "border-2 border-gray-300 hover:border-gray-400",
                "bg-white hover:bg-gray-50",
                "text-gray-700 rounded-xl",
                "shadow-sm hover:shadow-md",
                "transition-all duration-200",
                "active:scale-95",
                "touch-manipulation",
                "min-h-[48px]" // 48px minimum for mobile touch targets
              )}
            >
              Done
            </Button>
          </div>

          {/* Progress Indicator (Optional) */}
          <div className="px-6 pb-4">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Ready for next inventory</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default MobileInventorySuccessDialog;
