import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Copy, Share2, Printer } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface Asset {
  id: string;
  name: string;
  description?: string;
  serial_number?: string;
  asset_type?: {
    name: string;
    color: string;
  };
}

interface AssetQRDisplayProps {
  asset: Asset;
  qrData?: string;
  size?: number;
}

export default function AssetQRDisplay({ 
  asset, 
  qrData, 
  size = 200 
}: AssetQRDisplayProps) {
  const [copied, setCopied] = useState(false);

  // Generate QR data if not provided
  const qrCodeData = qrData || `${window.location.origin}/assets/${asset.id}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(qrCodeData);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleDownloadQR = () => {
    const svg = document.querySelector('#qr-code svg');
    if (svg) {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        
        const link = document.createElement('a');
        link.download = `${asset.name}-qr-code.png`;
        link.href = canvas.toDataURL();
        link.click();
      };
      
      img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const qrElement = document.querySelector('#qr-code');
      if (qrElement) {
        printWindow.document.write(`
          <html>
            <head>
              <title>QR Code - ${asset.name}</title>
              <style>
                body { 
                  font-family: Arial, sans-serif; 
                  text-align: center; 
                  padding: 20px; 
                }
                .qr-container { 
                  display: inline-block; 
                  border: 2px solid #000; 
                  padding: 20px; 
                  margin: 20px;
                }
                .asset-info { 
                  margin-top: 15px; 
                  font-size: 14px;
                }
              </style>
            </head>
            <body>
              <div class="qr-container">
                ${qrElement.innerHTML}
                <div class="asset-info">
                  <strong>${asset.name}</strong><br/>
                  ${asset.serial_number ? `S/N: ${asset.serial_number}` : ''}<br/>
                  Asset ID: ${asset.id.slice(0, 8)}
                </div>
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Asset QR Code</CardTitle>
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">{asset.name}</h3>
          {asset.asset_type && (
            <Badge 
              variant="outline"
              style={{ 
                borderColor: asset.asset_type.color,
                color: asset.asset_type.color 
              }}
            >
              {asset.asset_type.name}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* QR Code Display */}
        <div className="flex justify-center">
          <div 
            id="qr-code"
            className="p-4 bg-white rounded-lg border-2 border-gray-200"
          >
            <QRCodeSVG
              value={qrCodeData}
              size={size}
              level="M"
              includeMargin={true}
              bgColor="#ffffff"
              fgColor="#000000"
            />
          </div>
        </div>

        {/* Asset Information */}
        <div className="text-center space-y-2">
          {asset.description && (
            <p className="text-sm text-muted-foreground">
              {asset.description}
            </p>
          )}
          {asset.serial_number && (
            <p className="text-sm">
              <span className="font-medium">Serial Number:</span> {asset.serial_number}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Asset ID: {asset.id}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            className="gap-2"
          >
            <Copy className="h-4 w-4" />
            {copied ? "Copied!" : "Copy Link"}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadQR}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Download
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="gap-2"
          >
            <Printer className="h-4 w-4" />
            Print
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: `QR Code - ${asset.name}`,
                  text: `Asset: ${asset.name}`,
                  url: qrCodeData
                });
              }
            }}
            className="gap-2"
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </div>

        {/* QR Code URL Display */}
        <div className="p-3 bg-gray-50 rounded-md">
          <p className="text-xs text-muted-foreground mb-1">QR Code Data:</p>
          <p className="text-sm font-mono break-all">{qrCodeData}</p>
        </div>
      </CardContent>
    </Card>
  );
} 