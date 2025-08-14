import QRCode from 'qrcode';
import { supabase } from '@/integrations/supabase/client';

/**
 * QR Code generation service for mobile asset workflow
 */

export interface QRCodeOptions {
  width?: number;
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
}

export interface AssetQRData {
  asset_id: string;
  asset_name: string;
  mobile_url: string;
  qr_data_url: string;
  barcode: string;
}

interface MobileQRWorkflowData {
  asset_id: string;
  asset_name: string;
  asset_type_name: string;
  organization_id: string;
  barcode: string;
  mobile_url: string;
  workflow_options: Array<{
    type: string;
    label: string;
    form_id: string | null;
    available: boolean;
  }>;
}

/**
 * Generate QR code for mobile asset workflow
 */
export async function generateMobileAssetQR(
  assetId: string,
  options?: QRCodeOptions
): Promise<AssetQRData | null> {
  try {
    // Get asset data and mobile URL from database using SQL directly
    const { data, error } = await supabase
      .from('assets')
      .select(`
        id,
        name,
        barcode,
        asset_types!inner(
          name,
          intake_form_id,
          inventory_form_id
        )
      `)
      .eq('id', assetId)
      .eq('is_deleted', false)
      .single();

    if (error) {
      console.error('Error fetching asset for QR generation:', error);
      throw error;
    }
    if (!data) return null;

    // Generate mobile URL
    const baseUrl = window.location.origin;
    const mobileUrl = `${baseUrl}/mobile/asset/${assetId}`;

    // Default QR code options optimized for mobile scanning
    const qrOptions = {
      width: options?.width || 300,
      margin: options?.margin || 2,
      color: {
        dark: options?.color?.dark || '#000000',
        light: options?.color?.light || '#FFFFFF',
      },
      errorCorrectionLevel: options?.errorCorrectionLevel || 'M' as const,
    };

    // Generate QR code as data URL
    const qrDataUrl = await QRCode.toDataURL(mobileUrl, qrOptions);

    return {
      asset_id: data.id,
      asset_name: data.name,
      mobile_url: mobileUrl,
      qr_data_url: qrDataUrl,
      barcode: data.barcode || '',
    };
  } catch (error) {
    console.error('Error generating mobile QR code:', error);
    throw error;
  }
}

/**
 * Generate QR code as Canvas element for more advanced usage
 */
export async function generateMobileAssetQRCanvas(
  assetId: string,
  canvas: HTMLCanvasElement,
  options?: QRCodeOptions
): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('assets')
      .select('id, name')
      .eq('id', assetId)
      .eq('is_deleted', false)
      .single();

    if (error) {
      console.error('Error fetching asset for QR canvas generation:', error);
      throw error;
    }
    if (!data) throw new Error('Asset not found');

    const baseUrl = window.location.origin;
    const mobileUrl = `${baseUrl}/mobile/asset/${assetId}`;

    const qrOptions = {
      width: options?.width || 300,
      margin: options?.margin || 2,
      color: {
        dark: options?.color?.dark || '#000000',
        light: options?.color?.light || '#FFFFFF',
      },
      errorCorrectionLevel: options?.errorCorrectionLevel || 'M' as const,
    };

    await QRCode.toCanvas(canvas, mobileUrl, qrOptions);
  } catch (error) {
    console.error('Error generating QR canvas:', error);
    throw error;
  }
}

/**
 * Generate QR code as SVG string
 */
export async function generateMobileAssetQRSVG(
  assetId: string,
  options?: QRCodeOptions
): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('assets')
      .select('id, name')
      .eq('id', assetId)
      .eq('is_deleted', false)
      .single();

    if (error) {
      console.error('Error fetching asset for QR SVG generation:', error);
      throw error;
    }
    if (!data) throw new Error('Asset not found');

    const baseUrl = window.location.origin;
    const mobileUrl = `${baseUrl}/mobile/asset/${assetId}`;

    const qrOptions = {
      width: options?.width || 300,
      margin: options?.margin || 2,
      color: {
        dark: options?.color?.dark || '#000000',
        light: options?.color?.light || '#FFFFFF',
      },
      errorCorrectionLevel: options?.errorCorrectionLevel || 'M' as const,
    };

    return await QRCode.toString(mobileUrl, { 
      type: 'svg',
      ...qrOptions 
    });
  } catch (error) {
    console.error('Error generating QR SVG:', error);
    throw error;
  }
}

/**
 * Bulk generate QR codes for multiple assets
 */
export async function generateBulkMobileAssetQRs(
  assetIds: string[],
  options?: QRCodeOptions
): Promise<AssetQRData[]> {
  try {
    const results = await Promise.allSettled(
      assetIds.map(assetId => generateMobileAssetQR(assetId, options))
    );

    return results
      .filter((result): result is PromiseFulfilledResult<AssetQRData | null> => 
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value);
  } catch (error) {
    console.error('Error generating bulk QR codes:', error);
    throw error;
  }
}

/**
 * Validate QR code URL format
 */
export function validateMobileQRUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname.startsWith('/mobile/asset/');
  } catch {
    return false;
  }
}

/**
 * Extract asset ID from mobile QR URL
 */
export function extractAssetIdFromMobileUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const match = urlObj.pathname.match(/^\/mobile\/asset\/([a-f0-9-]+)$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Log QR code generation for analytics
 */
export async function logQRGeneration(assetId: string, userId?: string): Promise<void> {
  try {
    if (userId) {
      // Use direct SQL insert instead of RPC to avoid type issues
      await supabase
        .from('system_logs')
        .insert({
          type: 'info',
          message: 'QR Code Generated',
          details: {
            asset_id: assetId,
            generation_time: new Date().toISOString()
          },
          actor_id: userId
        });
    }
  } catch (error) {
    // Don't throw on logging errors, just console log
          // Failed to log QR generation
  }
} 