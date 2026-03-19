import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  Package, FlaskConical, CheckCircle, Archive, TrendingUp, ArrowRight,
  AlertTriangle, DollarSign, ShoppingCart, BarChart2, Trophy, CalendarDays, RefreshCw,
  FileDown, BellOff, ChevronUp, ChevronDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Frame, LabOrder, FrameHold } from "@shared/schema";
import { queryClient, getQueryFn } from "@/lib/queryClient";

const STATUS_CONFIG = {
  on_board: { label: "On Board", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", dot: "bg-emerald-500" },
  off_board: { label: "Off Board", color: "bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400", dot: "bg-slate-400" },
  at_lab: { label: "At Lab", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", dot: "bg-amber-500" },
  sold: { label: "Sold", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", dot: "bg-blue-500" },
};


function StatCard({
  title, value, icon: Icon, iconColor, bgColor, description, loading, valueClass,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  iconColor: string;
  bgColor: string;
  description?: string;
  loading?: boolean;
  valueClass?: string;
}) {
  return (
    <Card className="border-card-border">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground font-medium mb-1 uppercase tracking-wide">{title}</p>
            {loading ? (
              <Skeleton className="h-7 w-24 mb-1" />
            ) : (
              <p className={`text-2xl font-bold text-foreground leading-tight ${valueClass ?? ""}`}>{value}</p>
            )}
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          <div className={`p-2.5 rounded-lg ${bgColor} flex-shrink-0`}>
            <Icon className={`w-4 h-4 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const TOP_LIST_DEFAULT = 3;

function TopList({
  title, icon: Icon, items, loading, valueLabel,
}: {
  title: string;
  icon: React.ElementType;
  items: { name: string; count: number; revenue: number }[];
  loading: boolean;
  valueLabel?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const maxCount = items[0]?.count ?? 1;
  const visible = expanded ? items : items.slice(0, TOP_LIST_DEFAULT);
  const hasMore = items.length > TOP_LIST_DEFAULT;

  return (
    <Card className="border-card-border">
      <CardHeader className="pb-3 px-5 pt-5">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Icon className="w-4 h-4 text-muted-foreground" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        ) : items.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No sales data yet</p>
        ) : (
          <>
            <div className="space-y-2.5">
              {visible.map((item, i) => (
                <div key={item.name} className="space-y-1" data-testid={`row-top-${valueLabel?.toLowerCase() ?? "item"}-${i}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold text-muted-foreground w-4 flex-shrink-0">{i + 1}</span>
                      <span className="text-sm font-medium text-foreground truncate">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-muted-foreground">{item.count} sold</span>
                      <Badge variant="secondary" className="text-xs font-semibold">
                        ${item.revenue.toFixed(0)}
                      </Badge>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden ml-6">
                    <div
                      className="h-full rounded-full bg-primary/60"
                      style={{ width: `${(item.count / maxCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            {hasMore && (
              <button
                onClick={() => setExpanded((e) => !e)}
                className="mt-3 w-full flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors py-1.5 rounded-md hover:bg-muted/50"
                data-testid={`button-top-${valueLabel?.toLowerCase() ?? "item"}-toggle`}
              >
                {expanded ? (
                  <><ChevronUp className="w-3.5 h-3.5" /> Show Less</>
                ) : (
                  <><ChevronDown className="w-3.5 h-3.5" /> View More ({items.length - TOP_LIST_DEFAULT} more)</>
                )}
              </button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function daysAtLab(dateSentToLab: string): number {
  const sent = new Date(dateSentToLab);
  const today = new Date();
  return Math.floor((today.getTime() - sent.getTime()) / (1000 * 60 * 60 * 24));
}

function isThisMonth(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr + "T00:00:00");
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function fmt(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function topN(
  frames: Frame[],
  key: keyof Frame,
): { name: string; count: number; revenue: number }[] {
  const map = new Map<string, { count: number; revenue: number }>();
  for (const f of frames) {
    const units = f.soldCount ?? 0;
    if (units === 0) continue;
    const k = String(f[key] ?? "Unknown");
    const existing = map.get(k) ?? { count: 0, revenue: 0 };
    existing.count += units;
    existing.revenue += units * parseFloat(f.retailPrice as string);
    map.set(k, existing);
  }
  return [...map.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.count - a.count || b.revenue - a.revenue);
}

function computeFramesByManufacturer(
  frames: Frame[],
  frameHolds: FrameHold[],
  labOrders: LabOrder[],
): { name: string; total: number }[] {
  const activeHoldCount = new Map<string, number>();
  for (const h of frameHolds) {
    if (h.status === "active" && h.frameId) {
      activeHoldCount.set(h.frameId, (activeHoldCount.get(h.frameId) ?? 0) + 1);
    }
  }
  const activeLabCount = new Map<string, number>();
  for (const o of labOrders) {
    if (o.status === "pending" && !o.patientOwnFrame && o.frameId) {
      activeLabCount.set(o.frameId, (activeLabCount.get(o.frameId) ?? 0) + 1);
    }
  }
  const map = new Map<string, number>();
  for (const f of frames) {
    const mfr = f.manufacturer?.trim() || "Unknown";
    const owned =
      Math.max(0, f.quantity ?? 0) +
      Math.max(0, f.offBoardQty ?? 0) +
      Math.max(0, f.reorderedQty ?? 0) +
      (activeHoldCount.get(f.id) ?? 0) +
      (activeLabCount.get(f.id) ?? 0);
    if (owned > 0) {
      map.set(mfr, (map.get(mfr) ?? 0) + owned);
    }
  }
  return [...map.entries()]
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
}

export default function Dashboard() {
  const { isAdmin } = useAuth();

  const { data: frames = [], isLoading, isFetching, refetch } = useQuery<Frame[]>({
    queryKey: ["/api/frames"],
  });

  const { data: settingsMap = {} } = useQuery<Record<string, string>>({
    queryKey: ["/api/settings"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const { data: labOrders = [] } = useQuery<LabOrder[]>({
    queryKey: ["/api/lab-orders"],
  });

  const { data: frameHolds = [] } = useQuery<FrameHold[]>({
    queryKey: ["/api/frame-holds"],
  });

  const reminderDays = parseInt(settingsMap.labReminderDays || "14");

  const onBoard = frames.reduce((acc, f) => acc + Math.max(0, f.quantity ?? 0), 0);
  const offBoard = frames.reduce((acc, f) => acc + (f.offBoardQty ?? 0) + (f.reorderedQty ?? 0), 0);
  const activeLabOrders = labOrders.filter((o) => o.status === "pending" && !o.patientOwnFrame);
  const atLab = activeLabOrders.length;
  const onHold = frameHolds.filter((h) => h.status === "active").length;
  const total = frames.length;

  const sold = frames.reduce((acc, f) => acc + (f.soldCount ?? 0), 0);

  const totalRevenue = frames.reduce((acc, f) => acc + (f.soldCount ?? 0) * parseFloat(f.retailPrice as string), 0);
  const totalWholesaleCost = frames.reduce((acc, f) => acc + (f.soldCount ?? 0) * parseFloat(f.cost as string), 0);
  const totalProfit = totalRevenue - totalWholesaleCost;

  const soldThisMonth = frames.filter((f) => (f.soldCount ?? 0) > 0 && f.dateSold && isThisMonth(f.dateSold));
  const revenueThisMonth = soldThisMonth.reduce((acc, f) => acc + (f.soldCount ?? 0) * parseFloat(f.retailPrice as string), 0);
  const framesThisMonth = soldThisMonth.reduce((acc, f) => acc + (f.soldCount ?? 0), 0);

  const topBrands = topN(frames, "brand");
  const topManufacturers = topN(frames, "manufacturer");
  const topModels = topN(frames, "model");
  const byManufacturer = computeFramesByManufacturer(frames, frameHolds, labOrders);

  const recentFrames = [...frames]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const overdueLabOrders = activeLabOrders
    .filter((o) => o.dateSentToLab && daysAtLab(o.dateSentToLab) >= reminderDays)
    .sort((a, b) => daysAtLab(b.dateSentToLab!) - daysAtLab(a.dateSentToLab!));

  const currentMonth = new Date().toLocaleString("en-US", { month: "long", year: "numeric" });

  async function handleRefresh() {
    await queryClient.invalidateQueries({ queryKey: ["/api/frames"] });
    await queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    await queryClient.invalidateQueries({ queryKey: ["/api/lab-orders"] });
    await queryClient.invalidateQueries({ queryKey: ["/api/frame-holds"] });
    refetch();
  }

  function handleExportPDF() {
    const html = `<!DOCTYPE html><html><head><title>OptiTrack Monthly Report – ${currentMonth}</title>
<style>
  body { font-family: Arial, sans-serif; padding: 40px; color: #111; }
  h1 { font-size: 22px; margin-bottom: 4px; }
  h2 { font-size: 14px; color: #666; font-weight: normal; margin-bottom: 32px; }
  .section { margin-bottom: 28px; }
  .section h3 { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: #888; margin-bottom: 12px; border-bottom: 1px solid #eee; padding-bottom: 6px; }
  .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
  .card { border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px; }
  .card .label { font-size: 11px; color: #888; margin-bottom: 4px; }
  .card .value { font-size: 22px; font-weight: bold; }
  .card .sub { font-size: 11px; color: #aaa; margin-top: 2px; }
  .footer { margin-top: 48px; font-size: 10px; color: #bbb; }
  @media print { body { padding: 0; } }
</style></head><body>
<h1>OptiTrack Monthly Report</h1>
<h2>${currentMonth}</h2>
<div class="section">
  <h3>This Month</h3>
  <div class="grid">
    <div class="card"><div class="label">Revenue This Month</div><div class="value">$${fmt(revenueThisMonth)}</div><div class="sub">Retail price of frames sold</div></div>
    <div class="card"><div class="label">Frames Sold This Month</div><div class="value">${framesThisMonth}</div><div class="sub">Units sold this month</div></div>
  </div>
</div>
<div class="section">
  <h3>All-Time Performance</h3>
  <div class="grid">
    <div class="card"><div class="label">Total Revenue</div><div class="value">$${fmt(totalRevenue)}</div></div>
    <div class="card"><div class="label">Total Profit</div><div class="value">$${fmt(totalProfit)}</div></div>
    <div class="card"><div class="label">Total Frames Sold</div><div class="value">${sold}</div></div>
    <div class="card"><div class="label">Profit Margin</div><div class="value">${totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : "0.0"}%</div></div>
  </div>
</div>
<div class="section">
  <h3>Inventory Overview</h3>
  <div class="grid">
    <div class="card"><div class="label">Total Frame Models</div><div class="value">${total}</div></div>
    <div class="card"><div class="label">On Board</div><div class="value">${onBoard}</div></div>
    <div class="card"><div class="label">On Hold</div><div class="value">${onHold}</div></div>
    <div class="card"><div class="label">Not On Board</div><div class="value">${offBoard}</div></div>
    <div class="card"><div class="label">Active Lab Orders</div><div class="value">${atLab}</div></div>
  </div>
</div>
<div class="section">
  <h3>Frames by Manufacturer</h3>
  <table style="width:100%;border-collapse:collapse;font-size:12px;">
    <thead><tr><th style="text-align:left;padding:6px 0;border-bottom:1px solid #eee;color:#888">Manufacturer</th><th style="text-align:right;padding:6px 0;border-bottom:1px solid #eee;color:#888">Total Frames</th></tr></thead>
    <tbody>${byManufacturer.map(m => `<tr><td style="padding:5px 0;border-bottom:1px solid #f5f5f5">${m.name}</td><td style="text-align:right;padding:5px 0;border-bottom:1px solid #f5f5f5;font-weight:600">${m.total}</td></tr>`).join("")}</tbody>
  </table>
</div>
<div class="footer">Generated by OptiTrack · ${new Date().toLocaleString()}</div>
</body></html>`;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Frame Analytics</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Frame Inventory & Lab Order Management</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            disabled={isLoading}
            data-testid="button-export-pdf"
          >
            <FileDown className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isFetching}
            data-testid="button-refresh-analytics"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            {isFetching ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Row 1: Inventory status stats */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Inventory Overview</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard
            title="Total Frames"
            value={total}
            icon={Archive}
            iconColor="text-violet-600 dark:text-violet-400"
            bgColor="bg-violet-100 dark:bg-violet-900/30"
            loading={isLoading}
          />
          <StatCard
            title="On Board"
            value={onBoard}
            icon={Package}
            iconColor="text-emerald-600 dark:text-emerald-400"
            bgColor="bg-emerald-100 dark:bg-emerald-900/30"
            loading={isLoading}
          />
          <StatCard
            title="On Hold"
            value={onHold}
            icon={CalendarDays}
            iconColor="text-orange-600 dark:text-orange-400"
            bgColor="bg-orange-100 dark:bg-orange-900/30"
            loading={isLoading}
            description="Active frame holds"
          />
          <StatCard
            title="Off Board"
            value={offBoard}
            icon={BellOff}
            iconColor="text-slate-500 dark:text-slate-400"
            bgColor="bg-slate-100 dark:bg-slate-800/50"
            loading={isLoading}
            description="Not on display board"
          />
          <StatCard
            title="At Lab"
            value={atLab}
            icon={FlaskConical}
            iconColor="text-amber-600 dark:text-amber-400"
            bgColor="bg-amber-100 dark:bg-amber-900/30"
            loading={isLoading}
          />
          <StatCard
            title="Total Sold"
            value={sold}
            icon={CheckCircle}
            iconColor="text-blue-600 dark:text-blue-400"
            bgColor="bg-blue-100 dark:bg-blue-900/30"
            loading={isLoading}
          />
        </div>
      </div>

      {/* Row 2: Sales financial stats — admin only */}
      {isAdmin && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Sales Performance (All Time)</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              title="Total Revenue"
              value={`$${fmt(totalRevenue)}`}
              icon={DollarSign}
              iconColor="text-emerald-600 dark:text-emerald-400"
              bgColor="bg-emerald-100 dark:bg-emerald-900/30"
              loading={isLoading}
              description="Retail price of sold frames"
            />
            <StatCard
              title="Total Wholesale Cost"
              value={`$${fmt(totalWholesaleCost)}`}
              icon={ShoppingCart}
              iconColor="text-slate-600 dark:text-slate-400"
              bgColor="bg-slate-100 dark:bg-slate-800/50"
              loading={isLoading}
              description="Cost of sold frames"
            />
            <StatCard
              title="Total Profit"
              value={`$${fmt(totalProfit)}`}
              icon={TrendingUp}
              iconColor={totalProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}
              bgColor={totalProfit >= 0 ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-red-100 dark:bg-red-900/30"}
              loading={isLoading}
              description="Revenue minus wholesale cost"
              valueClass={totalProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}
            />
            <StatCard
              title="Profit Margin"
              value={totalRevenue > 0 ? `${((totalProfit / totalRevenue) * 100).toFixed(1)}%` : "—"}
              icon={BarChart2}
              iconColor="text-violet-600 dark:text-violet-400"
              bgColor="bg-violet-100 dark:bg-violet-900/30"
              loading={isLoading}
              description="Profit as % of revenue"
            />
          </div>
        </div>
      )}

      {/* Row 3: This month — admin only */}
      {isAdmin && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            <CalendarDays className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
            {currentMonth}
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              title="Revenue This Month"
              value={`$${fmt(revenueThisMonth)}`}
              icon={DollarSign}
              iconColor="text-emerald-600 dark:text-emerald-400"
              bgColor="bg-emerald-100 dark:bg-emerald-900/30"
              loading={isLoading}
            />
            <StatCard
              title="Frames Sold This Month"
              value={framesThisMonth}
              icon={CheckCircle}
              iconColor="text-blue-600 dark:text-blue-400"
              bgColor="bg-blue-100 dark:bg-blue-900/30"
              loading={isLoading}
            />
          </div>
        </div>
      )}

      {/* Lab follow-up alert */}
      {!isLoading && overdueLabOrders.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
          <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-3 px-6 pt-5">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex-shrink-0">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-amber-900 dark:text-amber-200">
                Frames Needing Lab Follow-Up
              </CardTitle>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                {overdueLabOrders.length} order{overdueLabOrders.length !== 1 ? "s" : ""} at lab for {reminderDays}+ days
              </p>
            </div>
            <div className="ml-auto">
              <Button variant="ghost" size="sm" asChild className="text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-200">
                <Link href="/lab-orders" data-testid="link-lab-followup-inventory">
                  View Lab Orders <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-5">
            <div className="rounded-md overflow-hidden border border-amber-200 dark:border-amber-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-amber-100/60 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-amber-800 dark:text-amber-300">Brand / Model</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-amber-800 dark:text-amber-300 hidden sm:table-cell">Lab</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-amber-800 dark:text-amber-300 hidden md:table-cell">Vision Plan</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-amber-800 dark:text-amber-300 hidden md:table-cell">Lab Order #</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-amber-800 dark:text-amber-300">Days at Lab</th>
                  </tr>
                </thead>
                <tbody>
                  {overdueLabOrders.map((order) => {
                    const days = daysAtLab(order.dateSentToLab!);
                    return (
                      <tr
                        key={order.id}
                        className="border-b border-amber-100 dark:border-amber-900/50 last:border-0 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                        data-testid={`row-overdue-frame-${order.id}`}
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">{order.frameBrand}</p>
                          <p className="text-xs text-muted-foreground">{order.frameModel}</p>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                          {order.labName || <span className="text-muted-foreground/50">—</span>}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                          {order.visionPlan || <span className="text-muted-foreground/50">—</span>}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                          {order.labOrderNumber || <span className="text-muted-foreground/50">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Badge
                            variant="outline"
                            className="border-amber-400 text-amber-700 dark:text-amber-400 dark:border-amber-600 font-semibold"
                            data-testid={`text-days-at-lab-${order.id}`}
                          >
                            {days} days
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analytics: Top 5 each */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          <Trophy className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
          Top Sellers (by units sold)
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TopList
            title="Top Brands"
            icon={Trophy}
            items={topBrands}
            loading={isLoading}
            valueLabel="brand"
          />
          <TopList
            title="Top Manufacturers"
            icon={BarChart2}
            items={topManufacturers}
            loading={isLoading}
            valueLabel="manufacturer"
          />
          <TopList
            title="Top Frame Models"
            icon={Package}
            items={topModels}
            loading={isLoading}
            valueLabel="model"
          />
        </div>
      </div>

      {/* Frames by Manufacturer */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          <BarChart2 className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
          Frames by Manufacturer
        </p>
        <Card className="border-card-border" data-testid="card-frames-by-manufacturer">
          <CardContent className="px-6 py-5">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-7 w-full" />
                ))}
              </div>
            ) : byManufacturer.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No frames in inventory</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-2.5">
                {byManufacturer.map(({ name, total }, idx) => {
                  const max = byManufacturer[0].total;
                  const pct = max > 0 ? (total / max) * 100 : 0;
                  return (
                    <div key={name} className="flex items-center gap-3" data-testid={`row-manufacturer-${idx}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-foreground truncate" data-testid={`text-manufacturer-name-${idx}`}>{name}</span>
                          <span className="text-sm font-semibold text-foreground ml-2 tabular-nums flex-shrink-0" data-testid={`text-manufacturer-total-${idx}`}>{total}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-violet-500 transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent frames + status breakdown */}
      <div className={`grid grid-cols-1 ${isAdmin ? "lg:grid-cols-3" : ""} gap-4`}>
        <Card className={`border-card-border ${isAdmin ? "lg:col-span-2" : ""}`}>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2 px-6 pt-5">
            <CardTitle className="text-base font-semibold">Recent Frames</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/inventory" data-testid="link-view-all">
                View all <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="px-6 pb-5">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : recentFrames.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">
                <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No frames yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentFrames.map((frame) => {
                  const config = STATUS_CONFIG[frame.status as keyof typeof STATUS_CONFIG];
                  const retail = parseFloat(frame.retailPrice as string);
                  const cost = parseFloat(frame.cost as string);
                  const profit = retail - cost;
                  return (
                    <div
                      key={frame.id}
                      data-testid={`row-recent-frame-${frame.id}`}
                      className="flex items-center justify-between gap-3 py-2.5 px-3 rounded-md bg-muted/40"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {frame.brand} {frame.model}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {frame.manufacturer} · {frame.color}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right">
                          <p className="text-sm font-semibold text-foreground">${retail.toFixed(2)}</p>
                          <p className="text-xs text-emerald-600 dark:text-emerald-400">+${profit.toFixed(2)}</p>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${config.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
                          {config.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {isAdmin && (
          <Card className="border-card-border">
          <CardHeader className="space-y-0 pb-2 px-6 pt-5">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              Sales Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-5 space-y-3">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <>
                <div className="p-3 rounded-md bg-muted/40 space-y-0.5">
                  <p className="text-xs text-muted-foreground">Revenue (sold frames)</p>
                  <p className="text-lg font-bold text-foreground" data-testid="text-total-revenue">
                    ${fmt(totalRevenue)}
                  </p>
                </div>
                <div className="p-3 rounded-md bg-muted/40 space-y-0.5">
                  <p className="text-xs text-muted-foreground">Wholesale Cost (sold)</p>
                  <p className="text-lg font-bold text-foreground" data-testid="text-total-cost">
                    ${fmt(totalWholesaleCost)}
                  </p>
                </div>
                <div className="p-3 rounded-md bg-emerald-50 dark:bg-emerald-950/20 space-y-0.5">
                  <p className="text-xs text-muted-foreground">Net Profit</p>
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400" data-testid="text-total-profit">
                    ${fmt(totalProfit)}
                  </p>
                </div>
                {total > 0 && (
                  <div className="space-y-2 pt-1">
                    <p className="text-xs text-muted-foreground">Status Breakdown</p>
                    {(() => {
                      const breakdownTotal = onBoard + onHold + offBoard + atLab + sold;
                      return [
                        { label: "On Board", count: onBoard, color: "bg-emerald-500" },
                        { label: "On Hold", count: onHold, color: "bg-orange-500" },
                        { label: "Not On Board", count: offBoard, color: "bg-slate-400" },
                        { label: "At Lab", count: atLab, color: "bg-amber-500" },
                        { label: "Sold", count: sold, color: "bg-blue-500" },
                      ].map(({ label, count, color }) => (
                        <div key={label} className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full ${color}`}
                              style={{ width: breakdownTotal > 0 ? `${(count / breakdownTotal) * 100}%` : "0%" }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-24 text-right">
                            {label} ({count})
                          </span>
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </>
            )}
          </CardContent>
          </Card>
        )}
      </div>

    </div>
  );
}
