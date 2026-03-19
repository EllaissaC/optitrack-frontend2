import { Switch, Route } from "wouter";
import { useEffect, Component, ReactNode } from "react";
import { useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Inventory from "@/pages/inventory";
import LabOrders from "@/pages/lab-orders";
import Settings from "@/pages/settings";
import Login from "@/pages/login";
import Setup from "@/pages/setup";
import Invite from "@/pages/invite";
import WeeklyMetrics from "@/pages/weekly-metrics";
import Home from "@/pages/home";
import FrameReorders from "@/pages/frame-reorders";
import FrameHolds from "@/pages/frame-holds";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { Building2, RefreshCw, AlertTriangle } from "lucide-react";

// ─── Error Boundary ────────────────────────────────────────────────────────────
// Catches any unhandled React rendering error and shows a recovery screen
// instead of leaving the user on a blank white page.

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class ErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const msg =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return { hasError: true, errorMessage: msg };
  }

  componentDidCatch(error: unknown, info: { componentStack: string }) {
    console.error("[ErrorBoundary] Caught error:", error, info.componentStack);
  }

  handleReload = () => {
    // Clear query cache so stale/broken data doesn't immediately re-crash
    queryClient.clear();
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
          <div className="max-w-sm w-full text-center space-y-4">
            <div className="flex justify-center">
              <AlertTriangle className="w-12 h-12 text-amber-500" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              Something went wrong
            </h2>
            <p className="text-sm text-muted-foreground">
              The page encountered an unexpected error. This is usually
              temporary — reloading will fix it.
            </p>
            <button
              onClick={this.handleReload}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <RefreshCw className="w-4 h-4" />
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── App Shell ─────────────────────────────────────────────────────────────────

function AppShell() {
  const { user, isLoading } = useAuth();
  const [location, navigate] = useLocation();
  const { data: setupStatus, isLoading: setupLoading } = useQuery<{ setupRequired: boolean }>({
    queryKey: ["/api/auth/setup-required"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const ready = !isLoading && !setupLoading;

  useEffect(() => {
    if (!ready) return;

    if (setupStatus?.setupRequired) {
      if (location !== "/setup") navigate("/setup");
      return;
    }

    if (!user) {
      if (location !== "/login" && location !== "/invite") navigate("/login");
      return;
    }

    if (location === "/" || location === "/login" || location === "/setup") {
      navigate("/home");
    }
  }, [ready, setupStatus, user, location, navigate]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (setupStatus?.setupRequired) {
    return (
      <Switch>
        <Route path="/setup" component={Setup} />
      </Switch>
    );
  }

  if (!user) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/invite" component={Invite} />
      </Switch>
    );
  }

  if (location === "/home") {
    return <Home />;
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background/95 sticky top-0 z-50">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex-1 min-w-0" />
            {user?.clinic && (
              <div className="flex items-start gap-2 text-right" data-testid="header-clinic-info">
                <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-foreground leading-tight" data-testid="text-clinic-name">
                    {user.clinic.clinicName}
                  </p>
                  {(user.clinic.address || user.clinic.city) && (
                    <p className="text-xs text-muted-foreground leading-tight" data-testid="text-clinic-address">
                      {[
                        user.clinic.address,
                        [user.clinic.city, user.clinic.state].filter(Boolean).join(", "),
                        user.clinic.zip,
                      ].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
              </div>
            )}
          </header>
          <main className="flex-1 overflow-y-auto">
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/home" component={Home} />
              <Route path="/dashboard" component={Dashboard} />
              <Route path="/frame-analytics" component={Dashboard} />
              <Route path="/inventory" component={Inventory} />
              <Route path="/lab-orders" component={LabOrders} />
              <Route path="/frame-reorders" component={FrameReorders} />
              <Route path="/frame-holds" component={FrameHolds} />
              <Route path="/weekly-metrics" component={WeeklyMetrics} />
              <Route path="/settings" component={Settings} />
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

// ─── Root ──────────────────────────────────────────────────────────────────────

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ErrorBoundary>
          <AppShell />
        </ErrorBoundary>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
