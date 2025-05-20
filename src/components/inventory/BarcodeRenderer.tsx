import React from 'react';
import QRCode from 'qrcode.react';
import Barcode from 'react-barcode';

export interface BarcodeRendererProps {
  value: string;
  type: 'qr' | 'code128' | 'code39';
  width?: number;
  height?: number;
  className?: string;
}

export function BarcodeRenderer({
  value,
  type = 'qr',
  width = 128,
  height = 128,
  className = '',
}: BarcodeRendererProps) {
  if (!value) {
    return <div className="text-muted-foreground text-sm">No barcode value provided</div>;
  }

  switch (type) {
    case 'qr':
      return (
        <QRCode 
          value={value}
          size={width}
          renderAs="svg"
          className={className}
          includeMargin={true}
          level="M"
        />
      );
    case 'code128':
      return (
        <div className={className}>
          <Barcode
            value={value}
            format="CODE128"
            width={1}
            height={height / 2}
            displayValue={true}
            margin={10}
          />
        </div>
      );
    case 'code39':
      return (
        <div className={className}>
          <Barcode
            value={value}
            format="CODE39"
            width={1}
            height={height / 2}
            displayValue={true}
            margin={10}
          />
        </div>
      );
    default:
      return (
        <QRCode 
          value={value}
          size={width}
          renderAs="svg"
          className={className}
          includeMargin={true}
          level="M"
        />
      );
  }
} 