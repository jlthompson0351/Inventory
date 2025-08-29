import { useState, useEffect } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Search, RefreshCw, Package } from "lucide-react";
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
    <div className="animate-fade-in min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Enhanced Header with Dashboard Feel */}
      <div className="relative bg-white/90 backdrop-blur-sm border-b border-white/30 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                <Package className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Inventory
                </h1>
                <p className="text-gray-600 text-lg mt-1">
                  Track and manage assets for {currentOrganization.name}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-green-600 font-medium">Live inventory tracking</span>
                </div>
              </div>
            </div>
            
            {/* Enhanced Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 min-w-fit">
              <Button 
                variant="outline" 
                onClick={handleBrowseAssets} 
                className="h-11 bg-white/80 backdrop-blur-sm border-2 border-blue-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 flex items-center gap-2"
              >
                <Search className="h-4 w-4" />
                Browse Assets
              </Button>
              <Button 
                onClick={handleAddInventory}
                className="h-11 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Inventory
              </Button>
            </div>
          </div>
        </div>
      </div>


      {/* Enhanced Search and Filter Controls */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 p-6 mb-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <p className="text-sm text-gray-600 flex-1">
              Showing all inventory items with quantity tracking and status monitoring
            </p>
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <div className="relative min-w-0 sm:w-64">
                <Input
                  placeholder="Search inventory..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-11 border-2 border-gray-200 focus:border-blue-400"
                />
                <div className="absolute left-3 top-3">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
              </div>
              <div className="flex flex-row gap-3">
                <Select value={assetTypeFilter} onValueChange={setAssetTypeFilter}>
                  <SelectTrigger className="w-40 h-11 border-2 border-gray-200 focus:border-blue-400">
                    <SelectValue placeholder="Asset Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Asset Types</SelectItem>
                    {assetTypes.map((assetType) => (
                      <SelectItem key={assetType.id} value={assetType.name}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: assetType.color || '#6E56CF' }}
                          />
                          {assetType.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRefresh} 
                  className="h-11 border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Inventory List */}
        <div id="inventory-list">
          <AssetInventoryList 
            key={refreshKey}
            organizationId={currentOrganization.id}
            searchTerm={searchTerm}
            categoryFilter={assetTypeFilter === "all" ? "" : assetTypeFilter}
          />
        </div>
      </div>
    </div>
  );
}
