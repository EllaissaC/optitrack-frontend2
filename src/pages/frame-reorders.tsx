import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { RotateCcw, Truck, AlertCircle, CheckCircle, Pencil, ChevronDown, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type Frame } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export default function FrameReorders() {
  const { toast } = useToast();
  const [needsReorderExpanded, setNeedsReorderExpanded] = useState(true);
  const [reorderedExpanded, setReorderedExpanded] = useState(true);

  const { data: frames = [], isLoading } = useQuery<Frame[]>({
    queryKey: ["/api/frames"],
  });

  const reorderMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/frames/${id}/reorder`, { qty: 1 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/frames"] });
      toast({ title: "Reorder placed", description: "Frame moved to 'Frames Reordered' — awaiting delivery." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to mark as reordered.", variant: "destructive" });
    },
  });

  const backOnBoardMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/frames/${id}/back-on-board`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/frames"] });
      toast({ title: "Back on board", description: "Frame quantity restored and status set to On Board." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to mark frame back on board.", variant: "destructive" });
    },
  });

  const reorderAlerts = frames.filter((f) => (f.offBoardQty ?? 0) > 0);
  const reorderedFrames = frames.filter((f) => (f.reorderedQty ?? 0) > 0);

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Frame Reorders</h1>
        <p className="text-sm text-muted-foreground mt-1">Track frames that need to be reordered and frames awaiting delivery.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Need Reordered</p>
          <p className="text-3xl font-bold text-orange-600 mt-1">{reorderAlerts.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Awaiting Delivery</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">{reorderedFrames.length}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground text-center py-12">Loading frames…</div>
      ) : reorderAlerts.length === 0 && reorderedFrames.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card p-12 text-center">
          <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">All frames are on board</p>
          <p className="text-xs text-muted-foreground mt-1">No frames currently need to be reordered.</p>
          <Link href="/inventory">
            <Button variant="outline" size="sm" className="mt-4">Go to Frame Inventory</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Frames Need Reordered */}
          <div className="rounded-lg border border-orange-200 dark:border-orange-800 overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center justify-between px-4 py-3 bg-orange-50/60 dark:bg-orange-950/20 hover:bg-orange-100/60 dark:hover:bg-orange-950/30 transition-colors"
              onClick={() => setNeedsReorderExpanded((v) => !v)}
              data-testid="button-toggle-needs-reorder"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-orange-500 flex-shrink-0" />
                <span className="text-sm font-semibold text-orange-800 dark:text-orange-300">Frames Need Reordered</span>
                <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-orange-200 dark:bg-orange-900 text-orange-800 dark:text-orange-300">
                  {reorderAlerts.length}
                </span>
              </div>
              <ChevronDown className={`w-4 h-4 text-orange-600 dark:text-orange-400 transition-transform duration-200 ${needsReorderExpanded ? "rotate-180" : ""}`} />
            </button>
            {needsReorderExpanded && (
              <div className="px-4 py-3 space-y-2 bg-background border-t border-orange-200 dark:border-orange-800">
                {reorderAlerts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">No frames currently need to be reordered.</p>
                ) : (
                  reorderAlerts.map((frame) => (
                    <div
                      key={frame.id}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50/40 dark:bg-orange-950/10"
                      data-testid={`alert-reorder-${frame.id}`}
                    >
                      <div className="p-1.5 rounded-md bg-orange-100 dark:bg-orange-900/40 flex-shrink-0">
                        <RotateCcw className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {frame.brand} {frame.model}
                          {(frame.reorderCount ?? 0) > 0 && (
                            <span className="ml-2 text-xs text-muted-foreground">(reordered {frame.reorderCount}×)</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {frame.manufacturer} · {frame.color} · {frame.eyeSize}/{frame.bridge}/{frame.templeLength}
                          <span className="ml-2 font-medium text-orange-700 dark:text-orange-400">
                            {frame.offBoardQty} unit{(frame.offBoardQty ?? 0) !== 1 ? "s" : ""} not on board
                          </span>
                        </p>
                      </div>
                      <Button
                        size="sm"
                        className="text-xs bg-orange-600 hover:bg-orange-700 text-white border-0 flex-shrink-0"
                        onClick={() => reorderMutation.mutate(frame.id)}
                        disabled={reorderMutation.isPending}
                        data-testid={`button-mark-reordered-${frame.id}`}
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Mark as Reordered
                      </Button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Frames Reordered — awaiting delivery */}
          <div className="rounded-lg border border-blue-200 dark:border-blue-800 overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center justify-between px-4 py-3 bg-blue-50/60 dark:bg-blue-950/20 hover:bg-blue-100/60 dark:hover:bg-blue-950/30 transition-colors"
              onClick={() => setReorderedExpanded((v) => !v)}
              data-testid="button-toggle-reordered"
            >
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span className="text-sm font-semibold text-blue-800 dark:text-blue-300">Frames Reordered — Awaiting Delivery</span>
                <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-300">
                  {reorderedFrames.length}
                </span>
              </div>
              <ChevronDown className={`w-4 h-4 text-blue-600 dark:text-blue-400 transition-transform duration-200 ${reorderedExpanded ? "rotate-180" : ""}`} />
            </button>
            {reorderedExpanded && (
              <div className="px-4 py-3 space-y-2 bg-background border-t border-blue-200 dark:border-blue-800">
                {reorderedFrames.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">No frames are currently awaiting delivery.</p>
                ) : (
                  reorderedFrames.map((frame) => (
                    <div
                      key={frame.id}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-950/10"
                      data-testid={`alert-reordered-${frame.id}`}
                    >
                      <div className="p-1.5 rounded-md bg-blue-100 dark:bg-blue-900/40 flex-shrink-0">
                        <Truck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {frame.brand} {frame.model}
                          <span className="ml-2 text-xs text-muted-foreground">(reordered {frame.reorderCount}×)</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {frame.manufacturer} · {frame.color} · {frame.eyeSize}/{frame.bridge}/{frame.templeLength}
                          <span className="ml-2 font-medium text-blue-700 dark:text-blue-400">
                            {frame.reorderedQty} unit{(frame.reorderedQty ?? 0) !== 1 ? "s" : ""} awaiting delivery
                          </span>
                        </p>
                      </div>
                      <Button
                        size="sm"
                        className="text-xs bg-blue-600 hover:bg-blue-700 text-white border-0 flex-shrink-0"
                        onClick={() => backOnBoardMutation.mutate(frame.id)}
                        disabled={backOnBoardMutation.isPending}
                        data-testid={`button-back-on-board-${frame.id}`}
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Back on Board
                      </Button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
