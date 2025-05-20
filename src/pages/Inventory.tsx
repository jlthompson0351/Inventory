import { useState } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Filter, Search, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import AssetList from "@/components/inventory/AssetList";
import { getInventoryItems } from "@/services/inventoryService";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Basic minimal Inventory page
export default function Inventory() {
  const { currentOrganization, isLoading } = useOrganization();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeView, setActiveView] = useState("assets");

  console.log("Inventory.tsx minimal version rendering");
  console.log("- isLoading:", isLoading);
  console.log("- currentOrganization:", currentOrganization);

  const handleAddInventory = () => {
    navigate("/inventory/add");
  };

  const handleBrowseAssets = () => {
    navigate("/inventory/browse-assets");
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Inventory...</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Please wait while we fetch your inventory data.</p>
        </CardContent>
      </Card>
    );
  }

  if (!currentOrganization) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Organization Selected</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Please select an organization to view inventory.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Inventory</h1>
          <p className="text-muted-foreground">
            Inventory for {currentOrganization.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleAddInventory}>
            <Plus className="mr-2 h-4 w-4" />
            Add Inventory
          </Button>
          <Button variant="outline" onClick={handleBrowseAssets}>
            Browse Assets
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Inventory Items</CardTitle>
              <CardDescription>
                This is a minimal working version of the Inventory page.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative w-full sm:w-64">
                <Input
                  placeholder="Search inventory..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
                <div className="absolute left-2.5 top-2.5">
                  <Search className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
              <Button variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeView} onValueChange={setActiveView}>
            <TabsList className="mb-4">
              <TabsTrigger value="assets">Assets</TabsTrigger>
              <TabsTrigger value="inventory">Inventory Items</TabsTrigger>
            </TabsList>
            
            <TabsContent value="assets">
              <AssetList organizationId={currentOrganization.id} />
            </TabsContent>
            
            <TabsContent value="inventory">
              <p className="text-muted-foreground text-center p-6">
                This is a minimal working version of the Inventory page.
                <br />
                Organization ID: {currentOrganization.id}
              </p>
              
              <div className="border border-dashed rounded-md p-8 text-center mt-4">
                <h3 className="font-medium mb-2">No Inventory Items Found</h3>
                <p className="text-muted-foreground mb-4">
                  Get started by adding inventory items to your assets.
                </p>
                <Button onClick={handleAddInventory}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Inventory
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
