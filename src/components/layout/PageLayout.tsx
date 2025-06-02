import { ReactNode, ErrorInfo, Component } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  Package2, 
  FileText, 
  Settings as SettingsIcon, 
  Users,
  Home,
  Layers,
  Boxes,
  QrCode,
  FileSpreadsheet,
  AlertTriangle
} from "lucide-react";
import Header from "./Header";
import CurrentOrganizationDisplay from "@/components/organization/CurrentOrganizationDisplay";
import UserMenu from "./UserMenu";
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
  SidebarRail,
  SidebarSeparator
} from "@/components/ui/sidebar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Add an error boundary to catch rendering errors
class PageErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean, error: Error | null, componentStack: string | null}> {
  constructor(props: {children: ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null, componentStack: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓");
    console.error("ERROR CAUGHT IN PAGE LAYOUT:", error);
    console.error("Component Stack:", errorInfo.componentStack);
    console.error("▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓");
    
    this.setState({
      componentStack: errorInfo.componentStack
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', margin: '20px', border: '2px solid red', borderRadius: '8px', backgroundColor: '#FFEEEE' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
            <AlertTriangle color="red" style={{ marginRight: '10px' }} />
            <h2 style={{ color: 'red', margin: 0 }}>Error Rendering Page Content</h2>
          </div>
          <p>Something went wrong when rendering this page.</p>
          {this.state.error && (
            <div style={{ padding: '10px', backgroundColor: '#FFF', borderRadius: '4px', marginTop: '10px' }}>
              <strong>Error:</strong> {this.state.error.toString()}
            </div>
          )}
          {this.state.componentStack && (
            <div style={{ padding: '10px', backgroundColor: '#FFF', borderRadius: '4px', marginTop: '10px', maxHeight: '200px', overflow: 'auto' }}>
              <strong>Component Stack:</strong> 
              <pre style={{ margin: '5px 0', fontSize: '12px', whiteSpace: 'pre-wrap' }}>
                {this.state.componentStack}
              </pre>
            </div>
          )}
          <p style={{ marginTop: '15px' }}>
            <button 
              onClick={() => window.location.reload()}
              style={{ padding: '8px 16px', backgroundColor: '#007BFF', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '10px' }}
            >
              Reload Page
            </button>
            <button 
              onClick={() => this.setState({ hasError: false, error: null, componentStack: null })}
              style={{ padding: '8px 16px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Try Again
            </button>
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

interface PageLayoutProps {
  children: ReactNode;
}

const PageLayout = ({ children }: PageLayoutProps) => {
  console.log("PageLayout rendering, children:", children ? "PRESENT" : "MISSING");
  
  // Detect if coming from mobile QR workflow
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const fromMobileQR = searchParams.get('fromMobileQR') === 'true' || location.state?.fromMobileQR;
  
  const mainNavigationItems = [
    {
      title: "Dashboard",
      icon: <Home className="w-4 h-4" />,
      path: "/",
    },
    {
      title: "Inventory",
      icon: <Package2 className="w-4 h-4" />,
      path: "/inventory",
    },
    {
      title: "Reports",
      icon: <FileSpreadsheet className="w-4 h-4" />,
      path: "/reports",
    },
    {
      title: "Forms",
      icon: <FileText className="w-4 h-4" />,
      path: "/forms",
    },
    {
      title: "Asset Types",
      icon: <Layers className="w-4 h-4" />,
      path: "/asset-types",
    },
    {
      title: "Assets",
      icon: <Boxes className="w-4 h-4" />,
      path: "/assets",
    },
    {
      title: "Barcode Tools",
      icon: <QrCode className="w-4 h-4" />,
      path: "/barcode-tools",
    }
  ];

  // If coming from mobile QR, render without sidebar
  if (fromMobileQR) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="flex flex-col min-h-screen">
          {/* Minimal header for mobile */}
          <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 px-4 py-3">
            <div className="flex items-center justify-center">
              <div className="flex items-center space-x-2">
                <QrCode className="h-6 w-6 text-blue-600" />
                <span className="font-semibold text-gray-900">Mobile</span>
              </div>
            </div>
          </div>
          
          {/* Main content area - centered and mobile optimized */}
          <main className="flex-1 flex items-start justify-center p-4">
            <div className="w-full max-w-md">
              <PageErrorBoundary>
                {children}
              </PageErrorBoundary>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Normal desktop layout with sidebar
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex">
          <Sidebar collapsible="icon">
            <SidebarRail />
            <SidebarHeader>
              <div className="px-4 py-3 flex flex-col gap-3">
                <h1 className="text-xl font-bold text-primary text-center">Coming Soon</h1>
                <CurrentOrganizationDisplay />
              </div>
            </SidebarHeader>
            
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {mainNavigationItems.map((item) => (
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
              <SidebarSeparator />
              <div className="px-4 py-2">
                <UserMenu />
              </div>
              <div className="px-4 py-2 text-xs text-center text-muted-foreground">
                &copy; {new Date().getFullYear()}
              </div>
            </SidebarFooter>
          </Sidebar>
          
          <main className="flex-1 py-6 px-4 overflow-y-auto bg-background">
            <div className="container mx-auto max-w-7xl">
              {/* Smaller, collapsed debug alert */}
              <details className="mb-4 bg-blue-50 border border-blue-100 rounded-md text-sm">
                <summary className="p-2 text-blue-700 font-medium cursor-pointer">
                  Debug Information (click to expand)
                </summary>
                <div className="p-3 border-t border-blue-100">
                  <Alert className="bg-blue-50 border-blue-200 text-blue-800">
                    <AlertTitle className="font-bold">Page Content Status</AlertTitle>
                    <AlertDescription>
                      This message indicates the PageLayout component is rendering properly. 
                      If you don't see content below this message, the issue is within the page component itself.
                    </AlertDescription>
                  </Alert>
                </div>
              </details>
              
              <PageErrorBoundary>
                {children}
              </PageErrorBoundary>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default PageLayout;
