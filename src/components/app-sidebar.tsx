import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Package,
  FlaskConical,
  Settings,
  LogOut,
  User,
  BarChart2,
  Home,
  RotateCcw,
  Clock,
  ChevronDown,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth, useLogout } from "@/hooks/use-auth";

export function AppSidebar() {
  const [location] = useLocation();
  const { user, isAdmin } = useAuth();
  const logout = useLogout();

  const isInventoryPath = location === "/inventory" || location === "/frame-reorders";
  const isOrdersPath = location === "/lab-orders" || location === "/frame-holds";

  const [inventoryOpen, setInventoryOpen] = useState(isInventoryPath);
  const [ordersOpen, setOrdersOpen] = useState(isOrdersPath);

  useEffect(() => {
    if (isInventoryPath) setInventoryOpen(true);
    if (isOrdersPath) setOrdersOpen(true);
  }, [isInventoryPath, isOrdersPath]);

  const isActive = (path: string) => location === path;

  const activeClass = "data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground";

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center flex-shrink-0">
            <Package className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-sidebar-foreground leading-tight">OptiTrack</p>
            <p className="text-xs text-muted-foreground">Frame Inventory & Lab Order Management</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>

              {/* Home */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild data-active={isActive("/home")} className={activeClass}>
                  <Link href="/home" data-testid="link-home">
                    <Home className="w-4 h-4" />
                    <span>Home</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Frame Analytics */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild data-active={isActive("/frame-analytics")} className={activeClass}>
                  <Link href="/frame-analytics" data-testid="link-frame-analytics">
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Frame Analytics</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Inventory Dropdown */}
              <SidebarMenuItem>
                <button
                  type="button"
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${isInventoryPath ? "bg-sidebar-accent/60 text-sidebar-accent-foreground" : "text-sidebar-foreground"}`}
                  onClick={() => setInventoryOpen((v) => !v)}
                  data-testid="button-toggle-inventory-dropdown"
                >
                  <Package className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 text-left">Inventory</span>
                  <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 ${inventoryOpen ? "rotate-180" : ""}`} />
                </button>
                {inventoryOpen && (
                  <div className="ml-5 mt-0.5 space-y-0.5 border-l border-sidebar-border pl-3">
                    <SidebarMenuButton asChild data-active={isActive("/inventory")} className={activeClass}>
                      <Link href="/inventory" data-testid="link-frame-inventory">
                        <Package className="w-3.5 h-3.5" />
                        <span className="text-sm">Frame Inventory</span>
                      </Link>
                    </SidebarMenuButton>
                    <SidebarMenuButton asChild data-active={isActive("/frame-reorders")} className={activeClass}>
                      <Link href="/frame-reorders" data-testid="link-frame-reorders">
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span className="text-sm">Frame Reorders</span>
                      </Link>
                    </SidebarMenuButton>
                  </div>
                )}
              </SidebarMenuItem>

              {/* Orders Dropdown */}
              <SidebarMenuItem>
                <button
                  type="button"
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${isOrdersPath ? "bg-sidebar-accent/60 text-sidebar-accent-foreground" : "text-sidebar-foreground"}`}
                  onClick={() => setOrdersOpen((v) => !v)}
                  data-testid="button-toggle-orders-dropdown"
                >
                  <FlaskConical className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 text-left">Orders</span>
                  <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 ${ordersOpen ? "rotate-180" : ""}`} />
                </button>
                {ordersOpen && (
                  <div className="ml-5 mt-0.5 space-y-0.5 border-l border-sidebar-border pl-3">
                    <SidebarMenuButton asChild data-active={isActive("/lab-orders")} className={activeClass}>
                      <Link href="/lab-orders" data-testid="link-lab-orders">
                        <FlaskConical className="w-3.5 h-3.5" />
                        <span className="text-sm">Lab Orders</span>
                      </Link>
                    </SidebarMenuButton>
                    <SidebarMenuButton asChild data-active={isActive("/frame-holds")} className={activeClass}>
                      <Link href="/frame-holds" data-testid="link-frame-holds">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="text-sm">Frame Holds</span>
                      </Link>
                    </SidebarMenuButton>
                  </div>
                )}
              </SidebarMenuItem>

              {/* Weekly Metrics */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild data-active={isActive("/weekly-metrics")} className={activeClass}>
                  <Link href="/weekly-metrics" data-testid="link-weekly-metrics">
                    <BarChart2 className="w-4 h-4" />
                    <span>Weekly Metrics</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    data-active={location === "/settings"}
                    className={activeClass}
                  >
                    <Link href="/settings" data-testid="link-settings">
                      <Settings className="w-4 h-4" />
                      <span>Settings</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="px-3 py-3 space-y-2">
          {user && (
            <div className="flex items-center gap-2.5 px-1 py-1">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <User className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-sidebar-foreground truncate">{user.username}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge
                    variant={user.role === "admin" ? "default" : "secondary"}
                    className="text-[10px] px-1.5 py-0 h-4"
                    data-testid="badge-user-role"
                  >
                    {user.role}
                  </Badge>
                </div>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4" />
            {logout.isPending ? "Signing out..." : "Sign out"}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
