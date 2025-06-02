import React from 'react';
import { AssetInventoryReport } from '../components/reporting/AssetInventoryReport';

export const AssetInventoryReportPage: React.FC = () => {
  return (
    <div className="container mx-auto py-6">
      <AssetInventoryReport />
    </div>
  );
};

export default AssetInventoryReportPage; 