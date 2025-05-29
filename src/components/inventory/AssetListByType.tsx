import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Search, Package, ArrowRight, Loader2, Plus, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { useOrganization } from "@/hooks/useOrganization";
import { getAssetTypeById, AssetType } from "@/services/assetTypeService";
import { getAssetsByAssetType, Asset } from "@/services/assetService";

export function AssetListByType() {
  const { assetTypeId } = useParams<{ assetTypeId: string }>();
  const navigate = useNavigate();
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();
  const [assetType, setAssetType] = useState<AssetType | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (currentOrganization?.id && assetTypeId) {
      loadAssetTypeDetails();
      loadAssets();
    }
  }, [currentOrganization?.id, assetTypeId]);

  const loadAssetTypeDetails = async () => {
    if (!currentOrganization?.id || !assetTypeId) return;
    
    try {
      const assetTypeData = await getAssetTypeById(assetTypeId);
      setAssetType(assetTypeData);
    } catch (error) {
      console.error("Error loading asset type details:", error);
      toast({
        title: "Error",
        description: "Failed to load asset type details",
        variant: "destructive",
      });
    }
  };

  const loadAssets = async () => {
    if (!currentOrganization?.id || !assetTypeId) return;
    
    setLoading(true);
    try {
      const assetList = await getAssetsByAssetType(assetTypeId);
      setAssets(assetList);
    } catch (error) {
      console.error("Error loading assets:", error);
      toast({
        title: "Error",
        description: "Failed to load assets",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredAssets = assets.filter(asset => 
    asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (asset.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
    (asset.asset_id?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  );

  const handleSelectAsset = (assetId: string) => {
    // Navigate to the action selector where user can choose intake vs inventory check
    navigate(`/inventory/action/${assetId}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate("/inventory/browse-assets")}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {assetType?.name || "Loading..."}
          </h1>
          <p className="text-muted-foreground">
            Select an asset to add inventory
          </p>
        </div>
      </div>

      {assetType && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Asset Type Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium">Description</h3>
                <p className="text-sm text-muted-foreground">
                  {assetType.description || "No description available"}
                </p>
              </div>
              <div>
                {assetType.intake_form_id && (
                  <Badge className="mb-2" variant="outline">
                    Has Form Template
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search assets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
          <p>Loading assets...</p>
        </div>
      ) : filteredAssets.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">No assets found</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm 
              ? "No assets match your search" 
              : "No assets have been created for this type yet"}
          </p>
          <p className="text-sm text-muted-foreground">
            Assets need to be created in the Assets section before you can manage their inventory.
          </p>
        </div>
      ) : (
        <ScrollArea className="h-[500px] pr-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAssets.map((asset) => (
              <Card 
                key={asset.id}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => handleSelectAsset(asset.id)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center text-base">
                    <List className="h-5 w-5 mr-2 text-primary" />
                    {asset.name}
                  </CardTitle>
                  {asset.asset_id && (
                    <p className="text-xs text-muted-foreground">ID: {asset.asset_id}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {asset.description || "No description available"}
                  </p>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="w-full justify-between"
                  >
                    Manage Inventory <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
} 