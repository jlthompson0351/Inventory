import { useState } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Filter, Search, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import AssetList from "@/components/inventory/AssetList";

// Basic minimal Inventory page
export default function Inventory() {
  const { currentOrganization, isLoading } = useOrganization();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

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
    <div className="container py-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl">Inventory Management</CardTitle>
              <CardDescription>
                Track assets and inventory for {currentOrganization.name}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleBrowseAssets}>
                <Search className="mr-2 h-4 w-4" />
                Browse Assets
              </Button>
              <Button onClick={handleAddInventory}>
                <Plus className="mr-2 h-4 w-4" />
                Add Inventory
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Quick Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Assets</p>
                    <p className="text-2xl font-bold">-</p>
                  </div>
                  <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                    📦
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Assets with inventory tracking
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Low Stock Items</p>
                    <p className="text-2xl font-bold">-</p>
                  </div>
                  <div className="h-8 w-8 bg-amber-100 rounded-full flex items-center justify-center">
                    ⚠️
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Items requiring attention
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-red-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">This Month's Usage</p>
                    <p className="text-2xl font-bold">-</p>
                  </div>
                  <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">
                    📊
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Total consumed this month
                </p>
              </CardContent>
            </Card>
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
              <AssetList organizationId={currentOrganization.id} />
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}
