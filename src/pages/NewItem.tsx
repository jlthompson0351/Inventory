import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Barcode, Camera, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { InventoryItemInsert } from "@/services/inventoryService";
import { getAssetTypes, AssetType } from "@/services/assetTypeService";

const NewItem = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentOrganization } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    barcode: "",
    sku: "",
    asset_type_id: "",
    quantity: "1",
    description: "",
    location: "",
    status: "in_stock"
  });

  useEffect(() => {
    const fetchAssetTypes = async () => {
      if (!currentOrganization?.id) return;
      
      try {
        const data = await getAssetTypes(currentOrganization.id);
        setAssetTypes(data);
      } catch (error) {
        console.error("Failed to fetch asset types:", error);
        toast({
          title: "Error",
          description: "Failed to load asset types. Please try again.",
          variant: "destructive",
        });
      }
    };
    
    fetchAssetTypes();
  }, [currentOrganization?.id, toast]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleScanBarcode = () => {
    // This would trigger an actual barcode scanner or camera
    toast({
      title: "Barcode Scanner",
      description: "This would open a barcode scanner in a real implementation.",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentOrganization?.id) {
      toast({
        title: "Error",
        description: "No organization selected. Please select an organization first.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    
    try {
      // Prepare item data
      const itemData: InventoryItemInsert = {
        name: formData.name,
        barcode: formData.barcode || null,
        sku: formData.sku || null,
        asset_type_id: formData.asset_type_id || null,
        quantity: parseInt(formData.quantity),
        description: formData.description || null,
        location: formData.location || null,
        status: formData.status,
        organization_id: currentOrganization.id
      };
      
      // DEPRECATED: Direct inventory creation is no longer supported
      // Redirect to asset-based workflow
      toast({
        title: "Workflow Changed",
        description: "Please create an asset first, then add inventory to it.",
        variant: "destructive"
      });
      navigate("/assets/new");
      return;
      
      // This code path is now unreachable due to the redirect above
      // Keeping for reference but will never execute
    } catch (error) {
      console.error("Error creating item:", error);
      toast({
        title: "Error",
        description: "Failed to create item. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mr-2">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Add New Item</h1>
          <p className="text-muted-foreground">Create a new inventory item</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Item Name*</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Enter item name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="barcode">Barcode</Label>
                  <div className="flex">
                    <Input
                      id="barcode"
                      name="barcode"
                      placeholder="Scan or enter barcode"
                      value={formData.barcode}
                      onChange={handleChange}
                      className="rounded-r-none"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      className="rounded-l-none"
                      onClick={handleScanBarcode}
                    >
                      <Barcode className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sku">SKU/Item Code</Label>
                  <Input
                    id="sku"
                    name="sku"
                    placeholder="Enter SKU"
                    value={formData.sku}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="asset_type_id">Category*</Label>
                  <Select 
                    value={formData.asset_type_id}
                    onValueChange={(value) => handleSelectChange("asset_type_id", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {assetTypes.map(type => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                      {assetTypes.length === 0 && (
                        <SelectItem value="no_asset_types" disabled>
                          No asset types available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity*</Label>
                  <Input
                    id="quantity"
                    name="quantity"
                    type="number"
                    placeholder="Enter quantity"
                    value={formData.quantity}
                    onChange={handleChange}
                    min="0"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status*</Label>
                  <Select 
                    value={formData.status}
                    onValueChange={(value) => handleSelectChange("status", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in_stock">In Stock</SelectItem>
                      <SelectItem value="low_stock">Low Stock</SelectItem>
                      <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Storage Location</Label>
                  <Input
                    id="location"
                    name="location"
                    placeholder="Where is this item stored?"
                    value={formData.location}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Enter item description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={4}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/inventory")}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Saving..." : "Save Item"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold mb-2">Item Image</h2>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Camera className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-2">
                  Drag and drop an image or click to upload
                </p>
                <Button variant="secondary" size="sm">
                  Upload Image
                </Button>
              </div>
            </div>

            <div className="mb-4">
              <h2 className="text-lg font-semibold mb-2">Barcode Preview</h2>
              <div className="border rounded-lg p-4 text-center bg-muted">
                {formData.barcode ? (
                  <div>
                    <svg className="mx-auto mb-2" viewBox="0 0 200 80">
                      {/* Simple barcode visualization */}
                      <rect x="20" y="10" width="2" height="60" fill="black" />
                      <rect x="25" y="10" width="1" height="60" fill="black" />
                      <rect x="30" y="10" width="3" height="60" fill="black" />
                      <rect x="36" y="10" width="2" height="60" fill="black" />
                      <rect x="42" y="10" width="1" height="60" fill="black" />
                      <rect x="48" y="10" width="2" height="60" fill="black" />
                      <rect x="54" y="10" width="4" height="60" fill="black" />
                      <rect x="60" y="10" width="1" height="60" fill="black" />
                      <rect x="66" y="10" width="2" height="60" fill="black" />
                      <rect x="72" y="10" width="3" height="60" fill="black" />
                      <rect x="78" y="10" width="1" height="60" fill="black" />
                      <rect x="82" y="10" width="2" height="60" fill="black" />
                      <rect x="88" y="10" width="1" height="60" fill="black" />
                      <rect x="94" y="10" width="3" height="60" fill="black" />
                      <rect x="100" y="10" width="1" height="60" fill="black" />
                      <rect x="106" y="10" width="2" height="60" fill="black" />
                      <rect x="110" y="10" width="4" height="60" fill="black" />
                      <rect x="118" y="10" width="2" height="60" fill="black" />
                      <rect x="124" y="10" width="1" height="60" fill="black" />
                      <rect x="130" y="10" width="2" height="60" fill="black" />
                      <rect x="136" y="10" width="1" height="60" fill="black" />
                      <rect x="142" y="10" width="3" height="60" fill="black" />
                      <rect x="148" y="10" width="1" height="60" fill="black" />
                      <rect x="154" y="10" width="2" height="60" fill="black" />
                      <rect x="160" y="10" width="1" height="60" fill="black" />
                      <rect x="165" y="10" width="2" height="60" fill="black" />
                      <rect x="170" y="10" width="3" height="60" fill="black" />
                      <rect x="178" y="10" width="2" height="60" fill="black" />
                    </svg>
                    <p className="text-sm font-mono">{formData.barcode}</p>
                  </div>
                ) : (
                  <div className="text-muted-foreground flex flex-col items-center">
                    <Barcode className="h-8 w-8 mb-2" />
                    <p className="text-sm">Scan barcode to preview</p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-2">Item Summary</h2>
              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="font-medium">
                    {formData.status === "in_stock" ? "In Stock" : 
                     formData.status === "low_stock" ? "Low Stock" : 
                     formData.status === "out_of_stock" ? "Out of Stock" : 
                     formData.status}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Quantity:</span>
                  <span className="font-medium">
                    {formData.quantity || "0"}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Category:</span>
                  <span className="font-medium">
                    {formData.asset_type_id ? 
                      assetTypes.find(t => t.id === formData.asset_type_id)?.name || "Unknown" : 
                      "None"}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NewItem;
