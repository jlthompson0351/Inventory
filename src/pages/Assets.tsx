import { useState, useCallback, useMemo } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Filter, Search, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import AssetList from "@/components/inventory/AssetList";

// Basic minimal Assets page
export default function Assets() {
  const { currentOrganization, isLoading } = useOrganization();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Debug logging - only on initial render
  console.log("Assets.tsx rendering");
  
  // Memoize the organization ID to prevent unnecessary re-renders
  const organizationId = useMemo(() => 
    currentOrganization?.id,
    [currentOrganization?.id]
  );

  // Memoize handlers to prevent recreation on every render
  const handleAddNewAsset = useCallback(() => {
    navigate("/assets/new");
  }, [navigate]);
  
  const handleRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);
  
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  // Show loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Assets...</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Please wait while we fetch your assets.</p>
        </CardContent>
      </Card>
    );
  }

  // Show no organization selected state
  if (!currentOrganization) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Organization Selected</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Please select an organization to view assets.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Assets</h1>
          <p className="text-muted-foreground">
            Assets for {currentOrganization.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleAddNewAsset}>
            <Plus className="mr-2 h-4 w-4" />
            Add New Asset
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Your Assets</CardTitle>
              <CardDescription>
                Manage your organization's assets and equipment
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative w-full sm:w-64">
                <Input
                  placeholder="Search assets..."
                  value={searchTerm}
                  onChange={handleSearchChange}
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
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Pass a key to force the component to remount when refresh is clicked */}
          <AssetList 
            key={`asset-list-${refreshTrigger}`}
            organizationId={organizationId} 
          />
        </CardContent>
      </Card>
    </div>
  );
} 