import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  Smartphone, 
  Package, 
  ClipboardList, 
  CheckCircle, 
  Lock,
  Loader2,
  ArrowRight,
  QrCode
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AssetData {
  asset_id: string;
  asset_name: string;
  asset_type_name: string;
  organization_id: string;
  barcode: string;
  workflow_options: Array<{
    type: string;
    label: string;
    form_id: string | null;
    available: boolean;
  }>;
}

interface AuthSession {
  user_id: string;
  session_token: string;
  expires_at: string;
  full_name: string;
  organization_id: string;
  role: string;
}

const MobileAssetWorkflow = () => {
  const { assetId } = useParams<{ assetId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [step, setStep] = useState<'loading' | 'pin' | 'options'>('loading');
  const [pin, setPin] = useState("");
  const [assetData, setAssetData] = useState<AssetData | null>(null);
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load asset data on mount
  useEffect(() => {
    if (assetId) {
      loadAssetData();
    }
  }, [assetId]);

  const loadAssetData = async () => {
    try {
      setIsLoading(true);
      
      // First get the asset data
      const { data: assetData, error: assetError } = await supabase
        .from('assets')
        .select('id, name, barcode, asset_type_id')
        .eq('id', assetId)
        .eq('is_deleted', false)
        .single();

      if (assetError) throw assetError;
      
      if (!assetData) {
        toast({
          variant: "destructive",
          title: "Asset Not Found",
          description: "This QR code doesn't link to a valid asset.",
        });
        return;
      }

      // Then get the asset type info
      const { data: assetTypeData, error: assetTypeError } = await supabase
        .from('asset_types')
        .select('id, name, intake_form_id, inventory_form_id')
        .eq('id', assetData.asset_type_id)
        .single();

      if (assetTypeError) throw assetTypeError;
      
      // Transform the data to match our expected format
      const transformedAssetData: AssetData = {
        asset_id: assetData.id,
        asset_name: assetData.name,
        asset_type_name: assetTypeData?.name || 'Unknown Type',
        organization_id: '',
        barcode: assetData.barcode || '',
        workflow_options: [
          {
            type: 'intake',
            label: 'Asset Intake',
            form_id: assetTypeData?.intake_form_id || null,
            available: !!assetTypeData?.intake_form_id
          },
          {
            type: 'inventory',
            label: 'Inventory Check', 
            form_id: assetTypeData?.inventory_form_id || null,
            available: !!assetTypeData?.inventory_form_id
          }
        ]
      };
      
      setAssetData(transformedAssetData);
      setStep('pin');
    } catch (error) {
      console.error('Error loading asset data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load asset information.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (pin.length !== 4) {
      toast({
        variant: "destructive",
        title: "Invalid PIN",
        description: "Please enter a 4-digit PIN.",
      });
      return;
    }

    try {
      setIsAuthenticating(true);
      
      // Use a more basic approach to avoid TypeScript issues
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('quick_access_pin', pin);

      if (profileError) {
        console.error('Database error:', profileError);
        throw profileError;
      }
      
      const profileData = profiles && profiles.length > 0 ? profiles[0] : null;
      
      if (!profileData) {
        toast({
          variant: "destructive",
          title: "Authentication Failed",
          description: "Invalid PIN code. Please try again.",
        });
        setPin("");
        return;
      }
      
      // Create a session object with the verified user data
      const session: AuthSession = {
        user_id: profileData.id,
        session_token: 'mobile_session',
        expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        full_name: profileData.full_name || 'Mobile User',
        organization_id: 'current',
        role: 'user'
      };
      
      setAuthSession(session);
      setStep('options');
      
      toast({
        title: "Authentication Successful",
        description: `Welcome, ${session.full_name}!`,
      });
    } catch (error) {
      console.error('Error authenticating PIN:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Authentication failed. Please try again.",
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleWorkflowOption = (option: any) => {
    if (!option.available) {
      toast({
        variant: "destructive",
        title: "Option Unavailable",
        description: "This workflow option is not configured for this asset type.",
      });
      return;
    }

    if (option.type === 'complete_monthly') {
      toast({
        title: "Feature Coming Soon",
        description: "Month completion feature will be available soon.",
      });
      return;
    }

    // Navigate to form with QR context
    if (option.form_id) {
      navigate(`/forms/submit/${option.form_id}`, {
        state: {
          assetId: assetData?.asset_id,
          assetName: assetData?.asset_name,
          formType: option.type,
          fromMobileQR: true,
          authSession: authSession,
          prefillData: {
            asset_id: assetData?.asset_id,
            asset_name: assetData?.asset_name,
            asset_type: assetData?.asset_type_name,
            barcode: assetData?.barcode
          }
        }
      });
    }
  };

  const getOptionIcon = (type: string) => {
    switch (type) {
      case 'intake': return Package;
      case 'inventory': return ClipboardList;
      case 'complete_monthly': return CheckCircle;
      default: return Package;
    }
  };

  const getOptionColor = (type: string) => {
    switch (type) {
      case 'intake': return 'bg-blue-500 hover:bg-blue-600';
      case 'inventory': return 'bg-green-500 hover:bg-green-600';
      case 'complete_monthly': return 'bg-purple-500 hover:bg-purple-600';
      default: return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <p className="text-center text-gray-600">Loading asset information...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-md space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <QrCode className="h-8 w-8 text-blue-500 mr-2" />
            <h1 className="text-2xl font-bold text-gray-900">Asset Workflow</h1>
          </div>
          
          {assetData && (
            <div className="bg-white rounded-lg p-4 border">
              <h2 className="font-semibold text-lg text-gray-900">{assetData.asset_name}</h2>
              <p className="text-sm text-gray-600">{assetData.asset_type_name}</p>
              <p className="text-xs text-gray-500 mt-1">QR: {assetData.barcode}</p>
            </div>
          )}
        </div>

        {/* PIN Entry Step */}
        {step === 'pin' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Lock className="h-5 w-5 mr-2" />
                Enter Your PIN
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePinSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="pin">4-Digit PIN Code</Label>
                  <Input
                    id="pin"
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter PIN"
                    className="text-center text-2xl tracking-widest"
                    autoFocus
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={pin.length !== 4 || isAuthenticating}
                >
                  {isAuthenticating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Authenticating...
                    </>
                  ) : (
                    'Authenticate'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Workflow Options Step */}
        {step === 'options' && authSession && assetData && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Smartphone className="h-5 w-5 mr-2" />
                  Welcome, {authSession.full_name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Choose an action for this asset:
                </p>
              </CardContent>
            </Card>

            <div className="space-y-3">
              {assetData.workflow_options.map((option, index) => {
                const Icon = getOptionIcon(option.type);
                const colorClass = getOptionColor(option.type);
                
                return (
                  <Button
                    key={index}
                    onClick={() => handleWorkflowOption(option)}
                    disabled={!option.available}
                    className={`w-full h-auto p-6 ${option.available ? colorClass : 'bg-gray-300 hover:bg-gray-300'} text-white`}
                    variant="default"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center">
                        <Icon className="h-6 w-6 mr-3" />
                        <div className="text-left">
                          <div className="font-semibold">{option.label}</div>
                          {!option.available && (
                            <div className="text-xs opacity-75">Not configured</div>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5" />
                    </div>
                  </Button>
                );
              })}
            </div>

            <div className="text-center pt-4">
              <p className="text-xs text-gray-500">
                Session expires at {new Date(authSession.expires_at).toLocaleTimeString()}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MobileAssetWorkflow; 