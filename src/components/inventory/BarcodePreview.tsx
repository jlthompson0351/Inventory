import React, { useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Printer, Download } from "lucide-react";
import { BarcodeRenderer } from "./BarcodeRenderer";

export interface BarcodePreviewProps {
  value: string;
  barcodeType?: 'qr' | 'code128' | 'code39';
  title?: string;
  assetName?: string;
  className?: string;
}

export function BarcodePreview({
  value,
  barcodeType = 'qr',
  title = 'Asset Barcode',
  assetName,
  className = '',
}: BarcodePreviewProps) {
  const barcodeRef = useRef<HTMLDivElement>(null);

  const printBarcode = () => {
    if (!barcodeRef.current) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const barcodeHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Barcode - ${assetName || value}</title>
          <style>
            body { margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; }
            .barcode-container { text-align: center; }
            .asset-name { font-size: 16px; font-weight: bold; margin-bottom: 8px; font-family: sans-serif; }
            .value { margin-top: 10px; font-family: monospace; }
            @media print {
              @page { margin: 0; }
              body { margin: 1cm; }
            }
          </style>
        </head>
        <body>
          <div class="barcode-container">
            ${assetName ? `<div class="asset-name">${assetName}</div>` : ''}
            ${barcodeRef.current.innerHTML}
            <div class="value">${value}</div>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `;
    
    printWindow.document.open();
    printWindow.document.write(barcodeHtml);
    printWindow.document.close();
  };

  const downloadBarcode = () => {
    if (!barcodeRef.current) return;
    
    const barcodeElement = barcodeRef.current.querySelector('svg');
    if (!barcodeElement) return;
    
    // Convert SVG to data URL
    const svgData = new XMLSerializer().serializeToString(barcodeElement);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    
    // Create download link
    const downloadLink = document.createElement('a');
    downloadLink.href = svgUrl;
    const filename = assetName 
      ? `barcode-${assetName.toLowerCase().replace(/\s+/g, '-')}.svg`
      : `barcode-${value}.svg`;
    
    downloadLink.download = filename;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(svgUrl);
  };

  if (!value) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground py-6">
          No barcode value available
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-col items-center">
            <div ref={barcodeRef} className="mb-2">
              <BarcodeRenderer
                value={value}
                type={barcodeType}
                width={150}
                height={150}
              />
            </div>
            {assetName && (
              <div className="text-sm font-medium mt-1">{assetName}</div>
            )}
            <div className="text-xs text-center mt-1 font-mono">
              {value}
            </div>
          </div>
          
          <div className="flex justify-center gap-2">
            <Button onClick={printBarcode} variant="outline" size="sm">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button onClick={downloadBarcode} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 