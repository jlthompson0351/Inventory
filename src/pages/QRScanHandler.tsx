import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Package, ClipboardList, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getAssetById } from '@/services/assetService';
import { getFormById } from '@/services/formService';
import { getAssetTypeById } from '@/services/assetTypeService';

interface QRCodeData {
  assetId?: string;
  barcode?: string;
}

const QRScanHandler: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [asset, setAsset] = useState<any>(null);
  const [assetType, setAssetType] = useState<any>(null);
  const [intakeFormId, setIntakeFormId] = useState<string | null>(null);
  const [inventoryFormId, setInventoryFormId] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');
  const [userId, setUserId] = useState<string | null>(null);

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setIsAuthenticated(true);
        setUserId(user.id);
      }
    };
    checkAuth();
  }, []);

  // Decode and process the QR code
  useEffect(() => {
    const processQRCode = async () => {
      if (!code) {
        toast({
          title: "Invalid QR Code",
          description: "No code provided",
          variant: "destructive"
        });
        return;
      }

      try {
        // Try to decode the QR code data
        let qrData: QRCodeData = {};
        
        // First try to parse as JSON (new format)
        try {
          const decodedData = atob(code);
          qrData = JSON.parse(decodedData);
        } catch {
          // If not JSON, assume it's a barcode string (legacy format)
          qrData = { barcode: code };
        }

        // Find the asset by ID or barcode
        let assetData = null;
        if (qrData.assetId) {
          assetData = await getAssetById(qrData.assetId);
        } else if (qrData.barcode) {
          // Look up asset by barcode
          const { data, error } = await supabase
            .from('assets')
            .select('*')
            .eq('barcode', qrData.barcode)
            .maybeSingle();
          
          if (error) {
            console.error('Error fetching asset by barcode:', error);
            throw error;
          }
          assetData = data;
        }

        if (!assetData) {
          toast({
            title: "Asset Not Found",
            description: "This QR code does not match any asset in the system",
            variant: "destructive"
          });
          setLoading(false);
          return;
        }

        setAsset(assetData);

        // Get asset type details including linked forms
        if (assetData.asset_type_id) {
          const assetTypeData = await getAssetTypeById(assetData.asset_type_id);
          setAssetType(assetTypeData);

          // Get linked forms for this asset type
          const { data: linkedForms } = await supabase
            .from('asset_type_forms')
            .select('form_id, purpose')
            .eq('asset_type_id', assetData.asset_type_id)
            .eq('organization_id', assetData.organization_id);

          if (linkedForms) {
            const intakeForm = linkedForms.find(f => f.purpose === 'intake');
            const inventoryForm = linkedForms.find(f => f.purpose === 'inventory');
            
            if (intakeForm) setIntakeFormId(intakeForm.form_id);
            if (inventoryForm) setInventoryFormId(inventoryForm.form_id);
          }
        }

        setLoading(false);
      } catch (error) {
        console.error('Error processing QR code:', error);
        toast({
          title: "Error",
          description: "Failed to process QR code",
          variant: "destructive"
        });
        setLoading(false);
      }
    };

    processQRCode();
  }, [code, toast]);

  // Authenticate with PIN
  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (pin.length !== 4) {
      setAuthError('PIN must be 4 digits');
      return;
    }

    try {
      // Verify PIN against user's profile
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, quick_access_pin')
        .eq('quick_access_pin', pin)
        .maybeSingle();

      if (error) {
        console.error('Error verifying PIN:', error);
        setAuthError('Authentication failed. Please try again.');
        return;
      }

      if (profile) {
        setIsAuthenticated(true);
        setUserId(profile.id);
        
        // Create a temporary session token
        localStorage.setItem('qr_scan_session', JSON.stringify({
          userId: profile.id,
          expires: Date.now() + (30 * 60 * 1000) // 30 minutes
        }));
        
        toast({
          title: "Authenticated",
          description: "You can now access forms",
        });
      } else {
        setAuthError('Invalid PIN');
      }
    } catch (error) {
      console.error('PIN verification error:', error);
      setAuthError('Invalid PIN');
    }
  };

  // Navigate to form with asset context
  const handleFormAccess = (formType: 'intake' | 'inventory', formId: string) => {
    if (!asset || !userId) return;

    // Store asset context for the form
    sessionStorage.setItem('qr_form_context', JSON.stringify({
      assetId: asset.id,
      assetName: asset.name,
      assetType: assetType?.name,
      formType,
      formId,
      userId
    }));

    // Navigate to the appropriate form page
    if (formType === 'intake') {
      navigate(`/inventory/add?assetId=${asset.id}&formId=${formId}`);
    } else {
      navigate(`/inventory/check?assetId=${asset.id}&formId=${formId}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mb-4" />
            <p className="text-muted-foreground">Processing QR Code...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center py-8">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Asset Not Found</h2>
            <p className="text-muted-foreground text-center">
              This QR code does not match any asset in the system.
            </p>
            <Button
              onClick={() => navigate('/')}
              className="mt-6"
            >
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-2xl">Quick Access Authentication</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePinSubmit} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="pin" className="text-lg text-center block">Enter your 4-digit PIN</Label>
                <Input
                  id="pin"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]{4}"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="text-center text-3xl tracking-[0.5em] h-16 font-bold"
                  autoFocus
                />
                {authError && (
                  <p className="text-sm text-destructive text-center">{authError}</p>
                )}
              </div>
              <Button 
                type="submit" 
                className="w-full h-14 text-lg font-medium" 
                disabled={pin.length !== 4}
              >
                Authenticate
              </Button>
              <div className="text-center text-sm text-muted-foreground">
                <p className="mb-2">Or</p>
                <Button
                  variant="link"
                  onClick={() => navigate('/login')}
                  className="text-primary text-base"
                >
                  Login with full credentials
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="pb-4">
          <CardTitle className="text-center text-2xl">Asset Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Asset Information */}
          <div className="bg-gray-50 p-5 rounded-lg">
            <h3 className="font-semibold mb-3 text-lg">Asset Details</h3>
            <div className="space-y-2 text-base">
              <p className="flex justify-between">
                <span className="text-muted-foreground">Name:</span> 
                <span className="font-medium">{asset.name}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-muted-foreground">Type:</span> 
                <span className="font-medium">{assetType?.name || 'Unknown'}</span>
              </p>
              {asset.serial_number && (
                <p className="flex justify-between">
                  <span className="text-muted-foreground">Serial:</span> 
                  <span className="font-medium">{asset.serial_number}</span>
                </p>
              )}
              <p className="flex justify-between">
                <span className="text-muted-foreground">Status:</span> 
                <span className={`font-medium ${
                  asset.status === 'active' ? 'text-green-600' : 
                  asset.status === 'maintenance' ? 'text-yellow-600' : 
                  'text-gray-600'
                }`}>
                  {asset.status.charAt(0).toUpperCase() + asset.status.slice(1)}
                </span>
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {intakeFormId && (
              <Button
                onClick={() => handleFormAccess('intake', intakeFormId)}
                className="w-full h-14 text-lg"
                size="lg"
              >
                <Package className="mr-3 h-6 w-6" />
                Add to Inventory (Intake)
              </Button>
            )}
            
            {inventoryFormId && (
              <Button
                onClick={() => handleFormAccess('inventory', inventoryFormId)}
                variant="outline"
                className="w-full h-14 text-lg"
                size="lg"
              >
                <ClipboardList className="mr-3 h-6 w-6" />
                Perform Inventory Check
              </Button>
            )}

            {!intakeFormId && !inventoryFormId && (
              <div className="text-center py-6 px-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <AlertCircle className="h-12 w-12 text-yellow-600 mx-auto mb-3" />
                <p className="text-muted-foreground text-base mb-1">
                  No forms are linked to this asset type.
                </p>
                <p className="text-sm text-muted-foreground">
                  Contact your administrator to set up forms.
                </p>
              </div>
            )}
          </div>

          {/* Additional Actions */}
          <div className="pt-4 border-t">
            <Button
              variant="ghost"
              onClick={() => navigate(`/assets/${asset.id}`)}
              className="w-full h-12 text-base"
            >
              View Full Asset Details
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QRScanHandler; 