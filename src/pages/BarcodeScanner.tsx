import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Barcode, Camera, Search, BoxIcon, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { 
  getInventoryItemByBarcode, 
  getAssetFormsByBarcode,
  getAssetWithFormulasByBarcode 
} from "@/services/inventoryService";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Separator } from "@/components/ui/separator";

const BarcodeScanner = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentOrganization } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [barcode, setBarcode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [searchResult, setSearchResult] = useState<any | null>(null);
  const [assetForms, setAssetForms] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const searchByBarcode = async (code: string) => {
    if (!currentOrganization?.id) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No organization selected",
      });
      return null;
    }
    
    try {
      setIsLoading(true);
      const result = await getInventoryItemByBarcode(currentOrganization.id, code);
      
      // Also get the associated forms and calculation formulas for this asset
      if (result) {
        const assetData = await getAssetWithFormulasByBarcode(supabase, code);
        setAssetForms(assetData);
      }
      
      return result;
    } catch (error) {
      console.error("Error searching for item:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to search for item",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const startScanner = async () => {
    setScanning(true);
    setScanResult(null);
    setSearchResult(null);

    try {
      // Check if mediaDevices API is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API is not available in this browser or context. Try using HTTPS or check browser permissions.");
      }
      
      const constraints = {
        video: {
          facingMode: "environment"
        }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        
        // In a real implementation, you would use a barcode scanning library like quagga.js here
        // This is a placeholder for manual testing - scanning would actually be handled by a library
        toast({
          title: "Scanner Started",
          description: "In a real app, scanning would happen automatically",
        });
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      setScanning(false);
      
      toast({
        variant: "destructive",
        title: "Camera Error",
        description: error instanceof Error && error.message 
          ? error.message 
          : "Could not access camera. Please check permissions or try using the manual entry option below.",
      });
    }
  };
  
  // This function would be called by the barcode scanning library when a barcode is detected
  const onBarcodeDetected = (detectedBarcode: string) => {
    setScanning(false);
    setScanResult(detectedBarcode);
    setBarcode(detectedBarcode);
    
    // Stop the video stream
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    
    toast({
      title: "Barcode Scanned",
      description: `Scanned barcode: ${detectedBarcode}`,
    });
    
    // Search for the item
    searchItem(detectedBarcode);
  };

  const searchItem = async (code: string) => {
    const result = await searchByBarcode(code);
    setSearchResult(result);
    
    if (result) {
      toast({
        title: "Item Found",
        description: `Found ${result.name} in inventory`,
      });
    } else {
      toast({
        title: "Item Not Found",
        description: "No matching item found for this barcode",
      });
    }
  };

  const handleManualSearch = async () => {
    if (!barcode.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a barcode",
      });
      return;
    }
    
    setScanResult(barcode);
    await searchItem(barcode);
  };

  const navigateToItem = (id: string) => {
    // This should navigate to inventory item detail - keep legacy route for now
    // since we don't have asset_id context here
    navigate(`/inventory/item/${id}`);
  };

  const navigateToNewItem = () => {
    // Redirect to asset creation since direct inventory creation is deprecated
    navigate("/assets/new", { state: { barcode: scanResult } });
  };

  const navigateToIntakeForm = () => {
    if (!assetForms || !assetForms.intake_form_id) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No intake form configured for this asset type",
      });
      return;
    }
    
    navigate(`/forms/submit/${assetForms.intake_form_id}`, {
      state: {
        assetId: assetForms.asset_id,
        assetName: assetForms.asset_name,
        formType: 'intake',
        assetTypeId: assetForms.asset_type_id,
        calculationFormulas: assetForms.calculation_formulas || {},
        prefillData: {
          asset_id: assetForms.asset_id,
          asset_name: assetForms.asset_name,
          asset_type: assetForms.asset_type_name,
          barcode: assetForms.barcode,
          ...assetForms.form_data
        }
      }
    });
  };

  const navigateToInventoryForm = () => {
    if (!assetForms || !assetForms.inventory_form_id) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No inventory form configured for this asset type",
      });
      return;
    }
    
    navigate(`/forms/submit/${assetForms.inventory_form_id}`, {
      state: {
        assetId: assetForms.asset_id,
        assetName: assetForms.asset_name,
        formType: 'inventory',
        assetTypeId: assetForms.asset_type_id,
        calculationFormulas: assetForms.calculation_formulas || {},
        prefillData: {
          asset_id: assetForms.asset_id,
          asset_name: assetForms.asset_name,
          asset_type: assetForms.asset_type_name,
          barcode: assetForms.barcode,
          ...assetForms.form_data
        }
      }
    });
  };

  // Cleanup function for the video stream
  useEffect(() => {
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // For testing purposes - simulates a QR code scan
  const simulateScan = () => {
    // Show a loading state to simulate scanning
    setScanning(true);
    
    // Use the manually entered barcode if available, otherwise use a test value
    const testBarcode = barcode.trim() || "TEST-QR-12345";
    
    // Simulate scan delay
    setTimeout(() => {
      setScanning(false);
      onBarcodeDetected(testBarcode);
      
      toast({
        title: "Test Scan Completed",
        description: `This is a simulated scan using "${testBarcode}"`,
      });
    }, 1500);
  };

  // Add an effect to check camera support on component mount
  useEffect(() => {
    const checkCameraSupport = () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        // Camera API not available in this environment
        toast({
          variant: "default",
          title: "Camera Not Available",
          description: "The camera feature isn't available in this environment. You can still use manual entry below.",
        });
      }
    };
    
    checkCameraSupport();
  }, [toast]);

  return (
    <div className="animate-fade-in">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mr-2">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">QR Code Scanner</h1>
          <p className="text-muted-foreground">Scan assets to access inventory forms</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-4">Scan QR Code</h2>
              
              <div className="bg-muted rounded-lg overflow-hidden mb-4 relative">
                {scanning ? (
                  <>
                    <video 
                      ref={videoRef} 
                      className="w-full h-64 object-cover"
                      playsInline
                    />
                    <div className="absolute inset-0 border-4 border-primary/50 rounded-lg pointer-events-none" />
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-1 bg-primary/70" />
                    <div className="absolute top-0 left-0 right-0 p-2 bg-black/50 text-white text-sm text-center">
                      Position barcode in center
                    </div>
                    
                    {/* Test button for simulation */}
                    <Button 
                      className="absolute bottom-2 right-2"
                      variant="secondary"
                      size="sm"
                      onClick={simulateScan}
                    >
                      Simulate Scan
                    </Button>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-64 bg-muted">
                    <div className="text-center">
                      <Barcode className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-muted-foreground">Camera preview will appear here</p>
                    </div>
                  </div>
                )}
                <canvas ref={canvasRef} className="hidden" />
              </div>
              
              <Button 
                onClick={startScanner} 
                disabled={scanning} 
                className="w-full"
              >
                <Camera className="mr-2 h-4 w-4" />
                {scanning ? "Scanning..." : "Start Scanner"}
              </Button>
              
              {!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia ? (
                <div className="mt-3">
                  <div className="text-sm text-amber-600 text-center mb-3">
                    Camera access may not be available in this environment. Please use manual entry below.
                  </div>
                  
                  <Button 
                    onClick={simulateScan}
                    variant="outline"
                    className="w-full"
                  >
                    <Barcode className="mr-2 h-4 w-4" />
                    Simulate QR Scan
                  </Button>
                </div>
              ) : null}
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-4">Manual Entry</h2>
              <div className="flex space-x-2">
                <Input
                  placeholder="Enter QR code manually"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                />
                <Button onClick={handleManualSearch} disabled={isLoading}>
                  {isLoading ? <span className="animate-spin">↻</span> : <Search className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">Scan Results</h2>
            
            {scanResult ? (
              <div>
                <div className="mb-4 p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Scanned QR Code:</p>
                  <div className="flex items-center">
                    <Barcode className="h-5 w-5 mr-2 text-primary" />
                    <p className="font-mono font-semibold">{scanResult}</p>
                  </div>
                </div>
                
                {searchResult ? (
                  <div className="mb-4">
                    <div className="border rounded-lg p-4 mb-4">
                      <h3 className="font-semibold text-lg mb-2">{searchResult.name}</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">SKU:</span>
                          <span>{searchResult.sku || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Quantity:</span>
                          <span>{searchResult.quantity}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Status:</span>
                          <span>{searchResult.status || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <Button 
                        className="w-full" 
                        onClick={() => navigateToItem(searchResult.id)}
                        variant="outline"
                      >
                        View Item Details
                      </Button>
                      
                      <Separator />
                      
                      <h4 className="font-medium text-center">Select Form Action</h4>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <Button 
                          onClick={navigateToIntakeForm}
                          variant="default"
                          disabled={!assetForms || !assetForms.intake_form_id}
                          className="h-auto py-4"
                        >
                          <div className="flex flex-col items-center">
                            <BoxIcon className="h-8 w-8 mb-2" />
                            <span>Intake</span>
                            <span className="text-xs opacity-80">Add to Stock</span>
                          </div>
                        </Button>
                        
                        <Button 
                          onClick={navigateToInventoryForm}
                          variant="default"
                          disabled={!assetForms || !assetForms.inventory_form_id}
                          className="h-auto py-4"
                        >
                          <div className="flex flex-col items-center">
                            <ClipboardList className="h-8 w-8 mb-2" />
                            <span>Monthly Inventory</span>
                            <span className="text-xs opacity-80">Take Stock</span>
                          </div>
                        </Button>
                      </div>
                      
                      {!assetForms || (!assetForms.intake_form_id && !assetForms.inventory_form_id) ? (
                        <div className="text-sm text-amber-600 text-center">
                          This asset type doesn't have forms configured. Contact your administrator.
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="mb-4">
                    <div className="border border-dashed rounded-lg p-6 text-center mb-4">
                      <Search className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="mb-1 font-medium">Item Not Found</p>
                      <p className="text-sm text-muted-foreground mb-4">
                        No item found with this QR code
                      </p>
                      <Button 
                        variant="outline" 
                        onClick={navigateToNewItem}
                      >
                        Create New Item
                      </Button>
                    </div>
                  </div>
                )}
                
                <div className="text-sm text-muted-foreground">
                  <p>Scan another QR code or enter manually to search inventory.</p>
                </div>
              </div>
            ) : (
              <div className="border border-dashed rounded-lg p-8 text-center">
                <Barcode className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground mb-2">No QR code scanned yet</p>
                <p className="text-sm text-muted-foreground">
                  Use the scanner or enter a QR code manually
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BarcodeScanner;
