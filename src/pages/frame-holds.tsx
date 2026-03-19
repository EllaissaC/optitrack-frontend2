import { useState, useRef, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus,
  Clock,
  CheckCircle,
  RotateCcw,
  CalendarDays,
  FlaskConical,
  Trash2,
  ChevronDown,
  AlertTriangle,
  Pencil,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { type FrameHold, type Frame } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const holdFormSchema = z.object({
  frameId: z.string().optional(),
  frameName: z.string().min(1, "Frame name is required"),
  brand: z.string().min(1, "Brand is required"),
  accountNumber: z.string().min(1, "Account number is required"),
  holdStartDate: z.string().min(1, "Start date is required"),
  holdExpirationDate: z.string().min(1, "Expiration date is required"),
  notes: z.string().optional(),
});
type HoldFormValues = z.infer<typeof holdFormSchema>;

interface HoldFormProps {
  form: ReturnType<typeof useForm<HoldFormValues>>;
  frames: Frame[];
  onFrameSelect: (frameId: string) => void;
  onSubmit: (v: HoldFormValues) => void;
  isPending: boolean;
}

function FrameSearchCombobox({
  frames,
  value,
  onChange,
}: {
  frames: Frame[];
  value: string;
  onChange: (frameId: string) => void;
}) {
  const getLabel = (frameId: string) => {
    const f = frames.find((fr) => fr.id === frameId);
    return f ? `${f.brand} – ${f.model} – ${f.color} – ${f.eyeSize}` : "";
  };

  const [query, setQuery] = useState(() => getLabel(value));
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef(value);

  useEffect(() => {
    if (value !== valueRef.current) {
      valueRef.current = value;
      setQuery(getLabel(value));
    }
  }, [value, frames]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    const available = frames.filter((f) => f.status !== "sold");
    if (!q) return available.slice(0, 20);
    return available
      .filter(
        (f) =>
          f.brand.toLowerCase().includes(q) ||
          f.model.toLowerCase().includes(q) ||
          f.color.toLowerCase().includes(q) ||
          String(f.eyeSize).includes(q) ||
          `${f.eyeSize}-${f.bridge}-${f.templeLength}`.includes(q),
      )
      .slice(0, 20);
  }, [query, frames]);

  function selectFrame(frame: Frame | null) {
    const frameId = frame?.id ?? "";
    valueRef.current = frameId;
    onChange(frameId);
    setQuery(frame ? getLabel(frame.id) : "");
    setOpen(false);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
    setOpen(true);
  }

  function handleBlur() {
    setTimeout(() => {
      if (!containerRef.current?.contains(document.activeElement)) {
        setOpen(false);
        setQuery(getLabel(value));
      }
    }, 150);
  }

  return (
    <div className="relative" ref={containerRef}>
      <Input
        value={query}
        onChange={handleInputChange}
        onFocus={() => setOpen(true)}
        onBlur={handleBlur}
        placeholder="Search by brand, model, color, or size..."
        data-testid="input-frame-search"
        autoComplete="off"
      />
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md max-h-64 overflow-y-auto">
          <div
            className="px-3 py-2 text-sm cursor-pointer hover:bg-accent text-muted-foreground border-b"
            onMouseDown={(e) => {
              e.preventDefault();
              selectFrame(null);
            }}
            data-testid="option-frame-none"
          >
            None (manual entry)
          </div>
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">No frames found</div>
          ) : (
            filtered.map((frame) => (
              <div
                key={frame.id}
                className={`px-3 py-2 text-sm cursor-pointer hover:bg-accent ${frame.id === value ? "bg-accent/50 font-medium" : ""}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectFrame(frame);
                }}
                data-testid={`option-frame-${frame.id}`}
              >
                <span className="font-medium">{frame.brand}</span>
                <span className="text-muted-foreground">
                  {" – "}
                  {frame.model} – {frame.color} – {frame.eyeSize}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function HoldFormComponent({ form, frames, onFrameSelect, onSubmit, isPending }: HoldFormProps) {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="frameId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Link to Frame (optional)</FormLabel>
              <FormControl>
                <FrameSearchCombobox
                  frames={frames}
                  value={field.value ?? ""}
                  onChange={(frameId) => {
                    field.onChange(frameId || undefined);
                    if (frameId) onFrameSelect(frameId);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="frameName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Frame Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g. RB3016" data-testid="input-frame-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="brand"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Brand</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g. Ray Ban" data-testid="input-brand" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="accountNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Account Number</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Patient account number" data-testid="input-account-number" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="holdStartDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hold Start Date</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      const val = e.target.value;
                      if (val) {
                        form.setValue("holdExpirationDate", defaultExpiration(val));
                      }
                    }}
                    data-testid="input-start-date"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="holdExpirationDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Expiration Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} data-testid="input-expiration-date" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (optional)</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Any additional notes..." rows={2} data-testid="textarea-notes" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter>
          <Button type="submit" disabled={isPending} data-testid="button-submit-hold">
            {isPending ? "Saving…" : "Save Hold"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

const convertFormSchema = z.object({
  frameColor: z.string().min(1, "Color is required"),
  frameManufacturer: z.string().min(1, "Manufacturer is required"),
  visionPlan: z.string().optional(),
  labName: z.string().optional(),
  labOrderNumber: z.string().optional(),
  labAccountNumber: z.string().optional(),
  dateSentToLab: z.string().optional(),
  notes: z.string().optional(),
});
type ConvertFormValues = z.infer<typeof convertFormSchema>;

function formatDate(dateStr: string) {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-");
  if (!y || !m || !d) return dateStr;
  return `${m}/${d}/${y}`;
}

function defaultExpiration(startDate: string): string {
  const d = new Date(startDate);
  d.setDate(d.getDate() + 14);
  return d.toISOString().split("T")[0];
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export default function FrameHolds() {
  const { toast } = useToast();
  const [expiredExpanded, setExpiredExpanded] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editHold, setEditHold] = useState<FrameHold | null>(null);
  const [extendHold, setExtendHold] = useState<FrameHold | null>(null);
  const [convertHold, setConvertHold] = useState<FrameHold | null>(null);
  const [extendDate, setExtendDate] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<FrameHold | null>(null);

  const { data: holds = [], isLoading } = useQuery<FrameHold[]>({
    queryKey: ["/api/frame-holds"],
  });

  const { data: frames = [] } = useQuery<Frame[]>({
    queryKey: ["/api/frames"],
  });

  const expiredHolds = holds.filter((h) => h.status === "expired");
  const activeHolds = holds.filter((h) => h.status === "active");

  const form = useForm<HoldFormValues>({
    resolver: zodResolver(holdFormSchema),
    defaultValues: {
      frameId: "",
      frameName: "",
      brand: "",
      accountNumber: "",
      holdStartDate: todayStr(),
      holdExpirationDate: defaultExpiration(todayStr()),
      notes: "",
    },
  });

  const convertForm = useForm<ConvertFormValues>({
    resolver: zodResolver(convertFormSchema),
    defaultValues: {
      frameColor: "",
      frameManufacturer: "",
      visionPlan: "",
      labName: "",
      labOrderNumber: "",
      labAccountNumber: "",
      dateSentToLab: "",
      notes: "",
    },
  });

  const watchStartDate = form.watch("holdStartDate");

  const createMutation = useMutation({
    mutationFn: (data: HoldFormValues) =>
      apiRequest("POST", "/api/frame-holds", {
        ...data,
        frameId: data.frameId || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/frame-holds"] });
      queryClient.invalidateQueries({ queryKey: ["/api/frames"] });
      toast({ title: "Hold created", description: "Frame is now on hold." });
      setAddOpen(false);
      form.reset({
        frameId: "",
        frameName: "",
        brand: "",
        accountNumber: "",
        holdStartDate: todayStr(),
        holdExpirationDate: defaultExpiration(todayStr()),
        notes: "",
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create hold.", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: HoldFormValues }) =>
      apiRequest("PATCH", `/api/frame-holds/${id}`, {
        ...data,
        frameId: data.frameId || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/frame-holds"] });
      toast({ title: "Hold updated" });
      setEditHold(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update hold.", variant: "destructive" });
    },
  });

  const releaseMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/frame-holds/${id}/release`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/frame-holds"] });
      queryClient.invalidateQueries({ queryKey: ["/api/frames"] });
      toast({ title: "Frame returned to board", description: "Hold released and inventory updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to release hold.", variant: "destructive" });
    },
  });

  const extendMutation = useMutation({
    mutationFn: ({ id, newExpirationDate }: { id: string; newExpirationDate: string }) =>
      apiRequest("POST", `/api/frame-holds/${id}/extend`, { newExpirationDate }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/frame-holds"] });
      toast({ title: "Hold extended", description: "Expiration date updated." });
      setExtendHold(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to extend hold.", variant: "destructive" });
    },
  });

  const convertMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ConvertFormValues }) =>
      apiRequest("POST", `/api/frame-holds/${id}/convert-to-lab-order`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/frame-holds"] });
      queryClient.invalidateQueries({ queryKey: ["/api/lab-orders"] });
      toast({ title: "Converted to Lab Order", description: "Hold has been converted and lab order created." });
      setConvertHold(null);
      convertForm.reset();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to convert to lab order.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/frame-holds/${id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/frame-holds"] });
      toast({ title: "Hold deleted" });
      setDeleteConfirm(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete hold.", variant: "destructive" });
    },
  });

  function openAdd() {
    form.reset({
      frameId: "",
      frameName: "",
      brand: "",
      accountNumber: "",
      holdStartDate: todayStr(),
      holdExpirationDate: defaultExpiration(todayStr()),
      notes: "",
    });
    setAddOpen(true);
  }

  function openEdit(hold: FrameHold) {
    form.reset({
      frameId: hold.frameId ?? "",
      frameName: hold.frameName,
      brand: hold.brand,
      accountNumber: hold.accountNumber,
      holdStartDate: hold.holdStartDate,
      holdExpirationDate: hold.holdExpirationDate,
      notes: hold.notes ?? "",
    });
    setEditHold(hold);
  }

  function openExtend(hold: FrameHold) {
    const next14 = defaultExpiration(todayStr());
    setExtendDate(next14);
    setExtendHold(hold);
  }

  function openConvert(hold: FrameHold) {
    const frame = frames.find((f) => f.id === hold.frameId);
    convertForm.reset({
      frameColor: frame?.color ?? "",
      frameManufacturer: frame?.manufacturer ?? hold.brand,
      visionPlan: "",
      labName: "",
      labOrderNumber: "",
      labAccountNumber: "",
      dateSentToLab: todayStr(),
      notes: hold.notes ?? "",
    });
    setConvertHold(hold);
  }

  function onFrameSelect(frameId: string) {
    const frame = frames.find((f) => f.id === frameId);
    if (frame) {
      form.setValue("frameName", frame.model);
      form.setValue("brand", frame.brand);
    }
  }

  function onSubmitAdd(values: HoldFormValues) {
    createMutation.mutate(values);
  }

  function onSubmitEdit(values: HoldFormValues) {
    if (!editHold) return;
    updateMutation.mutate({ id: editHold.id, data: values });
  }

  function onSubmitConvert(values: ConvertFormValues) {
    if (!convertHold) return;
    convertMutation.mutate({ id: convertHold.id, data: values });
  }

  const statusBadge = (status: FrameHold["status"]) => {
    if (status === "active") return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-0 text-xs">Active</Badge>;
    if (status === "expired") return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-0 text-xs">Expired</Badge>;
    return <Badge variant="secondary" className="text-xs">Released</Badge>;
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Frame Holds</h1>
          <p className="text-sm text-muted-foreground mt-1">Temporarily hold frames for patients without creating a lab order.</p>
        </div>
        <Button onClick={openAdd} data-testid="button-add-hold">
          <Plus className="w-4 h-4 mr-2" />
          New Hold
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Active Holds</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{activeHolds.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Expired Holds</p>
          <p className="text-3xl font-bold text-red-600 mt-1">{expiredHolds.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Holds</p>
          <p className="text-3xl font-bold text-foreground mt-1">{holds.filter((h) => h.status !== "released").length}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground text-center py-12">Loading holds…</div>
      ) : (
        <div className="space-y-4">
          {/* Expired Holds Section */}
          {expiredHolds.length > 0 && (
            <div className="rounded-lg border border-red-200 dark:border-red-800 overflow-hidden">
              <button
                type="button"
                className="w-full flex items-center justify-between px-4 py-3 bg-red-50/60 dark:bg-red-950/20 hover:bg-red-100/60 dark:hover:bg-red-950/30 transition-colors"
                onClick={() => setExpiredExpanded((v) => !v)}
                data-testid="button-toggle-expired"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <span className="text-sm font-semibold text-red-800 dark:text-red-300">Expired Frame Holds</span>
                  <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-red-200 dark:bg-red-900 text-red-800 dark:text-red-300">
                    {expiredHolds.length}
                  </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-red-600 dark:text-red-400 transition-transform duration-200 ${expiredExpanded ? "rotate-180" : ""}`} />
              </button>
              {expiredExpanded && (
                <div className="px-4 py-3 space-y-2 bg-background border-t border-red-200 dark:border-red-800">
                  {expiredHolds.map((hold) => (
                    <div
                      key={hold.id}
                      className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-950/10"
                      data-testid={`expired-hold-${hold.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-foreground">{hold.brand} {hold.frameName}</p>
                          {statusBadge(hold.status)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Acct: <span className="font-medium">{hold.accountNumber}</span>
                          <span className="mx-1.5">·</span>
                          Expired: <span className="font-medium text-red-600 dark:text-red-400">{formatDate(hold.holdExpirationDate)}</span>
                        </p>
                        {hold.notes && <p className="text-xs text-muted-foreground mt-0.5 italic">{hold.notes}</p>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          onClick={() => openExtend(hold)}
                          data-testid={`button-extend-${hold.id}`}
                        >
                          <CalendarDays className="w-3 h-3 mr-1" />
                          Extend
                        </Button>
                        <Button
                          size="sm"
                          className="text-xs bg-green-600 hover:bg-green-700 text-white border-0"
                          onClick={() => releaseMutation.mutate(hold.id)}
                          disabled={releaseMutation.isPending}
                          data-testid={`button-release-${hold.id}`}
                        >
                          <RotateCcw className="w-3 h-3 mr-1" />
                          Return to Board
                        </Button>
                        <Button
                          size="sm"
                          className="text-xs bg-purple-600 hover:bg-purple-700 text-white border-0"
                          onClick={() => openConvert(hold)}
                          data-testid={`button-convert-${hold.id}`}
                        >
                          <FlaskConical className="w-3 h-3 mr-1" />
                          Convert to Lab Order
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Active Holds */}
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground">Active Holds</h2>
            {activeHolds.length === 0 ? (
              <div className="rounded-lg border border-dashed bg-card p-8 text-center">
                <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No active holds. Click "New Hold" to create one.</p>
              </div>
            ) : (
              activeHolds.map((hold) => {
                const daysLeft = Math.ceil(
                  (new Date(hold.holdExpirationDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                );
                const isNearExpiry = daysLeft <= 3;
                return (
                  <div
                    key={hold.id}
                    className={`flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 rounded-lg border bg-card ${isNearExpiry ? "border-amber-300 dark:border-amber-700" : ""}`}
                    data-testid={`active-hold-${hold.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-foreground">{hold.brand} {hold.frameName}</p>
                        {statusBadge(hold.status)}
                        {isNearExpiry && (
                          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-0 text-xs">
                            Expires in {daysLeft}d
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Acct: <span className="font-medium">{hold.accountNumber}</span>
                        <span className="mx-1.5">·</span>
                        Start: {formatDate(hold.holdStartDate)}
                        <span className="mx-1.5">·</span>
                        Expires: {formatDate(hold.holdExpirationDate)}
                      </p>
                      {hold.notes && <p className="text-xs text-muted-foreground mt-0.5 italic">{hold.notes}</p>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs h-8 w-8 p-0"
                        onClick={() => openEdit(hold)}
                        data-testid={`button-edit-hold-${hold.id}`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                        onClick={() => setDeleteConfirm(hold)}
                        data-testid={`button-delete-hold-${hold.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={() => openExtend(hold)}
                        data-testid={`button-extend-active-${hold.id}`}
                      >
                        <CalendarDays className="w-3 h-3 mr-1" />
                        Extend
                      </Button>
                      <Button
                        size="sm"
                        className="text-xs bg-green-600 hover:bg-green-700 text-white border-0"
                        onClick={() => releaseMutation.mutate(hold.id)}
                        disabled={releaseMutation.isPending}
                        data-testid={`button-release-active-${hold.id}`}
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Return to Board
                      </Button>
                      <Button
                        size="sm"
                        className="text-xs bg-purple-600 hover:bg-purple-700 text-white border-0"
                        onClick={() => openConvert(hold)}
                        data-testid={`button-convert-active-${hold.id}`}
                      >
                        <FlaskConical className="w-3 h-3 mr-1" />
                        Convert to Lab Order
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Add Hold Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Frame Hold</DialogTitle>
          </DialogHeader>
          <HoldFormComponent form={form} frames={frames} onFrameSelect={onFrameSelect} onSubmit={onSubmitAdd} isPending={createMutation.isPending} />
        </DialogContent>
      </Dialog>

      {/* Edit Hold Dialog */}
      <Dialog open={!!editHold} onOpenChange={(open) => !open && setEditHold(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Frame Hold</DialogTitle>
          </DialogHeader>
          <HoldFormComponent form={form} frames={frames} onFrameSelect={onFrameSelect} onSubmit={onSubmitEdit} isPending={updateMutation.isPending} />
        </DialogContent>
      </Dialog>

      {/* Extend Hold Dialog */}
      <Dialog open={!!extendHold} onOpenChange={(open) => !open && setExtendHold(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Extend Hold</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {extendHold && (
              <p className="text-sm text-muted-foreground">
                Extending hold for <strong>{extendHold.brand} {extendHold.frameName}</strong> — Acct {extendHold.accountNumber}
              </p>
            )}
            <div className="space-y-1">
              <Label htmlFor="extend-date">New Expiration Date</Label>
              <Input
                id="extend-date"
                type="date"
                value={extendDate}
                onChange={(e) => setExtendDate(e.target.value)}
                data-testid="input-extend-date"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendHold(null)}>Cancel</Button>
            <Button
              onClick={() => extendHold && extendMutation.mutate({ id: extendHold.id, newExpirationDate: extendDate })}
              disabled={!extendDate || extendMutation.isPending}
              data-testid="button-confirm-extend"
            >
              {extendMutation.isPending ? "Saving…" : "Extend Hold"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert to Lab Order Dialog */}
      <Dialog open={!!convertHold} onOpenChange={(open) => !open && setConvertHold(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Convert to Lab Order</DialogTitle>
          </DialogHeader>
          {convertHold && (
            <p className="text-sm text-muted-foreground -mt-2 mb-2">
              Converting <strong>{convertHold.brand} {convertHold.frameName}</strong> — Acct {convertHold.accountNumber}
            </p>
          )}
          <Form {...convertForm}>
            <form onSubmit={convertForm.handleSubmit(onSubmitConvert)} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={convertForm.control}
                  name="frameColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Frame Color</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Color" data-testid="input-convert-color" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={convertForm.control}
                  name="frameManufacturer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Manufacturer</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Manufacturer" data-testid="input-convert-manufacturer" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={convertForm.control}
                  name="labName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lab Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Lab name" data-testid="input-convert-lab" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={convertForm.control}
                  name="labOrderNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Order Number</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Order #" data-testid="input-convert-order-num" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={convertForm.control}
                  name="visionPlan"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vision Plan</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="VSP, Davis, etc." data-testid="input-convert-vision-plan" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={convertForm.control}
                  name="dateSentToLab"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date Sent</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-convert-date-sent" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={convertForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={2} data-testid="textarea-convert-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setConvertHold(null)}>Cancel</Button>
                <Button type="submit" disabled={convertMutation.isPending} className="bg-purple-600 hover:bg-purple-700" data-testid="button-confirm-convert">
                  {convertMutation.isPending ? "Converting…" : "Convert to Lab Order"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Hold</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete the hold for <strong>{deleteConfirm?.brand} {deleteConfirm?.frameName}</strong>? The frame quantity will NOT be restored automatically — use "Return to Board" instead if needed.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete-hold"
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
