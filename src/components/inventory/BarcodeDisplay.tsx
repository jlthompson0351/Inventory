import { useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { useBarcode } from "react-barcodes";
import { Printer, QrCode, RefreshCw, Barcode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { generateAssetBarcode } from "@/services/inventoryService";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface BarcodeDisplayProps {
  assetId: string;
  barcode?: string | null;
  barcodeType?: string;
  name: string;
  onBarcodeUpdate?: (barcode: string) => void;
}

export function BarcodeDisplay({
  assetId,
  barcode,
  barcodeType = "qr",
  name,
  onBarcodeUpdate,
}: BarcodeDisplayProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentBarcode, setCurrentBarcode] = useState(barcode || "");
  const [currentType, setCurrentType] = useState(barcodeType);
  const { toast } = useToast();

  // For linear barcodes (CODE128, CODE39)
  const { inputRef } = useBarcode({
    value: currentBarcode || "No barcode assigned",
    options: {
      format: currentType === "code39" ? "CODE39" : "CODE128",
      displayValue: true,
      height: 80,
      width: 2,
      margin: 10,
    },
  });

  const generateNewBarcode = async () => {
    try {
      setIsGenerating(true);
      const newBarcode = await generateAssetBarcode(
        supabase,
        assetId,
        currentType
      );

      if (newBarcode) {
        setCurrentBarcode(newBarcode);
        if (onBarcodeUpdate) {
          onBarcodeUpdate(newBarcode);
        }
        toast({
          title: "Barcode Generated",
          description: "New barcode has been created for this asset",
        });
      }
    } catch (error) {
      console.error("Error generating barcode:", error);
      toast({
        title: "Error",
        description: "Failed to generate barcode",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const printBarcode = () => {
    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      toast({
        title: "Error",
        description: "Could not open print window. Please check your popup settings.",
        variant: "destructive",
      });
      return;
    }

    // Get the barcode element
    const barcodeEl = currentType === "qr" 
      ? document.getElementById("asset-qrcode")
      : document.getElementById("asset-barcode");
      
    if (!barcodeEl) {
      toast({
        title: "Error",
        description: "Barcode element not found",
        variant: "destructive",
      });
      return;
    }

    // Create print content
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Barcode: ${name}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              padding: 20px;
            }
            .barcode-container {
              margin: 30px auto;
              padding: 20px;
              border: 1px solid #ccc;
              max-width: 300px;
            }
            .asset-name {
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .barcode-id {
              font-size: 12px;
              color: #666;
              margin-top: 10px;
            }
          </style>
        </head>
        <body>
          <div class="barcode-container">
            <div class="asset-name">${name}</div>
            ${barcodeEl.outerHTML}
            <div class="barcode-id">${currentBarcode}</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  return (
    <Card className="w-full">
      <CardContent className="p-4 text-center">
        <div className="mb-2 text-sm font-medium">{currentType === "qr" ? "QR Code" : "Barcode"}</div>
        
        {!currentBarcode ? (
          <div className="h-40 flex items-center justify-center border rounded-md">
            <div className="text-muted-foreground text-sm">
              No barcode assigned
            </div>
          </div>
        ) : currentType === "qr" ? (
          <div className="flex justify-center py-4">
            <QRCodeCanvas
              id="asset-qrcode"
              value={currentBarcode}
              size={150}
              level="M"
              includeMargin
            />
          </div>
        ) : (
          <div className="flex justify-center py-4">
            <svg id="asset-barcode" ref={inputRef} />
          </div>
        )}
        
        <div className="text-xs text-muted-foreground mt-2">
          {currentBarcode || "Generate a barcode for this asset"}
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between p-4 pt-0">
        <Button
          variant="outline"
          size="sm"
          onClick={generateNewBarcode}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              {currentBarcode ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Regenerate
                </>
              ) : (
                <>
                  {currentType === "qr" ? (
                    <QrCode className="mr-2 h-4 w-4" />
                  ) : (
                    <Barcode className="mr-2 h-4 w-4" />
                  )}
                  Generate
                </>
              )}
            </>
          )}
        </Button>
        
        {currentBarcode && (
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={printBarcode}
            disabled={isGenerating}
          >
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        )}
      </CardFooter>
    </Card>
  );
} 