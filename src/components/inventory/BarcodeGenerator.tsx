import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Printer, Download, RefreshCw } from "lucide-react";
import { BarcodeRenderer } from "./BarcodeRenderer";

export interface BarcodeGeneratorProps {
  assetTypeId: string;
  prefix?: string;
  barcodeType?: 'qr' | 'code128' | 'code39';
  initialValue?: string;
  onGenerate?: (value: string) => void;
}

export function BarcodeGenerator({
  assetTypeId,
  prefix = '',
  barcodeType = 'qr',
  initialValue = '',
  onGenerate
}: BarcodeGeneratorProps) {
  const [barcodeValue, setBarcodeValue] = useState(initialValue || generateBarcodeValue());
  const [customValue, setCustomValue] = useState('');
  const [isUsingCustomValue, setIsUsingCustomValue] = useState(false);
  const barcodeRef = useRef<HTMLDivElement>(null);

  function generateBarcodeValue(): string {
    // Generate a unique ID based on timestamp and random number
    const timestamp = new Date().getTime().toString(36);
    const randomPart = Math.floor(Math.random() * 10000).toString(36);
    
    // Format with prefix if provided
    const formattedPrefix = prefix ? `${prefix}-` : '';
    
    // Use the asset type ID for more unique identification
    const shortAssetTypeId = assetTypeId.substring(0, 6);
    
    return `${formattedPrefix}${shortAssetTypeId}-${timestamp}${randomPart}`.toUpperCase();
  }

  const regenerateBarcode = () => {
    const newValue = generateBarcodeValue();
    setBarcodeValue(newValue);
    setIsUsingCustomValue(false);
    if (onGenerate) {
      onGenerate(newValue);
    }
  };

  const applyCustomValue = () => {
    if (customValue.trim()) {
      // Format with prefix if provided and custom value doesn't already include it
      const formattedPrefix = prefix ? `${prefix}-` : '';
      const valueToUse = customValue.startsWith(formattedPrefix) 
        ? customValue 
        : `${formattedPrefix}${customValue}`;
      
      setBarcodeValue(valueToUse.toUpperCase());
      setIsUsingCustomValue(true);
      if (onGenerate) {
        onGenerate(valueToUse);
      }
    }
  };

  const printBarcode = () => {
    if (!barcodeRef.current) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const barcodeHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Barcode</title>
          <style>
            body { margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; }
            .barcode-container { text-align: center; }
            .value { margin-top: 10px; font-family: sans-serif; }
            @media print {
              @page { margin: 0; }
              body { margin: 1cm; }
            }
          </style>
        </head>
        <body>
          <div class="barcode-container">
            ${barcodeRef.current.innerHTML}
            <div class="value">${barcodeValue}</div>
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
    downloadLink.download = `barcode-${barcodeValue}.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(svgUrl);
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-6">
          <div className="flex flex-col items-center">
            <div ref={barcodeRef} className="mb-2">
              <BarcodeRenderer
                value={barcodeValue}
                type={barcodeType}
                width={200}
                height={200}
              />
            </div>
            <div className="text-sm text-center mt-2 font-mono">
              {barcodeValue}
            </div>
          </div>
          
          <div className="grid gap-4">
            <div className="flex gap-2">
              <Button onClick={regenerateBarcode} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Regenerate
              </Button>
              <Button onClick={printBarcode} variant="outline" size="sm">
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button onClick={downloadBarcode} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="custom-value">Custom Barcode Value (Optional)</Label>
              <div className="flex gap-2">
                <Input
                  id="custom-value"
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  placeholder="Enter custom barcode value"
                />
                <Button onClick={applyCustomValue} disabled={!customValue.trim()}>
                  Apply
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                If you need a specific barcode value, enter it here. Otherwise, a unique value will be generated.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 