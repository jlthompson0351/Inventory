import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Edit, 
  QrCode, 
  Eye, 
  Package, 
  Calendar, 
  Hash, 
  MoreVertical,
  Trash2,
  Download
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
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);

  const handleViewDetails = () => {
    navigate(`/assets/${asset.id}`);
  };

  const handleEditAsset = () => {
    if (onEdit) {
      onEdit(asset);
    } else {
      navigate(`/assets/${asset.id}/edit`);
    }
  };

  const handleManageInventory = () => {
    navigate(`/assets/${asset.id}/inventory`);
  };

  const handleQRCode = () => {
    if (onGenerateQR) {
      onGenerateQR(asset);
    } else {
      setIsQRModalOpen(true);
    }
  };

  const handleDownloadQR = () => {
    // Logic to download QR code
    console.log("Download QR for:", asset.name);
  };

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800';
      case 'retired':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <Card className="group hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold truncate">
              {asset.name}
            </CardTitle>
            {asset.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {asset.description}
              </p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleViewDetails}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleEditAsset}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Asset
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleQRCode}>
                <QrCode className="mr-2 h-4 w-4" />
                Generate QR Code
              </DropdownMenuItem>
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

        <div className="flex flex-wrap gap-2 mt-3">
          {asset.status && (
            <Badge className={getStatusColor(asset.status)}>
              {asset.status}
            </Badge>
          )}
          {asset.asset_type && (
            <Badge 
              variant="outline" 
              style={{ 
                borderColor: asset.asset_type.color,
                color: asset.asset_type.color 
              }}
            >
              {asset.asset_type.name}
            </Badge>
          )}
          {asset.has_inventory && (
            <Badge variant="secondary">
              <Package className="mr-1 h-3 w-3" />
              Inventory: {asset.inventory_quantity || 0}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Asset Details */}
        <div className="grid grid-cols-1 gap-2 text-sm">
          {asset.serial_number && (
            <div className="flex items-center text-muted-foreground">
              <Hash className="mr-2 h-4 w-4" />
              <span className="font-medium">Serial:</span>
              <span className="ml-1">{asset.serial_number}</span>
            </div>
          )}
          {asset.acquisition_date && (
            <div className="flex items-center text-muted-foreground">
              <Calendar className="mr-2 h-4 w-4" />
              <span className="font-medium">Acquired:</span>
              <span className="ml-1">
                {format(new Date(asset.acquisition_date), 'MMM dd, yyyy')}
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleViewDetails}
            className="flex-1"
          >
            <Eye className="mr-2 h-4 w-4" />
            View
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleEditAsset}
            className="flex-1"
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleQRCode}
            className="flex-1"
          >
            <QrCode className="mr-2 h-4 w-4" />
            QR Code
          </Button>
          {asset.has_inventory && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleManageInventory}
              className="flex-1"
            >
              <Package className="mr-2 h-4 w-4" />
              Inventory
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 