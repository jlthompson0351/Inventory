
import { useState } from "react";
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

const NewItem = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    barcode: "",
    sku: "",
    category: "",
    quantity: "",
    unitPrice: "",
    description: "",
    location: ""
  });

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
    // In a real app, this would trigger the barcode scanner
    // For demo purposes, we'll simulate a barcode scan
    setTimeout(() => {
      setFormData({
        ...formData,
        barcode: "978020137962"
      });
      
      toast({
        title: "Barcode Scanned",
        description: "Barcode 978020137962 has been scanned successfully.",
      });
    }, 1000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      toast({
        title: "Item Created",
        description: `${formData.name} has been added to inventory.`,
      });
      navigate("/inventory");
    }, 1500);
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
                  <Label htmlFor="sku">SKU/Item Code*</Label>
                  <Input
                    id="sku"
                    name="sku"
                    placeholder="Enter SKU"
                    value={formData.sku}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category*</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(value) => handleSelectChange("category", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="electronics">Electronics</SelectItem>
                      <SelectItem value="furniture">Furniture</SelectItem>
                      <SelectItem value="office">Office Supplies</SelectItem>
                      <SelectItem value="equipment">Equipment</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
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
                  <Label htmlFor="unitPrice">Unit Price*</Label>
                  <Input
                    id="unitPrice"
                    name="unitPrice"
                    type="number"
                    placeholder="Enter price"
                    value={formData.unitPrice}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    required
                  />
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
              <h2 className="text-lg font-semibold mb-2">Calculated Values</h2>
              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Total Value:</span>
                  <span className="font-medium">
                    ${
                      formData.quantity && formData.unitPrice
                        ? (
                            parseFloat(formData.quantity) *
                            parseFloat(formData.unitPrice)
                          ).toFixed(2)
                        : "0.00"
                    }
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="font-medium">
                    {parseInt(formData.quantity) > 0
                      ? parseInt(formData.quantity) < 5
                        ? "Low Stock"
                        : "In Stock"
                      : "Out of Stock"}
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
