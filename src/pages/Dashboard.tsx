
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import { Link } from "react-router-dom";

const Dashboard = () => {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-xl font-semibold">Welcome to StockFlow</h2>
          <p className="mt-2">
            Use the navigation menu to access inventory management features, forms, 
            and reports to help streamline your asset tracking process.
          </p>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Organization Members</h2>
            </div>
            <Button asChild size="sm">
              <Link to="/organization/members">Manage Members</Link>
            </Button>
          </div>
          <p className="text-muted-foreground">
            Invite new members to your organization and manage existing member roles.
          </p>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
