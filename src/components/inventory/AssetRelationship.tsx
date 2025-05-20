import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronsRight, ChevronRight, ChevronDown } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface Asset {
  id: string;
  name: string;
  asset_type_id: string;
  parent_asset_id?: string | null;
  asset_type?: {
    name: string;
    color: string;
  };
  children?: Asset[];
}

interface AssetRelationshipProps {
  assetId: string;
  onSelect?: (assetId: string) => void;
}

export default function AssetRelationship({ assetId, onSelect }: AssetRelationshipProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [asset, setAsset] = useState<Asset | null>(null);
  const [parentAssets, setParentAssets] = useState<Asset[]>([]);
  const [childAssets, setChildAssets] = useState<Asset[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (assetId) {
      fetchAssetDetails();
      fetchRelationships();
    }
  }, [assetId]);

  const fetchAssetDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('assets')
        .select(`
          id,
          name,
          asset_type_id,
          asset_type:asset_types(name, color)
        `)
        .eq('id', assetId)
        .single();

      if (error) throw error;
      setAsset(data);
    } catch (error) {
      console.error("Error fetching asset details:", error);
      toast({
        title: "Error",
        description: "Failed to load asset details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRelationships = async () => {
    try {
      setLoading(true);

      // Fetch child assets
      const { data: childrenData, error: childrenError } = await supabase
        .from('assets')
        .select(`
          id,
          name,
          asset_type_id,
          asset_type:asset_types(name, color)
        `)
        .eq('parent_asset_id', assetId);

      if (childrenError) throw childrenError;
      setChildAssets(childrenData || []);

      // Fetch parent chain
      if (asset?.parent_asset_id) {
        await fetchParentChain(asset.parent_asset_id);
      }
    } catch (error) {
      console.error("Error fetching relationships:", error);
      toast({
        title: "Error",
        description: "Failed to load asset relationships",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchParentChain = async (parentId: string, chain: Asset[] = []) => {
    try {
      const { data, error } = await supabase
        .from('assets')
        .select(`
          id,
          name,
          parent_asset_id,
          asset_type_id,
          asset_type:asset_types(name, color)
        `)
        .eq('id', parentId)
        .single();

      if (error) throw error;

      const updatedChain = [...chain, data];
      setParentAssets(updatedChain);

      // Continue up the chain if there's another parent
      if (data.parent_asset_id) {
        await fetchParentChain(data.parent_asset_id, updatedChain);
      }
    } catch (error) {
      console.error("Error fetching parent chain:", error);
    }
  };

  const fetchChildrenOfNode = async (nodeId: string) => {
    try {
      const { data, error } = await supabase
        .from('assets')
        .select(`
          id,
          name,
          asset_type_id,
          asset_type:asset_types(name, color)
        `)
        .eq('parent_asset_id', nodeId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error(`Error fetching children of node ${nodeId}:`, error);
      return [];
    }
  };

  const toggleNode = async (nodeId: string) => {
    setExpandedNodes(prev => {
      const isCurrentlyExpanded = prev[nodeId];
      
      if (!isCurrentlyExpanded) {
        // Load children when expanding
        fetchChildrenOfNode(nodeId).then(children => {
          setChildAssets(prev => {
            // Find the node to update
            const updatedAssets = [...prev];
            const nodeIndex = updatedAssets.findIndex(node => node.id === nodeId);
            
            if (nodeIndex !== -1) {
              updatedAssets[nodeIndex] = {
                ...updatedAssets[nodeIndex],
                children: children
              };
            }
            
            return updatedAssets;
          });
        });
      }
      
      return {
        ...prev,
        [nodeId]: !isCurrentlyExpanded
      };
    });
  };

  const handleSelectAsset = (id: string) => {
    if (onSelect) {
      onSelect(id);
    }
  };

  const renderAssetNode = (node: Asset, level: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes[node.id];
    
    return (
      <div key={node.id} className="space-y-1">
        <div 
          className={`
            flex items-center gap-1 p-2 hover:bg-muted rounded-md cursor-pointer
            ${node.id === assetId ? 'bg-muted' : ''}
          `}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
        >
          {hasChildren ? (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-5 w-5 p-0"
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(node.id);
              }}
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          ) : (
            <div className="w-5"></div>
          )}
          
          <div 
            className="flex-1 flex items-center gap-2"
            onClick={() => handleSelectAsset(node.id)}
          >
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ 
                backgroundColor: node.asset_type?.color || '#6E56CF'
              }}
            ></div>
            <span>{node.name}</span>
          </div>
        </div>
        
        {isExpanded && node.children && (
          <div className="pl-4">
            {node.children.map(child => renderAssetNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading && !asset) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Asset Relationships</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Asset Relationships</CardTitle>
      </CardHeader>
      <CardContent>
        {parentAssets.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-medium mb-2">Parent Chain</h3>
            <div className="bg-muted/50 p-2 rounded-md">
              <div className="flex items-center gap-2 flex-wrap">
                {parentAssets.slice().reverse().map((parent, index, array) => (
                  <div key={parent.id} className="flex items-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => handleSelectAsset(parent.id)}
                    >
                      <div 
                        className="w-2 h-2 rounded-full mr-2" 
                        style={{ 
                          backgroundColor: parent.asset_type?.color || '#6E56CF'
                        }}
                      ></div>
                      {parent.name}
                    </Button>
                    {index < array.length - 1 && (
                      <ChevronsRight className="h-4 w-4 text-muted-foreground mx-1" />
                    )}
                  </div>
                ))}
                <ChevronsRight className="h-4 w-4 text-muted-foreground mx-1" />
                <div className="font-medium">Current Asset</div>
              </div>
            </div>
          </div>
        )}

        {childAssets.length > 0 ? (
          <div>
            <h3 className="text-sm font-medium mb-2">Child Assets</h3>
            <div className="border rounded-md">
              {childAssets.map(child => renderAssetNode(child))}
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            This asset doesn't have any child components.
          </div>
        )}
      </CardContent>
    </Card>
  );
} 