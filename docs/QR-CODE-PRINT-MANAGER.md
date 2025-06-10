# QR Code Print Manager

## Overview

The QR Code Print Manager is a professional tool for bulk QR code printing, designed to replace the technical barcode demo with a practical, production-ready solution for generating print-ready QR code sheets.

## Features

### Asset Management
- **Browse Assets**: View all available assets with QR code previews
- **Search & Filter**: Find specific assets by name, barcode, or asset type
- **Dual View Modes**: Switch between grid and list views for optimal browsing
- **Bulk Selection**: Select multiple assets with "Select All" and "Clear" options

### Print Configuration
- **QR Code Sizes**: Choose from 9 sizes ranging from 0.5" × 0.5" to 3" × 3"
- **Paper Formats**: Support for Letter (8.5" × 11"), A4 (8.27" × 11.69"), and Legal (8.5" × 14")
- **Asset Names**: Optional asset name printing below QR codes for identification
- **Smart Layout**: Automatic calculation of optimal grid layout based on settings

### Print Output
- **Professional Sheets**: Print-ready documents with proper margins and spacing
- **Multi-page Support**: Large selections automatically split across multiple pages
- **Actual QR Codes**: Real, scannable QR codes (not placeholder images)
- **Browser Printing**: Standard print dialog for immediate printing or PDF generation

## User Guide

### Getting Started

1. **Navigate to QR Code Print Manager**
   - Go to the main navigation
   - Click on "Barcode Tools"
   - The QR Code Print Manager will load automatically

2. **Browse Available Assets**
   - All assets are displayed with QR code previews
   - Use the search box to find specific assets
   - Switch between grid and list views using the view toggle

### Selecting Assets

#### Individual Selection
- Click on any asset card to select/deselect it
- Selected assets are highlighted with a blue border and check mark

#### Bulk Selection
- Use "Select All" to select all visible assets (respects search filters)
- Use "Clear" to deselect all currently selected assets
- Selection count is displayed in the Selection card

### Configuring Print Settings

#### QR Code Size
Choose from available sizes based on your use case:
- **0.5" × 0.5"**: Compact labels for small assets
- **0.75" × 0.75"**: Small but easily scannable
- **1" × 1"**: Standard size for most applications
- **1.25" × 1.25"**: Good balance of size and scannability
- **1.5" × 1.5"**: Enhanced visibility for medium distances
- **1.75" × 1.75"**: Large enough for challenging environments
- **2" × 2"**: High visibility for industrial applications
- **2.5" × 2.5"**: Large format for warehouse use
- **3" × 3"**: Maximum size for long-distance scanning

#### Paper Size
- **Letter (8.5" × 11")**: Standard US paper size
- **A4 (8.27" × 11.69")**: International standard
- **Legal (8.5" × 14")**: Extended US format for more QR codes per sheet

#### Display Options
- **Show Asset Names**: Toggle to include/exclude asset names below QR codes

### Print Preview Information

The Print Preview card shows:
- **QR codes per page**: How many codes fit on one sheet
- **Grid layout**: Dimensions (e.g., "6 × 8" for 6 columns, 8 rows)
- **Pages needed**: Total pages required for current selection

### Generating Print Sheets

1. **Select desired assets** using the grid or list view
2. **Configure print settings** (QR size, paper format, show names)
3. **Click "Generate Print Sheet"** button
4. **Wait for generation** (shows "Generating..." with spinner)
5. **New window opens** with print-ready document
6. **Use browser's print function** to print or save as PDF

## Technical Implementation

### Architecture

The QR Code Print Manager is implemented as a single-page React component with comprehensive functionality for practical QR code printing needs.

### QR Code Generation

The system uses the `qrcode` npm package to generate actual SVG QR codes that link to the mobile asset workflow URLs.

### Layout Calculation

Smart layout engine calculates optimal grid based on paper dimensions, QR code size, required margins, and spacing between codes.

## Best Practices

### Size Selection
- **Small Assets (0.5"-1")**: Use for compact labels on small equipment
- **Standard Assets (1"-1.5")**: Ideal for most general-purpose applications
- **Large Assets (2"-3")**: Best for outdoor equipment or long-distance scanning

### Print Quality
- Use high-quality printers (300 DPI or higher) for best scanability
- Test scan with different devices and apps before large batches
- Consider label material for durability and environmental resistance

### Workflow Efficiency
- Use search/filter to find specific asset groups
- Print in logical batches (by location, asset type, etc.)
- Keep asset names enabled for easier application and verification

## Integration

The QR Code Print Manager integrates seamlessly with the existing Logistiq system, accessible via "Barcode Tools" in main navigation, and replaces previous technical demo functionality with a production-ready tool for practical QR code management.

## Configuration Options

### QR Code Sizes
```typescript
const QR_SIZES = [
  { label: '0.5" × 0.5"', value: '0.5', inches: 0.5 },
  { label: '0.75" × 0.75"', value: '0.75', inches: 0.75 },
  { label: '1" × 1"', value: '1', inches: 1 },
  { label: '1.25" × 1.25"', value: '1.25', inches: 1.25 },
  { label: '1.5" × 1.5"', value: '1.5', inches: 1.5 },
  { label: '1.75" × 1.75"', value: '1.75', inches: 1.75 },
  { label: '2" × 2"', value: '2', inches: 2 },
  { label: '2.5" × 2.5"', value: '2.5', inches: 2.5 },
  { label: '3" × 3"', value: '3', inches: 3 },
];
```

### Paper Formats
```typescript
const PAPER_SIZES = [
  { label: 'Letter (8.5" × 11")', value: 'letter', width: 8.5, height: 11 },
  { label: 'A4 (8.27" × 11.69")', value: 'a4', width: 8.27, height: 11.69 },
  { label: 'Legal (8.5" × 14")', value: 'legal', width: 8.5, height: 14 },
];
```

## Troubleshooting

### Common Issues

**No QR codes in printed output:**
- This was the original issue that has been fixed
- QR codes are now generated as actual SVG data, not placeholders

**Print layout issues:**
- Verify paper size setting matches your printer
- Check printer margins and scaling settings
- Ensure "Fit to page" is disabled in browser print settings

**Performance with large selections:**
- QR code generation is done asynchronously
- Large batches (100+ assets) may take a few seconds to generate
- Browser may prompt for popup permission for the print window

**Asset not showing:**
- Verify asset has proper organization access
- Check that asset is not marked as deleted
- Ensure you have read permissions for the asset

### Error Handling

The system includes comprehensive error handling for:
- Supabase connection issues
- QR code generation failures
- Print window popup blocking
- Asset permission errors

All errors are displayed via toast notifications with descriptive messages.

## Future Enhancements

Potential improvements for future versions:

1. **Custom Templates**: Allow users to create custom print layouts
2. **Batch Processing**: Background processing for very large selections
3. **Print History**: Track what was printed when and by whom
4. **Label Integration**: Direct integration with label printer systems
5. **Export Options**: Save as PDF, PNG, or other formats
6. **Custom QR Data**: Include additional data in QR codes beyond asset ID
7. **Print Scheduling**: Schedule batch printing jobs
8. **Cost Tracking**: Calculate printing costs based on paper and ink usage

---

The QR Code Print Manager represents a significant upgrade from technical demo functionality to a production-ready tool that addresses real-world asset labeling needs with professional output quality and user experience. 