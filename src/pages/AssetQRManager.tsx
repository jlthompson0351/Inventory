import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useOrganization } from "@/hooks/useOrganization";
import { supabase } from "@/integrations/supabase/client";
import { 
  QrCode, 
  Download, 
  Printer, 
  Copy, 
  ExternalLink,
  Search,
  RefreshCw,
  ArrowLeft,
  DownloadCloud,
  Grid,
  List
} from "lucide-react";
import MobileQRCodeDisplay from "@/components/asset/MobileQRCodeDisplay";
import { generateMobileAssetQR, generateBulkMobileAssetQRs } from "@/services/qrService";

interface Asset {
  id: string;
  name: string;
  description?: string;
  status?: string;
  asset_type?: {
    id: string;
    name: string;
    color: string;
  };
  has_inventory?: boolean;
  barcode?: string;
}

export default function AssetQRManager() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();
  
  const [assets, setAssets] = useState<Asset[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [assetTypeFilter, setAssetTypeFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [bulkDownloading, setBulkDownloading] = useState(false);

  useEffect(() => {
    if (currentOrganization?.id) {
      loadAssets();
    }
  }, [currentOrganization?.id]);

  useEffect(() => {
    filterAssets();
  }, [assets, searchTerm, statusFilter, assetTypeFilter]);

  const loadAssets = async () => {
    if (!currentOrganization?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('assets')
        .select(`
          id,
          name,
          description,
          status,
          barcode,
          asset_type:asset_types(id, name, color)
        `)
        .eq('organization_id', currentOrganization.id)
        .eq('is_deleted', false)
        .order('name');

      if (error) throw error;
      setAssets(data || []);
    } catch (error) {
      console.error('Error loading assets:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load assets.",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterAssets = () => {
    let filtered = assets;

    if (searchTerm) {
      filtered = filtered.filter(asset => 
        asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.asset_type?.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(asset => asset.status === statusFilter);
    }

    if (assetTypeFilter !== "all") {
      filtered = filtered.filter(asset => asset.asset_type?.name === assetTypeFilter);
    }

    setFilteredAssets(filtered);
  };

  const handleSelectAsset = (assetId: string, checked: boolean) => {
    const newSelected = new Set(selectedAssets);
    if (checked) {
      newSelected.add(assetId);
    } else {
      newSelected.delete(assetId);
    }
    setSelectedAssets(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedAssets.size === filteredAssets.length) {
      setSelectedAssets(new Set());
    } else {
      setSelectedAssets(new Set(filteredAssets.map(asset => asset.id)));
    }
  };

  const handleBulkDownload = async () => {
    if (selectedAssets.size === 0) {
      toast({
        variant: "destructive",
        title: "No Assets Selected",
        description: "Please select assets to download QR codes.",
      });
      return;
    }

    setBulkDownloading(true);
    try {
      const assetIds = Array.from(selectedAssets);
      const qrCodes = await generateBulkMobileAssetQRs(assetIds, { width: 300 });
      
      // Create a zip file or download individually
      for (const qr of qrCodes) {
        const link = document.createElement('a');
        link.download = `${qr.asset_name}-qr.png`;
        link.href = qr.qr_data_url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Small delay between downloads
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      toast({
        title: "QR Codes Downloaded",
        description: `Downloaded ${qrCodes.length} QR codes successfully.`,
      });
    } catch (error) {
      console.error('Error downloading QR codes:', error);
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: "Failed to download QR codes.",
      });
    } finally {
      setBulkDownloading(false);
    }
  };

  const assetTypes = Array.from(new Set(assets.map(asset => asset.asset_type?.name).filter(Boolean)));

  if (loading) {
    return (
      <div className="container py-6">
        <Card>
          <CardHeader>
            <CardTitle>Loading QR Codes...</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Please wait while we load your assets.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => navigate('/assets')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Assets
              </Button>
              <div>
                <CardTitle className="text-2xl">QR Code Manager</CardTitle>
                <p className="text-muted-foreground">
                  Generate, download, and manage QR codes for your assets
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={handleBulkDownload}
                disabled={selectedAssets.size === 0 || bulkDownloading}
              >
                {bulkDownloading ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <DownloadCloud className="mr-2 h-4 w-4" />
                )}
                Download Selected ({selectedAssets.size})
              </Button>
              <Button variant="outline" onClick={loadAssets}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Filters and Controls */}
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle>Asset QR Codes</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {filteredAssets.length} of {assets.length} assets
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="relative w-full sm:w-64">
                    <Input
                      placeholder="Search assets..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                    <div className="absolute left-2.5 top-2.5">
                      <Search className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="retired">Retired</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={assetTypeFilter} onValueChange={setAssetTypeFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Asset Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {assetTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex rounded-md border">
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                      className="rounded-r-none"
                    >
                      <Grid className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                      className="rounded-l-none"
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Bulk Selection */}
              <div className="flex items-center gap-2 pt-3 border-t">
                <input
                  type="checkbox"
                  checked={selectedAssets.size === filteredAssets.length && filteredAssets.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-muted-foreground">
                  Select All ({filteredAssets.length} assets)
                </span>
              </div>
            </CardHeader>
            
            <CardContent>
              {/* Asset Grid/List */}
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredAssets.map((asset) => (
                    <div key={asset.id} className="relative">
                      <input
                        type="checkbox"
                        checked={selectedAssets.has(asset.id)}
                        onChange={(e) => handleSelectAsset(asset.id, e.target.checked)}
                        className="absolute top-2 left-2 z-10 rounded border-gray-300"
                      />
                      <MobileQRCodeDisplay
                        assetId={asset.id}
                        assetName={asset.name}
                        size="small"
                        showControls={true}
                        className="pt-8"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredAssets.map((asset) => (
                    <div key={asset.id} className="flex items-center gap-4 p-4 border rounded-lg">
                      <input
                        type="checkbox"
                        checked={selectedAssets.has(asset.id)}
                        onChange={(e) => handleSelectAsset(asset.id, e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{asset.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {asset.asset_type?.name} • {asset.status}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm"                         onClick={() => {
                          // Copy URL logic
                          const baseUrl = window.location.origin;
                          const mobileUrl = `${baseUrl}/mobile-test/asset/${asset.id}`;
                          navigator.clipboard.writeText(mobileUrl);
                          toast({ title: "URL Copied", description: "Mobile URL copied to clipboard." });
                        }}>
                          <Copy className="h-3 w-3 mr-1" />
                          Copy URL
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => {
                          const baseUrl = window.location.origin;
                          const mobileUrl = `${baseUrl}/mobile-test/asset/${asset.id}`;
                          window.open(mobileUrl, '_blank');
                        }}>
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Test
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {filteredAssets.length === 0 && (
                <div className="text-center py-12">
                  <QrCode className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium mb-2">No assets found</p>
                  <p className="text-muted-foreground">Try adjusting your filters or search terms.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
} 