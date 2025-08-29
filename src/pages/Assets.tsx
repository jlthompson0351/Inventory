import { useState, useCallback, useMemo, useEffect } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Search, RefreshCw, QrCode } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AssetGrid from "@/components/inventory/AssetGrid";
import { getAssetTypes, type AssetType } from "@/services/assetTypeService";

// Assets page with layout matching Inventory Management
export default function Assets() {
  const { currentOrganization, isLoading } = useOrganization();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [assetTypeFilter, setAssetTypeFilter] = useState<string>("all");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);
  const [loadingAssetTypes, setLoadingAssetTypes] = useState(false);
  
  // Memoize the organization ID to prevent unnecessary re-renders
  const organizationId = useMemo(() => 
    currentOrganization?.id,
    [currentOrganization?.id]
  );

  // Fetch asset types when organization changes
  useEffect(() => {
    const fetchAssetTypes = async () => {
      if (!currentOrganization?.id) {
        setAssetTypes([]);
        return;
      }

      try {
        setLoadingAssetTypes(true);
        const types = await getAssetTypes(currentOrganization.id);
        setAssetTypes(types);
      } catch (error) {
        console.error('Error fetching asset types:', error);
        setAssetTypes([]);
      } finally {
        setLoadingAssetTypes(false);
      }
    };

    fetchAssetTypes();
  }, [currentOrganization?.id]);

  // Get the selected asset type ID for filtering
  const selectedAssetTypeId = useMemo(() => 
    assetTypeFilter === "all" ? undefined : assetTypeFilter,
    [assetTypeFilter]
  );

  // Memoize handlers to prevent recreation on every render
  const handleAddNewAsset = useCallback(() => {
    navigate("/assets/new");
  }, [navigate]);

  const handleBrowseAssetTypes = useCallback(() => {
    navigate("/asset-types");
  }, [navigate]);

  const handleQRManager = useCallback(() => {
    navigate("/assets/qr-manager");
  }, [navigate]);
  
  const handleRefresh = useCallback(async () => {
    setRefreshTrigger(prev => prev + 1);
    
    // Also refresh asset types
    if (currentOrganization?.id) {
      try {
        setLoadingAssetTypes(true);
        const types = await getAssetTypes(currentOrganization.id);
        setAssetTypes(types);
      } catch (error) {
        console.error('Error refreshing asset types:', error);
      } finally {
        setLoadingAssetTypes(false);
      }
    }
  }, [currentOrganization?.id]);
  
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleAssetEdit = useCallback((asset: any) => {
    navigate(`/assets/${asset.id}/edit`);
  }, [navigate]);

  const handleAssetDelete = useCallback((asset: any) => {
    // Handle asset deletion with confirmation
    if (window.confirm(`Are you sure you want to delete "${asset.name}"?`)) {
      // Delete asset
      // Implement actual deletion logic here
    }
  }, []);

  const handleGenerateQR = useCallback((asset: any) => {
    navigate(`/assets/${asset.id}/qr`);
  }, [navigate]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="container py-6">
        <Card>
          <CardHeader>
            <CardTitle>Loading Assets...</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Please wait while we fetch your assets.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show no organization selected state
  if (!currentOrganization) {
    return (
      <div className="container py-6">
        <Card>
          <CardHeader>
            <CardTitle>No Organization Selected</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Please select an organization to view assets.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-6">
            <div className="text-center">
              <CardTitle className="text-3xl font-bold">Asset Management</CardTitle>
              <CardDescription className="text-lg mt-2">
                Manage and track assets for {currentOrganization.name}
              </CardDescription>
            </div>
            
            {/* All Controls on One Row */}
            <div className="flex items-center gap-2 overflow-x-auto">
              <div className="relative w-56 flex-shrink-0">
                <Input
                  placeholder="Search assets..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="pl-8"
                />
                <div className="absolute left-2.5 top-2.5">
                  <Search className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-28">
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
                <SelectTrigger className="w-36">
                  <SelectValue placeholder={loadingAssetTypes ? "Loading..." : "Asset Type"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {assetTypes.map((assetType) => (
                    <SelectItem key={assetType.id} value={assetType.id}>
                      <div className="flex items-center gap-2">
                        {assetType.color && (
                          <div 
                            className="w-3 h-3 rounded-full border border-gray-300"
                            style={{ backgroundColor: assetType.color }}
                          />
                        )}
                        {assetType.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
              
              <Button variant="outline" size="sm" onClick={handleBrowseAssetTypes}>
                <Search className="mr-1 h-4 w-4" />
                Browse
              </Button>
              
              <Button variant="outline" size="sm" onClick={handleQRManager}>
                <QrCode className="mr-1 h-4 w-4" />
                QR Manager
              </Button>
              
              <Button onClick={handleAddNewAsset}>
                <Plus className="mr-1 h-4 w-4" />
                Add Asset
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <AssetGrid 
            key={`asset-grid-${refreshTrigger}`}
            organizationId={organizationId}
            assetTypeId={selectedAssetTypeId}
            searchTerm={searchTerm}
            onEdit={handleAssetEdit}
            onDelete={handleAssetDelete}
            onGenerateQR={handleGenerateQR}
          />
        </CardContent>
      </Card>
    </div>
  );
} 