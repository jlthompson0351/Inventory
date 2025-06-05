# Logistiq System - User Guide

## Introduction

The Logistiq Inventory Builder application includes a powerful barcode system that automatically generates unique barcodes or QR codes for your assets. This guide will walk you through how to use this feature to streamline your inventory management.

## Setting Up Barcode Generation

### Enabling Barcodes for an Asset Type

1. Navigate to the **Asset Types** page
2. Click **Add Asset Type** or select an existing asset type to edit
3. In the dialog, find the **Barcode Generation** section
4. Toggle the switch to enable barcode generation
5. Select your preferred barcode type:
   - **QR Code** - Versatile and can store more information
   - **Code128** - Linear barcode good for alphanumeric data
   - **Code39** - Widely used in non-retail environments
6. (Optional) Enter a prefix to add to the beginning of each barcode
7. Save your changes

![Barcode Settings](../public/images/barcode-settings-example.png)

### Viewing Barcode Settings

To see the barcode settings for an asset type:

1. Go to the **Asset Types** page
2. Click on an asset type to view its details
3. On the Details tab, you'll see a **Barcode Generation** section showing:
   - Whether barcodes are enabled or disabled
   - The type of barcode being generated
   - Any prefix being used

## Creating Assets with Barcodes

When you create a new asset of a type that has barcode generation enabled:

1. Navigate to **Inventory** > **Add New Asset**
2. Fill in the required information
3. Select the asset type (which has barcode generation enabled)
4. Complete and submit the form
5. A unique barcode will be automatically generated for the asset

> **Note:** You don't need to add a barcode field to your forms. Barcodes are generated automatically based on the asset type settings.

## Viewing and Printing Barcodes

To view or print the barcode for an asset:

1. Navigate to the asset's detail page
2. Look for the barcode display in the header section
3. Use your browser's print function to print the barcode for labeling

## Scanning Assets

### Using the Asset Scanner

1. Go to **Inventory** > **Scan Asset**
2. Allow camera access when prompted
3. Point your device's camera at a barcode or QR code
4. Once detected, you'll be redirected to the asset's detail page

### Mobile Scanning

The scanning functionality works best on mobile devices:

1. Access the Logistiq application on your mobile browser
2. Navigate to **Inventory** > **Scan Asset**
3. Allow camera access
4. Scan the barcode or QR code

## Inventory Forms with Barcode Scanning

If your asset type has an inventory form configured:

1. Scan an asset barcode 
2. The system will identify the asset and load its inventory form
3. Complete the inventory check form
4. Submit to update the asset's inventory status

## Tips for Effective Barcode Usage

1. **Use a consistent prefix** for different categories of assets to easily identify them
2. **Print labels with durable materials** if assets are exposed to harsh environments
3. **QR codes** work better when scanning from screens or when damaged
4. **Linear barcodes** (Code128, Code39) work well for printed labels
5. **Test scanning** in your typical environment to ensure readability
6. For inventory checks, use a mobile device for efficient scanning

## Troubleshooting

### Scanning Issues

- Ensure adequate lighting when scanning
- Hold the scanner steady
- Make sure the entire barcode is visible in the camera view
- Try different angles if having trouble scanning
- For printed barcodes, ensure they are not damaged or smudged

### Barcode Generation Issues

If barcodes aren't being generated:
- Verify that barcode generation is enabled for the asset type
- Check that you have the necessary permissions
- Contact your system administrator if problems persist

## Need More Help?

If you encounter any issues with the barcode system, please contact your system administrator or refer to the technical documentation for more detailed information. 