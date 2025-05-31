import { useState, useCallback, useMemo } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Search, RefreshCw, QrCode } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AssetGrid from "@/components/inventory/AssetGrid";

// Assets page with layout matching Inventory Management
export default function Assets() {
  const { currentOrganization, isLoading } = useOrganization();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [assetTypeFilter, setAssetTypeFilter] = useState<string>("all");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Debug logging - only on initial render
  console.log("Assets.tsx rendering");
  
  // Memoize the organization ID to prevent unnecessary re-renders
  const organizationId = useMemo(() => 
    currentOrganization?.id,
    [currentOrganization?.id]
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
  
  const handleRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);
  
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleAssetEdit = useCallback((asset: any) => {
    navigate(`/assets/${asset.id}/edit`);
  }, [navigate]);

  const handleAssetDelete = useCallback((asset: any) => {
    // Handle asset deletion with confirmation
    if (window.confirm(`Are you sure you want to delete "${asset.name}"?`)) {
      console.log("Delete asset:", asset.id);
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
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl">Asset Management</CardTitle>
              <CardDescription>
                Manage and track assets for {currentOrganization.name}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleBrowseAssetTypes}>
                <Search className="mr-2 h-4 w-4" />
                Browse Asset Types
              </Button>
              <Button variant="outline" onClick={handleQRManager}>
                <QrCode className="mr-2 h-4 w-4" />
                QR Manager
              </Button>
              <Button onClick={handleAddNewAsset}>
                <Plus className="mr-2 h-4 w-4" />
                Add Asset
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle>Your Assets</CardTitle>
                  <CardDescription>
                    View, edit, and manage your assets with QR codes and inventory tracking.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="relative w-full sm:w-64">
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
                      <SelectItem value="equipment">Equipment</SelectItem>
                      <SelectItem value="vehicle">Vehicle</SelectItem>
                      <SelectItem value="tool">Tool</SelectItem>
                      <SelectItem value="furniture">Furniture</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={handleRefresh}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <AssetGrid 
                key={`asset-grid-${refreshTrigger}`}
                organizationId={organizationId}
                searchTerm={searchTerm}
                onEdit={handleAssetEdit}
                onDelete={handleAssetDelete}
                onGenerateQR={handleGenerateQR}
              />
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
} 