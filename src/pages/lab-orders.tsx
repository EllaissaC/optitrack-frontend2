import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  FlaskConical,
  Pencil,
  CheckCircle2,
  Calendar,
  Clock,
  Truck,
  Hash,
  Building2,
  PackageCheck,
  AlertTriangle,
  ShieldCheck,
  Search,
  X,
  SlidersHorizontal,
  Plus,
  ScanLine,
  ArrowLeft,
  ChevronRight,
  Glasses,
  Trash2,
  DollarSign,
  BadgeCheck,
  UserCheck,
  StickyNote,
  Zap,
  Timer,
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { type Frame, type LabOrder } from "@shared/schema";
import { VISION_PLAN_OPTIONS } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { useSearch } from "wouter";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ─── Add Lab Order Dialog ──────────────────────────────────────────────────────

const addLabOrderSchema = z.object({
  visionPlan: z.string().optional().nullable(),
  labName: z.string().optional().nullable(),
  labOrderNumber: z.string().optional().nullable(),
  labAccountNumber: z.string().optional().nullable(),
  trackingNumber: z.string().optional().nullable(),
  dateSentToLab: z.string().optional().nullable(),
  customDueDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

type AddLabOrderValues = z.infer<typeof addLabOrderSchema>;

type ManualFrame = { manufacturer: string; brand: string; model: string; color: string };

function AddLabOrderDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [step, setStep] = useState<"select" | "manual" | "details">("select");
  const [selectedFrame, setSelectedFrame] = useState<Frame | null>(null);
  const [isPOF, setIsPOF] = useState(false);
  const [isPOFInventory, setIsPOFInventory] = useState(false);
  const [manualFrame, setManualFrame] = useState<ManualFrame | null>(null);
  const [manualInput, setManualInput] = useState<ManualFrame>({ manufacturer: "", brand: "", model: "", color: "" });
  const [manualErrors, setManualErrors] = useState<Partial<Record<keyof ManualFrame, string>>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [barcodeValue, setBarcodeValue] = useState("");
  const [barcodeError, setBarcodeError] = useState<string | null>(null);
  const barcodeRef = useRef<HTMLInputElement>(null);

  const { data: framesData = [] } = useQuery<Frame[]>({ queryKey: ["/api/frames"] });
  const { data: labsData = [] } = useQuery<{ id: string; name: string; account: string }[]>({ queryKey: ["/api/labs"] });

  const inventoryFrames = framesData.filter((f) => f.status !== "sold");

  const filteredFrames = useMemo(() => {
    if (!searchQuery.trim()) return inventoryFrames;
    const q = searchQuery.trim().toLowerCase();
    return inventoryFrames.filter(
      (f) =>
        f.brand.toLowerCase().includes(q) ||
        f.model.toLowerCase().includes(q) ||
        f.manufacturer.toLowerCase().includes(q) ||
        f.color.toLowerCase().includes(q) ||
        (f.barcode ?? "").toLowerCase().includes(q)
    );
  }, [inventoryFrames, searchQuery]);

  const form = useForm<AddLabOrderValues>({
    resolver: zodResolver(addLabOrderSchema),
    defaultValues: {
      visionPlan: "",
      labName: "",
      labOrderNumber: "",
      labAccountNumber: "",
      trackingNumber: "",
      dateSentToLab: new Date().toISOString().split("T")[0],
      customDueDate: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (!open) {
      setStep("select");
      setSelectedFrame(null);
      setIsPOF(false);
      setIsPOFInventory(false);
      setManualFrame(null);
      setManualInput({ manufacturer: "", brand: "", model: "", color: "" });
      setManualErrors({});
      setSearchQuery("");
      setBarcodeValue("");
      setBarcodeError(null);
      form.reset({
        visionPlan: "",
        labName: "",
        labOrderNumber: "",
        labAccountNumber: "",
        trackingNumber: "",
        dateSentToLab: new Date().toISOString().split("T")[0],
        customDueDate: "",
        notes: "",
      });
    }
  }, [open]);

  function selectPOF() {
    setIsPOF(true);
    setSelectedFrame(null);
    form.reset({
      visionPlan: "",
      labName: "",
      labOrderNumber: "",
      labAccountNumber: "",
      trackingNumber: "",
      dateSentToLab: new Date().toISOString().split("T")[0],
      customDueDate: "",
      notes: "",
    });
    setStep("details");
  }

  useEffect(() => {
    if (open && step === "select") {
      setTimeout(() => barcodeRef.current?.focus(), 100);
    }
  }, [open, step]);

  function handleBarcodeSubmit() {
    const barcode = barcodeValue.trim();
    if (!barcode) return;
    const match = inventoryFrames.find((f) => f.barcode && f.barcode.trim() === barcode);
    if (match) {
      setBarcodeError(null);
      selectFrame(match);
    } else {
      setBarcodeError(`No frame found for barcode "${barcode}"`);
      setBarcodeValue("");
    }
  }

  function selectFrame(frame: Frame) {
    setSelectedFrame(frame);
    const matchingLab = labsData.find((l) => l.name === frame.labName);
    form.reset({
      visionPlan: frame.visionPlan ?? "",
      labName: frame.labName ?? "",
      labOrderNumber: "",
      labAccountNumber: matchingLab?.account ?? frame.labAccountNumber ?? "",
      trackingNumber: "",
      dateSentToLab: new Date().toISOString().split("T")[0],
      customDueDate: "",
      notes: "",
    });
    setStep("details");
  }

  const mutation = useMutation({
    mutationFn: async (values: AddLabOrderValues) => {
      const commonFields = {
        visionPlan: values.visionPlan || null,
        labName: values.labName || null,
        labOrderNumber: values.labOrderNumber || null,
        labAccountNumber: values.labAccountNumber || null,
        trackingNumber: values.trackingNumber || null,
        dateSentToLab: values.dateSentToLab || new Date().toISOString().split("T")[0],
        customDueDate: values.customDueDate || null,
        notes: values.notes || null,
        status: "pending",
      };
      let body: Record<string, unknown>;
      if (isPOF) {
        body = { ...commonFields, frameId: null, frameBrand: "Patient Own Frame", frameModel: "POF", frameColor: "—", frameManufacturer: "—", patientOwnFrame: true };
      } else if (manualFrame) {
        body = {
          ...commonFields,
          frameId: null,
          frameBrand: manualFrame.brand,
          frameModel: manualFrame.model,
          frameColor: manualFrame.color,
          frameManufacturer: manualFrame.manufacturer || manualFrame.brand,
          patientOwnFrame: false,
          autoCreateFrame: true,
        };
      } else {
        body = { ...commonFields, frameId: selectedFrame!.id, frameBrand: selectedFrame!.brand, frameModel: selectedFrame!.model, frameColor: selectedFrame!.color, frameManufacturer: selectedFrame!.manufacturer, patientOwnFrame: isPOFInventory };
      }
      await apiRequest("POST", "/api/lab-orders", body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lab-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/frames"] });
      toast({
        title: "Lab order created",
        description: isPOF
          ? "Patient own frame order added"
          : manualFrame
          ? `${manualFrame.brand} ${manualFrame.model} added to inventory as off-board and sent to lab`
          : isPOFInventory
          ? `${selectedFrame!.brand} ${selectedFrame!.model} — POF, no sale recorded`
          : `${selectedFrame!.brand} ${selectedFrame!.model} sent to lab`,
      });
      onClose();
    },
    onError: () => toast({ title: "Failed to create lab order", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl flex flex-col max-h-[90vh] p-0" aria-describedby={undefined}>
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            {(step === "details" || step === "manual") && (
              <button
                type="button"
                onClick={() => {
                  if (step === "manual") { setStep("select"); setManualErrors({}); }
                  else { setStep("select"); setIsPOF(false); setIsPOFInventory(false); setManualFrame(null); setBarcodeValue(""); setBarcodeError(null); }
                }}
                className="mr-1 text-muted-foreground hover:text-foreground transition-colors"
                data-testid="button-back-to-select"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <FlaskConical className="w-4 h-4 text-primary" />
            {step === "select" ? "Add Lab Order — Select Frame" : step === "manual" ? "Add Lab Order — Frame Details" : "Add Lab Order — Details"}
          </DialogTitle>
          {step === "select" && (
            <DialogDescription>
              Search inventory or scan a barcode to select a frame, or choose Patient Own Frame (POF) for lens-only orders.
            </DialogDescription>
          )}
          {step === "manual" && (
            <DialogDescription>
              Enter the frame details. It will be auto-added to inventory as off-board and flagged for reorder.
            </DialogDescription>
          )}
          {step === "details" && selectedFrame && (
            <DialogDescription>
              Enter the lab order details for{" "}
              <span className="font-medium text-foreground">{selectedFrame.brand} — {selectedFrame.model}</span>
              {selectedFrame.color ? `, ${selectedFrame.color}` : ""}
            </DialogDescription>
          )}
          {step === "details" && manualFrame && (
            <DialogDescription>
              Enter the lab order details for{" "}
              <span className="font-medium text-foreground">{manualFrame.brand} — {manualFrame.model}</span>
              {manualFrame.color ? `, ${manualFrame.color}` : ""}
            </DialogDescription>
          )}
          {step === "details" && isPOF && (
            <DialogDescription>
              Enter the lab order details for this patient own frame (lens-only) order.
            </DialogDescription>
          )}
        </DialogHeader>

        {step === "select" && (
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <ScanLine className="w-3.5 h-3.5 text-muted-foreground" /> Scan Barcode
              </label>
              <div className="flex gap-2">
                <input
                  ref={barcodeRef}
                  type="text"
                  className="flex-1 h-9 px-3 rounded-md border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Scan or type barcode, then press Enter…"
                  value={barcodeValue}
                  onChange={(e) => { setBarcodeValue(e.target.value); setBarcodeError(null); }}
                  onKeyDown={(e) => e.key === "Enter" && handleBarcodeSubmit()}
                  data-testid="input-barcode-scan"
                />
                <Button type="button" variant="outline" size="sm" onClick={handleBarcodeSubmit} data-testid="button-scan-lookup">
                  Find
                </Button>
              </div>
              {barcodeError && (
                <p className="text-xs text-destructive" data-testid="text-barcode-error">{barcodeError}</p>
              )}
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">or search inventory</span>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-input bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Search by brand, model, or color…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-frame-search"
              />
            </div>

            <div className="border border-border rounded-md overflow-hidden max-h-56 overflow-y-auto" data-testid="list-available-frames">
              {inventoryFrames.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <Glasses className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium">No frames in inventory</p>
                  <p className="text-xs mt-0.5">Add frames to inventory first</p>
                </div>
              ) : filteredFrames.length === 0 ? (
                <div className="py-6 text-center text-muted-foreground text-sm">No frames match your search</div>
              ) : (
                filteredFrames.map((frame) => (
                  <button
                    key={frame.id}
                    type="button"
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border last:border-0 text-left"
                    onClick={() => selectFrame(frame)}
                    data-testid={`button-select-frame-${frame.id}`}
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{frame.brand} — {frame.model}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {frame.color} · {frame.manufacturer}
                        {frame.barcode ? ` · #${frame.barcode}` : ""}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </button>
                ))
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              {inventoryFrames.length} frame{inventoryFrames.length !== 1 ? "s" : ""} in inventory
              {filteredFrames.length !== inventoryFrames.length && ` · ${filteredFrames.length} matching`}
            </p>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">or</span>
              </div>
            </div>

            <button
              type="button"
              className="w-full flex items-center gap-3 px-4 py-3 rounded-md border border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-100/60 dark:hover:bg-amber-900/30 transition-colors text-left"
              onClick={selectPOF}
              data-testid="button-patient-own-frame"
            >
              <UserCheck className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Patient Own Frame (POF)</p>
                <p className="text-xs text-muted-foreground mt-0.5">Patient brings their own frame — lenses only. No inventory affected.</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 ml-auto" />
            </button>

            <button
              type="button"
              className="w-full flex items-center gap-3 px-4 py-3 rounded-md border border-dashed border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100/60 dark:hover:bg-blue-900/30 transition-colors text-left"
              onClick={() => setStep("manual")}
              data-testid="button-not-in-inventory"
            >
              <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Board Frame — Not in System</p>
                <p className="text-xs text-muted-foreground mt-0.5">Frame is physically on the board but never entered. Auto-added to inventory as off-board.</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 ml-auto" />
            </button>
          </div>
        )}

        {step === "manual" && (
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            <div className="p-3 rounded-lg bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 flex gap-2">
              <AlertTriangle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-800 dark:text-blue-300">
                This frame will be created in inventory with <strong>quantity 0</strong>, marked as <strong>off-board</strong>, and added to the reorder list automatically.
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Manufacturer</label>
                <input
                  type="text"
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="e.g. Luxottica, Marchon…"
                  value={manualInput.manufacturer}
                  onChange={(e) => setManualInput((p) => ({ ...p, manufacturer: e.target.value }))}
                  data-testid="input-manual-manufacturer"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Brand <span className="text-destructive">*</span></label>
                <input
                  type="text"
                  className={`w-full h-9 px-3 rounded-md border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring ${manualErrors.brand ? "border-destructive" : "border-input"}`}
                  placeholder="e.g. Ray-Ban"
                  value={manualInput.brand}
                  onChange={(e) => { setManualInput((p) => ({ ...p, brand: e.target.value })); setManualErrors((p) => ({ ...p, brand: undefined })); }}
                  data-testid="input-manual-brand"
                />
                {manualErrors.brand && <p className="text-xs text-destructive">{manualErrors.brand}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Model <span className="text-destructive">*</span></label>
                <input
                  type="text"
                  className={`w-full h-9 px-3 rounded-md border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring ${manualErrors.model ? "border-destructive" : "border-input"}`}
                  placeholder="e.g. RB5154"
                  value={manualInput.model}
                  onChange={(e) => { setManualInput((p) => ({ ...p, model: e.target.value })); setManualErrors((p) => ({ ...p, model: undefined })); }}
                  data-testid="input-manual-model"
                />
                {manualErrors.model && <p className="text-xs text-destructive">{manualErrors.model}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Color <span className="text-destructive">*</span></label>
                <input
                  type="text"
                  className={`w-full h-9 px-3 rounded-md border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring ${manualErrors.color ? "border-destructive" : "border-input"}`}
                  placeholder="e.g. Matte Black"
                  value={manualInput.color}
                  onChange={(e) => { setManualInput((p) => ({ ...p, color: e.target.value })); setManualErrors((p) => ({ ...p, color: undefined })); }}
                  data-testid="input-manual-color"
                />
                {manualErrors.color && <p className="text-xs text-destructive">{manualErrors.color}</p>}
              </div>
            </div>

            <Button
              type="button"
              className="w-full"
              onClick={() => {
                const errs: Partial<Record<keyof ManualFrame, string>> = {};
                if (!manualInput.brand.trim()) errs.brand = "Brand is required";
                if (!manualInput.model.trim()) errs.model = "Model is required";
                if (!manualInput.color.trim()) errs.color = "Color is required";
                if (Object.keys(errs).length > 0) { setManualErrors(errs); return; }
                setManualFrame({ ...manualInput });
                form.reset({ visionPlan: "", labName: "", labOrderNumber: "", labAccountNumber: "", trackingNumber: "", dateSentToLab: new Date().toISOString().split("T")[0], customDueDate: "", notes: "" });
                setStep("details");
              }}
              data-testid="button-manual-continue"
            >
              Continue to Lab Details
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}

        {step === "details" && (selectedFrame || isPOF || manualFrame) && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

                {/* Section 1: Frame & Order Info */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Frame & Order Info</p>

                  {isPOF ? (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                      <UserCheck className="w-5 h-5 text-amber-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">Patient Own Frame</p>
                        <p className="text-xs text-muted-foreground">Lenses only — no inventory change</p>
                      </div>
                    </div>
                  ) : manualFrame ? (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                      <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground truncate">{manualFrame.brand} — {manualFrame.model}</p>
                        <p className="text-xs text-muted-foreground truncate">{manualFrame.color}{manualFrame.manufacturer ? ` · ${manualFrame.manufacturer}` : ""}</p>
                        <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">Will be added to inventory as off-board · flagged for reorder</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                        <Glasses className="w-5 h-5 text-primary flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-foreground truncate">{selectedFrame!.brand} — {selectedFrame!.model}</p>
                          <p className="text-xs text-muted-foreground truncate">{selectedFrame!.color} · {selectedFrame!.manufacturer}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsPOFInventory((v) => !v)}
                        data-testid="button-toggle-pof-inventory"
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md border transition-colors text-left ${
                          isPOFInventory
                            ? "border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-950/30"
                            : "border-dashed border-muted-foreground/30 hover:border-amber-300 dark:hover:border-amber-700 hover:bg-amber-50/40 dark:hover:bg-amber-950/10"
                        }`}
                      >
                        <UserCheck className={`w-4 h-4 flex-shrink-0 ${isPOFInventory ? "text-amber-600" : "text-muted-foreground"}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-medium ${isPOFInventory ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`}>
                            POF — Patient Own Frame
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {isPOFInventory ? "Enabled — no sale or analytics impact" : "Returning patient using their own frame from inventory"}
                          </p>
                        </div>
                        <div className={`w-8 h-4 rounded-full transition-colors flex-shrink-0 ${isPOFInventory ? "bg-amber-500" : "bg-muted-foreground/25"}`}>
                          <div className={`w-3 h-3 rounded-full bg-white mt-0.5 transition-transform ${isPOFInventory ? "translate-x-4" : "translate-x-0.5"}`} />
                        </div>
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="visionPlan" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground" /> Vision Plan
                        </FormLabel>
                        <Select value={field.value ?? ""} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger data-testid="select-vision-plan">
                              <SelectValue placeholder="Select vision plan…" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">None / Out of Pocket</SelectItem>
                            {VISION_PLAN_OPTIONS.map((plan) => (
                              <SelectItem key={plan} value={plan}>{plan}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="labName" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-muted-foreground" /> Lab
                        </FormLabel>
                        {labsData.length > 0 ? (
                          <Select
                            value={field.value ?? ""}
                            onValueChange={(v) => {
                              field.onChange(v);
                              const lab = labsData.find((l) => l.name === v);
                              if (lab?.account) form.setValue("labAccountNumber", lab.account);
                            }}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-lab-name">
                                <SelectValue placeholder="Select lab…" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {labsData.map((lab) => (
                                <SelectItem key={lab.id} value={lab.name}>{lab.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <FormControl>
                            <Input placeholder="e.g. HOYA Lab" data-testid="input-lab-name" {...field} value={field.value ?? ""} />
                          </FormControl>
                        )}
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>

                {/* Section 2: Order Details (2-column) */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Order Details</p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                    <FormField control={form.control} name="labOrderNumber" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5">
                          <Hash className="w-3.5 h-3.5 text-muted-foreground" /> Order #
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="ORD-12345" data-testid="input-lab-order-number" {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="labAccountNumber" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5">
                          <Hash className="w-3.5 h-3.5 text-muted-foreground" /> Account #
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="A12345" data-testid="input-lab-account-number" {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="trackingNumber" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5">
                          <Truck className="w-3.5 h-3.5 text-muted-foreground" /> Tracking #
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="1Z999AA1…" data-testid="input-tracking-number" {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="dateSentToLab" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground" /> Date Sent
                        </FormLabel>
                        <FormControl>
                          <Input type="date" data-testid="input-date-sent" {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="customDueDate" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-muted-foreground" /> Custom Due Date
                          <span className="text-xs text-muted-foreground font-normal">(rush)</span>
                        </FormLabel>
                        <FormControl>
                          <Input type="date" data-testid="input-custom-due-date" {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>

                {/* Section 3: Notes */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes</p>
                  <FormField control={form.control} name="notes" render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          placeholder="Rush job, redo, special instructions…"
                          rows={2}
                          data-testid="textarea-notes"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              <div className="flex-shrink-0 flex items-center justify-end gap-2 px-6 py-4 border-t border-border bg-background">
                <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                <Button type="submit" disabled={mutation.isPending} data-testid="button-send-to-lab">
                  <FlaskConical className="w-4 h-4 mr-1.5" />
                  {mutation.isPending ? "Sending…" : "Send to Lab"}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcDaysAtLab(dateSentToLab: string | null | undefined): number | null {
  if (!dateSentToLab) return null;
  const sent = new Date(dateSentToLab);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  sent.setHours(0, 0, 0, 0);
  const diff = Math.floor((today.getTime() - sent.getTime()) / (1000 * 60 * 60 * 24));
  return diff >= 0 ? diff : 0;
}

function DaysAtLabBadge({ days, threshold = 14 }: { days: number | null; threshold?: number }) {
  if (days === null) return <span className="text-muted-foreground text-xs">—</span>;
  if (days >= threshold) {
    return (
      <Badge className="bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-0 font-semibold tabular-nums" data-testid="badge-days-red">
        {days}d
      </Badge>
    );
  }
  if (days >= Math.max(1, threshold - 6)) {
    return (
      <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 border-0 font-semibold tabular-nums" data-testid="badge-days-yellow">
        {days}d
      </Badge>
    );
  }
  return (
    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-0 font-semibold tabular-nums" data-testid="badge-days-green">
      {days}d
    </Badge>
  );
}

function isOrderOverdue(order: LabOrder, threshold: number): boolean {
  if (order.status === "received") return false;
  if (order.customDueDate) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const due = new Date(order.customDueDate); due.setHours(0, 0, 0, 0);
    return today > due;
  }
  const days = calcDaysAtLab(order.dateSentToLab);
  return days !== null && days >= threshold;
}

// Standard lab turnaround used to decide if a custom due date qualifies as a rush.
const STANDARD_TURNAROUND_DAYS = 21;

// How many days before the custom due date to start showing the order in "Needs Attention".
const RUSH_ALERT_DAYS = 3;

function isRushOrder(order: LabOrder): boolean {
  if (order.status === "received") return false;
  if (!order.customDueDate) return false;
  // Use the date sent (or today as fallback) as the reference point
  const refStr = order.dateSentToLab || new Date().toISOString().split("T")[0];
  const ref = new Date(refStr + "T00:00:00");
  ref.setHours(0, 0, 0, 0);
  const standardDue = new Date(ref.getTime() + STANDARD_TURNAROUND_DAYS * 24 * 60 * 60 * 1000);
  const customDue = new Date(order.customDueDate + "T00:00:00");
  customDue.setHours(0, 0, 0, 0);
  return customDue < standardDue;
}

function standardDueDate(order: LabOrder): Date {
  const refStr = order.dateSentToLab || new Date().toISOString().split("T")[0];
  const ref = new Date(refStr + "T00:00:00");
  ref.setHours(0, 0, 0, 0);
  return new Date(ref.getTime() + STANDARD_TURNAROUND_DAYS * 24 * 60 * 60 * 1000);
}

// Returns true when the rush order's custom due date is within RUSH_ALERT_DAYS days (approaching or past).
function isRushApproaching(order: LabOrder): boolean {
  if (!isRushOrder(order) || !order.customDueDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(order.customDueDate + "T00:00:00");
  due.setHours(0, 0, 0, 0);
  // Alert window starts RUSH_ALERT_DAYS before the due date
  const alertStart = new Date(due.getTime() - RUSH_ALERT_DAYS * 24 * 60 * 60 * 1000);
  return today >= alertStart;
}

// How many days until (positive) or since (negative) the custom due date.
function daysUntilDue(customDueDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(customDueDate + "T00:00:00");
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

// ─── Edit Lab Order Dialog ─────────────────────────────────────────────────────

const editOrderSchema = z.object({
  labOrderNumber: z.string().optional().nullable(),
  labAccountNumber: z.string().optional().nullable(),
  trackingNumber: z.string().optional().nullable(),
  dateSentToLab: z.string().optional().nullable(),
  customDueDate: z.string().optional().nullable(),
  labName: z.string().optional().nullable(),
  visionPlan: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

type EditOrderValues = z.infer<typeof editOrderSchema>;

function EditLabOrderDialog({ order, open, onClose }: { order: LabOrder; open: boolean; onClose: () => void }) {
  const { toast } = useToast();

  const form = useForm<EditOrderValues>({
    resolver: zodResolver(editOrderSchema),
    defaultValues: {
      labOrderNumber: order.labOrderNumber ?? "",
      labAccountNumber: order.labAccountNumber ?? "",
      trackingNumber: order.trackingNumber ?? "",
      dateSentToLab: order.dateSentToLab ?? "",
      customDueDate: order.customDueDate ?? "",
      labName: order.labName ?? "",
      visionPlan: order.visionPlan ?? "",
      notes: order.notes ?? "",
    },
  });

  const mutation = useMutation({
    mutationFn: (values: EditOrderValues) =>
      apiRequest("PATCH", `/api/lab-orders/${order.id}`, {
        labOrderNumber: values.labOrderNumber || null,
        labAccountNumber: values.labAccountNumber || null,
        trackingNumber: values.trackingNumber || null,
        dateSentToLab: values.dateSentToLab || null,
        customDueDate: values.customDueDate || null,
        labName: values.labName || null,
        visionPlan: values.visionPlan || null,
        notes: values.notes || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lab-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/frames"] });
      toast({ title: "Lab order updated" });
      onClose();
    },
    onError: () => toast({ title: "Failed to update lab order", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl flex flex-col max-h-[90vh] p-0" aria-describedby={undefined}>
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-primary" /> Edit Lab Order
          </DialogTitle>
          <DialogDescription>{order.frameBrand} — {order.frameModel}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

              {/* Section 1: Frame & Order Info */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Frame & Order Info</p>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                  <Glasses className="w-5 h-5 text-primary flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">{order.frameBrand} — {order.frameModel}</p>
                    <p className="text-xs text-muted-foreground">{order.frameColor} · {order.frameManufacturer}</p>
                  </div>
                  {order.patientOwnFrame && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 font-medium border border-amber-200 dark:border-amber-800">POF</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="visionPlan" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground" /> Vision Plan
                      </FormLabel>
                      <Select value={field.value ?? ""} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-vision-plan">
                            <SelectValue placeholder="Select vision plan..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None / Out of Pocket</SelectItem>
                          {VISION_PLAN_OPTIONS.map((plan) => (
                            <SelectItem key={plan} value={plan}>{plan}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="labName" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-muted-foreground" /> Lab Name
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. HOYA Lab" data-testid="input-edit-lab-name" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              {/* Section 2: Order Details (2-column) */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Order Details</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <FormField control={form.control} name="labOrderNumber" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <Hash className="w-3.5 h-3.5 text-muted-foreground" /> Order #
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="ORD-12345" data-testid="input-edit-lab-order-number" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="labAccountNumber" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <Hash className="w-3.5 h-3.5 text-muted-foreground" /> Account #
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="A12345" data-testid="input-edit-lab-account-number" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="trackingNumber" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-muted-foreground" /> Tracking #
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="1Z999AA1..." data-testid="input-edit-tracking-number" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="dateSentToLab" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" /> Date Sent
                      </FormLabel>
                      <FormControl>
                        <Input type="date" data-testid="input-edit-date-sent" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="customDueDate" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-muted-foreground" /> Custom Due Date
                        <span className="text-xs text-muted-foreground font-normal">(rush)</span>
                      </FormLabel>
                      <FormControl>
                        <Input type="date" data-testid="input-edit-custom-due-date" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              {/* Section 3: Notes */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes</p>
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder="Rush job, redo, special instructions…"
                        rows={2}
                        data-testid="textarea-edit-notes"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>

            <div className="flex-shrink-0 flex items-center justify-end gap-2 px-6 py-4 border-t border-border bg-background">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending} data-testid="button-save-lab-order">
                {mutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Mark Received Dialog ─────────────────────────────────────────────────────

function MarkReceivedDialog({ order, open, onClose }: { order: LabOrder | null; open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const orderIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (order) orderIdRef.current = order.id;
  }, [order]);

  const mutation = useMutation({
    mutationFn: () => {
      const id = orderIdRef.current;
      if (!id) throw new Error("No order selected");
      return apiRequest("PATCH", `/api/lab-orders/${id}`, {
        status: "received",
        dateReceivedFromLab: new Date().toISOString().split("T")[0],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lab-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/frames"] });
      toast({ title: "Order marked as received" });
      onClose();
    },
    onError: () => toast({ title: "Failed to update order", variant: "destructive" }),
  });

  function handleConfirm() {
    const id = order?.id ?? orderIdRef.current;
    if (!id) return;
    orderIdRef.current = id;
    mutation.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !mutation.isPending && onClose()}>
      <DialogContent className="max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageCheck className="w-5 h-5 text-green-600" />
            Mark as Received
          </DialogTitle>
          <div className="text-sm text-muted-foreground mt-1">
            {order && (
              <>
                Confirm that the order for{" "}
                <span className="font-semibold text-foreground">{order.frameBrand} {order.frameModel}</span>{" "}
                has been received from the lab. Today&apos;s date will be recorded. The frame will be marked as sold.
              </>
            )}
          </div>
        </DialogHeader>
        <DialogFooter className="gap-2 mt-4">
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={mutation.isPending}
            className="bg-green-600 hover:bg-green-700 text-white"
            data-testid="button-confirm-received"
          >
            {mutation.isPending ? "Updating..." : "Mark Received"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete Lab Order Dialog ───────────────────────────────────────────────────

function DeleteLabOrderDialog({ order, open, onClose }: { order: LabOrder | null; open: boolean; onClose: () => void }) {
  const { toast } = useToast();

  const orderIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (order) orderIdRef.current = order.id;
  }, [order]);

  const mutation = useMutation({
    mutationFn: () => {
      const id = orderIdRef.current;
      if (!id) throw new Error("No order selected");
      return apiRequest("DELETE", `/api/lab-orders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lab-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/frames"] });
      toast({ title: "Lab order deleted" });
      onClose();
    },
    onError: () => toast({ title: "Failed to delete lab order", variant: "destructive" }),
  });

  function handleDelete() {
    const id = order?.id ?? orderIdRef.current;
    if (!id) return;
    orderIdRef.current = id;
    mutation.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !mutation.isPending && onClose()}>
      <DialogContent className="max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Delete Lab Order?</DialogTitle>
          <div className="text-sm text-muted-foreground mt-1">
            {order && (
              <>
                This will permanently delete the lab order for{" "}
                <span className="font-semibold text-foreground">{order.frameBrand} {order.frameModel}</span>.
                The frame will remain in inventory and the sold count will not change.
              </>
            )}
          </div>
        </DialogHeader>
        <DialogFooter className="gap-2 mt-4">
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            disabled={mutation.isPending}
            variant="destructive"
            data-testid="button-confirm-delete-order"
          >
            {mutation.isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Frame Sold Dialog ─────────────────────────────────────────────────────────

function FrameSoldDialog({ order, open, onClose }: { order: LabOrder | null; open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const orderIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (order) orderIdRef.current = order.id;
  }, [order]);

  const mutation = useMutation({
    mutationFn: () => {
      const id = orderIdRef.current;
      if (!id) throw new Error("No order selected");
      return apiRequest("POST", `/api/lab-orders/${id}/frame-sold`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lab-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/frames"] });
      toast({
        title: order?.patientOwnFrame ? "Payment recorded" : "Frame sale recorded",
        description: order?.patientOwnFrame
          ? "Lab order marked as paid."
          : "Sales analytics have been updated.",
      });
      onClose();
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to record frame sale";
      toast({ title: msg, variant: "destructive" });
    },
  });

  function handleConfirm() {
    const id = order?.id ?? orderIdRef.current;
    if (!id) return;
    orderIdRef.current = id;
    mutation.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !mutation.isPending && onClose()}>
      <DialogContent className="max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-amber-600" />
            {order?.patientOwnFrame ? "Record Payment" : "Record Frame Sale"}
          </DialogTitle>
          <div className="text-sm text-muted-foreground mt-1 space-y-1">
            {order && (
              order.patientOwnFrame ? (
                <>
                  <p>Confirm that the patient has paid for this lab order.</p>
                  <p className="text-xs">This is a Patient Own Frame (POF) order — no inventory or frame analytics will be updated.</p>
                </>
              ) : (
                <>
                  <p>
                    Confirm that the patient has paid for:{" "}
                    <span className="font-semibold text-foreground">{order.frameBrand} {order.frameModel} ({order.frameColor})</span>.
                  </p>
                  <p className="text-xs">Sales analytics (top frames, manufacturers, revenue) will be updated.</p>
                </>
              )
            )}
          </div>
        </DialogHeader>
        <DialogFooter className="gap-2 mt-4">
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={mutation.isPending}
            className="bg-amber-600 hover:bg-amber-700 text-white"
            data-testid="button-confirm-frame-sold"
          >
            {mutation.isPending ? "Recording..." : order?.patientOwnFrame ? "Confirm Payment" : "Confirm Sale"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

type CategoryFilter = "all" | "overdue" | "at_lab" | "rush" | "received";
type UrgencyFilter = "all" | "red" | "orange" | "green";

function getOrderUrgency(order: LabOrder, threshold: number): "red" | "orange" | "green" {
  if (isOrderOverdue(order, threshold)) return "red";
  if (isRushApproaching(order)) return "orange";
  const days = calcDaysAtLab(order.dateSentToLab);
  if (days !== null && days >= Math.max(1, threshold - 6)) return "orange";
  return "green";
}

export default function LabOrders() {
  const search = useSearch();
  const urlParams = new URLSearchParams(search);
  const initialUrgency = (urlParams.get("urgency") as UrgencyFilter) ?? "all";

  const [editOrder, setEditOrder] = useState<LabOrder | null>(null);
  const [receiveOrder, setReceiveOrder] = useState<LabOrder | null>(null);
  const [deleteOrder, setDeleteOrder] = useState<LabOrder | null>(null);
  const [sellOrder, setSellOrder] = useState<LabOrder | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterLab, setFilterLab] = useState("all");
  const [filterVisionPlan, setFilterVisionPlan] = useState("all");
  const [filterCategory, setFilterCategory] = useState<CategoryFilter>("all");
  const [filterUrgency, setFilterUrgency] = useState<UrgencyFilter>(initialUrgency);
  const [showFilters, setShowFilters] = useState(false);
  const [showAddLabOrder, setShowAddLabOrder] = useState(false);

  const { data: ordersData, isLoading } = useQuery<LabOrder[]>({
    queryKey: ["/api/lab-orders"],
  });

  const { data: labsData = [] } = useQuery<{ id: string; name: string; account: string }[]>({
    queryKey: ["/api/labs"],
  });

  const { data: settingsMap = {} } = useQuery<Record<string, string>>({
    queryKey: ["/api/settings"],
  });

  const threshold = Math.max(1, parseInt((settingsMap as Record<string, string>).labTurnaroundDays || "14"));

  const orders = ordersData ?? [];

  const overdueOrders = useMemo(
    () => orders.filter((o) => isOrderOverdue(o, threshold)),
    [orders, threshold]
  );

  // Rush orders approaching their due date that are not already overdue (goes into attention section)
  const rushAttentionOrders = useMemo(
    () => orders.filter((o) => isRushApproaching(o) && !isOrderOverdue(o, threshold)),
    [orders, threshold]
  );

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const overdue = isOrderOverdue(order, threshold);
      const rush = isRushOrder(order);
      const rushApproaching = isRushApproaching(order);

      if (filterUrgency !== "all") {
        // Urgency filter mode: show all non-received orders matching the urgency color,
        // bypassing the category separation (Needs Attention section is hidden).
        if (order.status === "received") return false;
        if (getOrderUrgency(order, threshold) !== filterUrgency) return false;
      } else if (filterCategory === "all") {
        // Only overdue + approaching-rush orders are moved to the Needs Attention section.
        // Non-approaching rush orders remain in the normal list.
        if (overdue || rushApproaching) return false;
      } else if (filterCategory === "overdue") {
        if (!overdue) return false;
      } else if (filterCategory === "at_lab") {
        // Normal at-lab: pending, not overdue, not a rush order at all
        if (order.status !== "pending" || overdue || rush) return false;
      } else if (filterCategory === "rush") {
        // Rush filter shows all rush orders (approaching or not)
        if (!rush) return false;
      } else if (filterCategory === "received") {
        if (order.status !== "received") return false;
      }

      if (filterLab !== "all" && order.labName !== filterLab) return false;
      if (filterVisionPlan !== "all" && order.visionPlan !== filterVisionPlan) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        if (
          !order.frameBrand.toLowerCase().includes(q) &&
          !order.frameModel.toLowerCase().includes(q) &&
          !order.frameColor.toLowerCase().includes(q) &&
          !(order.labName ?? "").toLowerCase().includes(q) &&
          !(order.labOrderNumber ?? "").toLowerCase().includes(q) &&
          !(order.visionPlan ?? "").toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [orders, filterCategory, filterUrgency, filterLab, filterVisionPlan, searchQuery, threshold]);

  const pendingOrders = orders.filter((o) => o.status === "pending");

  const uniqueLabs = [...new Set(orders.map((o) => o.labName).filter(Boolean))];
  const uniqueVisionPlans = [...new Set(orders.map((o) => o.visionPlan).filter(Boolean))];

  const hasActiveFilters = filterLab !== "all" || filterVisionPlan !== "all" || filterCategory !== "all" || filterUrgency !== "all";

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-lab-orders-title">Lab Orders</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Frames currently at the lab
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="text-lab-total">
            <FlaskConical className="w-4 h-4" />
            {isLoading ? "..." : `${pendingOrders.length} pending`}
          </div>
          <Button onClick={() => setShowAddLabOrder(true)} data-testid="button-add-lab-order">
            <Plus className="w-4 h-4 mr-1.5" /> Add Lab Order
          </Button>
        </div>
      </div>

      {/* Needs Attention Section — overdue orders + rush-attention orders */}
      {(overdueOrders.length > 0 || rushAttentionOrders.length > 0) && filterCategory === "all" && filterUrgency === "all" && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/20 overflow-hidden" data-testid="section-overdue-attention">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-amber-200 dark:border-amber-800">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              Orders That Need Attention
            </span>
            <span className="ml-1 text-xs bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-300 rounded-full px-2 py-0.5 font-medium">
              {overdueOrders.length + rushAttentionOrders.length}
            </span>
          </div>
          <div className="divide-y divide-amber-100 dark:divide-amber-900/40">

            {/* Overdue orders */}
            {overdueOrders.map((order) => {
              const days = calcDaysAtLab(order.dateSentToLab);
              const rush = isRushOrder(order);
              return (
                <div key={order.id} className="flex items-center gap-4 px-4 py-3 flex-wrap" data-testid={`overdue-row-${order.id}`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">{order.frameBrand}</span>
                      <span className="text-sm text-muted-foreground">{order.frameModel}</span>
                      {order.patientOwnFrame && (
                        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-0 text-[10px] px-1.5 py-0">POF</Badge>
                      )}
                      {rush && (
                        <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-0 text-[10px] px-1.5 py-0 flex items-center gap-0.5" data-testid={`badge-rush-${order.id}`}>
                          <Zap className="w-2.5 h-2.5" /> Rush
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      {order.labName && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Building2 className="w-3 h-3" /> {order.labName}
                        </span>
                      )}
                      {order.labOrderNumber && (
                        <span className="text-xs font-mono text-muted-foreground">#{order.labOrderNumber}</span>
                      )}
                      {rush && order.customDueDate ? (
                        <span className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                          <Timer className="w-3 h-3" /> Due: {order.customDueDate}
                        </span>
                      ) : (
                        <span className="text-xs text-red-600 dark:text-red-400">
                          {days !== null ? `${days} days at lab` : "Date not set"}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge className="bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-0 text-xs font-medium">
                      Overdue
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setEditOrder(order)}
                      data-testid={`button-overdue-edit-${order.id}`}
                    >
                      <Pencil className="w-3 h-3 mr-1" /> Edit
                    </Button>
                  </div>
                </div>
              );
            })}

            {/* Rush-attention orders: approaching their custom due date */}
            {rushAttentionOrders.map((order) => {
              const remaining = daysUntilDue(order.customDueDate!);
              const dueLabel =
                remaining < 0
                  ? `Past due by ${Math.abs(remaining)} day${Math.abs(remaining) !== 1 ? "s" : ""}`
                  : remaining === 0
                  ? "Due today"
                  : `Due in ${remaining} day${remaining !== 1 ? "s" : ""}`;
              return (
                <div key={order.id} className="flex items-center gap-4 px-4 py-3 flex-wrap" data-testid={`rush-attention-row-${order.id}`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">{order.frameBrand}</span>
                      <span className="text-sm text-muted-foreground">{order.frameModel}</span>
                      {order.patientOwnFrame && (
                        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-0 text-[10px] px-1.5 py-0">POF</Badge>
                      )}
                      <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-0 text-[10px] px-1.5 py-0 flex items-center gap-0.5" data-testid={`badge-rush-${order.id}`}>
                        <Zap className="w-2.5 h-2.5" /> Rush
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      {order.labName && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Building2 className="w-3 h-3" /> {order.labName}
                        </span>
                      )}
                      {order.labOrderNumber && (
                        <span className="text-xs font-mono text-muted-foreground">#{order.labOrderNumber}</span>
                      )}
                      <span className="text-xs text-purple-600 dark:text-purple-400 flex items-center gap-1">
                        <Timer className="w-3 h-3" /> {dueLabel} — requested by {order.customDueDate}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-0 text-xs font-medium flex items-center gap-1">
                      <Zap className="w-3 h-3" /> Rush Due Soon
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setEditOrder(order)}
                      data-testid={`button-rush-edit-${order.id}`}
                    >
                      <Pencil className="w-3 h-3 mr-1" /> Edit
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Days at lab legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
        <span className="font-medium">Days at lab:</span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" /> 0–{Math.max(1, threshold - 7)} days
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block" /> {Math.max(2, threshold - 6)}–{threshold - 1} days
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> {threshold}+ days (overdue)
        </span>
      </div>

      {/* Urgency Status Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Filter by status:</span>
        {([
          { key: "all",    label: "All Orders",    dot: null,              active: "bg-foreground text-background border-foreground" },
          { key: "red",    label: "Overdue",        dot: "bg-red-500",      active: "bg-red-600 text-white border-red-600" },
          { key: "orange", label: "Getting Close",  dot: "bg-yellow-500",   active: "bg-yellow-500 text-white border-yellow-500" },
          { key: "green",  label: "On Track",       dot: "bg-green-500",    active: "bg-green-600 text-white border-green-600" },
        ] as const).map(({ key, label, dot, active }) => (
          <button
            key={key}
            onClick={() => setFilterUrgency(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
              filterUrgency === key
                ? active
                : "bg-background text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground"
            }`}
            data-testid={`button-urgency-${key}`}
          >
            {dot && <span className={`w-2 h-2 rounded-full ${dot} flex-shrink-0`} />}
            {label}
          </button>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-input bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Search by frame, lab, order number…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search-orders"
          />
          {searchQuery && (
            <button
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setSearchQuery("")}
              data-testid="button-clear-search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <Button
          variant={showFilters || hasActiveFilters ? "default" : "outline"}
          size="sm"
          onClick={() => setShowFilters((v) => !v)}
          data-testid="button-toggle-filters"
        >
          <SlidersHorizontal className="w-4 h-4 mr-1.5" />
          Filters
          {hasActiveFilters && (
            <span className="ml-1.5 bg-white/20 text-xs rounded-full px-1.5 py-0.5">active</span>
          )}
        </Button>
      </div>

      {showFilters && (
        <div className="flex items-center gap-3 flex-wrap p-4 rounded-lg bg-muted/30 border border-border">
          <Select value={filterCategory} onValueChange={(v) => setFilterCategory(v as CategoryFilter)}>
            <SelectTrigger className="w-44 h-8 text-sm" data-testid="select-filter-category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Orders</SelectItem>
              <SelectItem value="overdue">Overdue Orders</SelectItem>
              <SelectItem value="at_lab">At Lab (Normal)</SelectItem>
              <SelectItem value="rush">Rush Orders</SelectItem>
              <SelectItem value="received">Received Orders</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterLab} onValueChange={setFilterLab}>
            <SelectTrigger className="w-44 h-8 text-sm" data-testid="select-filter-lab">
              <SelectValue placeholder="All labs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All labs</SelectItem>
              {uniqueLabs.map((lab) => (
                <SelectItem key={lab!} value={lab!}>{lab}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterVisionPlan} onValueChange={setFilterVisionPlan}>
            <SelectTrigger className="w-44 h-8 text-sm" data-testid="select-filter-vision-plan">
              <SelectValue placeholder="All vision plans" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All vision plans</SelectItem>
              {uniqueVisionPlans.map((vp) => (
                <SelectItem key={vp!} value={vp!}>{vp}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilterLab("all");
                setFilterVisionPlan("all");
                setFilterCategory("all");
                setFilterUrgency("all");
              }}
              data-testid="button-clear-filters"
            >
              <X className="w-3.5 h-3.5 mr-1" /> Clear
            </Button>
          )}
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="font-semibold">Frame</TableHead>
              <TableHead className="font-semibold">Lab</TableHead>
              <TableHead className="font-semibold">Order #</TableHead>
              <TableHead className="font-semibold">Vision Plan</TableHead>
              <TableHead className="font-semibold">Tracking</TableHead>
              <TableHead className="font-semibold">Days at Lab</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="text-right font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-16 text-muted-foreground">
                  <FlaskConical className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p className="font-medium text-sm">
                    {orders.length === 0 ? "No lab orders yet" : "No orders match your filters"}
                  </p>
                  <p className="text-xs mt-1">
                    {orders.length === 0
                      ? "Click \"Add Lab Order\" to create your first lab order"
                      : "Try adjusting your search or filters"}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((order) => {
                const days = calcDaysAtLab(order.dateSentToLab);
                const isReceived = order.status === "received";
                const overdue = isOrderOverdue(order, threshold);
                const rush = isRushOrder(order);
                return (
                  <TableRow key={order.id} className={isReceived ? "opacity-60" : undefined} data-testid={`row-order-${order.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-semibold text-foreground" data-testid={`text-brand-${order.id}`}>{order.frameBrand}</p>
                        {order.patientOwnFrame && (
                          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-0 text-[10px] px-1.5 py-0" data-testid={`badge-pof-${order.id}`}>
                            POF
                          </Badge>
                        )}
                        {rush && !isReceived && (
                          <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-0 text-[10px] px-1.5 py-0 flex items-center gap-0.5" data-testid={`badge-rush-${order.id}`}>
                            <Zap className="w-2.5 h-2.5" /> Rush
                          </Badge>
                        )}
                      </div>
                      {!order.patientOwnFrame && (
                        <>
                          <p className="text-sm text-muted-foreground" data-testid={`text-model-${order.id}`}>{order.frameModel}</p>
                          <p className="text-xs text-muted-foreground">{order.frameColor}</p>
                        </>
                      )}
                      <div className="flex items-start gap-1 mt-1" data-testid={`notes-section-${order.id}`}>
                        <StickyNote className="w-3 h-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                        {order.notes ? (
                          <p className="text-xs text-muted-foreground leading-snug" data-testid={`text-notes-${order.id}`}>{order.notes}</p>
                        ) : (
                          <p className="text-xs text-muted-foreground/50 italic">No notes added</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm" data-testid={`text-lab-name-${order.id}`}>
                          {order.labName ?? <span className="text-muted-foreground italic">—</span>}
                        </span>
                      </div>
                      {order.labAccountNumber && (
                        <p className="text-xs text-muted-foreground font-mono mt-0.5 ml-5">#{order.labAccountNumber}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      {order.labOrderNumber ? (
                        <span className="font-mono text-sm" data-testid={`text-order-num-${order.id}`}>{order.labOrderNumber}</span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {order.visionPlan ? (
                        <span className="text-sm" data-testid={`text-vision-plan-${order.id}`}>{order.visionPlan}</span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {order.trackingNumber ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="font-mono text-xs text-primary cursor-default truncate max-w-[120px] block" data-testid={`text-tracking-${order.id}`}>
                              {order.trackingNumber}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>{order.trackingNumber}</TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isReceived && order.dateReceivedFromLab ? (
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                          <span className="text-xs text-muted-foreground">{order.dateReceivedFromLab}</span>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <DaysAtLabBadge days={days} threshold={threshold} />
                          {rush && order.customDueDate && (
                            <div className="flex items-center gap-1 text-xs text-purple-700 dark:text-purple-400" data-testid={`text-due-date-${order.id}`}>
                              <Timer className="w-3 h-3" /> Due {order.customDueDate}
                            </div>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {isReceived ? (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-0 w-fit" data-testid={`badge-status-${order.id}`}>
                            Received
                          </Badge>
                        ) : overdue ? (
                          <Badge className="bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-0 w-fit" data-testid={`badge-status-${order.id}`}>
                            <AlertTriangle className="w-3 h-3 mr-0.5" /> Overdue
                          </Badge>
                        ) : (
                          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-0 w-fit" data-testid={`badge-status-${order.id}`}>
                            Pending
                          </Badge>
                        )}
                        {order.frameSold && (
                          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-0 w-fit" data-testid={`badge-frame-sold-${order.id}`}>
                            <DollarSign className="w-3 h-3 mr-0.5" />
                            Frame Sold
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => setEditOrder(order)}
                              data-testid={`button-edit-${order.id}`}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit order details</TooltipContent>
                        </Tooltip>
                        {!isReceived && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30 border-green-200 dark:border-green-800"
                                onClick={() => setReceiveOrder(order)}
                                data-testid={`button-receive-${order.id}`}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                Mark Received
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Mark order as received from lab</TooltipContent>
                          </Tooltip>
                        )}
                        {(order.frameId || order.patientOwnFrame) && !order.frameSold && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30 border-amber-200 dark:border-amber-800"
                                onClick={() => setSellOrder(order)}
                                data-testid={`button-frame-sold-${order.id}`}
                              >
                                <DollarSign className="w-3.5 h-3.5 mr-1" />
                                {order.patientOwnFrame ? "Mark Paid" : "Frame Sold"}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {order.patientOwnFrame
                                ? "Record payment for this lab order (no inventory change)"
                                : "Record frame sale & update analytics"}
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {order.frameSold && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground px-2 py-1 rounded border border-dashed border-muted-foreground/30">
                                <BadgeCheck className="w-3.5 h-3.5 text-amber-500" />
                                <span>Sold {order.frameSoldAt ?? ""}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>Frame sale recorded on {order.frameSoldAt ?? "unknown date"}</TooltipContent>
                          </Tooltip>
                        )}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setDeleteOrder(order)}
                              data-testid={`button-delete-${order.id}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete lab order</TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {filteredOrders.length > 0 && (
        <p className="text-xs text-muted-foreground text-right">
          Showing {filteredOrders.length} of {orders.length} order{orders.length !== 1 ? "s" : ""}
        </p>
      )}

      <AddLabOrderDialog
        open={showAddLabOrder}
        onClose={() => setShowAddLabOrder(false)}
      />

      {editOrder && (
        <EditLabOrderDialog
          order={editOrder}
          open={!!editOrder}
          onClose={() => setEditOrder(null)}
        />
      )}

      <MarkReceivedDialog
        order={receiveOrder}
        open={!!receiveOrder}
        onClose={() => setReceiveOrder(null)}
      />

      <DeleteLabOrderDialog
        order={deleteOrder}
        open={!!deleteOrder}
        onClose={() => setDeleteOrder(null)}
      />

      <FrameSoldDialog
        order={sellOrder}
        open={!!sellOrder}
        onClose={() => setSellOrder(null)}
      />
    </div>
  );
}
