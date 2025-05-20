import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarcodeToggle } from "@/components/inventory/BarcodeToggle";
import { BarcodeGenerator } from "@/components/inventory/BarcodeGenerator";
import { BarcodeRenderer } from "@/components/inventory/BarcodeRenderer";
import { BarcodePreview } from "@/components/inventory/BarcodePreview";
import { BarcodeScanner } from "@/components/inventory/BarcodeScanner";
import { useToast } from "@/hooks/use-toast";
import { Clipboard, Scan, X } from "lucide-react";

export default function BarcodeDemo() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("toggle");
  const [barcodeSettings, setBarcodeSettings] = useState({
    enabled: true,
    type: 'qr',
    prefix: 'DEMO'
  });
  const [generatedBarcode, setGeneratedBarcode] = useState("");
  const [manualBarcode, setManualBarcode] = useState("DEMO-12345");
  const [showScanner, setShowScanner] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState("");
  
  const handleBarcodeSettingsChange = (settings: any) => {
    setBarcodeSettings({
      enabled: settings.enabled,
      type: settings.type,
      prefix: settings.prefix
    });
  };
  
  const handleGeneratedBarcode = (value: string) => {
    setGeneratedBarcode(value);
    toast({
      title: "Barcode Generated",
      description: `New barcode: ${value}`,
    });
  };
  
  const handleBarcodeScan = (value: string) => {
    setScannedBarcode(value);
    toast({
      title: "Barcode Scanned",
      description: `Scanned barcode: ${value}`,
    });
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied to Clipboard",
        description: "Barcode value copied to clipboard",
      });
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  };

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-2">Barcode Component Demo</h1>
      <p className="text-muted-foreground mb-6">
        This page demonstrates the various barcode components available in the application.
      </p>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="toggle">Toggle</TabsTrigger>
          <TabsTrigger value="generator">Generator</TabsTrigger>
          <TabsTrigger value="renderer">Renderer</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="scanner">Scanner</TabsTrigger>
        </TabsList>
        
        <TabsContent value="toggle">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Barcode Toggle</CardTitle>
                </CardHeader>
                <CardContent>
                  <BarcodeToggle
                    enabled={barcodeSettings.enabled}
                    type={barcodeSettings.type}
                    prefix={barcodeSettings.prefix}
                    onBarcodeSettingsChange={handleBarcodeSettingsChange}
                  />
                </CardContent>
              </Card>
            </div>
            
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Current Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="bg-secondary p-4 rounded-md text-sm overflow-auto">
                    {JSON.stringify(barcodeSettings, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="generator">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Barcode Generator</CardTitle>
                </CardHeader>
                <CardContent>
                  <BarcodeGenerator
                    assetTypeId="12345"
                    prefix={barcodeSettings.prefix}
                    barcodeType={barcodeSettings.type as any}
                    onGenerate={handleGeneratedBarcode}
                  />
                </CardContent>
              </Card>
            </div>
            
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Generated Barcode</CardTitle>
                </CardHeader>
                <CardContent>
                  {generatedBarcode ? (
                    <div className="space-y-4">
                      <p className="font-mono text-sm break-all">
                        {generatedBarcode}
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => copyToClipboard(generatedBarcode)}
                      >
                        <Clipboard className="mr-2 h-4 w-4" />
                        Copy to Clipboard
                      </Button>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">
                      Generate a barcode to see it here
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="renderer">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>QR Code</CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center">
                  <div className="space-y-4">
                    <BarcodeRenderer
                      value={manualBarcode}
                      type="qr"
                      width={200}
                      height={200}
                    />
                    <div className="text-center">
                      <Input
                        value={manualBarcode}
                        onChange={(e) => setManualBarcode(e.target.value)}
                        className="text-center mb-2"
                      />
                      <Label className="text-xs text-muted-foreground">
                        Enter a value to render
                      </Label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Code 128</CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center">
                  <div className="space-y-4">
                    <BarcodeRenderer
                      value={manualBarcode}
                      type="code128"
                      width={200}
                      height={200}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Code 39</CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center">
                  <div className="space-y-4">
                    <BarcodeRenderer
                      value={manualBarcode}
                      type="code39"
                      width={200}
                      height={200}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="preview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <BarcodePreview
                value={manualBarcode}
                barcodeType={barcodeSettings.type as any}
                title="Asset Barcode"
                assetName="Demo Asset"
              />
            </div>
            
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Preview Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="barcode-value">Barcode Value</Label>
                      <Input
                        id="barcode-value"
                        value={manualBarcode}
                        onChange={(e) => setManualBarcode(e.target.value)}
                      />
                    </div>
                    
                    <Alert>
                      <AlertTitle>About Previews</AlertTitle>
                      <AlertDescription>
                        The BarcodePreview component is designed to display barcodes on asset detail pages with printing and downloading options.
                      </AlertDescription>
                    </Alert>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="scanner">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              {showScanner ? (
                <div className="relative">
                  <BarcodeScanner
                    onScan={handleBarcodeScan}
                    onClose={() => setShowScanner(false)}
                    title="Scan a Barcode"
                  />
                </div>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Barcode Scanner</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col items-center justify-center space-y-4 py-8">
                      <Scan className="h-16 w-16 text-muted-foreground" />
                      <p className="text-center text-muted-foreground">
                        Start the scanner to scan a barcode or QR code.
                      </p>
                      <Button onClick={() => setShowScanner(true)}>
                        <Scan className="mr-2 h-4 w-4" />
                        Start Scanner
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
            
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Scanned Result</CardTitle>
                </CardHeader>
                <CardContent>
                  {scannedBarcode ? (
                    <div className="space-y-4">
                      <Alert className="bg-primary/10 border-primary/20">
                        <AlertTitle>Barcode Detected</AlertTitle>
                        <AlertDescription className="font-mono break-all">
                          {scannedBarcode}
                        </AlertDescription>
                      </Alert>
                      
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => copyToClipboard(scannedBarcode)}
                        >
                          <Clipboard className="mr-2 h-4 w-4" />
                          Copy
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setScannedBarcode("")}
                        >
                          <X className="mr-2 h-4 w-4" />
                          Clear
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      No barcode has been scanned yet
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 