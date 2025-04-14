
import { Card } from "@/components/ui/card";
import AdminStatusCheck from "@/components/system-admin/AdminStatusCheck";

const Dashboard = () => {
  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-xl font-semibold">Welcome to StockFlow</h2>
          <p className="mt-2">
            Use the navigation menu to access inventory management features, forms, 
            and reports to help streamline your asset tracking process.
          </p>
        </Card>
        
        <AdminStatusCheck />
      </div>
    </div>
  );
};

export default Dashboard;
