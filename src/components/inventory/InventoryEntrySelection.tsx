import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { QrCode, Package, Boxes, ArrowRight, Barcode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

import { BarcodeScanner } from "../inventory/BarcodeScanner";

interface InventoryEntrySelectionProps {
  onScanQrCode?: () => void;
  onSelectAssetType?: () => void;
}

export function InventoryEntrySelection({ 
  onScanQrCode, 
  onSelectAssetType 
}: InventoryEntrySelectionProps) {
  const navigate = useNavigate();
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [manualQrCode, setManualQrCode] = useState("");
  const [showManualEntry, setShowManualEntry] = useState(false);

  const handleScanComplete = (result: string) => {
    setShowQrScanner(false);
    if (result) {
      // Navigate to asset detail page or handling function
      navigate(`/assets/scan/${encodeURIComponent(result)}`);
    }
  };

  const handleManualSubmit = () => {
    if (manualQrCode) {
      navigate(`/assets/scan/${encodeURIComponent(manualQrCode)}`);
    }
    setShowManualEntry(false);
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Add Inventory</h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Choose how you'd like to add inventory to your system
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {/* QR Code Scanning Option */}
        <Card className="border-2 hover:border-primary/60 transition-all cursor-pointer">
          <CardHeader className="text-center">
            <div className="mx-auto bg-primary/10 p-4 rounded-full mb-2">
              <QrCode className="h-10 w-10 text-primary" />
            </div>
            <CardTitle>Scan QR Code</CardTitle>
            <CardDescription>
              Quickly add inventory by scanning an asset's QR code
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center text-sm text-muted-foreground">
            <p>Use your camera to scan a QR code from an existing asset</p>
          </CardContent>
          <CardFooter className="flex justify-center gap-2">
            <Button 
              onClick={() => setShowQrScanner(true)}
              className="w-full"
            >
              <Barcode className="mr-2 h-4 w-4" />
              Scan QR Code
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowManualEntry(true)}
              className="w-full"
            >
              Enter Manually
            </Button>
          </CardFooter>
        </Card>

        {/* Asset Type Selection Option */}
        <Card 
          className="border-2 hover:border-primary/60 transition-all cursor-pointer"
          onClick={() => navigate("/inventory/browse-assets")}
        >
          <CardHeader className="text-center">
            <div className="mx-auto bg-primary/10 p-4 rounded-full mb-2">
              <Boxes className="h-10 w-10 text-primary" />
            </div>
            <CardTitle>Select Asset Type</CardTitle>
            <CardDescription>
              Browse and select from your existing asset types
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center text-sm text-muted-foreground">
            <p>Choose an asset type to view and add inventory for specific assets</p>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={() => navigate("/inventory/browse-assets")}>
              <Package className="mr-2 h-4 w-4" />
              Browse Asset Types
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* QR Scanner Dialog */}
      <Dialog open={showQrScanner} onOpenChange={setShowQrScanner}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Scan QR Code</DialogTitle>
            <DialogDescription>
              Position the QR code within the scanner
            </DialogDescription>
          </DialogHeader>
          <div className="aspect-square w-full max-w-sm mx-auto bg-muted rounded-md overflow-hidden">
            <BarcodeScanner onScan={handleScanComplete} />
          </div>
          <DialogFooter className="sm:justify-center">
            <Button variant="outline" onClick={() => setShowQrScanner(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Entry Dialog */}
      <Dialog open={showManualEntry} onOpenChange={setShowManualEntry}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enter QR Code Manually</DialogTitle>
            <DialogDescription>
              Input the QR code value if scanning is not working
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="qrCode">QR Code Value</Label>
              <Input
                id="qrCode"
                placeholder="Enter QR code value"
                value={manualQrCode}
                onChange={(e) => setManualQrCode(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowManualEntry(false)}>
              Cancel
            </Button>
            <Button onClick={handleManualSubmit} disabled={!manualQrCode}>
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 