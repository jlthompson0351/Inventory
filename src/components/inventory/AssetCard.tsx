import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QrCode, Tag, Calendar, Info } from "lucide-react";
import { cva } from "class-variance-authority";

interface AssetCardProps {
  asset: {
    id: string;
    name: string;
    description?: string;
    status?: string;
    asset_type_name?: string;
    asset_type_color?: string;
    serial_number?: string;
    acquisition_date?: string;
    barcode?: string;
    metadata?: Record<string, any>;
  };
  onClick?: () => void;
}

const statusVariants = cva("", {
  variants: {
    status: {
      active: "bg-green-100 text-green-800 border-green-300",
      maintenance: "bg-yellow-100 text-yellow-800 border-yellow-300",
      retired: "bg-red-100 text-red-800 border-red-300",
      stored: "bg-blue-100 text-blue-800 border-blue-300",
      default: "bg-gray-100 text-gray-800 border-gray-300",
    },
  },
  defaultVariants: {
    status: "default",
  },
});

export default function AssetCard({ asset, onClick }: AssetCardProps) {
  if (!asset || !asset.id) {
    console.error("Missing or invalid asset object in AssetCard");
    return null;
  }

  // Extract cost from metadata if available
  const metadata = asset.metadata || {};
  const cost = metadata?.cost;
  const unitType = metadata?.unit_type;
  
  // Handle onClick safely
  const handleClick = () => {
    try {
      if (onClick) onClick();
    } catch (error) {
      console.error("Error in AssetCard onClick handler:", error);
    }
  };
  
  return (
    <Card 
      className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer border h-full flex flex-col"
      onClick={handleClick}
    >
      <CardHeader className="pb-2 pt-4 px-4 gap-1">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 flex-1">
            {asset.asset_type_color && (
              <div 
                className="w-3 h-3 rounded-full shrink-0 mt-1.5" 
                style={{ backgroundColor: asset.asset_type_color }}
              />
            )}
            <h3 className="font-semibold text-base line-clamp-2">{asset.name || "Unnamed Asset"}</h3>
          </div>
          {asset.status && (
            <Badge 
              variant="outline" 
              className={`${statusVariants({ status: asset.status as any })} capitalize shrink-0 ml-2`}
            >
              {asset.status}
            </Badge>
          )}
        </div>
        {asset.asset_type_name && (
          <p className="text-xs text-muted-foreground ml-5">
            Type: {asset.asset_type_name}
          </p>
        )}
      </CardHeader>
      
      <CardContent className="pt-0 pb-2 px-4 flex-1">
        {asset.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
            {asset.description}
          </p>
        )}
        
        <div className="grid grid-cols-1 gap-1 text-xs">
          {asset.barcode && (
            <div className="flex items-center text-muted-foreground">
              <QrCode className="h-3 w-3 mr-1.5 opacity-70" />
              <span className="truncate">ID: {asset.id.slice(0, 8)}...</span>
            </div>
          )}
          
          {asset.serial_number && (
            <div className="flex items-center text-muted-foreground">
              <Tag className="h-3 w-3 mr-1.5 opacity-70" />
              <span className="font-mono truncate">SN: {asset.serial_number}</span>
            </div>
          )}
          
          {asset.acquisition_date && (
            <div className="flex items-center text-muted-foreground">
              <Calendar className="h-3 w-3 mr-1.5 opacity-70" />
              <span>
                Acquired: {
                  (() => {
                    try {
                      return new Date(asset.acquisition_date).toLocaleDateString();
                    } catch (error) {
                      console.error("Invalid date format:", asset.acquisition_date);
                      return "Invalid date";
                    }
                  })()
                }
              </span>
            </div>
          )}
          
          {cost && (
            <div className="flex items-center text-muted-foreground">
              <Info className="h-3 w-3 mr-1.5 opacity-70" />
              <span>
                Cost: ${typeof cost === "number" ? cost.toFixed(2) : Number(cost).toFixed(2)}
                {unitType && ` per ${unitType}`}
              </span>
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="pt-0 pb-3 px-4 mt-auto">
        <div className="w-full flex justify-between items-center">
          <Badge 
            variant="secondary" 
            className="text-xs"
          >
            {asset.barcode ? "Has QR Code" : "No QR Code"}
          </Badge>
          
          <span className="text-xs text-muted-foreground">
            ID: {asset.id.slice(0, 8)}
          </span>
        </div>
      </CardFooter>
    </Card>
  );
} 