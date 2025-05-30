import { useState, useEffect, useRef } from "react";
import { 
  QrCode, 
  Download, 
  Printer, 
  Copy, 
  ExternalLink,
  Loader2,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { generateMobileAssetQR, logQRGeneration, type AssetQRData } from "@/services/qrService";
import { useAuth } from "@/hooks/useAuth";

interface MobileQRCodeDisplayProps {
  assetId: string;
  assetName: string;
  size?: 'small' | 'medium' | 'large';
  showControls?: boolean;
  className?: string;
}

const MobileQRCodeDisplay = ({ 
  assetId, 
  assetName, 
  size = 'medium',
  showControls = true,
  className = ''
}: MobileQRCodeDisplayProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [qrData, setQrData] = useState<AssetQRData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Size configurations
  const sizeConfig = {
    small: { width: 150, padding: 'p-3' },
    medium: { width: 250, padding: 'p-4' },
    large: { width: 350, padding: 'p-6' }
  };

  const config = sizeConfig[size];

  useEffect(() => {
    generateQR();
  }, [assetId]);

  const generateQR = async () => {
    try {
      setIsLoading(true);
      
      const qr = await generateMobileAssetQR(assetId, {
        width: config.width,
        errorCorrectionLevel: 'M'
      });

      if (qr) {
        setQrData(qr);
        
        // Log QR generation
        if (user?.id) {
          await logQRGeneration(assetId, user.id);
        }
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to generate QR code for this asset.",
        });
      }
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate QR code. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    await generateQR();
    setIsRegenerating(false);
    
    toast({
      title: "QR Code Regenerated",
      description: "Mobile QR code has been updated.",
    });
  };

  const handleDownload = () => {
    if (!qrData) return;

    const link = document.createElement('a');
    link.download = `${assetName}-mobile-qr.png`;
    link.href = qrData.qr_data_url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "QR Code Downloaded",
      description: "QR code image has been saved to your downloads.",
    });
  };

  const handlePrint = () => {
    if (!qrData) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Mobile QR Code - ${assetName}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
            }
            .qr-container {
              text-align: center;
              border: 2px solid #000;
              padding: 20px;
              border-radius: 8px;
            }
            .asset-name {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .instructions {
              font-size: 12px;
              color: #666;
              margin-top: 10px;
              max-width: 300px;
              line-height: 1.4;
            }
            img {
              max-width: 100%;
              height: auto;
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <div class="asset-name">${assetName}</div>
            <img src="${qrData.qr_data_url}" alt="Mobile QR Code" />
            <div class="instructions">
              Scan this QR code with your mobile device to access the asset workflow.
              Enter your PIN when prompted to continue.
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.print();
    printWindow.close();

    toast({
      title: "QR Code Print",
      description: "Print dialog opened for QR code.",
    });
  };

  const handleCopyUrl = async () => {
    if (!qrData) return;

    try {
      await navigator.clipboard.writeText(qrData.mobile_url);
      toast({
        title: "URL Copied",
        description: "Mobile workflow URL copied to clipboard.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Copy Failed",
        description: "Failed to copy URL to clipboard.",
      });
    }
  };

  const handleOpenMobile = () => {
    if (!qrData) return;
    window.open(qrData.mobile_url, '_blank');
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className={`${config.padding} flex items-center justify-center`}>
          <div className="flex flex-col items-center space-y-2">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <p className="text-sm text-gray-600">Generating QR code...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!qrData) {
    return (
      <Card className={className}>
        <CardContent className={`${config.padding} flex items-center justify-center`}>
          <div className="text-center">
            <QrCode className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-600">Failed to generate QR code</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={generateQR}
            >
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center text-sm">
          <QrCode className="h-4 w-4 mr-2" />
          Mobile QR Code
        </CardTitle>
      </CardHeader>
      <CardContent className={config.padding}>
        {/* QR Code Display */}
        <div className="flex justify-center mb-4">
          <div className="bg-white p-4 rounded-lg border">
            <img
              src={qrData.qr_data_url}
              alt={`Mobile QR Code for ${assetName}`}
              className="max-w-full h-auto"
              style={{ width: config.width }}
            />
          </div>
        </div>

        {/* Asset Info */}
        <div className="text-center mb-4">
          <p className="font-medium text-sm">{assetName}</p>
          <p className="text-xs text-gray-500">Scan to access mobile workflow</p>
        </div>

        {/* Controls */}
        {showControls && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="text-xs"
              >
                <Download className="h-3 w-3 mr-1" />
                Download
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="text-xs"
              >
                <Printer className="h-3 w-3 mr-1" />
                Print
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyUrl}
                className="text-xs"
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy URL
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenMobile}
                className="text-xs"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Test
              </Button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleRegenerate}
              disabled={isRegenerating}
              className="w-full text-xs"
            >
              {isRegenerating ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3 mr-1" />
              )}
              Regenerate
            </Button>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </CardContent>
    </Card>
  );
};

export default MobileQRCodeDisplay; 