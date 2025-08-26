import { useState, useEffect } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Search, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AssetInventoryList from "@/components/inventory/AssetInventoryList";
import { getAssetTypes, type AssetType } from "@/services/assetTypeService";

// Inventory management page focused on inventory items, not assets
export default function Inventory() {
  const { currentOrganization, isLoading } = useOrganization();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [assetTypeFilter, setAssetTypeFilter] = useState<string>("all");
  const [refreshKey, setRefreshKey] = useState(0);
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);

  // Load asset types for the dropdown
  useEffect(() => {
    const loadAssetTypes = async () => {
      if (!currentOrganization?.id) return;
      
      try {
        const types = await getAssetTypes(currentOrganization.id);
        setAssetTypes(types);
      } catch (error) {
        console.error('Error loading asset types:', error);
      }
    };

    loadAssetTypes();
  }, [currentOrganization?.id]);

  const handleAddInventory = () => {
    navigate("/inventory/add");
  };

  const handleBrowseAssets = () => {
    navigate("/inventory/browse-assets");
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };



  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Inventory...</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Please wait while we fetch your inventory data.</p>
        </CardContent>
      </Card>
    );
  }

  if (!currentOrganization) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Organization Selected</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Please select an organization to view inventory.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      {/* Single Clean Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Inventory</h1>
          <p className="text-muted-foreground mt-1">
            Track and manage assets for {currentOrganization.name}
          </p>
        </div>
        <div className="flex flex-row gap-3 w-full lg:w-auto">
          <Button variant="outline" onClick={handleBrowseAssets} className="flex-1 lg:flex-none">
            <Search className="mr-2 h-4 w-4" />
            Browse Assets
          </Button>
          <Button onClick={handleAddInventory} className="flex-1 lg:flex-none">
            <Plus className="mr-2 h-4 w-4" />
            Add Inventory
          </Button>
        </div>
      </div>


      {/* Search and Filter Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-4 border-b">
        <p className="text-sm text-muted-foreground flex-1">
          {/* Dynamic count will be shown here when available */}
          Showing all inventory items with quantity tracking and status monitoring
        </p>
        <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
          <div className="relative min-w-0 sm:w-64">
            <Input
              placeholder="Search inventory..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
            <div className="absolute left-2.5 top-2.5">
              <Search className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          <div className="flex flex-row gap-2">
            <Select value={assetTypeFilter} onValueChange={setAssetTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Asset Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Asset Types</SelectItem>
                {assetTypes.map((assetType) => (
                  <SelectItem key={assetType.id} value={assetType.name}>
                    {assetType.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleRefresh} className="flex-shrink-0">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Inventory List */}
      <div id="inventory-list">
        <AssetInventoryList 
          key={refreshKey}
          organizationId={currentOrganization.id}
          searchTerm={searchTerm}
          categoryFilter={assetTypeFilter === "all" ? "" : assetTypeFilter}
        />
      </div>
    </div>
  );
}
