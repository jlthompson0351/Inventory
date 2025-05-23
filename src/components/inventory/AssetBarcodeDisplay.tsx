import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Download } from "lucide-react";
import { BarcodeService } from '@/services/barcodeService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

interface AssetBarcodeDisplayProps {
  assetId: string;
}

export function AssetBarcodeDisplay({ assetId }: AssetBarcodeDisplayProps) {
  const [barcodeData, setBarcodeData] = useState<{
    barcode: string;
    barcode_type: string;
    name: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [barcodeElement, setBarcodeElement] = useState<React.ReactNode | null>(null);
  
  useEffect(() => {
    const fetchBarcodeData = async () => {
      try {
        const { data, error } = await supabase
          .rpc('get_asset_barcode_data', { p_asset_id: assetId });
        
        if (error) {
          throw error;
        }
        
        if (data && typeof data === 'object' && 'barcode' in data) {
          const barcodeInfo = data as { barcode: string; barcode_type: string; name: string };
          setBarcodeData(barcodeInfo);
          generateBarcodeElement(barcodeInfo.barcode, barcodeInfo.barcode_type);
        }
      } catch (error: any) {
        console.error('Error fetching barcode data:', error);
        toast({
          title: 'Error',
          description: `Failed to fetch barcode data: ${error.message}`,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchBarcodeData();
  }, [assetId]);
  
  const generateBarcodeElement = (barcode: string, type: string) => {
    if (!barcode) return;
    
    if (type === 'qr') {
      // For QR codes, encode a URL that can be scanned on mobile
      const baseUrl = window.location.origin;
      const qrData = JSON.stringify({ assetId, barcode });
      const encodedData = btoa(qrData);
      const qrValue = `${baseUrl}/qr/${encodedData}`;
      
      const element = BarcodeService.generateQRCode(qrValue, { size: 200 });
      setBarcodeElement(element);
    } else {
      const element = BarcodeService.generateBarcode(barcode, {
        format: 'CODE128',
        height: 80,
        width: 2,
        displayValue: true,
      });
      setBarcodeElement(element);
    }
  };
  
  const handleDownload = async () => {
    if (!barcodeData?.barcode) return;
    
    try {
      let dataUrl;
      
      if (barcodeData.barcode_type === 'qr') {
        // For QR codes, encode the URL
        const baseUrl = window.location.origin;
        const qrData = JSON.stringify({ assetId, barcode: barcodeData.barcode });
        const encodedData = btoa(qrData);
        const qrValue = `${baseUrl}/qr/${encodedData}`;
        
        dataUrl = await BarcodeService.generateQRCodeDataURL(qrValue, { size: 300 });
      } else {
        dataUrl = await BarcodeService.generateBarcodeDataURL(barcodeData.barcode, {
          format: 'CODE128',
          height: 100,
          width: 2,
          displayValue: true,
        });
      }
      
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `asset-${assetId}-barcode.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: 'Success',
        description: 'Barcode downloaded successfully',
      });
    } catch (error) {
      console.error('Error downloading barcode:', error);
      toast({
        title: 'Error',
        description: 'Failed to download barcode',
        variant: 'destructive',
      });
    }
  };
  
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Asset Barcode</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-4">
          <Skeleton className="h-[200px] w-[200px]" />
          <Skeleton className="h-10 w-32" />
        </CardContent>
      </Card>
    );
  }
  
  if (!barcodeData?.barcode) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Asset Barcode</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground my-4">No barcode available for this asset.</p>
          <p className="text-sm">Barcodes must be enabled on the asset type.</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Asset Barcode</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center space-y-4">
        <div className="bg-white p-4 border rounded">
          {barcodeElement}
        </div>
        <div className="text-center mb-2">          <p className="text-sm text-muted-foreground">Barcode: {barcodeData.barcode}</p>          <p className="text-xs text-muted-foreground mt-1">Type: {barcodeData.barcode_type.toUpperCase()}</p>          {barcodeData.barcode_type === 'qr' && (            <p className="text-xs text-primary mt-2">              📱 Scan with your phone for quick access            </p>          )}        </div>
        <Button onClick={handleDownload} className="flex items-center">
          <Download className="mr-2 h-4 w-4" />
          Download Barcode
        </Button>
      </CardContent>
    </Card>
  );
} 