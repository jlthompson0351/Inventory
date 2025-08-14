# Barcode & QR Code User Guide (Updated August 2025)

This guide explains how to use the barcode and QR code features in the BarcodEx inventory management system to streamline your asset tracking.

---

## 🚀 **Getting Started: Enabling Barcodes**

Barcodes are managed at the **Asset Type** level. To start using them, you first need to enable them for a specific category of assets.

1.  **Navigate to Asset Types**: Go to the "Asset Types" section in the application.
2.  **Select an Asset Type**: Either create a new asset type or edit an existing one.
3.  **Enable Barcodes**: In the asset type settings, you will find a "Barcode Generation" section. Toggle the switch to enable it.
4.  **Choose a Prefix (Optional but Recommended)**: Enter a short prefix (e.g., "LAP" for laptops, "VEH" for vehicles). This helps in easily identifying asset types from their barcodes.

Once enabled, any new asset created under this asset type will automatically get a unique barcode.

---

##  asset creation and barcode generation

When you create a new asset for a type that has barcode generation enabled, a unique barcode will be automatically generated for it. You don't need to manually enter a barcode value.

---

## 🔍 **Viewing & Printing Barcodes**

### **For a Single Asset**
1.  **Go to the Asset's Detail Page**: Navigate to the specific asset you want to view.
2.  **Find the Barcode**: The asset's barcode or QR code will be displayed prominently on the page.
3.  **Print**: You can print the barcode directly from your browser to create a label.

### **Bulk Printing with the QR Code Print Manager**
For printing labels for multiple assets at once, use the **QR Code Print Manager**.

1.  **Navigate**: Find the "QR Code Print Manager" in the "Barcode Tools" section of the application.
2.  **Select Assets**: Use the search and filter options to find the assets you need, and select them.
3.  **Configure Your Print Sheet**:
    -   **QR Code Size**: Choose from a range of sizes (0.5" to 3").
    -   **Paper Size**: Select standard paper sizes (Letter, A4, Legal).
    -   **Show Asset Names**: Toggle this on to print the asset name below each QR code for easy identification.
4.  **Generate & Print**: Click "Generate Print Sheet". A print-ready page will be created with your QR codes neatly arranged.

---

## 📲 **Scanning Assets (Mobile Workflow)**

The most powerful way to use the barcode system is with a mobile device.

### **On-the-Go Scanning**
1.  **Navigate to "Scan Asset"**: Open this page in your mobile browser.
2.  **Allow Camera Access**: The first time you use it, your browser will ask for permission to use the camera.
3.  **Scan**: Point your camera at an asset's QR code.
4.  **View Asset**: You will be automatically redirected to the asset's mobile-friendly detail page.

### **Mobile Inventory Checks with PIN Authentication**
For performing inventory actions in the field, the system uses a secure and fast PIN-based workflow.

1.  **Scan an Asset**: As described above.
2.  **Choose an Action**: On the asset page, you will see options like "Perform Inventory Check".
3.  **Enter Your PIN**: You will be prompted to enter your 4-digit `quick_access_pin` (which you can set in your user profile).
4.  **Submit Form**: After successful PIN authentication, you can fill out and submit the inventory form directly from your mobile device.

---

## 💡 **Tips for Best Results**

-   **Use Prefixes**: Consistent prefixes make it easy to identify asset types at a glance.
-   **Durable Labels**: For assets in harsh environments, use durable, weatherproof labels.
-   **QR Codes are Robust**: They can often be scanned even if slightly damaged.
-   **Good Lighting**: Ensure good lighting conditions when scanning for the best results.

---

## 🐛 **Troubleshooting**

-   **Scanning Issues?**: Make sure the barcode is well-lit, not damaged, and fully visible in the camera's view.
-   **Barcodes Not Generating?**: Check the asset type settings to ensure barcode generation is enabled.
-   **Camera Access Denied?**: Make sure you have granted camera permissions to your browser for this site. You must be on an HTTPS connection.

For any further issues, please contact your system administrator.