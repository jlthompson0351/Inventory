
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, FileInput, BarChart3, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";

const Dashboard = () => {
  const stats = [
    { 
      title: "Total Items", 
      value: "234", 
      description: "Items in inventory", 
      icon: <Package className="h-5 w-5" />,
      change: "+12.5%",
      path: "/inventory",
    },
    { 
      title: "Custom Forms", 
      value: "8", 
      description: "Active form templates", 
      icon: <FileInput className="h-5 w-5" />,
      change: "+2 this month",
      path: "/forms",
    },
    { 
      title: "Value", 
      value: "$48,294", 
      description: "Total inventory value", 
      icon: <BarChart3 className="h-5 w-5" />,
      change: "+5.3%",
      path: "/reports",
    },
    { 
      title: "Alerts", 
      value: "3", 
      description: "Low stock items", 
      icon: <AlertCircle className="h-5 w-5" />,
      change: "-2 from last week",
      path: "/alerts",
    },
  ];

  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <Link to={stat.path} key={stat.title}>
            <Card className="card-hover">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <div className="p-1 bg-primary/10 rounded-full text-primary">
                  {stat.icon}
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground mt-1">
                    {stat.description}
                  </p>
                  <p className="text-xs text-primary">
                    {stat.change}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your recent inventory changes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((item) => (
                <div key={item} className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center space-x-3">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <Package className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Item {item} Updated</p>
                      <p className="text-sm text-muted-foreground">Quantity adjusted to 25</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">2 hours ago</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Link to="/inventory/new">
                <div className="flex items-center p-2 rounded-md hover:bg-secondary cursor-pointer">
                  <div className="p-2 bg-primary/10 rounded-full mr-3">
                    <Package className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Add New Item</p>
                    <p className="text-sm text-muted-foreground">Create inventory item</p>
                  </div>
                </div>
              </Link>
              <Link to="/forms/new">
                <div className="flex items-center p-2 rounded-md hover:bg-secondary cursor-pointer">
                  <div className="p-2 bg-primary/10 rounded-full mr-3">
                    <FileInput className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Create Form</p>
                    <p className="text-sm text-muted-foreground">Build custom inventory form</p>
                  </div>
                </div>
              </Link>
              <Link to="/inventory/scan">
                <div className="flex items-center p-2 rounded-md hover:bg-secondary cursor-pointer">
                  <div className="p-2 bg-primary/10 rounded-full mr-3">
                    <svg 
                      className="h-4 w-4 text-primary" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7V5a1 1 0 011-1h4a1 1 0 011 1v2m0 0H4m6 0h2m4 0h4a1 1 0 001-1V5a1 1 0 00-1-1h-4a1 1 0 00-1 1v2m0 0h-2m-6 6h16M4 13v2a1 1 0 001 1h4a1 1 0 001-1v-2m0 0H4m6 0h2m4 0h4a1 1 0 001-1v-2a1 1 0 00-1-1h-4a1 1 0 00-1 1v2m0 0h-2" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium">Scan Barcode</p>
                    <p className="text-sm text-muted-foreground">Scan item barcode</p>
                  </div>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
