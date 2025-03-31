
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Barcode, Camera, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";

const BarcodeScanner = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [barcode, setBarcode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [searchResult, setSearchResult] = useState<any | null>(null);

  // Mock function to search for item by barcode
  const searchByBarcode = (code: string) => {
    // In a real app, this would be an API call
    const mockItems = [
      { id: 1, name: "Laptop", sku: "TECH-001", barcode: "123456789012", category: "Electronics", quantity: 12 },
      { id: 2, name: "Monitor", sku: "TECH-005", barcode: "987654321098", category: "Electronics", quantity: 8 },
    ];
    
    return new Promise<any>((resolve) => {
      setTimeout(() => {
        const found = mockItems.find(item => item.barcode === code);
        resolve(found || null);
      }, 500);
    });
  };

  const startScanner = async () => {
    setScanning(true);
    setScanResult(null);
    setSearchResult(null);

    try {
      const constraints = {
        video: {
          facingMode: "environment"
        }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        
        // In a real app, this would use a barcode scanning library
        // For the demo, we'll simulate a scan after a few seconds
        setTimeout(() => {
          const mockBarcode = "123456789012";
          setScanning(false);
          setScanResult(mockBarcode);
          setBarcode(mockBarcode);
          
          // Stop the video stream
          stream.getTracks().forEach(track => track.stop());
          
          toast({
            title: "Barcode Scanned",
            description: `Scanned barcode: ${mockBarcode}`,
          });
          
          // Search for the item
          searchItem(mockBarcode);
        }, 3000);
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      setScanning(false);
      
      toast({
        variant: "destructive",
        title: "Camera Error",
        description: "Could not access camera. Please check permissions.",
      });
    }
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

  const navigateToItem = (id: number) => {
    navigate(`/inventory/${id}`);
  };

  const navigateToNewItem = () => {
    navigate("/inventory/new", { state: { barcode: scanResult } });
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mr-2">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Barcode Scanner</h1>
          <p className="text-muted-foreground">Scan or search inventory by barcode</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-4">Scan Barcode</h2>
              
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
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-4">Manual Entry</h2>
              <div className="flex space-x-2">
                <Input
                  placeholder="Enter barcode manually"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                />
                <Button onClick={handleManualSearch}>
                  <Search className="h-4 w-4" />
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
                  <p className="text-sm text-muted-foreground mb-1">Scanned Barcode:</p>
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
                          <span>{searchResult.sku}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Category:</span>
                          <span>{searchResult.category}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Quantity:</span>
                          <span>{searchResult.quantity}</span>
                        </div>
                      </div>
                    </div>
                    
                    <Button 
                      className="w-full" 
                      onClick={() => navigateToItem(searchResult.id)}
                    >
                      View Item Details
                    </Button>
                  </div>
                ) : (
                  <div className="mb-4">
                    <div className="border border-dashed rounded-lg p-6 text-center mb-4">
                      <Search className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="mb-1 font-medium">Item Not Found</p>
                      <p className="text-sm text-muted-foreground mb-4">
                        No item found with this barcode
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
                  <p>Scan another barcode or enter manually to search inventory.</p>
                </div>
              </div>
            ) : (
              <div className="border border-dashed rounded-lg p-8 text-center">
                <Barcode className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground mb-2">No barcode scanned yet</p>
                <p className="text-sm text-muted-foreground">
                  Use the scanner or enter a barcode manually
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
