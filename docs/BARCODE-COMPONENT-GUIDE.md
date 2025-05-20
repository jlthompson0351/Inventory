# Barcode Components Guide

This guide explains the usage of the barcode components available in the BarCodeX Inventory Builder application. These components allow you to generate, display, and print barcodes for inventory assets.

## Available Components

### 1. BarcodeToggle

Located at `src/components/inventory/BarcodeToggle.tsx`

This component provides a user interface for enabling/disabling barcode generation for an asset type and configuring barcode settings.

```typescript
interface BarcodeToggleProps {
  enabled: boolean;
  barcodeType?: string;
  type?: string; // For backward compatibility
  prefix?: string;
  onChange?: (settings: {
    enabled: boolean;
    barcodeType: string;
    prefix: string;
  }) => void;
  onBarcodeSettingsChange?: (settings: {
    enabled: boolean;
    type: string;
    prefix: string;
  }) => void;
}
```

**Example usage:**

```tsx
import { BarcodeToggle } from '../components/inventory/BarcodeToggle';

// In your component
const [barcodeSettings, setBarcodeSettings] = useState({
  enabled: false,
  type: 'qr',
  prefix: ''
});

// Render the component
<BarcodeToggle
  enabled={barcodeSettings.enabled}
  type={barcodeSettings.type}
  prefix={barcodeSettings.prefix}
  onBarcodeSettingsChange={(settings) => setBarcodeSettings(settings)}
/>
```

### 2. BarcodeRenderer

Located at `src/components/inventory/BarcodeRenderer.tsx`

This component renders different types of barcodes based on the provided parameters. It's primarily used internally by other barcode components.

```typescript
interface BarcodeRendererProps {
  value: string;
  type: 'qr' | 'code128' | 'code39';
  width?: number;
  height?: number;
  className?: string;
}
```

**Example usage:**

```tsx
import { BarcodeRenderer } from '../components/inventory/BarcodeRenderer';

// Render a QR code
<BarcodeRenderer
  value="DEMO-QR-123"
  type="qr"
  width={150}
  height={150}
  className="my-qr-code"
/>

// Render a Code128 barcode
<BarcodeRenderer
  value="CODE128-VALUE"
  type="code128"
  width={200} // Note: Width/Height affect container for linear barcodes
  height={100}
  className="my-barcode"
/>
```

### 3. BarcodeGenerator

Located at `src/components/inventory/BarcodeGenerator.tsx`

This component generates unique barcodes based on asset type settings and provides UI for regenerating, customizing, printing, and downloading barcodes.

```typescript
interface BarcodeGeneratorProps {
  assetTypeId: string;
  prefix?: string;
  barcodeType?: 'qr' | 'code128' | 'code39';
  initialValue?: string;
  onGenerate?: (value: string) => void;
}
```

**Example usage:**

```tsx
import { BarcodeGenerator } from '../components/inventory/BarcodeGenerator';

// Render the component
<BarcodeGenerator
  assetTypeId="123456"
  prefix="TOOL"
  barcodeType="qr"
  onGenerate={(value) => console.log('Generated barcode:', value)}
/>
```

### 4. BarcodePreview

Located at `src/components/inventory/BarcodePreview.tsx`

This component displays a barcode for an existing asset and provides options for printing and downloading. Ideal for asset detail pages.

```typescript
interface BarcodePreviewProps {
  value: string;
  barcodeType?: 'qr' | 'code128' | 'code39';
  title?: string;
  assetName?: string;
  className?: string;
}
```

**Example usage:**

```tsx
import { BarcodePreview } from '../components/inventory/BarcodePreview';

// Render the component
<BarcodePreview
  value="TOOL-123456-ABCDEF"
  barcodeType="qr"
  title="Asset Barcode"
  assetName="Power Drill"
/>
```

### 5. BarcodeScanner

Located at `src/components/inventory/BarcodeScanner.tsx`

This component uses the device camera to scan QR codes.

```typescript
export interface BarcodeScannerProps {
  onScan: (value: string) => void;
  onClose?: () => void;
  title?: string;
  facingMode?: 'user' | 'environment';
  className?: string;
}
```

**Example usage:**

```tsx
import { BarcodeScanner } from '@/components/inventory/BarcodeScanner';

const [showScanner, setShowScanner] = useState(false);

const handleScan = (scannedValue) => {
  console.log('Scanned:', scannedValue);
  // Perform lookup or action with the scanned value
  setShowScanner(false);
};

return (
  <div>
    <Button onClick={() => setShowScanner(true)}>Scan Barcode</Button>
    {showScanner && (
      <BarcodeScanner
        onScan={handleScan}
        onClose={() => setShowScanner(false)}
        title="Scan Asset Barcode"
      />
    )}
  </div>
);
```

### 6. BarcodeDisplay

Located at `src/components/inventory/BarcodeDisplay.tsx`

This component provides a comprehensive display for asset barcodes with generation, regeneration, and downloading capabilities.

```typescript
interface BarcodeDisplayProps {
  assetId: string;
  barcode?: string | null;
  barcodeType?: string;
  name: string;
  onBarcodeUpdate?: (barcode: string) => void;
}
```

**Example usage:**

```tsx
import { BarcodeDisplay } from '@/components/inventory/BarcodeDisplay';

// In your component
<BarcodeDisplay
  assetId="1234"
  barcode="TOOL-123456-ABCDEF"
  barcodeType="qr"
  name="Power Drill"
  onBarcodeUpdate={(newBarcode) => {
    console.log('Barcode updated:', newBarcode);
    // Update your state/database with the new barcode
  }}
/>
```

### 7. AssetBarcodeDisplay

Located at `src/components/inventory/AssetBarcodeDisplay.tsx`

This component specifically handles asset barcode display with additional features for asset context.

```typescript
interface AssetBarcodeDisplayProps {
  assetId: string;
}
```

**Example usage:**

```tsx
import { AssetBarcodeDisplay } from '@/components/inventory/AssetBarcodeDisplay';

// Simply pass the asset ID and the component handles the rest
<AssetBarcodeDisplay assetId="1234" />
```

## Barcode Service

Located at `src/services/barcodeService.ts`

The BarcodeService provides utility functions for working with barcodes.

```typescript
import { BarcodeService } from '@/services/barcodeService';

// Generate a unique barcode value
const barcode = BarcodeService.generateBarcodeValue('TOOL', assetTypeId);

// Generate a UUID-based barcode
const uuidBarcode = BarcodeService.generateUuidBarcode('TOOL');

// Validate a barcode
const isValid = BarcodeService.validateBarcode(barcode, {
  minLength: 10,
  requiredPrefix: 'TOOL'
});

// Parse a barcode to extract information
const parsedInfo = BarcodeService.parseBarcode(barcode);

// Generate QR code as data URL for download
const qrDataUrl = await BarcodeService.generateQRCodeDataURL('TOOL-1234', { size: 300 });
```

## Integration Examples

### Adding Barcode Support to an Asset Type

```tsx
// In your asset type form
const [assetType, setAssetType] = useState({
  name: '',
  description: '',
  color: '#6E56CF',
  enable_barcodes: false,
  barcode_type: 'qr',
  barcode_prefix: ''
});

const handleBarcodeSettingsChange = (settings) => {
  setAssetType({
    ...assetType,
    enable_barcodes: settings.enabled,
    barcode_type: settings.type,
    barcode_prefix: settings.prefix
  });
};

// Render the BarcodeToggle component
<BarcodeToggle
  enabled={assetType.enable_barcodes}
  type={assetType.barcode_type}
  prefix={assetType.barcode_prefix}
  onBarcodeSettingsChange={handleBarcodeSettingsChange}
/>
```

### Displaying a Barcode on an Asset Detail Page

```tsx
// In your asset detail component
const [asset, setAsset] = useState({
  id: '',
  name: '',
  barcode: ''
});

// Quick QR code display with download button
{asset.barcode && (
  <div className="p-4 bg-white rounded-lg border">
    <QRCode 
      value={asset.barcode} 
      size={200} 
      level="H" 
      includeMargin={true}
      renderAs="canvas"
      id="asset-qrcode"
    />
    <Button 
      variant="outline" 
      onClick={() => {
        // Get the canvas element and convert it to a data URL
        const canvas = document.getElementById('asset-qrcode') as HTMLCanvasElement;
        if (canvas) {
          const dataUrl = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.href = dataUrl;
          link.download = `${asset.id}-qrcode.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      }}
    >
      Download QR Code
    </Button>
  </div>
)}

// Or use the comprehensive AssetBarcodeDisplay component
<AssetBarcodeDisplay assetId={asset.id} />
```

### Generating a New Barcode for an Asset

```tsx
// In your asset creation form
const [newAsset, setNewAsset] = useState({
  name: '',
  barcode: ''
});

const handleBarcodeGenerated = (value) => {
  setNewAsset({
    ...newAsset,
    barcode: value
  });
};

// Render the BarcodeGenerator component
<BarcodeGenerator
  assetTypeId={assetTypeId}
  prefix={assetTypeDetails?.barcode_prefix || ''}
  barcodeType={assetTypeDetails?.barcode_type || 'qr'}
  onGenerate={handleBarcodeGenerated}
/>
```

### Adding QR Code Generation to an Asset Detail Page

```tsx
// In your asset detail page
const handleGenerateBarcode = async () => {
  if (!asset || !assetType) return;
  
  try {
    setLoading(true);
    
    // Generate a new barcode
    const barcode = await generateAssetBarcode(
      supabase,
      asset.id,
      'qr' // Force QR code type
    );
    
    if (barcode) {
      // Update the asset with the new barcode
      const { error } = await supabase
        .from('assets')
        .update({ barcode })
        .eq('id', asset.id);
        
      if (error) throw error;
      
      // Update the local state
      setAsset({
        ...asset,
        barcode
      });
      
      toast({
        title: "Success",
        description: "QR code generated successfully",
      });
    }
  } catch (error) {
    console.error("Error generating QR code:", error);
    toast({
      title: "Error",
      description: "Failed to generate QR code",
      variant: "destructive",
    });
  } finally {
    setLoading(false);
  }
};

// Render the button
<Button
  variant="default"
  onClick={handleGenerateBarcode}
>
  <QrCode className="h-4 w-4 mr-2" />
  Generate QR Code
</Button>
```

## Testing Barcode Components

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { BarcodeToggle } from '../components/inventory/BarcodeToggle';

describe('BarcodeToggle', () => {
  test('renders correctly with default props', () => {
    const handleChange = jest.fn();
    render(
      <BarcodeToggle
        enabled={false}
        type="qr"
        prefix=""
        onBarcodeSettingsChange={handleChange}
      />
    );
    
    expect(screen.getByText('Enable barcodes for assets')).toBeInTheDocument();
    expect(screen.getByText('Barcode Type')).toBeInTheDocument();
    expect(screen.getByText('Barcode Prefix (Optional)')).toBeInTheDocument();
  });
  
  test('calls onBarcodeSettingsChange when switch is toggled', () => {
    const handleChange = jest.fn();
    render(
      <BarcodeToggle
        enabled={false}
        type="qr"
        prefix=""
        onBarcodeSettingsChange={handleChange}
      />
    );
    
    fireEvent.click(screen.getByRole('switch'));
    expect(handleChange).toHaveBeenCalledWith({
      enabled: true,
      type: 'qr',
      prefix: ''
    });
  });
});
```

## Best Practices

1. **Barcode Prefixes**: Use short, meaningful prefixes (3-5 characters) to identify asset types.
2. **Barcode Type**: QR codes are recommended for most use cases as they can store more data and are easier to scan with mobile devices.
3. **Printing**: When printing barcodes, use a high-quality printer and test the scannability with different readers.
4. **Validation**: Always validate barcode formats on the server-side before storing them in the database.
5. **Handling**: Add error handling for cases where a barcode might be invalid or missing.
6. **Downloads**: Always provide a download option for users to save and print barcodes separately.
7. **Asset Integration**: Configure barcode settings at the asset type level for consistency across similar assets. 