import { useState, useCallback, useMemo } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Filter, Search, RefreshCw, Grid, List, Settings } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import AssetGrid from "@/components/inventory/AssetGrid";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

// Basic minimal Assets page
export default function Assets() {
  const { currentOrganization, isLoading } = useOrganization();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
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

  const handleAssetEdit = useCallback((asset: any) => {
    navigate(`/assets/${asset.id}/edit`);
  }, [navigate]);

  const handleAssetDelete = useCallback((asset: any) => {
    // Handle asset deletion with confirmation
    if (window.confirm(`Are you sure you want to delete "${asset.name}"?`)) {
      console.log("Delete asset:", asset.id);
      // Implement actual deletion logic here
    }
  }, []);

  const handleGenerateQR = useCallback((asset: any) => {
    navigate(`/assets/${asset.id}/qr`);
  }, [navigate]);

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
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Assets</h1>
          <p className="text-muted-foreground mt-1">
            Manage and track your organization's assets
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline">{currentOrganization.name}</Badge>
            <Badge variant="secondary">Asset Management</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleAddNewAsset} className="gap-2">
            <Plus className="h-4 w-4" />
            Add New Asset
          </Button>
        </div>
      </div>

      {/* Controls Section */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-lg">Your Assets</CardTitle>
              <CardDescription>
                View, edit, and manage your assets with QR codes
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative w-full sm:w-64">
                <Input
                  placeholder="Search assets..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="pl-9"
                />
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              {/* View Mode Toggle */}
              <div className="flex rounded-md border">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-r-none"
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-l-none"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>

              {/* Filter Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>All Assets</DropdownMenuItem>
                  <DropdownMenuItem>Active Only</DropdownMenuItem>
                  <DropdownMenuItem>With Inventory</DropdownMenuItem>
                  <DropdownMenuItem>Without Inventory</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>By Asset Type</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* More Actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Actions
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleRefresh}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Export Assets</DropdownMenuItem>
                  <DropdownMenuItem>Import Assets</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Bulk Edit</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Asset Grid */}
          <AssetGrid 
            key={`asset-grid-${refreshTrigger}`}
            organizationId={organizationId}
            searchTerm={searchTerm}
            onEdit={handleAssetEdit}
            onDelete={handleAssetDelete}
            onGenerateQR={handleGenerateQR}
          />
        </CardContent>
      </Card>
    </div>
  );
} 