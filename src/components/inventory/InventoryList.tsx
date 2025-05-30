import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { 
  History, 
  Package, 
  MapPin, 
  Calendar, 
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  BarChart3
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { getInventoryItems } from "@/services/inventoryService";
import { format } from "date-fns";

interface InventoryItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  location?: string;
  category?: string;
  sku?: string;
  barcode?: string;
  status?: string;
  created_at: string;
  updated_at: string;
  asset_id?: string;
  asset_type?: {
    id: string;
    name: string;
    color: string;
  };
  // Inventory-specific metadata
  last_check_date?: string;
  monthly_usage?: number;
  stock_level?: 'low' | 'normal' | 'high';
}

interface InventoryListProps {
  organizationId: string;
  searchTerm?: string;
  categoryFilter?: string;
}

export default function InventoryList({ 
  organizationId, 
  searchTerm = "",
  categoryFilter
}: InventoryListProps) {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchInventoryItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await getInventoryItems(organizationId);
      
      if (data) {
        // Process and enrich inventory data with metadata
        const enrichedItems = data.map(item => ({
          ...item,
          // Calculate stock level based on quantity
          stock_level: getStockLevel(item.quantity),
          // Calculate days since last update
          last_check_date: item.updated_at,
          // Mock monthly usage calculation (you can replace with real data)
          monthly_usage: Math.floor(Math.random() * 20) + 1
        }));
        
        setInventoryItems(enrichedItems);
      }
    } catch (err) {
      console.error("Error fetching inventory items:", err);
      setError("Failed to load inventory items");
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    if (organizationId) {
      fetchInventoryItems();
    }
  }, [fetchInventoryItems]);

  const getStockLevel = (quantity: number): 'low' | 'normal' | 'high' => {
    if (quantity <= 10) return 'low';
    if (quantity >= 50) return 'high';
    return 'normal';
  };

  const getStockLevelColor = (level: 'low' | 'normal' | 'high') => {
    switch (level) {
      case 'low': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const handleViewHistory = (item: InventoryItem) => {
    navigate(`/inventory/item/${item.id}?tab=history`);
  };

  const handleInventoryCheck = (item: InventoryItem) => {
    navigate(`/inventory/check/${item.asset_id || item.id}`);
  };

  // Filter items based on search and category
  const filteredItems = useMemo(() => {
    return inventoryItems.filter(item => {
      const matchesSearch = !searchTerm || 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.location?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = !categoryFilter || item.category === categoryFilter;
      
      return matchesSearch && matchesCategory;
    });
  }, [inventoryItems, searchTerm, categoryFilter]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (filteredItems.length === 0) {
    return (
      <div className="border border-dashed rounded-md p-8 text-center text-muted-foreground">
        <Package className="h-12 w-12 mx-auto mb-4 opacity-30" />
        <p className="text-lg font-medium mb-2">No inventory items found</p>
        <p>Add inventory items to track your stock levels and usage.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {filteredItems.map((item) => (
        <Card key={item.id} className="overflow-hidden hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start mb-2">
              <CardTitle className="text-base line-clamp-1" title={item.name}>
                {item.name}
              </CardTitle>
              {item.stock_level === 'low' && (
                <TrendingDown className="h-4 w-4 text-red-500 flex-shrink-0" />
              )}
              {item.stock_level === 'high' && (
                <TrendingUp className="h-4 w-4 text-green-500 flex-shrink-0" />
              )}
            </div>
            
            {/* Quantity Badge - Prominent */}
            <Badge 
              variant="outline"
              className={`${getStockLevelColor(item.stock_level || 'normal')} mb-2 w-fit font-semibold`}
            >
              {item.quantity} units
            </Badge>
            
            {/* Asset Type and Category */}
            <div className="flex flex-wrap gap-1 mb-2">
              {item.asset_type && (
                <Badge variant="secondary" className="text-xs">
                  {item.asset_type.name}
                </Badge>
              )}
              {item.category && (
                <Badge variant="outline" className="text-xs">
                  {item.category}
                </Badge>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="pt-0 space-y-3">
            {/* Key Metadata - Compact */}
            <div className="space-y-1 text-xs text-muted-foreground">
              {item.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{item.location}</span>
                </div>
              )}
              
              {item.last_check_date && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 flex-shrink-0" />
                  <span>Checked {format(new Date(item.last_check_date), 'MMM d')}</span>
                </div>
              )}
              
              {item.monthly_usage && (
                <div className="flex items-center gap-1">
                  <BarChart3 className="h-3 w-3 flex-shrink-0" />
                  <span>{item.monthly_usage}/month</span>
                </div>
              )}
              
              {item.sku && (
                <div className="flex items-center gap-1">
                  <Package className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">SKU: {item.sku}</span>
                </div>
              )}
            </div>
            
            {/* Description - Compact */}
            {item.description && (
              <p className="text-xs text-muted-foreground line-clamp-2" title={item.description}>
                {item.description}
              </p>
            )}
            
            {/* Action buttons - Compact */}
            <div className="space-y-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/inventory/${item.id}/history`)}
                className="text-xs h-7"
              >
                <History className="h-3 w-3 mr-1" />
                View History
              </Button>
              
              <div className="grid grid-cols-2 gap-1">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleInventoryCheck(item)}
                  className="h-8 text-xs"
                >
                  <Calendar className="h-3 w-3 mr-1" />
                  Check
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => navigate(`/inventory/item/${item.id}`)}
                  className="h-8 text-xs"
                >
                  <Package className="h-3 w-3 mr-1" />
                  Details
                </Button>
              </div>
            </div>
            
            {/* Status and Date - Bottom */}
            <div className="pt-2 border-t">
              <div className="flex justify-between items-center">
                {item.status && (
                  <Badge variant="outline" className="text-xs">
                    {item.status}
                  </Badge>
                )}
                <div className="text-xs text-muted-foreground">
                  {format(new Date(item.updated_at), 'MMM d')}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
} 