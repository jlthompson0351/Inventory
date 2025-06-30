import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { getAssetByQrCode } from "@/services/assetService";
import { getInventoryItems, getInventoryHistoryForMonth } from '@/services/inventoryService';

export default function ScanAsset() {
  const navigate = useNavigate();
  const { qrCode } = useParams<{ qrCode: string }>();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (qrCode) {
      lookupAsset(qrCode);
    } else {
      setError("No QR code provided");
      setLoading(false);
    }
  }, [qrCode]);

  const lookupAsset = async (code: string) => {
    setLoading(true);
    try {
      const asset = await getAssetByQrCode(code);
      if (!asset) {
        setError("Asset not found for this QR code");
        setLoading(false);
        return;
      }
      // Check for existing inventory_item and history for this asset/month
      const currentOrganization = asset.organization_id ? { id: asset.organization_id } : null;
      if (currentOrganization?.id) {
        const items = await getInventoryItems(currentOrganization.id, asset.id);
        const inventoryItem = items && items.length > 0 ? items[0] : null;
        const monthYear = new Date().toISOString().slice(0, 7);
        if (inventoryItem) {
          const history = await getInventoryHistoryForMonth(inventoryItem.id, monthYear);
          if (history && history.event_type === 'check') {
            navigate(`/inventory/item/${inventoryItem.id}?month=${monthYear}&edit=1`);
            return;
          }
        }
      }
      // If only intake exists or none, allow add
      navigate(`/inventory/action/${asset.id}`);
    } catch (err) {
      console.error("Error looking up asset:", err);
      setError("Error looking up asset");
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <h2 className="text-xl font-bold">Looking up asset...</h2>
          <p className="text-muted-foreground mt-2">Scanning QR code: {qrCode}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-12 max-w-lg mx-auto">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-4">QR Code Error</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <div className="flex flex-col gap-2 sm:flex-row justify-center">
            <Button onClick={() => navigate("/inventory/add")}>
              Try Another Scan
            </Button>
            <Button variant="outline" onClick={() => navigate("/inventory/browse-assets")}>
              Browse Assets
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
} 