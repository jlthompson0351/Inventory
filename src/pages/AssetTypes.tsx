
import { useState } from "react";
import { Plus, Edit, Trash2, Package2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

// Mock asset types data
const initialAssetTypes = [
  { id: "1", name: "General", description: "General inventory items", count: 45 },
  { id: "2", name: "Equipment", description: "Technical equipment and machinery", count: 32 },
  { id: "3", name: "Furniture", description: "Office furniture and fixtures", count: 18 },
  { id: "4", name: "Machinery", description: "Heavy industrial machinery", count: 7 },
  { id: "5", name: "IT Assets", description: "Computers, servers, and IT equipment", count: 24 },
  { id: "6", name: "Vehicles", description: "Company vehicles and transportation", count: 5 }
];

const AssetTypes = () => {
  const { toast } = useToast();
  const [assetTypes, setAssetTypes] = useState(initialAssetTypes);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAssetType, setEditingAssetType] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: ""
  });
  
  const filteredAssetTypes = assetTypes.filter(
    type => type.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           type.description.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleAddEdit = () => {
    if (formData.name.trim() === "") {
      toast({
        title: "Error",
        description: "Asset type name is required",
        variant: "destructive"
      });
      return;
    }
    
    if (editingAssetType) {
      // Update existing asset type
      const updatedAssetTypes = assetTypes.map(type => 
        type.id === editingAssetType.id 
          ? { ...type, name: formData.name, description: formData.description }
          : type
      );
      setAssetTypes(updatedAssetTypes);
      toast({
        title: "Asset Type Updated",
        description: `${formData.name} has been updated successfully.`
      });
    } else {
      // Add new asset type
      const newAssetType = {
        id: Date.now().toString(),
        name: formData.name,
        description: formData.description,
        count: 0
      };
      setAssetTypes([...assetTypes, newAssetType]);
      toast({
        title: "Asset Type Added",
        description: `${formData.name} has been added successfully.`
      });
    }
    
    // Reset form and close dialog
    resetForm();
  };
  
  const handleEdit = (assetType: any) => {
    setEditingAssetType(assetType);
    setFormData({
      name: assetType.name,
      description: assetType.description
    });
    setIsFormOpen(true);
  };
  
  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      setAssetTypes(assetTypes.filter(type => type.id !== id));
      toast({
        title: "Asset Type Deleted",
        description: `${name} has been deleted successfully.`
      });
    }
  };
  
  const resetForm = () => {
    setFormData({ name: "", description: "" });
    setEditingAssetType(null);
    setIsFormOpen(false);
  };

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Asset Types</h1>
          <p className="text-muted-foreground">Manage asset categories for inventory</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                resetForm();
                setIsFormOpen(true);
              }}>
                <Plus className="mr-2 h-4 w-4" />
                Add Asset Type
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingAssetType ? "Edit Asset Type" : "Add New Asset Type"}
                </DialogTitle>
                <DialogDescription>
                  {editingAssetType 
                    ? "Update the details of this asset type." 
                    : "Create a new asset type to categorize inventory items."}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Asset Type Name*</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter asset type name"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Enter a description for this asset type"
                    rows={3}
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={resetForm}>Cancel</Button>
                <Button onClick={handleAddEdit}>
                  {editingAssetType ? "Save Changes" : "Add Asset Type"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          {/* Search and filter */}
          <div className="relative w-full sm:w-80 mb-4">
            <Input
              placeholder="Search asset types..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
            <div className="absolute left-2.5 top-2.5">
              <Package2 className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          
          {/* Asset Types Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssetTypes.length > 0 ? (
                  filteredAssetTypes.map((assetType) => (
                    <TableRow key={assetType.id}>
                      <TableCell className="font-medium">{assetType.name}</TableCell>
                      <TableCell>{assetType.description}</TableCell>
                      <TableCell className="text-right">{assetType.count}</TableCell>
                      <TableCell>
                        <div className="flex space-x-1 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(assetType)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => handleDelete(assetType.id, assetType.name)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6">
                      {searchTerm ? "No matching asset types found." : "No asset types have been created yet."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>About Asset Types</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Asset types help you categorize and organize your inventory items. Each item in your inventory can be assigned an asset type, making it easier to filter, search, and generate reports based on categories.
            </p>
            <div className="mt-4 space-y-2">
              <p>
                <strong>Examples of asset types:</strong>
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>IT Equipment (computers, monitors, accessories)</li>
                <li>Office Furniture (desks, chairs, cabinets)</li>
                <li>Machinery (production equipment, tools)</li>
                <li>Vehicles (cars, trucks, forklifts)</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AssetTypes;
