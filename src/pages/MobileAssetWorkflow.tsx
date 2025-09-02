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
  QrCode,
  RotateCcw
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
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // PIN authentication function
  const authenticateWithPin = async (pin: string, assetId: string): Promise<AuthSession> => {
    // Find user by PIN
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('quick_access_pin', pin)
      .eq('is_deleted', false);

    if (profileError) {
      console.error('Database error:', profileError);
      throw new Error('Authentication failed');
    }
    
    const profileData = profiles && profiles.length > 0 ? profiles[0] : null;
    
    if (!profileData) {
      throw new Error('Invalid PIN code');
    }
    
    // Create a session object with the verified user data
    const session: AuthSession = {
      user_id: profileData.id,
      session_token: 'mobile_session',
      expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      full_name: profileData.full_name || 'Mobile User',
      organization_id: profileData.organization_id,
      role: 'user'
    };
    
    return session;
  };

  // Load asset data on mount
  useEffect(() => {
    if (assetId) {
      loadAssetData();
    }
  }, [assetId]);

  const loadAssetData = async () => {
    try {
      // Loading asset data
      setIsLoading(true);
      
      // First get the asset data - use maybeSingle() to handle missing assets gracefully
      // Fetching asset data
      const { data: assetData, error: assetError } = await supabase
        .from('assets')
        .select('id, name, barcode, asset_type_id, organization_id')
        .eq('id', assetId)
        .eq('is_deleted', false)
        .single();

      if (assetError) {
        console.error('MobileAssetWorkflow - Error fetching asset:', assetError);
        toast({
          variant: "destructive",
          title: "Asset Not Found",
          description: "The asset you're looking for could not be found.",
        });
        return;
      }
      
      if (!assetData) {
        // No asset data returned
        toast({
          variant: "destructive",
          title: "Asset Not Found",
          description: "This QR code doesn't link to a valid asset or you don't have access to it.",
        });
        return;
      }

              // Asset data loaded

      // Then get the asset type info - use maybeSingle() here too
      // Fetching asset type data
      const { data: assetTypeData, error: assetTypeError } = await supabase
        .from('asset_types')
        .select('*')
        .eq('id', assetData.asset_type_id)
        .maybeSingle();

      if (assetTypeError) {
        console.error('MobileAssetWorkflow - Error fetching asset type:', assetTypeError);
        toast({
          variant: "destructive", 
          title: "Asset Type Error",
          description: "Could not load asset type information.",
        });
        return;
      }

              // Asset type data loaded

      // Get linked forms for this asset type from asset_type_forms table
      // Fetching linked forms
      const { data: linkedForms, error: formsError } = await supabase
        .from('asset_type_forms')
        .select('form_id, purpose')
        .eq('asset_type_id', assetData.asset_type_id)
        .eq('organization_id', assetData.organization_id);

      if (formsError) {
        console.error('MobileAssetWorkflow - Error fetching linked forms:', formsError);
        // Don't fail here, continue with no forms
      }

              // Linked forms loaded

      let intakeFormId = null;
      let inventoryFormId = null;

      if (linkedForms) {
        const intakeForm = linkedForms.find(f => f.purpose === 'intake');
        const inventoryForm = linkedForms.find(f => f.purpose === 'inventory');
        
        if (intakeForm) intakeFormId = intakeForm.form_id;
        if (inventoryForm) inventoryFormId = inventoryForm.form_id;
      }
      
      // Form IDs resolved
      
      // Transform the data to match our expected format
      const transformedAssetData: AssetData = {
        asset_id: assetData.id,
        asset_name: assetData.name,
        asset_type_name: assetTypeData?.name || 'Unknown Type',
        organization_id: assetData.organization_id || '',
        barcode: assetData.barcode || '',
        workflow_options: [
          {
            type: 'intake',
            label: 'Intake',
            form_id: intakeFormId,
            available: !!intakeFormId
          },
          {
            type: 'inventory',
            label: 'Inventory', 
            form_id: inventoryFormId,
            available: !!inventoryFormId
          },
          {
            type: 'continue_inventory',
            label: 'Continue Inventory',
            form_id: inventoryFormId,
            available: !!inventoryFormId
          }
        ]
      };
      
      // Setting asset data and moving to PIN step
      setAssetData(transformedAssetData);
      setStep('pin');
    } catch (error) {
      console.error('🚨 MobileAssetWorkflow - Error loading asset data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load asset information.",
      });
    } finally {
      // Setting loading to false
      setIsLoading(false);
    }
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 4) return;

    setIsAuthenticating(true);
    setAuthError(null);

    try {
      const session = await authenticateWithPin(pin, assetId!);
      setAuthSession(session);
      setStep('options');
    } catch (error) {
      console.error('PIN authentication failed:', error);
      setAuthError(error instanceof Error ? error.message : 'Invalid PIN. Please try again.');
      setPin('');
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

    // Navigate to form with QR context
    if (option.form_id) {
      // Determine the form behavior based on type
      const navigationState: any = {
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
      };

      // For different workflow types, determine navigation behavior
      if (option.type === 'intake') {
        // This is "Asset Intake" - create new inventory items
        navigationState.forceNewEntry = true;
        navigationState.action = 'new';
      } else if (option.type === 'inventory') {
        // This is "New Inventory" - always fresh, even if same month
        navigationState.forceNewEntry = true;
        navigationState.action = 'new'; // This will prevent loading existing month data
      } else if (option.type === 'continue_inventory') {
        // This is "Continue Current Inventory" - auto-populate current month data
        navigationState.continueExisting = true;
        navigationState.action = 'continue'; // This will load existing month data if available
      }

      // Navigate to the correct form with mobile QR context
      const queryParams = new URLSearchParams({
        fromMobileQR: 'true',
        type: option.type,
        action: navigationState.action || 'continue'
      });

      navigate(`/forms/submit/${option.form_id}?${queryParams.toString()}`, {
        state: navigationState
      });
    }
  };

  const getOptionIcon = (type: string) => {
    switch (type) {
      case 'intake': return Package;
      case 'inventory': return ClipboardList;
      case 'continue_inventory': return RotateCcw;
      default: return Package;
    }
  };

  const getOptionColor = (type: string) => {
    switch (type) {
      case 'intake': return 'bg-blue-500 hover:bg-blue-600';
      case 'inventory': return 'bg-green-500 hover:bg-green-600';
      case 'continue_inventory': return 'bg-orange-500 hover:bg-orange-600';
      default: return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  const getOptionDescription = (type: string) => {
    switch (type) {
      case 'intake': return 'Add new items';
      case 'inventory': return 'Count inventory';
      case 'continue_inventory': return 'Update this month';
      default: return '';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-8">
        <div className="mx-auto max-w-sm space-y-6 pt-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-6">
              <div className="bg-blue-500 p-3 rounded-2xl shadow-lg">
                <QrCode className="h-8 w-8 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Asset Workflow</h1>
            <p className="text-sm text-gray-600">Mobile QR Code Access</p>
          </div>

          {/* Loading Step */}
          {step === 'loading' && (
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardContent className="flex flex-col items-center py-12">
                <div className="bg-blue-100 p-4 rounded-full mb-4">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Asset Data</h3>
                <p className="text-sm text-gray-600 text-center">
                  Please wait while we retrieve your asset information...
                </p>
              </CardContent>
            </Card>
          )}

          {/* PIN Entry Step */}
          {step === 'pin' && (
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="text-center pb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mx-auto mb-4">
                  <Lock className="h-8 w-8 text-green-600" />
                </div>
                <CardTitle className="text-xl text-gray-900">Enter Your PIN</CardTitle>
                <p className="text-sm text-gray-600 mt-2">
                  Use your 4-digit PIN for quick access
                </p>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <form onSubmit={handlePinSubmit} className="space-y-6">
                  <div className="space-y-4">
                    <Label htmlFor="pin" className="text-sm font-medium text-gray-700">
                      4-Digit PIN Code
                    </Label>
                    <Input
                      id="pin"
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]{4}"
                      maxLength={4}
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="Enter PIN"
                      className="text-center text-2xl tracking-[0.3em] h-14 font-mono bg-gray-50 border-2 focus:border-blue-500 focus:bg-white transition-all duration-200"
                      data-testid="pin-input"
                      autoFocus
                    />
                    {authError && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-sm text-red-600 text-center font-medium">{authError}</p>
                      </div>
                    )}
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full h-12 text-base font-semibold bg-blue-600 hover:bg-blue-700 shadow-lg" 
                    disabled={pin.length !== 4 || isAuthenticating}
                    data-testid="pin-submit"
                  >
                    {isAuthenticating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Authenticating...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Authenticate
                      </>
                    )}
                  </Button>
                  
                  <div className="text-center pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-500 mb-3">Need help?</p>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => navigate('/login')}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Use full login instead
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Footer */}
          <div className="text-center pt-8 pb-4">
            <p className="text-xs text-gray-500">
              Inventory Management System
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-8">
      <div className="mx-auto max-w-sm space-y-6 pt-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-blue-500 p-3 rounded-2xl shadow-lg">
              <QrCode className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Asset Workflow</h1>
          <p className="text-sm text-gray-600">Mobile QR Code Access</p>
        </div>

        {/* Asset & Welcome Card - Options Step Only */}
        {assetData && step === 'options' && authSession && (
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4">
                  <Package className="h-6 w-6 text-blue-600" />
                </div>
                <h2 className="font-bold text-lg text-gray-900 mb-1">{assetData.asset_name}</h2>
                <p className="text-sm text-gray-600 mb-3">{assetData.asset_type_name}</p>
                
                {/* Welcome message - only show if authenticated */}
                {authSession && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                    <div className="flex items-center justify-center mb-1">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                      <span className="text-sm font-medium text-green-800">Welcome, {authSession.full_name}</span>
                    </div>
                    <p className="text-xs text-green-700">Choose an action for this asset</p>
                  </div>
                )}
                
                <div className="inline-block bg-gray-100 px-3 py-1 rounded-full">
                  <p className="text-xs text-gray-500">QR: {assetData.barcode}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading Step */}
        {step === 'loading' && (
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="flex flex-col items-center py-12">
              <div className="bg-blue-100 p-4 rounded-full mb-4">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Asset Data</h3>
              <p className="text-sm text-gray-600 text-center">
                Please wait while we retrieve your asset information...
              </p>
            </CardContent>
          </Card>
        )}

        {/* PIN Entry Step */}
        {step === 'pin' && (
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="p-6">
              {/* Asset name at top */}
              <div className="text-center mb-4">
                <h2 className="font-bold text-lg text-gray-900 mb-1">{assetData?.asset_name}</h2>
                <p className="text-sm text-gray-600">{assetData?.asset_type_name}</p>
              </div>

              {/* PIN Entry Section */}
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Enter Your PIN</h3>
                <p className="text-sm text-gray-600">Use your 4-digit PIN for quick access</p>
              </div>

              <form onSubmit={handlePinSubmit} className="space-y-6">
                <div className="space-y-4">
                  <Label htmlFor="pin" className="text-sm font-medium text-gray-700 text-center block">
                    4-Digit PIN Code
                  </Label>
                  <Input
                    id="pin"
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]{4}"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter PIN"
                    className="text-center text-2xl tracking-[0.3em] h-14 font-mono bg-gray-50 border-2 focus:border-blue-500 focus:bg-white transition-all duration-200"
                    autoFocus
                  />
                  {authError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-sm text-red-600 text-center font-medium">{authError}</p>
                    </div>
                  )}
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full h-12 text-base font-semibold bg-blue-600 hover:bg-blue-700 shadow-lg" 
                  disabled={pin.length !== 4 || isAuthenticating}
                >
                  {isAuthenticating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Authenticating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Authenticate
                    </>
                  )}
                </Button>
                
                <div className="text-center pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-3">Need help?</p>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => navigate('/login')}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Use full login instead
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Workflow Options Step - Action Buttons */}
        {step === 'options' && authSession && assetData && (
          <div className="space-y-4">
            {assetData.workflow_options.map((option, index) => {
              const Icon = getOptionIcon(option.type);
              const colorClass = getOptionColor(option.type);
              const description = getOptionDescription(option.type);
              
              return (
                <Button
                  key={index}
                  onClick={() => handleWorkflowOption(option)}
                  disabled={!option.available}
                  className={`w-full h-auto p-6 ${
                    option.available 
                      ? `${colorClass} shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200` 
                      : 'bg-gray-300 hover:bg-gray-300 cursor-not-allowed'
                  } text-white rounded-xl`}
                  variant="default"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center">
                      <div className="bg-white/20 p-2 rounded-lg mr-4">
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-base">{option.label}</div>
                        <div className="text-sm opacity-90 mt-1">
                          {option.available ? description : 'Not configured'}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 opacity-70" />
                  </div>
                </Button>
              );
            })}

            {/* Help Section */}
            <Card className="shadow-lg border-0 bg-white/60 backdrop-blur-sm mt-8">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-gray-600 mb-2">Need assistance?</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/assets/${assetData.asset_id}`)}
                  className="text-blue-600 hover:text-blue-700 text-sm"
                >
                  View full asset details
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-8 pb-4">
          <p className="text-xs text-gray-500">
            Inventory Management System
          </p>
        </div>
      </div>
    </div>
  );
};

export default MobileAssetWorkflow; 