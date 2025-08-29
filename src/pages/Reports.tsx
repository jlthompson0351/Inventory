import { FileSpreadsheet, BarChart3, TrendingUp, PieChart } from "lucide-react";
import SimpleAssetReport from '@/components/inventory/SimpleAssetReport';

const Reports = () => {
  return (
    <div className="animate-fade-in min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Enhanced Header with Dashboard Feel */}
      <div className="relative bg-white/90 backdrop-blur-sm border-b border-white/30 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                <FileSpreadsheet className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Inventory Reports
                </h1>
                <p className="text-gray-600 text-lg mt-1">
                  Comprehensive reporting system with advanced analytics
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-green-600 font-medium">System ready for report generation</span>
                </div>
              </div>
            </div>
            
            {/* Quick Stats Cards */}
            <div className="flex gap-4">
              <div className="bg-white/80 backdrop-blur-sm rounded-lg px-4 py-3 shadow-md border border-white/50">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-xs text-gray-600">Reports</p>
                    <p className="text-lg font-bold text-gray-800">Active</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-lg px-4 py-3 shadow-md border border-white/50">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-xs text-gray-600">Analytics</p>
                    <p className="text-lg font-bold text-gray-800">Ready</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-lg px-4 py-3 shadow-md border border-white/50">
                <div className="flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-xs text-gray-600">Export</p>
                    <p className="text-lg font-bold text-gray-800">CSV</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Report Component with Better Spacing */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SimpleAssetReport />
      </div>
    </div>
  );
};

export default Reports;