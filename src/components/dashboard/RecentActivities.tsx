
import { useState } from "react";
import { Package2, User, FileText, Clock } from "lucide-react";

// Mock data for recent activities
const RECENT_ACTIVITIES = [
  {
    id: 1,
    type: "asset",
    action: "checked_out",
    user: "Sarah Miller",
    item: "Laptop X1",
    time: "2 hours ago",
  },
  {
    id: 2,
    type: "user",
    action: "joined",
    user: "Michael Chen",
    item: "Development Team",
    time: "5 hours ago",
  },
  {
    id: 3,
    type: "form",
    action: "submitted",
    user: "Emma Johnson",
    item: "Monthly Inventory Check",
    time: "Yesterday",
  },
  {
    id: 4,
    type: "asset",
    action: "checked_in",
    user: "David Wilson",
    item: "Conference Room Projector",
    time: "Yesterday",
  },
  {
    id: 5,
    type: "asset",
    action: "added",
    user: "Lisa Garcia",
    item: "Monitor LG 27\"",
    time: "2 days ago",
  },
];

const RecentActivities = () => {
  const getIcon = (type: string) => {
    switch (type) {
      case "asset":
        return <Package2 className="h-4 w-4" />;
      case "user":
        return <User className="h-4 w-4" />;
      case "form":
        return <FileText className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getActionText = (activity: any) => {
    switch (activity.action) {
      case "checked_out":
        return <span>checked out <span className="font-semibold">{activity.item}</span></span>;
      case "checked_in":
        return <span>checked in <span className="font-semibold">{activity.item}</span></span>;
      case "joined":
        return <span>joined <span className="font-semibold">{activity.item}</span></span>;
      case "submitted":
        return <span>submitted <span className="font-semibold">{activity.item}</span></span>;
      case "added":
        return <span>added <span className="font-semibold">{activity.item}</span> to inventory</span>;
      default:
        return <span>interacted with <span className="font-semibold">{activity.item}</span></span>;
    }
  };

  return (
    <div className="space-y-4">
      <ul className="-my-2 divide-y">
        {RECENT_ACTIVITIES.map((activity) => (
          <li key={activity.id} className="py-2.5">
            <div className="flex items-start gap-4">
              <div className={`mt-1 rounded-full p-1.5 ${
                activity.type === "asset"
                  ? "bg-blue-100 text-blue-600"
                  : activity.type === "user"
                  ? "bg-green-100 text-green-600"
                  : "bg-amber-100 text-amber-600"
              }`}>
                {getIcon(activity.type)}
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm">
                  <span className="font-medium">{activity.user}</span>{" "}
                  {getActionText(activity)}
                </p>
                <p className="text-xs text-muted-foreground">{activity.time}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default RecentActivities;
