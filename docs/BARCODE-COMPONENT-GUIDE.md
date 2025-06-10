# Logistiq Components Guide

This guide explains the usage of the barcode components available in the Logistiq Inventory Builder application. These components allow you to generate, display, and print barcodes for inventory assets.

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

## QR Code Print Manager

### Overview

The QR Code Print Manager (`src/pages/QRCodePrintManager.tsx`) is a comprehensive solution for bulk QR code printing. It replaces the technical barcode demo page with a practical tool for generating print-ready QR code sheets.

### Features

- **Asset Browser**: Grid and list views with search and filtering
- **Bulk Selection**: Select multiple assets for batch printing
- **Print Configuration**: Multiple QR code sizes and paper formats
- **Smart Layout**: Automatic grid calculation for optimal paper usage
- **Professional Output**: Print-ready sheets with proper spacing and margins

### Technical Implementation

```typescript
interface Asset {
  id: string;
  name: string;
  barcode: string;
  asset_type_name: string;
  organization_id: string;
}

interface QRCodePrintManagerState {
  assets: Asset[];
  selectedAssets: Set<string>;
  qrSize: string; // '0.5' to '3' inches
  paperSize: 'letter' | 'a4' | 'legal';
  showAssetNames: boolean;
  viewMode: 'grid' | 'list';
}
```

### Print Settings

**QR Code Sizes:**
- 0.5" × 0.5" through 3" × 3" in 0.25" increments
- Optimal for different use cases from small labels to outdoor signage

**Paper Formats:**
- Letter (8.5" × 11")
- A4 (8.27" × 11.69") 
- Legal (8.5" × 14")

**Layout Calculation:**
- Automatic grid sizing based on QR code size and paper dimensions
- 0.25" margins and 0.125" spacing between codes
- Multi-page support for large selections

### QR Code Generation

The system uses the `qrcode` library to generate actual QR codes (not placeholders):

```typescript
const generateQRCode = async (assetId: string) => {
  const qrUrl = `${window.location.origin}/mobile-asset-workflow/${assetId}`;
  const qrSvg = await QRCode.toString(qrUrl, {
    type: 'svg',
    width: layout.sizeInches * 60,
    margin: 1,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  });
  return qrSvg;
};
```

### Usage Example

```typescript
// Access from main navigation
// Barcode Tools → QR Code Print Manager

// Key user actions:
1. Browse/search assets
2. Select assets (individual or bulk)
3. Configure print settings
4. Generate print sheet
5. Print from browser dialog
```

### Print Output

The generated print sheets include:
- Actual scannable QR codes (not placeholder images)
- Optional asset names for identification
- Professional layout with cutting guides
- Multi-page support for large batches
- Print-optimized CSS with proper margins and page breaks

### Integration

The QR Code Print Manager is integrated into the main application navigation under "Barcode Tools" and replaces the previous technical demo functionality with a production-ready tool for practical QR code management.

## Best Practices

1. **Barcode Prefixes**: Use short, meaningful prefixes (3-5 characters) to identify asset types.
2. **Barcode Type**: QR codes are recommended for most use cases as they can store more data and are easier to scan with mobile devices.
3. **Printing**: When printing barcodes, use a high-quality printer and test the scannability with different readers.
4. **Validation**: Always validate barcode formats on the server-side before storing them in the database.
5. **Handling**: Add error handling for cases where a barcode might be invalid or missing.
6. **Downloads**: Always provide a download option for users to save and print barcodes separately.
7. **Asset Integration**: Configure barcode settings at the asset type level for consistency across similar assets.
8. **Bulk Operations**: Use the QR Code Print Manager for efficient bulk QR code printing rather than individual asset downloads.
9. **Print Testing**: Always test print output with your specific printer and label stock before large batches.
10. **Size Selection**: Choose QR code sizes appropriate for your scanning distance and label application. 