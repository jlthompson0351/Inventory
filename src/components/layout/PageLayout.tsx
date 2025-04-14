
import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { 
  BarChart3, 
  Package2, 
  FileText, 
  Settings as SettingsIcon, 
  Users 
} from "lucide-react";
import Header from "./Header";
import OrganizationSwitcher from "@/components/organization/OrganizationSwitcher";
import { 
  Sidebar, 
  SidebarContent, 
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail
} from "@/components/ui/sidebar";

interface PageLayoutProps {
  children: ReactNode;
}

const PageLayout = ({ children }: PageLayoutProps) => {
  const navigationItems = [
    {
      title: "Dashboard",
      icon: <BarChart3 className="w-4 h-4" />,
      path: "/",
    },
    {
      title: "Inventory",
      icon: <Package2 className="w-4 h-4" />,
      path: "/inventory",
    },
    {
      title: "Forms",
      icon: <FileText className="w-4 h-4" />,
      path: "/forms",
    },
  ];

  const organizationItems = [
    {
      title: "Organization Members",
      icon: <Users className="w-4 h-4" />,
      path: "/organization/members",
    },
    {
      title: "Organization Settings",
      icon: <SettingsIcon className="w-4 h-4" />,
      path: "/organization/settings",
    },
  ];

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex">
          <Sidebar collapsible="icon">
            <SidebarRail />
            <SidebarHeader>
              <div className="px-4 py-2">
                <OrganizationSwitcher />
              </div>
            </SidebarHeader>
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {navigationItems.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          tooltip={item.title}
                        >
                          <Link to={item.path}>
                            {item.icon}
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
              
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {organizationItems.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          tooltip={item.title}
                        >
                          <Link to={item.path}>
                            {item.icon}
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
              <div className="px-4 py-2 text-xs text-center text-muted-foreground">
                StockFlow &copy; {new Date().getFullYear()}
              </div>
            </SidebarFooter>
          </Sidebar>
          
          <main className="flex-1 py-6 px-4 overflow-y-auto bg-background">
            <div className="container mx-auto max-w-7xl">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default PageLayout;
