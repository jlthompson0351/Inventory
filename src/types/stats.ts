export interface DashboardStats {
  inventoryCount: number;
  formCount: number;
  assetTypeCount: number;
  teamMemberCount: number;
  inventoryStatus: {
    inStock: number;
    lowStock: number;
  };
  recentActivities: Array<{
    description: string;
    timestamp: string;
  }>;
  popularAssetTypes: Array<{
    name: string;
    itemCount: number;
  }>;
  recentForms: Array<{
    name: string;
    createdAt: string;
  }>;
} 