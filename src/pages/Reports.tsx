import { FileSpreadsheet } from "lucide-react";
import SimpleAssetReport from '@/components/inventory/SimpleAssetReport';

const Reports = () => {
  return (
    <div className="animate-fade-in p-2 md:p-3 lg:p-4 min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Compact Header */}
      <div className="relative mb-4">
        <div className="relative bg-white/90 backdrop-blur-sm border border-white/30 rounded-xl p-4 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-md">
              <FileSpreadsheet className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Inventory Reports
              </h1>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-600 font-medium">Ready to generate</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Report Component */}
      <SimpleAssetReport />
    </div>
  );
};

export default Reports;