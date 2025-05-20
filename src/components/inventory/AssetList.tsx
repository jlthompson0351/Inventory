import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Eye, Edit, Trash2, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Define Asset type interface properly
interface Asset {
  id: string;
  name: string;
  description?: string;
  status?: string;
  serial_number?: string;
  acquisition_date?: string;
  asset_type?: {
    name: string;
    color: string;
  };
}

interface AssetListProps {
  organizationId?: string;
  assetTypeId?: string;
  onEdit?: (asset: Asset) => void;
  onDelete?: (asset: Asset) => void;
  onView?: (asset: Asset) => void;
}

export default function AssetList({
  organizationId,
  assetTypeId,
  onEdit,
  onDelete,
  onView,
}: AssetListProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Fetch assets from the database
  useEffect(() => {
    const fetchAssets = async () => {
      try {
        setLoading(true);
        console.log("Fetching assets with organizationId:", organizationId);
        
        if (!organizationId) {
          console.log("No organizationId provided, skipping fetch");
          setAssets([]);
          setLoading(false);
          return;
        }
        
        let query = supabase
          .from('assets')
          .select(`
            *,
            asset_type:asset_types(id, name, color)
          `)
          .eq('organization_id', organizationId);
        
        if (assetTypeId) {
          query = query.eq('asset_type_id', assetTypeId);
        }
        
        const { data, error } = await query.order('created_at', { ascending: false });
        
        if (error) {
          console.error("Supabase error fetching assets:", error);
          throw error;
        }
        
        console.log(`Fetched ${data?.length || 0} assets`);
        setAssets(data || []);
        setError(null);
      } catch (err) {
        console.error("Error fetching assets:", err);
        setError("Failed to load assets. Please try again.");
        setAssets([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAssets();
  }, [organizationId, assetTypeId]);

  const handleEdit = (asset: Asset) => {
    try {
      if (onEdit) {
        onEdit(asset);
      } else {
        navigate(`/assets/${asset.id}/edit`);
      }
    } catch (err) {
      console.error("Error navigating to edit asset:", err);
      setError("Failed to navigate to edit page");
    }
  };

  const handleDelete = (asset: Asset) => {
    try {
      if (onDelete) {
        onDelete(asset);
      }
    } catch (err) {
      console.error("Error deleting asset:", err);
      setError("Failed to delete asset");
    }
  };

  const handleView = (asset: Asset) => {
    try {
      if (onView) {
        onView(asset);
      } else {
        navigate(`/assets/${asset.id}`);
      }
    } catch (err) {
      console.error("Error navigating to view asset:", err);
      setError("Failed to navigate to view page");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (assets.length === 0) {
    return (
      <div className="border border-dashed rounded-md p-8 text-center text-muted-foreground">
        No assets found. Add assets to get started.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {assets.map((asset) => (
        <Card key={asset.id} className="overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">{asset.name || "Unnamed Asset"}</CardTitle>
                <div className="text-sm text-muted-foreground mt-1">
                  {asset.serial_number && (
                    <p className="font-mono">SN: {asset.serial_number}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {asset.status && (
                  <Badge
                    variant={
                      asset.status === "active"
                        ? "default"
                        : asset.status === "maintenance"
                        ? "secondary"
                        : "destructive"
                    }
                  >
                    {asset.status}
                  </Badge>
                )}
                {asset.asset_type && (
                  <Badge
                    variant="outline"
                    style={{
                      borderColor: asset.asset_type.color || "#888",
                      color: asset.asset_type.color || "#888",
                    }}
                  >
                    {asset.asset_type.name || "Unknown Type"}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div className="text-sm">
                {asset.description && <p>{asset.description}</p>}
                {asset.acquisition_date && (
                  <p className="text-muted-foreground mt-1">
                    Acquired: {new Date(asset.acquisition_date).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleView(asset)}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleEdit(asset)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => handleDelete(asset)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
} 