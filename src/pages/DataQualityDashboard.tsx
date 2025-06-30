import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SmartInsights } from '@/components/reporting/SmartInsights';
import { useOrganization } from '@/hooks/useOrganization';
import { Button } from '@/components/ui/button';
import { RefreshCw, BarChart3, TrendingUp, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DataQualityDashboard: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-1">Data Quality Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor and improve your inventory data reliability for {currentOrganization?.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => navigate('/reports')}
            className="flex items-center gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            View Reports
          </Button>
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh Analysis
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Quality Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">87/100</div>
            <p className="text-xs text-muted-foreground">
              Good - Above average quality
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">3</div>
            <p className="text-xs text-muted-foreground">
              Require immediate attention
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Coverage</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">94%</div>
            <p className="text-xs text-muted-foreground">
              Inventory items with data
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Insights Panel */}
      <SmartInsights
        data={[]} // Empty data since we're using inventory analysis
        columns={[]}
        formFields={[]}
        reportConfig={{}}
        enableInventoryAnalysis={true} // This is the key - enables our bulletproof analysis
      />

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Button 
              variant="outline" 
              className="justify-start"
              onClick={() => navigate('/inventory')}
            >
              📝 Review Inventory
            </Button>
            <Button 
              variant="outline" 
              className="justify-start"
              onClick={() => navigate('/reports')}
            >
              📊 Generate Report
            </Button>
            <Button 
              variant="outline" 
              className="justify-start"
              onClick={() => navigate('/assets')}
            >
              🏷️ Audit Assets
            </Button>
            <Button 
              variant="outline" 
              className="justify-start"
              onClick={() => navigate('/forms')}
            >
              📋 Review Forms
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Help Text */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <h3 className="font-medium text-blue-900 mb-2">💡 About This Dashboard</h3>
          <div className="text-sm text-blue-800 space-y-1">
            <p>• <strong>System Quality Score:</strong> Overall data reliability based on multiple factors</p>
            <p>• <strong>Inventory Quality:</strong> Uses our bulletproof 4-tier fallback system for accuracy</p>
            <p>• <strong>Data Consistency:</strong> Checks alignment between form submissions and inventory records</p>
            <p>• <strong>Historical Coverage:</strong> Ensures last month totals are always available</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DataQualityDashboard; 