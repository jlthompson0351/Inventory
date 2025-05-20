import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { barcodeService } from '@/services/barcodeService';
import Barcode from 'react-barcode';
import { QRCodeSVG } from 'qrcode.react';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check, Search, Printer, RefreshCw } from 'lucide-react';

interface BarcodeManagerProps {
  assetTypeId: string;
  assetId?: string;
  assetName?: string;
  assetTypeSettings?: {
    barcode_enabled: boolean;
    barcode_type: 'qrcode' | 'code128' | 'code39';
    barcode_prefix: string;
  };
  onSettingsChanged?: () => void;
}

export function BarcodeManager({
  assetTypeId,
  assetId,
  assetName,
  assetTypeSettings,
  onSettingsChanged
}: BarcodeManagerProps) {
  const [settings, setSettings] = useState({
    barcode_enabled: assetTypeSettings?.barcode_enabled || false,
    barcode_type: assetTypeSettings?.barcode_type || 'qrcode',
    barcode_prefix: assetTypeSettings?.barcode_prefix || '',
  });
  
  const [barcode, setBarcode] = useState<string | null>(null);
  const [searchBarcode, setSearchBarcode] = useState('');
  const [searchResult, setSearchResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [tab, setTab] = useState('view');
  
  // Load initial barcode if available
  useEffect(() => {
    if (assetId && settings.barcode_enabled) {
      loadBarcode();
    }
  }, [assetId, settings.barcode_enabled]);
  
  // Update settings when props change
  useEffect(() => {
    if (assetTypeSettings) {
      setSettings({
        barcode_enabled: assetTypeSettings.barcode_enabled,
        barcode_type: assetTypeSettings.barcode_type,
        barcode_prefix: assetTypeSettings.barcode_prefix,
      });
    }
  }, [assetTypeSettings]);
  
  const loadBarcode = async () => {
    if (!assetId) return;
    setLoading(true);
    try {
      const result = await barcodeService.generateBarcode(assetTypeId, assetId);
      setBarcode(result);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const success = await barcodeService.updateBarcodeSettings(assetTypeId, settings);
      if (success && onSettingsChanged) {
        onSettingsChanged();
      }
    } finally {
      setSaving(false);
    }
  };
  
  const handleSearch = async () => {
    if (!searchBarcode.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a barcode to search',
        variant: 'destructive',
      });
      return;
    }
    
    setLoading(true);
    try {
      const result = await barcodeService.findAssetByBarcode(searchBarcode);
      setSearchResult(result);
      if (!result) {
        toast({
          title: 'Not Found',
          description: 'No asset found with this barcode',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };
  
  const handleBulkGenerate = async () => {
    setGenerating(true);
    try {
      const count = await barcodeService.bulkGenerateBarcodes(assetTypeId);
      if (count > 0) {
        toast({
          title: 'Success',
          description: `Generated ${count} barcodes successfully`,
        });
      }
    } finally {
      setGenerating(false);
    }
  };
  
  const handlePrint = () => {
    const printContent = document.getElementById('barcode-print-section');
    if (!printContent) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: 'Error',
        description: 'Unable to open print window. Please check your browser settings.',
        variant: 'destructive',
      });
      return;
    }
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Barcode</title>
          <style>
            body { font-family: Arial, sans-serif; }
            .container { text-align: center; padding: 20px; }
            .barcode-container { margin: 20px 0; }
            .asset-info { margin-top: 10px; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            ${printContent.innerHTML}
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Barcode Management
          {settings.barcode_enabled && (
            <Badge variant="outline" className="ml-2">
              Enabled
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="view">View Barcode</TabsTrigger>
            <TabsTrigger value="search">Search</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="view">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : settings.barcode_enabled && barcode ? (
              <div className="space-y-4">
                <div id="barcode-print-section" className="p-4 border rounded-lg flex flex-col items-center">
                  <div className="barcode-container">
                    {settings.barcode_type === 'qrcode' ? (
                      <QRCodeSVG value={barcode} size={200} />
                    ) : (
                      <Barcode value={barcode} format={settings.barcode_type} />
                    )}
                  </div>
                  <div className="asset-info mt-2 text-sm text-center">
                    <p className="font-semibold">{assetName || 'Asset'}</p>
                    <p className="text-xs text-muted-foreground">{barcode}</p>
                  </div>
                </div>
                
                <div className="flex justify-center space-x-2">
                  <Button onClick={handlePrint} variant="outline" className="flex items-center">
                    <Printer className="mr-2 h-4 w-4" />
                    Print
                  </Button>
                  <Button onClick={loadBarcode} variant="outline" className="flex items-center">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                {!settings.barcode_enabled ? (
                  <p>Barcodes are not enabled for this asset type.</p>
                ) : !assetId ? (
                  <p>Save the asset first to generate a barcode.</p>
                ) : (
                  <div className="space-y-4">
                    <p>No barcode has been generated yet.</p>
                    <Button onClick={loadBarcode}>Generate Barcode</Button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="search">
            <div className="space-y-4">
              <div className="flex items-end space-x-2">
                <div className="flex-1">
                  <Label htmlFor="search-barcode">Barcode</Label>
                  <Input
                    id="search-barcode"
                    placeholder="Enter barcode to search"
                    value={searchBarcode}
                    onChange={(e) => setSearchBarcode(e.target.value)}
                  />
                </div>
                <Button onClick={handleSearch} disabled={loading}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4 mr-2" />
                  )}
                  Search
                </Button>
              </div>
              
              {searchResult && (
                <div className="border rounded-lg p-4 mt-4">
                  <h3 className="font-semibold text-lg mb-2">Asset Found</h3>
                  <div className="space-y-2">
                    <p><span className="font-medium">Name:</span> {searchResult.name}</p>
                    <p><span className="font-medium">Type:</span> {searchResult.asset_type_name}</p>
                    <p><span className="font-medium">Barcode:</span> {searchResult.barcode}</p>
                    <p><span className="font-medium">Created:</span> {new Date(searchResult.created_at).toLocaleString()}</p>
                    <Button
                      variant="outline"
                      onClick={() => window.open(`/assets/${searchResult.id}`, '_blank')}
                    >
                      View Asset
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="settings">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="barcode-enabled"
                  checked={settings.barcode_enabled}
                  onCheckedChange={(checked) => 
                    setSettings({...settings, barcode_enabled: checked === true})
                  }
                />
                <Label htmlFor="barcode-enabled">Enable barcodes for this asset type</Label>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="barcode-type">Barcode Type</Label>
                <Select
                  value={settings.barcode_type}
                  onValueChange={(value: 'qrcode' | 'code128' | 'code39') => 
                    setSettings({...settings, barcode_type: value})
                  }
                  disabled={!settings.barcode_enabled}
                >
                  <SelectTrigger id="barcode-type">
                    <SelectValue placeholder="Select barcode type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="qrcode">QR Code</SelectItem>
                    <SelectItem value="code128">Code 128</SelectItem>
                    <SelectItem value="code39">Code 39</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="barcode-prefix">Barcode Prefix (Optional)</Label>
                <Input
                  id="barcode-prefix"
                  placeholder="Enter prefix"
                  value={settings.barcode_prefix}
                  onChange={(e) => setSettings({...settings, barcode_prefix: e.target.value})}
                  disabled={!settings.barcode_enabled}
                  maxLength={10}
                />
                <p className="text-xs text-muted-foreground">
                  A short prefix to identify this asset type, max 10 characters
                </p>
              </div>
              
              <div className="pt-4 flex justify-between">
                <Button
                  onClick={handleBulkGenerate}
                  disabled={!settings.barcode_enabled || generating}
                  variant="outline"
                >
                  {generating ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Bulk Generate for All Items
                </Button>
                
                <Button onClick={handleSaveSettings} disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Save Settings
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 