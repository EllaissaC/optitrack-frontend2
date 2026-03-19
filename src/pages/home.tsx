import { Link } from "wouter";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Package,
  FlaskConical,
  BarChart2,
  Plus,
  Barcode,
  Truck,
  LogOut,
  User,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth, useLogout } from "@/hooks/use-auth";
import type { Frame } from "@shared/schema";
import type { LabOrder } from "@shared/schema";

function calcDaysAtLabHome(dateSentToLab: string | null | undefined): number | null {
  if (!dateSentToLab) return null;
  const sent = new Date(dateSentToLab + "T00:00:00");
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - sent.getTime()) / (1000 * 60 * 60 * 24));
}

function isLabOrderOverdue(order: LabOrder, threshold: number): boolean {
  if (order.status === "received") return false;
  if (order.customDueDate) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const due = new Date(order.customDueDate); due.setHours(0, 0, 0, 0);
    return today > due;
  }
  const days = calcDaysAtLabHome(order.dateSentToLab);
  return days !== null && days >= threshold;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function startOfCurrentWeek() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

const navCards = [
  { title: "Frame Analytics", icon: LayoutDashboard, url: "/frame-analytics", dot: "bg-violet-500", testId: "nav-card-frame-analytics" },
  { title: "Inventory",       icon: Package,         url: "/inventory",        dot: "bg-emerald-500", testId: "nav-card-inventory" },
  { title: "Lab Orders",      icon: FlaskConical,    url: "/lab-orders",       dot: "bg-blue-500",    testId: "nav-card-lab-orders" },
  { title: "Weekly Metrics",  icon: BarChart2,       url: "/weekly-metrics",   dot: "bg-amber-500",   testId: "nav-card-weekly-metrics" },
];

const quickActions = [
  { label: "Add Frame",    icon: Plus,    url: "/inventory",  testId: "quick-action-add-frame" },
  { label: "Scan Barcode", icon: Barcode, url: "/inventory",  testId: "quick-action-scan-barcode" },
  { label: "Send to Lab",  icon: Truck,   url: "/lab-orders", testId: "quick-action-send-to-lab" },
];

export default function Home() {
  const { user } = useAuth();
  const logout = useLogout();

  const { data: frames } = useQuery<Frame[]>({ queryKey: ["/api/frames"] });
  const { data: labOrders } = useQuery<LabOrder[]>({ queryKey: ["/api/lab-orders"] });
  const { data: settingsMap = {} } = useQuery<Record<string, string>>({ queryKey: ["/api/settings"] });

  const overdueThreshold = useMemo(() => {
    return Math.max(1, parseInt((settingsMap as Record<string, string>).labTurnaroundDays || "14"));
  }, [settingsMap]);

  const stats = useMemo(() => {
    const framesInStock = frames?.reduce((sum, f) => sum + (f.quantity ?? 0), 0) ?? 0;
    const reorderAlerts = frames?.filter(f => (f.offBoardQty ?? 0) > 0).length ?? 0;
    const pendingOrders = labOrders?.filter(o => o.status !== "received").length ?? 0;
    const overdueOrders = labOrders?.filter(o => isLabOrderOverdue(o, overdueThreshold)).length ?? 0;

    const weekStart = startOfCurrentWeek();
    const soldThisWeek = labOrders?.filter(o => {
      if (!o.frameSold || !o.frameSoldAt) return false;
      return new Date(o.frameSoldAt) >= weekStart;
    }) ?? [];
    const weekRevenue = soldThisWeek.reduce((sum, order) => {
      const frame = frames?.find(f => f.id === order.frameId);
      return sum + (frame ? parseFloat(frame.retailPrice as string) : 0);
    }, 0);

    return { framesInStock, reorderAlerts, pendingOrders, overdueOrders, weekRevenue };
  }, [frames, labOrders, overdueThreshold]);

  const statusCards = [
    {
      title: "Frames in Stock",
      value: stats.framesInStock.toLocaleString(),
      icon: TrendingUp,
      color: "text-emerald-600",
      bgColor: "bg-emerald-100",
      borderColor: "bg-emerald-400",
      trend: "On board",
      trendColor: "text-emerald-700 bg-emerald-50",
      alert: false,
      link: "/inventory",
    },
    {
      title: "Lab Orders Pending",
      value: stats.pendingOrders.toLocaleString(),
      icon: FlaskConical,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      borderColor: "bg-blue-400",
      trend: "In progress",
      trendColor: "text-blue-700 bg-blue-50",
      alert: false,
      link: "/lab-orders",
    },
    {
      title: "Reorder Alerts",
      value: stats.reorderAlerts.toLocaleString(),
      icon: AlertTriangle,
      color: "text-amber-600",
      bgColor: "bg-amber-100",
      borderColor: "bg-amber-400",
      trend: stats.reorderAlerts > 0 ? "Needs attention" : "All clear",
      trendColor: stats.reorderAlerts > 0 ? "text-amber-700 bg-amber-100" : "text-emerald-700 bg-emerald-50",
      alert: stats.reorderAlerts > 0,
      link: "/frame-reorders",
    },
    {
      title: "Sold This Week",
      value: `$${stats.weekRevenue.toLocaleString()}`,
      icon: BarChart2,
      color: "text-violet-600",
      bgColor: "bg-violet-100",
      borderColor: "bg-violet-400",
      trend: "Revenue",
      trendColor: "text-violet-700 bg-violet-50",
      alert: false,
      link: "/frame-analytics",
    },
    {
      title: "Orders Needing Attention",
      value: stats.overdueOrders.toLocaleString(),
      icon: ShieldAlert,
      color: "text-red-600",
      bgColor: "bg-red-100",
      borderColor: "bg-red-500",
      trend: stats.overdueOrders > 0 ? "Overdue" : "All clear",
      trendColor: stats.overdueOrders > 0 ? "text-red-700 bg-red-100" : "text-emerald-700 bg-emerald-50",
      alert: stats.overdueOrders > 0,
      link: "/lab-orders?urgency=red",
      alertLink: "View overdue orders →",
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-background">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-sm">
            <Package className="w-4 h-4 text-primary-foreground" strokeWidth={2} />
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground">OptiTrack</span>
        </div>

        {user && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div className="hidden sm:flex flex-col items-start leading-none">
                <span className="text-sm font-semibold text-foreground" data-testid="text-home-username">
                  {user.username}
                </span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                  {user.role}
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground hidden sm:flex items-center gap-2 h-8"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
              data-testid="button-home-logout"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-xs font-medium">
                {logout.isPending ? "Signing out..." : "Sign out"}
              </span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground h-8 w-8 rounded-full sm:hidden"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
              title="Sign out"
              data-testid="button-home-logout-mobile"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        )}
      </header>

      <main className="flex-1 flex flex-col px-6 py-8 max-w-5xl mx-auto w-full justify-center">
        <div className="mb-6" data-testid="text-home-greeting">
          <h1 className="text-xl font-semibold text-foreground">
            {getGreeting()}{user ? `, ${user.username}` : ""}.
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Here's your clinic overview for today.
          </p>
        </div>

        <div className="flex flex-col gap-8">
          <section>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70 mb-3">
              Today's Overview
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
              {statusCards.map((card) => (
                <Link key={card.title} href={card.link}>
                  <div
                    data-testid={`stat-card-${card.title.toLowerCase().replace(/\s+/g, "-")}`}
                    className={`relative flex flex-col p-5 rounded-xl shadow-sm border cursor-pointer transition-all hover:shadow-md ${
                      card.alert
                        ? card.title === "Orders Needing Attention"
                          ? "bg-red-50/80 border-red-200 hover:border-red-300"
                          : "bg-amber-50/80 border-amber-200 hover:border-amber-300"
                        : "bg-card border-border hover:border-primary/30"
                    } overflow-hidden`}
                  >
                    <div className={`absolute top-0 left-0 right-0 h-[3px] ${card.borderColor}`} />
                    <div className="flex items-start justify-between mb-4 mt-1">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${card.bgColor}`}>
                        <card.icon className={`w-5 h-5 ${card.color}`} strokeWidth={2} />
                      </div>
                      <div className={`text-[10px] font-medium rounded px-1.5 py-0.5 ${card.trendColor}`}>
                        {card.trend}
                      </div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-foreground tracking-tight">
                        {card.value}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 font-medium">
                        {card.title}
                      </div>
                    </div>
                    {card.alert && (
                      <span className={`text-xs underline mt-4 font-medium ${
                        card.title === "Orders Needing Attention" ? "text-red-700" : "text-amber-700"
                      }`}>
                        {"alertLink" in card ? card.alertLink : "View reorders →"}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground/40 mb-2">
              Go to
            </h2>

            <div className="grid grid-cols-2 gap-3">
              {navCards.map((card) => (
                <Link key={card.title} href={card.url} data-testid={card.testId}>
                  <div className="group flex items-center gap-3 p-3.5 rounded-lg border border-border bg-card hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${card.dot}`} />
                    <div className="w-8 h-8 rounded-md bg-muted group-hover:bg-primary/5 flex items-center justify-center flex-shrink-0 transition-colors">
                      <card.icon
                        className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors"
                        strokeWidth={2}
                      />
                    </div>
                    <span className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                      {card.title}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 ml-auto flex-shrink-0 text-muted-foreground/30 group-hover:text-primary/60 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-3">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground/40 font-medium whitespace-nowrap">
                Shortcuts
              </span>
              <div className="flex flex-wrap gap-2">
                {quickActions.map((action) => (
                  <Button
                    key={action.label}
                    variant="outline"
                    className="h-8 px-3 rounded-full text-xs font-medium gap-1.5 bg-background hover:bg-muted"
                    asChild
                    data-testid={action.testId}
                  >
                    <Link href={action.url}>
                      <action.icon className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={2} />
                      {action.label}
                    </Link>
                  </Button>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
