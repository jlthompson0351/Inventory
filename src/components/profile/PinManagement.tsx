import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Lock, Smartphone, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { setUserPin, removeUserPin, getUserPin } from '@/services/pinService';

const PinManagement: React.FC = () => {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [currentPin, setCurrentPin] = useState<string | null>(null);
  const [showPin, setShowPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const { toast } = useToast();

  // Load current PIN status on mount
  useEffect(() => {
    loadPinStatus();
  }, []);

  const loadPinStatus = async () => {
    try {
      setIsLoadingStatus(true);
      const { pin: userPin, error } = await getUserPin();
      
      if (error) {
        console.error('Error loading PIN status:', error);
        return;
      }
      
      setCurrentPin(userPin);
    } catch (error) {
      console.error('Error in loadPinStatus:', error);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  const handleSetPin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (pin.length !== 4) {
      toast({
        variant: "destructive",
        title: "Invalid PIN",
        description: "PIN must be exactly 4 digits.",
      });
      return;
    }

    if (pin !== confirmPin) {
      toast({
        variant: "destructive",
        title: "PIN Mismatch",
        description: "PINs do not match. Please try again.",
      });
      return;
    }

    try {
      setIsLoading(true);
      const { success, error } = await setUserPin(pin);
      
      if (success) {
        toast({
          title: "PIN Set Successfully",
          description: "Your mobile QR authentication PIN has been set.",
        });
        setCurrentPin(pin);
        setPin('');
        setConfirmPin('');
      } else {
        toast({
          variant: "destructive",
          title: "Error Setting PIN",
          description: error || "Failed to set PIN.",
        });
      }
    } catch (error) {
      console.error('Error setting PIN:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemovePin = async () => {
    if (!confirm('Are you sure you want to remove your PIN? This will disable mobile QR authentication.')) {
      return;
    }

    try {
      setIsLoading(true);
      const { success, error } = await removeUserPin();
      
      if (success) {
        toast({
          title: "PIN Removed",
          description: "Your mobile QR authentication PIN has been removed.",
        });
        setCurrentPin(null);
      } else {
        toast({
          variant: "destructive",
          title: "Error Removing PIN",
          description: error || "Failed to remove PIN.",
        });
      }
    } catch (error) {
      console.error('Error removing PIN:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatPin = (value: string) => {
    return value.replace(/\D/g, '').slice(0, 4);
  };

  if (isLoadingStatus) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Lock className="h-5 w-5 mr-2" />
            Mobile QR Authentication
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <span className="ml-2 text-sm text-gray-600">Loading PIN status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Lock className="h-5 w-5 mr-2" />
          Mobile QR Authentication
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Status */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center">
            <Smartphone className="h-5 w-5 mr-3 text-gray-600" />
            <div>
              <p className="font-medium">Mobile PIN Status</p>
              <p className="text-sm text-gray-600">
                4-digit PIN for scanning asset QR codes
              </p>
            </div>
          </div>
          <div>
            {currentPin ? (
              <Badge variant="default" className="bg-green-500">
                <Check className="h-3 w-3 mr-1" />
                Active
              </Badge>
            ) : (
              <Badge variant="secondary">
                <X className="h-3 w-3 mr-1" />
                Not Set
              </Badge>
            )}
          </div>
        </div>

        {/* PIN Setup/Change Form */}
        <form onSubmit={handleSetPin} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pin">
                {currentPin ? 'New PIN' : 'Set PIN'} (4 digits)
              </Label>
              <div className="relative">
                <Input
                  id="pin"
                  type={showPin ? "text" : "password"}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(formatPin(e.target.value))}
                  placeholder="1234"
                  className="text-center text-lg tracking-wider"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            
            <div>
              <Label htmlFor="confirmPin">Confirm PIN</Label>
              <Input
                id="confirmPin"
                type={showPin ? "text" : "password"}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={confirmPin}
                onChange={(e) => setConfirmPin(formatPin(e.target.value))}
                placeholder="1234"
                className="text-center text-lg tracking-wider"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button 
              type="submit"
              disabled={pin.length !== 4 || confirmPin.length !== 4 || isLoading}
              className="flex-1"
            >
              {isLoading ? 'Setting...' : (currentPin ? 'Update PIN' : 'Set PIN')}
            </Button>
            
            {currentPin && (
              <Button
                type="button"
                variant="outline"
                onClick={handleRemovePin}
                disabled={isLoading}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                Remove PIN
              </Button>
            )}
          </div>
        </form>

        {/* Info Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">How it works:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Scan any asset QR code with your mobile device</li>
            <li>• Enter your 4-digit PIN to authenticate</li>
            <li>• Choose from available workflow options (Intake, Inventory Check, etc.)</li>
            <li>• Complete forms and actions directly from your mobile device</li>
          </ul>
        </div>

        {currentPin && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h4 className="font-medium text-amber-900 mb-2">Security Note:</h4>
            <p className="text-sm text-amber-800">
              Your PIN is stored securely and is only used for mobile QR authentication. 
              Keep it private and change it regularly for security.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PinManagement; 