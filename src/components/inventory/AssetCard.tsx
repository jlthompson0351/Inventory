import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Edit, 
  Eye, 
  Package, 
  Calendar, 
  Hash, 
  MoreVertical,
  Trash2,
  Download,
  MapPin,
  History,
  Settings
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { getInventoryItems } from "@/services/inventoryService";
import { useOrganization } from "@/hooks/useOrganization";

interface Asset {
  id: string;
  name: string;
  description?: string;
  status?: string;
  serial_number?: string;
  acquisition_date?: string;
  asset_type?: {
    id: string;
    name: string;
    color: string;
    deleted_at?: string | null;
  };
  has_inventory?: boolean;
  inventory_quantity?: number;
}

interface AssetCardProps {
  asset: Asset;
  onEdit?: (asset: Asset) => void;
  onDelete?: (asset: Asset) => void;
  onGenerateQR?: (asset: Asset) => void;
}

export default function AssetCard({ asset, onEdit, onDelete, onGenerateQR }: AssetCardProps) {
  const navigate = useNavigate();
  const { currentOrganization } = useOrganization();
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [inventoryItemId, setInventoryItemId] = useState<string | null>(null);

  // Load inventory item ID for this asset
  useEffect(() => {
    const loadInventoryItemId = async () => {
      if (asset.has_inventory && currentOrganization?.id) {
        try {
          const inventoryItems = await getInventoryItems(currentOrganization.id, asset.id);
          if (inventoryItems && inventoryItems.length > 0) {
            setInventoryItemId(inventoryItems[0].id);
          }
        } catch (error) {
          console.error("Error loading inventory item ID:", error);
        }
      }
    };

    loadInventoryItemId();
  }, [asset.id, asset.has_inventory, currentOrganization?.id]);

  const handleManageAsset = () => {
    navigate(`/assets/${asset.id}`);
  };

  const handleEditAsset = () => {
    if (onEdit) {
      onEdit(asset);
    } else {
      navigate(`/assets/${asset.id}/edit`);
    }
  };

  const handleInventoryHistory = () => {
    if (inventoryItemId) {
      navigate(`/inventory/${inventoryItemId}/history`);
    } else {
      console.error("No inventory item found for this asset");
    }
  };

  const handleDownloadQR = () => {
    // Logic to download QR code
    console.log("Download QR for:", asset.name);
  };

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'retired':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow h-full min-h-[280px]" style={{ transform: 'scale(1.1)' }}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start mb-2">
          <CardTitle className="text-base line-clamp-1" title={asset.name}>
            {asset.name}
          </CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 flex-shrink-0">
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleManageAsset}>
                <Settings className="mr-2 h-4 w-4" />
                Manage Asset
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleEditAsset}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Asset
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDownloadQR}>
                <Download className="mr-2 h-4 w-4" />
                Download QR
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDelete?.(asset)}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Status Badge - Prominent like inventory quantity */}
        {asset.status && (
          <Badge 
            variant="outline"
            className={`${getStatusColor(asset.status)} mb-2 w-fit font-semibold`}
          >
            {asset.status}
          </Badge>
        )}

        {/* Asset Type and Inventory */}
        <div className="flex flex-wrap gap-1 mb-2">
          {asset.asset_type && (
            <Badge 
              variant="secondary" 
              className="text-xs"
              style={{ 
                backgroundColor: `${asset.asset_type.color}20`,
                color: asset.asset_type.color,
                borderColor: asset.asset_type.color
              }}
            >
              {asset.asset_type.name}
            </Badge>
          )}
          {asset.has_inventory && (
            <Badge variant="outline" className="text-xs">
              <Package className="mr-1 h-3 w-3" />
              Inventory: {asset.inventory_quantity || 0}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {/* Key Metadata - Compact like inventory cards */}
        <div className="space-y-1 text-xs text-muted-foreground">
          {asset.serial_number && (
            <div className="flex items-center gap-1">
              <Hash className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">Serial: {asset.serial_number}</span>
            </div>
          )}
          
          {asset.acquisition_date && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3 flex-shrink-0" />
              <span>Acquired {format(new Date(asset.acquisition_date), 'MMM d, yyyy')}</span>
            </div>
          )}
        </div>

        {/* Description - Compact */}
        {asset.description && (
          <p className="text-xs text-muted-foreground line-clamp-2" title={asset.description}>
            {asset.description}
          </p>
        )}

        {/* Action buttons - Cleaner layout */}
        <div className="space-y-1">
          <Button
            variant="outline"
            size="sm"
            onClick={handleManageAsset}
            className="text-xs h-7 w-full"
          >
            <Settings className="h-3 w-3 mr-1" />
            Manage Asset
          </Button>
          
          <div className="grid grid-cols-1 gap-1">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleEditAsset}
              className="h-8 text-xs"
            >
              <Edit className="h-3 w-3 mr-1" />
              Edit
            </Button>
          </div>

          {asset.has_inventory && inventoryItemId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleInventoryHistory}
              className="text-xs h-7 w-full"
            >
              <History className="h-3 w-3 mr-1" />
              Inventory History
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 