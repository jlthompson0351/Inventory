
import { Card } from "@/components/ui/card";
import { Package2, Users, FileText, Layers } from "lucide-react";

interface StatsProps {
  stats: {
    totalAssets: number;
    activeUsers: number;
    pendingForms: number;
    assetTypes: number;
  };
  loading: boolean;
}

const DashboardStats = ({ stats, loading }: StatsProps) => {
  const statItems = [
    {
      title: "Total Assets",
      value: stats.totalAssets,
      icon: <Package2 className="h-5 w-5" />,
      description: "Items in inventory",
      change: "+12.5%",
      trend: "up",
    },
    {
      title: "Active Users",
      value: stats.activeUsers,
      icon: <Users className="h-5 w-5" />,
      description: "Current team members",
      change: "+5.2%",
      trend: "up",
    },
    {
      title: "Pending Forms",
      value: stats.pendingForms,
      icon: <FileText className="h-5 w-5" />,
      description: "Awaiting submission",
      change: "-2.3%",
      trend: "down",
    },
    {
      title: "Asset Types",
      value: stats.assetTypes,
      icon: <Layers className="h-5 w-5" />,
      description: "Asset categories",
      change: "0%",
      trend: "neutral",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statItems.map((item) => (
        <Card key={item.title} className="relative overflow-hidden">
          <div className="p-6 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-primary/10 rounded-md">
                {item.icon}
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                item.trend === "up" 
                  ? "text-green-700 bg-green-100" 
                  : item.trend === "down" 
                    ? "text-red-700 bg-red-100" 
                    : "text-gray-700 bg-gray-100"
              }`}>
                {item.change}
              </span>
            </div>
            
            <div className="mt-2">
              <h3 className="text-xl font-bold">
                {loading ? (
                  <div className="h-7 w-16 bg-muted animate-pulse rounded" />
                ) : (
                  item.value.toLocaleString()
                )}
              </h3>
              <p className="text-sm font-medium">{item.title}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {item.description}
              </p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default DashboardStats;
