import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { QRCodeSVG } from 'qrcode.react';
import QRCode from 'qrcode';
import { Download, Printer, Search, Grid, List, ChevronUp, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/hooks/useAuth";
import { getAssetTypes, AssetType } from "@/services/assetTypeService";

interface Asset {
  id: string;
  name: string;
  barcode: string;
  asset_type_name: string;
  organization_id: string;
}

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

const PAPER_SIZES = [
  { label: 'Letter (8.5" × 11")', value: 'letter', width: 8.5, height: 11 },
  { label: 'A4 (8.27" × 11.69")', value: 'a4', width: 8.27, height: 11.69 },
  { label: 'Legal (8.5" × 14")', value: 'legal', width: 8.5, height: 14 },
];

export default function QRCodePrintManager() {
  const { user, organization } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [qrSize, setQrSize] = useState('1');
  const [paperSize, setPaperSize] = useState('letter');
  const [showAssetNames, setShowAssetNames] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Asset type filtering state
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);
  const [selectedAssetTypes, setSelectedAssetTypes] = useState<Set<string>>(new Set());
  const [showAllAssetTypes, setShowAllAssetTypes] = useState(true);

  useEffect(() => {
    fetchAssets();
  }, []);

  useEffect(() => {
    if (organization?.id) {
      fetchAssetTypes();
    }
  }, [organization?.id]);

  useEffect(() => {
    // Filter assets based on search term and asset type
    let filtered = assets.filter(asset =>
      asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.barcode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.asset_type_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Apply asset type filter if not showing all
    if (!showAllAssetTypes && selectedAssetTypes.size > 0) {
      filtered = filtered.filter(asset => {
        // Find the asset type by name to get the ID
        const assetType = assetTypes.find(type => type.name === asset.asset_type_name);
        return assetType && selectedAssetTypes.has(assetType.id);
      });
    }

    setFilteredAssets(filtered);
  }, [assets, searchTerm, selectedAssetTypes, showAllAssetTypes, assetTypes]);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('assets')
        .select(`
          id,
          name,
          barcode,
          organization_id,
          asset_types(name)
        `)
        .eq('is_deleted', false)
        .order('name');

      if (error) throw error;

      const transformedAssets: Asset[] = data?.map(asset => ({
        id: asset.id,
        name: asset.name,
        barcode: asset.barcode || '',
        asset_type_name: asset.asset_types?.name || 'Unknown',
        organization_id: asset.organization_id
      })) || [];

      setAssets(transformedAssets);
    } catch (error) {
      console.error('Error fetching assets:', error);
      toast.error('Failed to load assets');
    } finally {
      setLoading(false);
    }
  };

  const fetchAssetTypes = async () => {
    try {
      if (!organization?.id) return;
      
      const assetTypesList = await getAssetTypes(organization.id);
      setAssetTypes(assetTypesList);
    } catch (error) {
      console.error('Error fetching asset types:', error);
      toast.error('Failed to load asset types');
    }
  };

  const toggleAssetSelection = (assetId: string) => {
    const newSelected = new Set(selectedAssets);
    if (newSelected.has(assetId)) {
      newSelected.delete(assetId);
    } else {
      newSelected.add(assetId);
    }
    setSelectedAssets(newSelected);
  };

  const selectAll = () => {
    setSelectedAssets(new Set(filteredAssets.map(asset => asset.id)));
  };

  const clearSelection = () => {
    setSelectedAssets(new Set());
  };

  const toggleAssetTypeSelection = (assetTypeId: string) => {
    const newSelected = new Set(selectedAssetTypes);
    if (newSelected.has(assetTypeId)) {
      newSelected.delete(assetTypeId);
    } else {
      newSelected.add(assetTypeId);
    }
    setSelectedAssetTypes(newSelected);
    setShowAllAssetTypes(false);
  };

  const selectAllAssetTypes = () => {
    setShowAllAssetTypes(true);
    setSelectedAssetTypes(new Set());
  };

  const selectNoAssetTypes = () => {
    setShowAllAssetTypes(false);
    setSelectedAssetTypes(new Set());
  };



  const calculateLayout = () => {
    const paper = PAPER_SIZES.find(p => p.value === paperSize)!;
    const sizeInches = parseFloat(qrSize);
    const margin = 0.25; // 0.25" margins
    const spacing = 0.125; // 0.125" spacing between QR codes
    
    // Add extra height for asset names if enabled
    const itemHeight = showAssetNames ? sizeInches + 0.3 : sizeInches;
    
    // Calculate usable area
    const usableWidth = paper.width - (2 * margin);
    const usableHeight = paper.height - (2 * margin);
    
    // Calculate how many QR codes fit
    const codesPerRow = Math.floor((usableWidth + spacing) / (sizeInches + spacing));
    const codesPerColumn = Math.floor((usableHeight + spacing) / (itemHeight + spacing));
    const codesPerPage = codesPerRow * codesPerColumn;
    
    return { codesPerRow, codesPerColumn, codesPerPage, sizeInches, spacing, margin };
  };

  const generateQRUrl = (assetId: string) => {
    return `${window.location.origin}/mobile/asset/${assetId}`;
  };

  const generatePrintDocument = async () => {
    if (selectedAssets.size === 0) {
      toast.error('Please select at least one asset');
      return;
    }

    setIsGenerating(true);

    try {
      const layout = calculateLayout();
      const selectedAssetsList = filteredAssets.filter(asset => selectedAssets.has(asset.id));
      
      // Create a new window for the print document
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('Please allow popups to generate print sheets');
        setIsGenerating(false);
        return;
      }

      // Calculate pages needed
      const totalPages = Math.ceil(selectedAssetsList.length / layout.codesPerPage);
      
      // Generate QR codes as SVG strings
      const qrCodePromises = selectedAssetsList.map(async (asset) => {
        const qrUrl = generateQRUrl(asset.id);
        const qrSvg = await QRCode.toString(qrUrl, {
          type: 'svg',
          width: layout.sizeInches * 60,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        return { asset, qrSvg };
      });
      
      const qrCodeData = await Promise.all(qrCodePromises);
      
      // Generate HTML for print document
      let html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>QR Code Print Sheet</title>
          <style>
            @page {
              size: ${paperSize === 'letter' ? '8.5in 11in' : paperSize === 'a4' ? 'A4' : '8.5in 14in'};
              margin: ${layout.margin}in;
            }
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
            }
            .page {
              width: 100%;
              height: 100vh;
              display: flex;
              flex-direction: column;
              page-break-after: always;
            }
            .page:last-child {
              page-break-after: avoid;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(${layout.codesPerRow}, 1fr);
              gap: ${layout.spacing}in;
              flex: 1;
            }
            .qr-item {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: ${showAssetNames ? 'flex-start' : 'center'};
              width: ${layout.sizeInches}in;
              height: ${showAssetNames ? layout.sizeInches + 0.3 : layout.sizeInches}in;
              border: 1px dashed #ccc;
              text-align: center;
              padding: 0.05in;
              box-sizing: border-box;
            }
            .qr-code {
              width: ${layout.sizeInches * 0.85}in;
              height: ${layout.sizeInches * 0.85}in;
              flex-shrink: 0;
            }
            .qr-code svg {
              width: 100% !important;
              height: 100% !important;
            }
            .asset-name {
              font-size: ${Math.max(8, layout.sizeInches * 5)}px;
              font-weight: bold;
              margin-top: 4px;
              word-break: break-word;
              line-height: 1.1;
              max-width: 100%;
              overflow: hidden;
              text-overflow: ellipsis;
              color: #000;
            }
            .page-header {
              text-align: center;
              margin-bottom: 0.2in;
              font-size: 12px;
              color: #666;
            }
          </style>
        </head>
        <body>
      `;

              // Generate pages
        for (let page = 0; page < totalPages; page++) {
          const startIndex = page * layout.codesPerPage;
          const endIndex = Math.min(startIndex + layout.codesPerPage, qrCodeData.length);
          const pageQRCodes = qrCodeData.slice(startIndex, endIndex);

          html += `
            <div class="page">
              <div class="page-header">
                QR Code Print Sheet - Page ${page + 1} of ${totalPages} - ${qrSize}" × ${qrSize}" codes
              </div>
              <div class="grid">
          `;

          pageQRCodes.forEach(({ asset, qrSvg }) => {
            html += `
              <div class="qr-item">
                <div class="qr-code">
                  ${qrSvg}
                </div>
                ${showAssetNames ? `<div class="asset-name">${asset.name}</div>` : ''}
              </div>
            `;
          });

                  // Fill remaining grid slots with empty cells
          const remainingSlots = layout.codesPerPage - pageQRCodes.length;
          for (let i = 0; i < remainingSlots; i++) {
            html += '<div class="qr-item" style="border: none;"></div>';
          }

        html += `
            </div>
          </div>
        `;
      }

      html += `
        </body>
        </html>
      `;

      printWindow.document.write(html);
      printWindow.document.close();

      // Focus the print window and show print dialog
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 500);

      toast.success(`Generated ${totalPages} page(s) with ${selectedAssets.size} QR codes`);
    } catch (error) {
      console.error('Error generating print document:', error);
      toast.error('Failed to generate print document');
    } finally {
      setIsGenerating(false);
    }
  };

  const layout = calculateLayout();

  if (loading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading assets...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">QR Code Print Manager</h1>
        <p className="text-muted-foreground">
          Select assets, choose print settings, and generate print-ready QR code sheets
        </p>
      </div>

      {/* Controls - Compact Single Row */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
            {/* Search */}
            <div className="sm:col-span-2">
              <Label className="text-xs font-medium">Search Assets</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, barcode, or type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-9"
                />
              </div>
            </div>

            {/* Asset Type Filter */}
            <div>
              <Label className="text-xs font-medium">Asset Types</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-9 mt-1 w-full justify-between"
                  >
                    <span className="truncate">
                      {showAllAssetTypes 
                        ? "All Types"
                        : selectedAssetTypes.size === 0
                        ? "No Types"
                        : selectedAssetTypes.size === 1
                        ? assetTypes.find(t => selectedAssetTypes.has(t.id))?.name || "1 Type"
                        : `${selectedAssetTypes.size} Types`
                      }
                    </span>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2" align="start">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 p-2 hover:bg-muted rounded border-b">
                      <Checkbox
                        id="all-types"
                        checked={showAllAssetTypes}
                        onCheckedChange={() => selectAllAssetTypes()}
                      />
                      <Label htmlFor="all-types" className="flex-1 cursor-pointer font-medium">
                        All Asset Types
                      </Label>
                    </div>
                    {assetTypes.map(assetType => (
                      <div key={assetType.id} className="flex items-center space-x-2 p-2 hover:bg-muted rounded">
                        <Checkbox
                          id={`type-${assetType.id}`}
                          checked={!showAllAssetTypes && selectedAssetTypes.has(assetType.id)}
                          onCheckedChange={() => toggleAssetTypeSelection(assetType.id)}
                          disabled={showAllAssetTypes}
                        />
                        <Label 
                          htmlFor={`type-${assetType.id}`} 
                          className="flex-1 cursor-pointer text-sm"
                          style={{ color: assetType.color || undefined }}
                        >
                          {assetType.name}
                        </Label>
                      </div>
                    ))}
                    {!showAllAssetTypes && selectedAssetTypes.size > 0 && (
                      <div className="pt-2 border-t">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={selectNoAssetTypes}
                          className="w-full text-xs"
                        >
                          Clear Selection
                        </Button>
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* QR Size */}
            <div>
              <Label className="text-xs font-medium">QR Size</Label>
              <Select value={qrSize} onValueChange={setQrSize}>
                <SelectTrigger className="h-9 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QR_SIZES.map(size => (
                    <SelectItem key={size.value} value={size.value}>
                      {size.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Paper Size */}
            <div>
              <Label className="text-xs font-medium">Paper</Label>
              <Select value={paperSize} onValueChange={setPaperSize}>
                <SelectTrigger className="h-9 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAPER_SIZES.map(paper => (
                    <SelectItem key={paper.value} value={paper.value}>
                      {paper.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Options & View Toggle */}
            <div className="flex flex-col space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="show-names"
                  checked={showAssetNames}
                  onCheckedChange={setShowAssetNames}
                />
                <Label htmlFor="show-names" className="text-xs">Names</Label>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={viewMode === 'grid' ? () => setViewMode('list') : () => setViewMode('grid')}
                className="h-7"
              >
                {viewMode === 'grid' ? <List className="h-3 w-3" /> : <Grid className="h-3 w-3" />}
              </Button>
            </div>
          </div>

          {/* Stats and Actions Row */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-2">
                <Badge variant="outline">{filteredAssets.length} assets</Badge>
                <Badge variant="secondary">{selectedAssets.size} selected</Badge>
                {!showAllAssetTypes && selectedAssetTypes.size > 0 && (
                  <Badge variant="default" className="text-xs">
                    {selectedAssetTypes.size} type{selectedAssetTypes.size !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
              <div className="hidden sm:block text-xs text-muted-foreground">
                Grid: {layout.codesPerRow}×{layout.codesPerColumn} | {layout.codesPerPage} per page | {Math.ceil(selectedAssets.size / layout.codesPerPage)} pages needed
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={selectAll}>
                Select All ({filteredAssets.length})
              </Button>
              <Button variant="outline" size="sm" onClick={clearSelection} disabled={selectedAssets.size === 0}>
                Clear
              </Button>
              <Button 
                onClick={generatePrintDocument}
                disabled={selectedAssets.size === 0 || isGenerating}
                size="sm"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b border-white mr-2"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <Printer className="h-3 w-3 mr-2" />
                    Print {selectedAssets.size} QR Codes
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Asset Grid/List */}
      <Card>
        <CardContent className="p-6">
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
              {filteredAssets.map(asset => (
                <div
                  key={asset.id}
                  className={`border rounded-lg p-3 cursor-pointer transition-all ${
                    selectedAssets.has(asset.id)
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => toggleAssetSelection(asset.id)}
                >
                  <div className="flex flex-col items-center space-y-2">
                    <QRCodeSVG
                      value={generateQRUrl(asset.id)}
                      size={60}
                      level="M"
                      className="border"
                    />
                    <div className="text-center">
                      <div className="text-xs font-medium truncate w-full" title={asset.name}>
                        {asset.name}
                      </div>
                      <div className="text-xs text-muted-foreground truncate w-full" title={asset.asset_type_name}>
                        {asset.asset_type_name}
                      </div>
                    </div>
                    {selectedAssets.has(asset.id) && (
                      <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                        <ChevronUp className="h-2 w-2 text-white" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredAssets.map(asset => (
                <div
                  key={asset.id}
                  className={`flex items-center space-x-4 p-3 rounded-lg cursor-pointer transition-all ${
                    selectedAssets.has(asset.id)
                      ? 'border border-primary bg-primary/5'
                      : 'border border-border hover:border-primary/50'
                  }`}
                  onClick={() => toggleAssetSelection(asset.id)}
                >
                  <Checkbox
                    checked={selectedAssets.has(asset.id)}
                    onCheckedChange={() => {}} // Handled by parent click
                  />
                  <QRCodeSVG
                    value={generateQRUrl(asset.id)}
                    size={40}
                    level="M"
                    className="border"
                  />
                  <div className="flex-1">
                    <div className="font-medium">{asset.name}</div>
                    <div className="text-sm text-muted-foreground">{asset.asset_type_name}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {filteredAssets.length === 0 && !loading && (
            <div className="text-center py-16">
              <p className="text-muted-foreground">No assets found matching your search.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 