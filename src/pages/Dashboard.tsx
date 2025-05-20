import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { useOrganization } from "@/hooks/useOrganization";
import { Layers, Boxes, FileText, BarChart3, ChevronRight, ArrowUpRight, Clock, Plus, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  console.log("Dashboard component rendering");
  const { currentOrganization } = useOrganization();
  const navigate = useNavigate();
  
  useEffect(() => {
    console.log("Dashboard component mounted");
  }, []);
  
  return (
    <div>
      {/* Debug information - collapsible */}
      <details className="mb-4 bg-blue-50 border border-blue-100 rounded-md text-sm">
        <summary className="p-2 text-blue-700 font-medium cursor-pointer">
          Dashboard Component Debug Info
        </summary>
        <div className="p-3 border-t border-blue-100 text-blue-800">
          <p className="mb-2">If you can see this, Dashboard page component is rendering correctly!</p>
          <p>Active Organization: {currentOrganization?.name || 'No organization selected'}</p>
          <p>Organization ID: {currentOrganization?.id || 'None'}</p>
        </div>
      </details>
      
      {/* Actual dashboard content */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-1">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome to {currentOrganization?.name || 'your organization'}'s inventory dashboard
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate('/reports')}>
            View Reports 
            <ArrowUpRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
              <Boxes className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                Manage your organization's assets
              </p>
            </CardContent>
            <CardFooter className="pt-0 pb-2">
              <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => navigate('/assets')}>
                View Assets <ChevronRight className="ml-1 h-3 w-3" />
              </Button>
            </CardFooter>
          </Card>
          
          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Asset Types</CardTitle>
              <Layers className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                Create and manage asset types
              </p>
            </CardContent>
            <CardFooter className="pt-0 pb-2">
              <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => navigate('/asset-types')}>
                Manage Types <ChevronRight className="ml-1 h-3 w-3" />
              </Button>
            </CardFooter>
          </Card>
          
          <Card className="border-l-4 border-l-emerald-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Forms</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                Create and customize forms
              </p>
            </CardContent>
            <CardFooter className="pt-0 pb-2">
              <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => navigate('/forms')}>
                View Forms <ChevronRight className="ml-1 h-3 w-3" />
              </Button>
            </CardFooter>
          </Card>
          
          <Card className="border-l-4 border-l-amber-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reports</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                Generate and view reports
              </p>
            </CardContent>
            <CardFooter className="pt-0 pb-2">
              <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => navigate('/reports')}>
                Create Reports <ChevronRight className="ml-1 h-3 w-3" />
              </Button>
            </CardFooter>
          </Card>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                Recent Activity
                <Clock className="ml-2 h-4 w-4 text-muted-foreground" />
              </CardTitle>
              <CardDescription>
                Your recent inventory management activity
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-6">
              <p className="text-center text-muted-foreground py-8">
                No recent activity to display
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common tasks you can perform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/inventory/add')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Inventory Item
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/assets/new')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Asset
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/barcode-tools')}>
                  <QrCode className="mr-2 h-4 w-4" />
                  Generate Barcodes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
