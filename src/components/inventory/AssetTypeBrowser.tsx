import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Search, Package, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { useOrganization } from "@/hooks/useOrganization";
import { getAssetTypes, AssetType } from "@/services/assetTypeService";

export function AssetTypeBrowser() {
  const navigate = useNavigate();
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (currentOrganization?.id) {
      loadAssetTypes();
    }
  }, [currentOrganization?.id]);

  const loadAssetTypes = async () => {
    if (!currentOrganization?.id) return;
    
    setLoading(true);
    try {
      const types = await getAssetTypes(currentOrganization.id);
      setAssetTypes(types);
    } catch (error) {
      console.error("Error loading asset types:", error);
      toast({
        title: "Error",
        description: "Failed to load asset types",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredAssetTypes = assetTypes.filter(type => 
    type.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (type.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate("/inventory/add")}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Select Asset Type</h1>
          <p className="text-muted-foreground">
            Choose an asset type to view available assets
          </p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search asset types..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
          <p>Loading asset types...</p>
        </div>
      ) : filteredAssetTypes.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">No asset types found</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm 
              ? "No asset types match your search" 
              : "You haven't created any asset types yet"}
          </p>
          <Button onClick={() => navigate("/asset-types/new")}>
            Create Asset Type
          </Button>
        </div>
      ) : (
        <ScrollArea className="h-[500px] pr-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAssetTypes.map((assetType) => (
              <Card 
                key={assetType.id}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => navigate(`/inventory/asset-type/${assetType.id}`)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center">
                    <Package className="h-5 w-5 mr-2 text-primary" />
                    {assetType.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-2">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {assetType.description || "No description available"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {assetType.asset_count > 0 && (
                      <Badge variant="outline">
                        {assetType.asset_count} assets
                      </Badge>
                    )}
                    {assetType.has_form && (
                      <Badge variant="secondary">Has form</Badge>
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-between" 
                    size="sm"
                  >
                    View Assets <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
} 