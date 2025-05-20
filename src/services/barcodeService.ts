import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { QRCodeCanvas } from 'qrcode.react';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { v4 as uuidv4 } from 'uuid';
// Import JsBarcode dynamically to avoid SSR issues

/**
 * Service for handling barcode and QR code generation
 */
export const BarcodeService = {
  /**
   * Generate a barcode component
   * @param value - Value to encode in the barcode
   * @param options - Barcode options
   * @returns React element with barcode
   */
  generateBarcode: (
    value: string,
    options?: {
      width?: number;
      height?: number;
      format?: string;
      displayValue?: boolean;
      fontSize?: number;
      margin?: number;
    }
  ): React.ReactElement => {
    const defaultOptions = {
      width: 2,
      height: 100,
      format: 'CODE128',
      displayValue: true,
      fontSize: 20,
      margin: 10,
    };

    const finalOptions = { ...defaultOptions, ...options };

    // Create SVG element for barcode
    return React.createElement('svg', {
      className: 'barcode-svg',
      width: finalOptions.width * value.length + finalOptions.margin * 2,
      height: finalOptions.height + (finalOptions.displayValue ? finalOptions.fontSize + 10 : 0),
      'data-value': value,
      'data-format': finalOptions.format,
      ref: (svg) => {
        if (svg && typeof window !== 'undefined') {
          // Dynamically apply barcode when element mounts in browser
          import('jsbarcode').then((JsBarcode) => {
            JsBarcode.default(svg, value, {
              format: finalOptions.format,
              width: finalOptions.width,
              height: finalOptions.height,
              displayValue: finalOptions.displayValue,
              fontSize: finalOptions.fontSize,
              margin: finalOptions.margin,
            });
          }).catch(err => {
            console.error('Error loading JsBarcode:', err);
          });
        }
      }
    });
  },

  /**
   * Generate a QR code component
   * @param value - Value to encode in the QR code
   * @param options - QR code options
   * @returns React element with QR code
   */
  generateQRCode: (
    value: string,
    options?: {
      size?: number;
      level?: 'L' | 'M' | 'Q' | 'H';
      bgColor?: string;
      fgColor?: string;
    }
  ): React.ReactElement => {
    const defaultOptions = {
      size: 256,
      level: 'M' as const,
      bgColor: '#ffffff',
      fgColor: '#000000',
    };

    const finalOptions = { ...defaultOptions, ...options };

    return React.createElement(QRCodeCanvas, {
      value,
      size: finalOptions.size,
      level: finalOptions.level,
      bgColor: finalOptions.bgColor,
      fgColor: finalOptions.fgColor
    });
  },

  /**
   * Generate a barcode as an SVG string (browser only)
   * @param value - Value to encode in the barcode
   * @param options - Barcode options
   * @returns SVG string of the barcode
   */
  generateBarcodeSVG: async (
    value: string,
    options?: {
      width?: number;
      height?: number;
      format?: string;
      displayValue?: boolean;
      fontSize?: number;
      margin?: number;
    }
  ): Promise<string> => {
    if (typeof document === 'undefined') {
      throw new Error('generateBarcodeSVG can only be used in a browser environment');
    }
    
    // Create a temporary SVG element in memory
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    
    // Set SVG attributes
    const defaultOptions = {
      width: 2,
      height: 100,
      format: 'CODE128',
      displayValue: true,
      fontSize: 20,
      margin: 10,
    };

    const finalOptions = { ...defaultOptions, ...options };
    
    // Calculate dimensions
    const width = finalOptions.width * value.length + finalOptions.margin * 2;
    const height = finalOptions.height + (finalOptions.displayValue ? finalOptions.fontSize + 10 : 0);
    
    svg.setAttribute('width', width.toString());
    svg.setAttribute('height', height.toString());
    
    // Use JsBarcode to create barcode
    try {
      const JsBarcode = await import('jsbarcode').then(module => module.default);
      JsBarcode(svg, value, {
        format: finalOptions.format,
        width: finalOptions.width,
        height: finalOptions.height,
        displayValue: finalOptions.displayValue,
        fontSize: finalOptions.fontSize,
        margin: finalOptions.margin,
      });
      
      return new XMLSerializer().serializeToString(svg);
    } catch (error) {
      console.error('Error generating barcode SVG:', error);
      return `<svg width="${width}" height="${height}"><text x="10" y="20">Error generating barcode</text></svg>`;
    }
  },

  /**
   * Generate a QR code as an SVG string
   * @param value - Value to encode in the QR code
   * @param options - QR code options
   * @returns SVG string of the QR code
   */
  generateQRCodeSVG: (
    value: string,
    options?: {
      size?: number;
      level?: 'L' | 'M' | 'Q' | 'H';
      bgColor?: string;
      fgColor?: string;
    }
  ): string => {
    const qrCodeComponent = BarcodeService.generateQRCode(value, options);
    return ReactDOMServer.renderToString(qrCodeComponent);
  },

  /**
   * Generate a data URL from a barcode
   * @param value - Value to encode in the barcode
   * @param options - Barcode options
   * @returns Promise resolving to data URL string
   */
  generateBarcodeDataURL: async (
    value: string,
    options?: {
      width?: number;
      height?: number;
      format?: string;
      displayValue?: boolean;
      fontSize?: number;
      margin?: number;
    }
  ): Promise<string> => {
    const svgString = await BarcodeService.generateBarcodeSVG(value, options);
    return svgToDataURL(svgString);
  },

  /**
   * Generate a data URL from a QR code
   * @param value - Value to encode in the QR code
   * @param options - QR code options
   * @returns Promise resolving to data URL string
   */
  generateQRCodeDataURL: async (
    value: string,
    options?: {
      size?: number;
      level?: 'L' | 'M' | 'Q' | 'H';
      bgColor?: string;
      fgColor?: string;
    }
  ): Promise<string> => {
    const svgString = BarcodeService.generateQRCodeSVG(value, options);
    return svgToDataURL(svgString);
  },

  /**
   * Generate a unique barcode value using a prefix and asset type ID
   * @param {string} prefix - Optional prefix to add to the barcode
   * @param {string} assetTypeId - The asset type ID
   * @returns {string} - A unique barcode value
   */
  generateBarcodeValue(prefix: string = '', assetTypeId: string = ''): string {
    // Generate a unique ID based on timestamp and random number
    const timestamp = new Date().getTime().toString(36);
    const randomPart = Math.floor(Math.random() * 10000).toString(36);
    
    // Format with prefix if provided
    const formattedPrefix = prefix ? `${prefix}-` : '';
    
    // Use the asset type ID for more unique identification
    const shortAssetTypeId = assetTypeId ? assetTypeId.substring(0, 6) : '';
    const assetTypeIdPart = shortAssetTypeId ? `${shortAssetTypeId}-` : '';
    
    return `${formattedPrefix}${assetTypeIdPart}${timestamp}${randomPart}`.toUpperCase();
  },

  /**
   * Generate a unique barcode value using UUID
   * @param {string} prefix - Optional prefix to add to the barcode
   * @returns {string} - A unique barcode value
   */
  generateUuidBarcode(prefix: string = ''): string {
    const uuid = uuidv4();
    const shortUuid = uuid.replace(/-/g, '').substring(0, 12);
    
    // Format with prefix if provided
    const formattedPrefix = prefix ? `${prefix}-` : '';
    
    return `${formattedPrefix}${shortUuid}`.toUpperCase();
  },

  /**
   * Validate a barcode format
   * @param {string} barcode - The barcode to validate
   * @param {Object} options - Validation options
   * @returns {boolean} - Whether the barcode is valid
   */
  validateBarcode(barcode: string, options: {
    minLength?: number;
    maxLength?: number;
    allowedChars?: RegExp;
    requiredPrefix?: string;
  } = {}): boolean {
    const {
      minLength = 3,
      maxLength = 255,
      allowedChars = /^[A-Z0-9\-_]+$/,
      requiredPrefix
    } = options;
    
    // Check length constraints
    if (barcode.length < minLength || barcode.length > maxLength) {
      return false;
    }
    
    // Check if the barcode contains only allowed characters
    if (!allowedChars.test(barcode)) {
      return false;
    }
    
    // Check if the barcode starts with the required prefix
    if (requiredPrefix && !barcode.startsWith(requiredPrefix)) {
      return false;
    }
    
    return true;
  },

  /**
   * Parse a barcode to extract embedded information
   * @param {string} barcode - The barcode to parse
   * @returns {Object} - Extracted information
   */
  parseBarcode(barcode: string): {
    prefix?: string;
    assetTypeId?: string;
    timestamp?: string;
    random?: string;
  } {
    if (!barcode) return {};
    
    // Try to parse a barcode in the format PREFIX-ASSETTYPEID-TIMESTAMP-RANDOM
    const parts = barcode.split('-');
    
    if (parts.length >= 3) {
      return {
        prefix: parts[0],
        assetTypeId: parts[1],
        timestamp: parts[2],
        random: parts[3] || ''
      };
    }
    
    return {};
  }
};

/**
 * Convert SVG string to data URL
 * @param svgString - SVG content as string
 * @returns Promise resolving to data URL
 */
const svgToDataURL = (svgString: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const image = new Image();
      
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        
        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        context.drawImage(image, 0, 0);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/png'));
      };
      
      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };
      
      image.src = url;
    } catch (error) {
      reject(error);
    }
  });
};

export default BarcodeService; 