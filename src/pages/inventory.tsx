import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Package,
  X,
  FlaskConical,
  CheckCircle,
  Barcode,
  ScanLine,
  AlertCircle,
  RotateCcw,
  ChevronsUpDown,
  ChevronDown,
  Hash,
  Truck,
  Building2,
  PlusCircle,
  FileUp,
  Loader2,
  Trash,
  FileText,
  Archive,
  Clock,
  Filter,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest, getQueryFn } from "@/lib/queryClient";
import {
  insertFrameSchema,
  type Frame,
  type Manufacturer,
  type Brand,
  type Lab,
} from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import { VISION_PLAN_OPTIONS } from "@/lib/constants";

const formSchema = insertFrameSchema
  .extend({
    eyeSize: z.coerce.number().min(1, "Required").max(99),
    bridge: z.coerce.number().min(1, "Required").max(99),
    templeLength: z.coerce.number().min(1, "Required").max(999),
    cost: z.coerce
      .string()
      .refine(
        (v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0,
        "Must be a valid price",
      ),
    multiplier: z.coerce
      .string()
      .refine(
        (v) =>
          v === "" ||
          v === null ||
          (!isNaN(parseFloat(v)) && parseFloat(v) > 0),
        "Must be a positive number",
      )
      .optional()
      .nullable(),
    retailPrice: z.coerce
      .string()
      .refine(
        (v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0,
        "Must be a valid price",
      ),
    barcode: z.string().optional().nullable(),
    quantity: z.coerce.number().int().min(1).optional().nullable(),
    labOrderNumber: z.string().optional().nullable(),
    labName: z.string().optional().nullable(),
    labAccountNumber: z.string().optional().nullable(),
    trackingNumber: z.string().optional().nullable(),
    dateSentToLab: z.string().optional().nullable(),
    visionPlan: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.status === "at_lab" && !data.visionPlan) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Vision Plan is required",
        path: ["visionPlan"],
      });
    }
  });

type FormValues = z.infer<typeof formSchema>;

const STATUS_CONFIG = {
  on_board: {
    label: "On Board",
    icon: Package,
    className:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  off_board: {
    label: "Off Board",
    icon: Archive,
    className:
      "bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400",
    dot: "bg-slate-400",
  },
  at_lab: {
    label: "At Lab",
    icon: FlaskConical,
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  sold: {
    label: "Sold",
    icon: CheckCircle,
    className:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    dot: "bg-blue-500",
  },
};

function StatusPill({ status }: { status: string }) {
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
  if (!config) return null;
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${config.className}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${config.dot}`}
      />
      {config.label}
    </span>
  );
}

function FrameFoundCard({
  frame,
  onDismiss,
  onEdit,
}: {
  frame: Frame;
  onDismiss: () => void;
  onEdit: () => void;
}) {
  const { toast } = useToast();

  const statusMutation = useMutation({
    mutationFn: (status: string) =>
      apiRequest("PATCH", `/api/frames/${frame.id}`, { status }),
    onSuccess: (_data, status) => {
      queryClient.invalidateQueries({ queryKey: ["/api/frames"] });
      const labels: Record<string, string> = {
        at_lab: "Sent to lab",
        off_board: "Marked as Off Board",
        sold: "Marked as sold",
        on_board: "Returned to board",
      };
      toast({
        title: labels[status] ?? "Status updated",
        description: `${frame.brand} ${frame.model} has been updated.`,
      });
      onDismiss();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update status.",
        variant: "destructive",
      });
    },
  });

  const quickActions = [
    {
      key: "at_lab",
      label: "Send to Lab",
      icon: FlaskConical,
      className:
        "border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400",
      show: frame.status !== "at_lab",
    },
    {
      key: "off_board",
      label: "Mark Off Board",
      icon: Archive,
      className:
        "border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-400",
      show: frame.status !== "off_board",
    },
    {
      key: "sold",
      label: "Mark Sold",
      icon: CheckCircle,
      className:
        "border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-400",
      show: frame.status !== "sold",
    },
    {
      key: "on_board",
      label: "Return to Board",
      icon: RotateCcw,
      className:
        "border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-400",
      show: frame.status !== "on_board",
    },
  ].filter((a) => a.show);

  return (
    <div
      className="rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 overflow-hidden"
      data-testid="frame-found-card"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-emerald-100 dark:bg-emerald-900/40 border-b border-emerald-200 dark:border-emerald-800">
        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm font-semibold">
            Frame found in inventory
          </span>
          {frame.barcode && (
            <span className="font-mono text-xs bg-emerald-200 dark:bg-emerald-800 px-1.5 py-0.5 rounded text-emerald-800 dark:text-emerald-300">
              {frame.barcode}
            </span>
          )}
          {frame.notes && (
            <div style={{ fontSize: "12px", color: "#666", marginTop: "6px" }}>
              📝 {frame.notes}
            </div>
          )}
        </div>
        <button
          onClick={onDismiss}
          className="text-emerald-600 dark:text-emerald-500 flex-shrink-0"
          data-testid="button-dismiss-found-card"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 flex flex-wrap items-start gap-4">
        <div className="flex-1 min-w-0 space-y-3">
          <div>
            <p className="text-lg font-bold text-foreground leading-tight">
              {frame.brand} {frame.model}
            </p>
            <p className="text-sm text-muted-foreground">
              {frame.manufacturer} · {frame.color}
              {frame.code ? ` · ${frame.code}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-sm">
            {frame.code && (
              <div>
                <span className="text-muted-foreground text-xs uppercase tracking-wide">
                  Code
                </span>
                <p className="font-mono font-medium text-foreground">
                  {frame.code}
                </p>
              </div>
            )}
            <div>
              <span className="text-muted-foreground text-xs uppercase tracking-wide">
                Size
              </span>
              <p className="font-mono font-medium text-foreground">
                {frame.eyeSize}/{frame.bridge}/{frame.templeLength}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs uppercase tracking-wide">
                Wholesale
              </span>
              <p className="font-medium text-foreground">
                ${parseFloat(frame.cost as string).toFixed(2)}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs uppercase tracking-wide">
                Retail
              </span>
              <p className="font-semibold text-foreground">
                ${parseFloat(frame.retailPrice as string).toFixed(2)}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs uppercase tracking-wide">
                Status
              </span>
              <div className="mt-0.5">
                <StatusPill status={frame.status} />
              </div>
            </div>
            {frame.labName && (
              <div>
                <span className="text-muted-foreground text-xs uppercase tracking-wide">
                  Lab
                </span>
                <p className="font-medium text-foreground">{frame.labName}</p>
              </div>
            )}
            {frame.labOrderNumber && (
              <div>
                <span className="text-muted-foreground text-xs uppercase tracking-wide">
                  Order #
                </span>
                <p className="font-mono font-medium text-foreground">
                  {frame.labOrderNumber}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
          {quickActions.map((action) => (
            <Button
              key={action.key}
              variant="outline"
              size="sm"
              className={`gap-1.5 ${action.className}`}
              disabled={statusMutation.isPending}
              onClick={() => statusMutation.mutate(action.key)}
              data-testid={`button-quick-action-${action.key}`}
            >
              <action.icon className="w-3.5 h-3.5" />
              {action.label}
            </Button>
          ))}
          <Separator
            orientation="vertical"
            className="h-6 mx-1 hidden sm:block"
          />
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={onEdit}
            data-testid="button-found-edit"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </Button>
        </div>
      </div>
    </div>
  );
}

function FrameFormDialog({
  open,
  onClose,
  editFrame,
  prefillBarcode,
}: {
  open: boolean;
  onClose: () => void;
  editFrame?: Frame | null;
  prefillBarcode?: string;
}) {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const isEdit = !!editFrame;

  const [showAddMfgModal, setShowAddMfgModal] = useState(false);
  const [newMfgName, setNewMfgName] = useState("");
  const [showAddBrandModal, setShowAddBrandModal] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");
  const [newBrandMfgId, setNewBrandMfgId] = useState<string>("");
  const [duplicateInfo, setDuplicateInfo] = useState<{
    existingFrameId: string;
    existingBrand: string;
    existingModel: string;
    existingColor: string;
  } | null>(null);
  const [pendingPayload, setPendingPayload] = useState<Record<
    string,
    unknown
  > | null>(null);
  type Variant = {
    code: string;
    color: string;
    eyeSize: number;
    bridge: number;
    templeLength: number;
    barcode: string;
    quantity: number;
  };
  const [variants, setVariants] = useState<Variant[]>([]);

  const addMfgMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", "/api/manufacturers", { name });
      return res.json() as Promise<Manufacturer>;
    },
    onSuccess: (newMfg) => {
      queryClient.invalidateQueries({ queryKey: ["/api/manufacturers"] });
      form.setValue("manufacturer", newMfg.name);
      form.setValue("brand", "");
      setNewMfgName("");
      setShowAddMfgModal(false);
      toast({ title: `Manufacturer "${newMfg.name}" added` });
    },
    onError: () =>
      toast({ title: "Failed to add manufacturer", variant: "destructive" }),
  });

  const addBrandMutation = useMutation({
    mutationFn: async ({
      manufacturerId,
      name,
    }: {
      manufacturerId: string;
      name: string;
    }) => {
      const res = await apiRequest(
        "POST",
        `/api/manufacturers/${manufacturerId}/brands`,
        { name },
      );
      return res.json() as Promise<Brand>;
    },
    onSuccess: (newBrand) => {
      queryClient.invalidateQueries({ queryKey: ["/api/manufacturers"] });
      if (newBrandMfgId) {
        queryClient.invalidateQueries({
          queryKey: ["/api/manufacturers", newBrandMfgId, "brands"],
        });
      }
      form.setValue("brand", newBrand.name);
      setNewBrandName("");
      setNewBrandMfgId("");
      setShowAddBrandModal(false);
      toast({ title: `Brand "${newBrand.name}" added` });
    },
    onError: () =>
      toast({ title: "Failed to add brand", variant: "destructive" }),
  });

  const { data: manufacturersData = [] } = useQuery<Manufacturer[]>({
    queryKey: ["/api/manufacturers"],
  });
  const { data: labsData = [] } = useQuery<Lab[]>({
    queryKey: ["/api/labs"],
  });
  const { data: settingsData = {} } = useQuery<Record<string, string>>({
    queryKey: ["/api/settings"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const allManufacturers = manufacturersData.map((m) => m.name);
  const allLabs = labsData;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      manufacturer: "",
      brand: "",
      model: "",
      color: "",
      code: "",
      eyeSize: 52,
      bridge: 18,
      templeLength: 145,
      cost: "",
      retailPrice: "",
      status: "on_board",
      barcode: "",
      quantity: 1,
      multiplier: "",
      labOrderNumber: "",
      labName: "",
      labAccountNumber: "",
      trackingNumber: "",
      dateSentToLab: "",
      visionPlan: "",
    },
  });

  const watchedManufacturer = form.watch("manufacturer");
  const watchedStatus = form.watch("status");
  const watchedCost = form.watch("cost");
  const watchedMultiplier = form.watch("multiplier");

  useEffect(() => {
    const cost = parseFloat(watchedCost as string);
    const multiplier = parseFloat(watchedMultiplier as string);
    if (!isNaN(cost) && !isNaN(multiplier) && multiplier > 0) {
      form.setValue("retailPrice", String(Math.round(cost * multiplier)), {
        shouldValidate: false,
      });
    }
  }, [watchedCost, watchedMultiplier]);

  useEffect(() => {
    if (watchedStatus === "at_lab" && !form.getValues("dateSentToLab")) {
      form.setValue("dateSentToLab", new Date().toISOString().split("T")[0]);
    }
  }, [watchedStatus]);

  const selectedMfgObj = manufacturersData.find(
    (m) => m.name === watchedManufacturer,
  );
  const { data: brandsData = [] } = useQuery<Brand[]>({
    queryKey: ["/api/manufacturers", selectedMfgObj?.id, "brands"],
    enabled: !!selectedMfgObj?.id,
  });
  const availableBrandNames = brandsData.map((b) => b.name);

  useEffect(() => {
    if (open) {
      form.reset(
        editFrame
          ? {
              manufacturer: editFrame.manufacturer,
              brand: editFrame.brand,
              model: editFrame.model,
              color: editFrame.color,
              code: editFrame.code ?? "",
              eyeSize: editFrame.eyeSize,
              bridge: editFrame.bridge,
              templeLength: editFrame.templeLength,
              cost: String(editFrame.cost),
              retailPrice: String(editFrame.retailPrice),
              status: editFrame.status as
                | "on_board"
                | "off_board"
                | "at_lab"
                | "sold",
              barcode: editFrame.barcode ?? "",
              quantity: editFrame.quantity ?? 1,
              multiplier: editFrame.multiplier
                ? String(editFrame.multiplier)
                : "",
              labOrderNumber: editFrame.labOrderNumber ?? "",
              labName: editFrame.labName ?? "",
              labAccountNumber: editFrame.labAccountNumber ?? "",
              trackingNumber: editFrame.trackingNumber ?? "",
              dateSentToLab: editFrame.dateSentToLab ?? "",
              visionPlan: editFrame.visionPlan ?? "",
            }
          : {
              manufacturer: "",
              brand: "",
              model: "",
              color: "",
              code: "",
              eyeSize: 52,
              bridge: 18,
              templeLength: 145,
              cost: "",
              multiplier: settingsData.defaultMultiplier || "3",
              retailPrice: "",
              status: "on_board",
              barcode: prefillBarcode ?? "",
              quantity: 1,
              labOrderNumber: "",
              labName: "",
              labAccountNumber: "",
              trackingNumber: "",
              dateSentToLab: "",
              visionPlan: "",
            },
      );
      setVariants([]);
    }
  }, [open, editFrame, prefillBarcode]);

  function handleManufacturerChange(
    value: string,
    fieldOnChange: (v: string) => void,
  ) {
    fieldOnChange(value);
    form.setValue("brand", "");
  }

  function handleBrandChange(
    value: string,
    fieldOnChange: (v: string) => void,
  ) {
    fieldOnChange(value);
  }

  function handleLabChange(value: string, fieldOnChange: (v: string) => void) {
    fieldOnChange(value);
    const lab = allLabs.find((l) => l.name === value);
    form.setValue("labAccountNumber", lab?.account ?? "");
  }

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch("/api/frames", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      const json = await res.json();
      return json as { _reorder?: boolean } & Record<string, unknown>;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/frames"] });
      if (result._reorder) {
        toast({
          title: "Quantity updated",
          description: "Matching frame found — quantity has been incremented.",
        });
      } else {
        toast({
          title: "Frame added",
          description: "The frame has been added to inventory.",
        });
      }
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add frame.",
        variant: "destructive",
      });
    },
  });

  const replaceMutation = useMutation({
    mutationFn: (data: {
      existingFrameId: string;
      newFrame: Record<string, unknown>;
    }) => apiRequest("POST", "/api/frames/replace", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/frames"] });
      toast({
        title: "Frame replaced",
        description: "The existing frame has been replaced with the new entry.",
      });
      setDuplicateInfo(null);
      setPendingPayload(null);
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to replace frame.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: FormValues) =>
      apiRequest("PATCH", `/api/frames/${editFrame!.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/frames"] });
      toast({
        title: "Frame updated",
        description: "The frame has been updated.",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update frame.",
        variant: "destructive",
      });
    },
  });

  const isPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    replaceMutation.isPending;

  function onSubmit(values: FormValues) {
    const payload = {
      ...values,
      code: values.code || null,
      barcode: values.barcode || null,
      multiplier: values.multiplier || null,
      labOrderNumber: values.labOrderNumber || null,
      labName: values.labName || null,
      labAccountNumber: values.labAccountNumber || null,
      trackingNumber: values.trackingNumber || null,
      dateSentToLab: values.dateSentToLab || null,
      visionPlan: values.visionPlan || null,
    };
    if (isEdit) {
      updateMutation.mutate(payload);
    } else {
      setPendingPayload(payload);
      if (variants.length > 0) {
        const allPayloads = [
          payload,
          ...variants.map((v) => ({
            ...payload,
            code: v.code || null,
            color: v.color,
            eyeSize: v.eyeSize,
            bridge: v.bridge,
            templeLength: v.templeLength,
            barcode: v.barcode || null,
            quantity: v.quantity,
          })),
        ];
        Promise.all(
          allPayloads.map((p) =>
            fetch("/api/frames", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(p),
              credentials: "include",
            }),
          ),
        )
          .then(() => {
            queryClient.invalidateQueries({ queryKey: ["/api/frames"] });
            toast({
              title: "Frames added",
              description: `${allPayloads.length} frame variant${allPayloads.length !== 1 ? "s" : ""} added to inventory.`,
            });
            setVariants([]);
            onClose();
          })
          .catch(() => {
            toast({
              title: "Error",
              description: "Some variants may not have been added.",
              variant: "destructive",
            });
          });
      } else {
        createMutation.mutate(payload);
      }
    }
  }

  const isAtLab = watchedStatus === "at_lab";

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit Frame" : "Add New Frame"}</DialogTitle>
            {!isEdit && prefillBarcode && (
              <DialogDescription>
                No frame found for barcode{" "}
                <span className="font-mono font-semibold text-foreground">
                  {prefillBarcode}
                </span>
                . Fill in the details below.
              </DialogDescription>
            )}
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {/* Barcode + Quantity */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="barcode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <Barcode className="w-3.5 h-3.5 text-muted-foreground" />
                        Barcode
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Scan or type barcode..."
                          data-testid="input-barcode"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        Qty in Stock
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          step={1}
                          placeholder="1"
                          data-testid="input-quantity"
                          {...field}
                          value={field.value ?? 1}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            field.onChange(isNaN(val) || val < 1 ? 1 : val);
                          }}
                          onFocus={(e) => e.target.select()}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Manufacturer + Brand */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="manufacturer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Manufacturer</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={(v) =>
                          handleManufacturerChange(v, field.onChange)
                        }
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-manufacturer">
                            <SelectValue placeholder="Select manufacturer..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>Manufacturers</SelectLabel>
                            {allManufacturers.map((m) => (
                              <SelectItem key={m} value={m}>
                                {m}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                          {isAdmin && (
                            <>
                              <SelectSeparator />
                              <div className="px-1 pb-1">
                                <button
                                  type="button"
                                  data-testid="button-add-manufacturer-inline"
                                  className="flex w-full items-center gap-1.5 rounded-sm px-2 py-1.5 text-sm text-primary hover:bg-accent cursor-pointer"
                                  onPointerDown={(e) => e.preventDefault()}
                                  onClick={() => {
                                    setNewMfgName("");
                                    setShowAddMfgModal(true);
                                  }}
                                >
                                  <PlusCircle className="w-3.5 h-3.5" />
                                  Add Manufacturer
                                </button>
                              </div>
                            </>
                          )}
                        </SelectContent>
                      </Select>
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
                      <Select
                        value={field.value}
                        onValueChange={(v) =>
                          handleBrandChange(v, field.onChange)
                        }
                        disabled={!watchedManufacturer}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-brand">
                            <SelectValue
                              placeholder={
                                watchedManufacturer
                                  ? "Select brand..."
                                  : "Select manufacturer first"
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableBrandNames.length > 0 ? (
                            <SelectGroup>
                              <SelectLabel>
                                {watchedManufacturer} Brands
                              </SelectLabel>
                              {availableBrandNames.map((b) => (
                                <SelectItem key={b} value={b}>
                                  {b}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          ) : (
                            <div className="px-3 py-4 text-xs text-muted-foreground text-center">
                              No brands for this manufacturer.
                            </div>
                          )}
                          {isAdmin && watchedManufacturer && (
                            <>
                              <SelectSeparator />
                              <div className="px-1 pb-1">
                                <button
                                  type="button"
                                  data-testid="button-add-brand-inline"
                                  className="flex w-full items-center gap-1.5 rounded-sm px-2 py-1.5 text-sm text-primary hover:bg-accent cursor-pointer"
                                  onPointerDown={(e) => e.preventDefault()}
                                  onClick={() => {
                                    setNewBrandName("");
                                    setNewBrandMfgId(selectedMfgObj?.id ?? "");
                                    setShowAddBrandModal(true);
                                  }}
                                >
                                  <PlusCircle className="w-3.5 h-3.5" />
                                  Add Brand
                                </button>
                              </div>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Model */}
              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Model</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. RB5154"
                        data-testid="input-model"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Color + Code */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Matte Black"
                          data-testid="input-color"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Code{" "}
                        <span className="text-muted-foreground font-normal">
                          (optional)
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. 8356"
                          data-testid="input-code"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Sizes */}
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="eyeSize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Eye Size (mm)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={99}
                          data-testid="input-eye-size"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="bridge"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bridge (mm)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={99}
                          data-testid="input-bridge"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="templeLength"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Temple (mm)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={999}
                          data-testid="input-temple"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Additional Variants — only shown when adding a new frame */}
              {!isEdit && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      <PlusCircle className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
                      Additional Color/Size Variants
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() =>
                        setVariants((prev) => [
                          ...prev,
                          {
                            code: "",
                            color: "",
                            eyeSize: 52,
                            bridge: 18,
                            templeLength: 145,
                            barcode: "",
                            quantity: 1,
                          },
                        ])
                      }
                      data-testid="button-add-variant"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add Variant
                    </Button>
                  </div>
                  {variants.length > 0 && (
                    <div className="space-y-2">
                      {variants.map((v, idx) => (
                        <div
                          key={idx}
                          className="grid grid-cols-7 gap-2 items-end p-3 rounded-lg bg-muted/30 border border-border"
                        >
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">
                              Code
                            </p>
                            <Input
                              placeholder="e.g. 8356"
                              value={v.code}
                              onChange={(e) =>
                                setVariants((prev) =>
                                  prev.map((x, i) =>
                                    i === idx
                                      ? { ...x, code: e.target.value }
                                      : x,
                                  ),
                                )
                              }
                              data-testid={`input-variant-code-${idx}`}
                            />
                          </div>
                          <div className="col-span-2">
                            <p className="text-xs text-muted-foreground mb-1">
                              Color
                            </p>
                            <Input
                              placeholder="Color"
                              value={v.color}
                              onChange={(e) =>
                                setVariants((prev) =>
                                  prev.map((x, i) =>
                                    i === idx
                                      ? { ...x, color: e.target.value }
                                      : x,
                                  ),
                                )
                              }
                              data-testid={`input-variant-color-${idx}`}
                            />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">
                              Eye
                            </p>
                            <Input
                              type="number"
                              min={1}
                              max={99}
                              value={v.eyeSize}
                              onChange={(e) =>
                                setVariants((prev) =>
                                  prev.map((x, i) =>
                                    i === idx
                                      ? {
                                          ...x,
                                          eyeSize:
                                            parseInt(e.target.value) || 52,
                                        }
                                      : x,
                                  ),
                                )
                              }
                              data-testid={`input-variant-eye-${idx}`}
                            />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">
                              Bridge
                            </p>
                            <Input
                              type="number"
                              min={1}
                              max={99}
                              value={v.bridge}
                              onChange={(e) =>
                                setVariants((prev) =>
                                  prev.map((x, i) =>
                                    i === idx
                                      ? {
                                          ...x,
                                          bridge:
                                            parseInt(e.target.value) || 18,
                                        }
                                      : x,
                                  ),
                                )
                              }
                              data-testid={`input-variant-bridge-${idx}`}
                            />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">
                              Temple
                            </p>
                            <Input
                              type="number"
                              min={1}
                              max={999}
                              value={v.templeLength}
                              onChange={(e) =>
                                setVariants((prev) =>
                                  prev.map((x, i) =>
                                    i === idx
                                      ? {
                                          ...x,
                                          templeLength:
                                            parseInt(e.target.value) || 145,
                                        }
                                      : x,
                                  ),
                                )
                              }
                              data-testid={`input-variant-temple-${idx}`}
                            />
                          </div>
                          <div className="flex items-end gap-1">
                            <div className="flex-1">
                              <p className="text-xs text-muted-foreground mb-1">
                                Qty
                              </p>
                              <Input
                                type="number"
                                min={1}
                                step={1}
                                value={v.quantity}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) =>
                                  setVariants((prev) =>
                                    prev.map((x, i) =>
                                      i === idx
                                        ? {
                                            ...x,
                                            quantity:
                                              parseInt(e.target.value) || 1,
                                          }
                                        : x,
                                    ),
                                  )
                                }
                                data-testid={`input-variant-qty-${idx}`}
                              />
                            </div>
                            <button
                              type="button"
                              className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors mb-0.5"
                              onClick={() =>
                                setVariants((prev) =>
                                  prev.filter((_, i) => i !== idx),
                                )
                              }
                              data-testid={`button-remove-variant-${idx}`}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {variants.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-2 bg-muted/20 rounded border border-dashed border-border">
                      Click "Add Variant" to add additional color/size
                      combinations for the same model.
                    </p>
                  )}
                </div>
              )}

              {/* Pricing */}
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Wholesale Cost ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          placeholder="0.00"
                          data-testid="input-cost"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="multiplier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Multiplier</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          min={0}
                          placeholder="e.g. 3"
                          data-testid="input-multiplier"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="retailPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Retail Price ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          placeholder="0.00"
                          data-testid="input-retail-price"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Status */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger
                          data-testid="select-status"
                          className="w-48"
                        >
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="on_board">On Board</SelectItem>
                        <SelectItem value="off_board">Off Board</SelectItem>
                        <SelectItem value="at_lab">At Lab</SelectItem>
                        <SelectItem value="sold">Sold</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Lab fields — shown only when status = at_lab */}
              {isAtLab && (
                <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-4 space-y-4">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                    <FlaskConical className="w-4 h-4" />
                    <p className="text-sm font-semibold">Lab Details</p>
                  </div>

                  {/* Vision Plan — required */}
                  <FormField
                    control={form.control}
                    name="visionPlan"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          Vision Plan{" "}
                          <span className="text-destructive ml-0.5">*</span>
                        </FormLabel>
                        <Select
                          value={field.value ?? ""}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-vision-plan">
                              <SelectValue placeholder="Select vision plan..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {VISION_PLAN_OPTIONS.map((plan) => (
                              <SelectItem key={plan} value={plan}>
                                {plan}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Row 1: Lab Name + Account Number display */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="labName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-muted-foreground" />{" "}
                            Lab Name
                          </FormLabel>
                          <Select
                            value={field.value ?? ""}
                            onValueChange={(v) =>
                              handleLabChange(v, field.onChange)
                            }
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-lab-name">
                                <SelectValue placeholder="Select lab..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectGroup>
                                <SelectLabel>Labs</SelectLabel>
                                {allLabs.map((lab) => (
                                  <SelectItem key={lab.name} value={lab.name}>
                                    <span className="flex items-center justify-between gap-3 w-full">
                                      <span>{lab.name}</span>
                                      {lab.account && (
                                        <span className="text-xs text-muted-foreground font-mono">
                                          #{lab.account}
                                        </span>
                                      )}
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="labAccountNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1">
                            <Hash className="w-3 h-3 text-muted-foreground" />{" "}
                            Account Number
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                placeholder="Auto-filled on lab selection"
                                data-testid="input-lab-account-number"
                                {...field}
                                value={field.value ?? ""}
                                className="font-mono"
                                readOnly={
                                  !!allLabs.find(
                                    (l) =>
                                      l.name === form.watch("labName") &&
                                      l.account,
                                  )
                                }
                              />
                              {field.value && (
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0.5 rounded">
                                  auto
                                </span>
                              )}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Row 2: Order Number + Date + Tracking */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="labOrderNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1">
                            <Hash className="w-3 h-3 text-muted-foreground" />{" "}
                            Order Number
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g. ORD-12345"
                              data-testid="input-lab-order-number"
                              {...field}
                              value={field.value ?? ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="dateSentToLab"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1">
                            <ChevronsUpDown className="w-3 h-3 text-muted-foreground" />{" "}
                            Date Sent
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              data-testid="input-date-sent-to-lab"
                              {...field}
                              value={field.value ?? ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="trackingNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1">
                            <Truck className="w-3 h-3 text-muted-foreground" />{" "}
                            Tracking Number
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g. 1Z999AA0..."
                              data-testid="input-tracking-number"
                              {...field}
                              value={field.value ?? ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  data-testid="button-cancel-frame"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  data-testid="button-save-frame"
                >
                  {isPending
                    ? "Saving..."
                    : isEdit
                      ? "Update Frame"
                      : "Add Frame"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Quick-add Manufacturer modal */}
      <Dialog
        open={showAddMfgModal}
        onOpenChange={(o) => {
          if (!o) setShowAddMfgModal(false);
        }}
      >
        <DialogContent className="max-w-sm" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Add Manufacturer</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Manufacturer Name</label>
              <Input
                data-testid="input-new-manufacturer-name"
                placeholder="e.g. Luxottica"
                value={newMfgName}
                onChange={(e) => setNewMfgName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const name = newMfgName.trim();
                    if (name) addMfgMutation.mutate(name);
                  }
                }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAddMfgModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              data-testid="button-save-new-manufacturer"
              disabled={!newMfgName.trim() || addMfgMutation.isPending}
              onClick={() => {
                const name = newMfgName.trim();
                if (name) addMfgMutation.mutate(name);
              }}
            >
              {addMfgMutation.isPending ? "Saving..." : "Add Manufacturer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick-add Brand modal */}
      <Dialog
        open={showAddBrandModal}
        onOpenChange={(o) => {
          if (!o) setShowAddBrandModal(false);
        }}
      >
        <DialogContent className="max-w-sm" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Add Brand</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Brand Name</label>
              <Input
                data-testid="input-new-brand-name"
                placeholder="e.g. Ray-Ban"
                value={newBrandName}
                onChange={(e) => setNewBrandName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Manufacturer</label>
              <Select value={newBrandMfgId} onValueChange={setNewBrandMfgId}>
                <SelectTrigger data-testid="select-new-brand-manufacturer">
                  <SelectValue placeholder="Select manufacturer..." />
                </SelectTrigger>
                <SelectContent>
                  {manufacturersData.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAddBrandModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              data-testid="button-save-new-brand"
              disabled={
                !newBrandName.trim() ||
                !newBrandMfgId ||
                addBrandMutation.isPending
              }
              onClick={() => {
                const name = newBrandName.trim();
                if (name && newBrandMfgId) {
                  addBrandMutation.mutate({
                    manufacturerId: newBrandMfgId,
                    name,
                  });
                }
              }}
            >
              {addBrandMutation.isPending ? "Saving..." : "Add Brand"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!duplicateInfo}
        onOpenChange={(o) => {
          if (!o) setDuplicateInfo(null);
        }}
      >
        <DialogContent className="max-w-sm" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Duplicate Frame Detected</DialogTitle>
            <DialogDescription>
              This frame already exists in inventory
              {duplicateInfo && (
                <span className="block mt-1 font-semibold text-foreground">
                  {duplicateInfo.existingBrand} {duplicateInfo.existingModel} —{" "}
                  {duplicateInfo.existingColor}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Would you like to replace the existing entry with the new one? Sales
            history will be preserved.
          </p>
          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              data-testid="button-duplicate-cancel"
              onClick={() => setDuplicateInfo(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              data-testid="button-duplicate-replace"
              disabled={replaceMutation.isPending}
              onClick={() => {
                if (!duplicateInfo || !pendingPayload) return;
                replaceMutation.mutate({
                  existingFrameId: duplicateInfo.existingFrameId,
                  newFrame: pendingPayload,
                });
              }}
            >
              {replaceMutation.isPending
                ? "Replacing..."
                : "Replace Existing Frame"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface ExtractedFrame {
  manufacturer: string;
  brand: string;
  model: string;
  color: string;
  code?: string;
  eyeSize: number;
  bridge: number;
  templeLength: number;
  cost: string;
  quantity: number;
}

function InvoiceImportDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [rows, setRows] = useState<ExtractedFrame[]>([]);
  const [importing, setImporting] = useState(false);
  const [detectedCount, setDetectedCount] = useState(0);
  const [importSummary, setImportSummary] = useState<{
    added: number;
    skipped: number;
    detected: number;
  } | null>(null);
  const [globalManufacturer, setGlobalManufacturer] = useState<string>("");

  const { data: existingFrames = [] } = useQuery<Frame[]>({
    queryKey: ["/api/frames"],
  });
  const { data: mfgList = [] } = useQuery<Manufacturer[]>({
    queryKey: ["/api/manufacturers"],
  });
  const { data: settingsData = {} } = useQuery<Record<string, string>>({
    queryKey: ["/api/settings"],
  });

  const grouped = useMemo(() => {
    const groups = new Map<
      string,
      {
        key: string;
        brand: string;
        model: string;
        manufacturer: string;
        indices: number[];
      }
    >();
    rows.forEach((row, idx) => {
      const key = `${row.brand.trim().toLowerCase()}|||${row.model.trim().toLowerCase()}`;
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          brand: row.brand,
          model: row.model,
          manufacturer: row.manufacturer,
          indices: [],
        });
      }
      groups.get(key)!.indices.push(idx);
    });
    return Array.from(groups.values());
  }, [rows]);

  function updateGroupField(
    groupKey: string,
    field: "brand" | "model" | "manufacturer",
    value: string,
  ) {
    setRows((prev) =>
      prev.map((row) => {
        const key = `${row.brand.trim().toLowerCase()}|||${row.model.trim().toLowerCase()}`;
        return key === groupKey ? { ...row, [field]: value } : row;
      }),
    );
  }

  function resetState() {
    setSelectedFile(null);
    setRows([]);
    setParsing(false);
    setImporting(false);
    setDetectedCount(0);
    setImportSummary(null);
    setGlobalManufacturer("");
  }

  function handleFileChange(file: File) {
    setSelectedFile(file);
    setRows([]);
    setImportSummary(null);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileChange(file);
  }

  function updateRow(
    idx: number,
    field: keyof ExtractedFrame,
    value: string | number,
  ) {
    setRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)),
    );
  }

  function removeRow(idx: number) {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleParse() {
    if (!selectedFile) return;
    setParsing(true);
    setRows([]);
    setImportSummary(null);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      const res = await fetch("/api/invoice/parse", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!res.ok) {
        const err = await res
          .json()
          .catch(() => ({ message: "Failed to parse invoice" }));
        throw new Error(err.message || "Failed to parse invoice");
      }
      const data = await res.json();
      if (!data.frames || data.frames.length === 0) {
        toast({
          title: "No frames found",
          description:
            "No optical frame products could be identified in this file.",
          variant: "destructive",
        });
        return;
      }
      const total = data.totalDetected ?? data.frames.length;
      setDetectedCount(total);

      // If the user already chose a manufacturer before extracting, respect it and apply to all rows.
      // Only auto-detect if the user hasn't made a selection yet.
      if (globalManufacturer.trim()) {
        setRows(
          (data.frames as ExtractedFrame[]).map((f: ExtractedFrame) => ({
            ...f,
            manufacturer: globalManufacturer.trim(),
          })),
        );
      } else {
        // Auto-detect the primary manufacturer from extracted frames
        const mfgCounts = new Map<string, number>();
        (data.frames as ExtractedFrame[]).forEach((f) => {
          const m = f.manufacturer?.trim();
          if (m) mfgCounts.set(m, (mfgCounts.get(m) ?? 0) + 1);
        });
        let detectedMfg = "";
        let bestCount = 0;
        mfgCounts.forEach((count, mfg) => {
          if (count > bestCount) {
            detectedMfg = mfg;
            bestCount = count;
          }
        });
        // Prefer an exact match against known manufacturers (normalises AI casing/spelling)
        const knownMfg = mfgList.find(
          (m) => m.name.toLowerCase() === detectedMfg.toLowerCase(),
        );
        const finalMfg = knownMfg?.name || detectedMfg;
        if (finalMfg) {
          setGlobalManufacturer(finalMfg);
          setRows(
            (data.frames as ExtractedFrame[]).map((f: ExtractedFrame) => ({
              ...f,
              manufacturer: finalMfg,
            })),
          );
        } else {
          setRows(data.frames);
        }
      }

      if (data.truncated) {
        toast({
          title: "Large invoice detected",
          description: `Detected ${total} frames in invoice. Showing the first 100 for import. Split large invoices into batches of 100 for best results.`,
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Parse failed",
        description:
          err instanceof Error ? err.message : "Could not parse invoice",
        variant: "destructive",
      });
    } finally {
      setParsing(false);
    }
  }

  async function handleImport() {
    if (rows.length === 0) return;
    setImporting(true);
    let added = 0;
    let skipped = 0;

    for (const row of rows) {
      try {
        const costNum = parseFloat(row.cost) || 0;
        const importMultiplier =
          parseFloat(settingsData.defaultMultiplier || "3") || 3;
        const retailNum = Math.round(costNum * importMultiplier);
        const manufacturer =
          globalManufacturer?.trim() ||
          row.manufacturer?.trim() ||
          row.brand?.trim() ||
          "Unknown";
        const brand = row.brand?.trim() || manufacturer;

        const payload = {
          manufacturer,
          brand,
          model: row.model,
          color: row.color,
          code: row.code?.trim() || null,
          eyeSize: Number(row.eyeSize) || 52,
          bridge: Number(row.bridge) || 18,
          templeLength: Number(row.templeLength) || 145,
          cost: String(costNum.toFixed(2)),
          retailPrice: String(retailNum),
          quantity: Number(row.quantity) || 1,
          status: "on_board",
        };

        const res = await fetch("/api/frames", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const json = await res.json().catch(() => ({}));
          if (json._reorder) {
            skipped++;
          } else {
            added++;
          }
        } else {
          skipped++;
        }
      } catch {
        skipped++;
      }
    }

    queryClient.invalidateQueries({ queryKey: ["/api/frames"] });
    queryClient.invalidateQueries({ queryKey: ["/api/frame-holds"] });
    queryClient.invalidateQueries({ queryKey: ["/api/lab-orders"] });
    setImporting(false);
    setImportSummary({ added, skipped, detected: detectedCount });
    const parts: string[] = [];
    if (skipped > 0) parts.push(`${skipped} skipped (already exist)`);
    toast({
      title: "Import complete",
      description: `Detected ${detectedCount} frame${detectedCount !== 1 ? "s" : ""} in invoice. Imported ${added} frame${added !== 1 ? "s" : ""}${parts.length ? ", " + parts.join(", ") : ""}.`,
    });
  }

  function handleClose() {
    resetState();
    onClose();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose();
      }}
    >
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="w-5 h-5" />
            Import Frames from Invoice
          </DialogTitle>
          <DialogDescription>
            Upload an invoice (PDF, image, or spreadsheet) and the system will
            extract frame data for you to review before importing.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
          {/* Global manufacturer selector — always visible, applies to all extracted frames */}
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border bg-muted/30">
            <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm font-medium whitespace-nowrap">
              Manufacturer:
            </span>
            <Select
              value={globalManufacturer}
              onValueChange={(v) => {
                setGlobalManufacturer(v);
                if (rows.length > 0) {
                  setRows((prev) =>
                    prev.map((r) => ({ ...r, manufacturer: v })),
                  );
                }
              }}
            >
              <SelectTrigger
                className="flex-1 h-8 text-sm"
                data-testid="select-global-manufacturer"
              >
                <SelectValue placeholder="Select manufacturer to apply to all frames..." />
              </SelectTrigger>
              <SelectContent>
                {mfgList.map((m) => (
                  <SelectItem key={m.id} value={m.name}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {globalManufacturer && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground flex-shrink-0"
                onClick={() => setGlobalManufacturer("")}
                data-testid="button-clear-global-manufacturer"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>

          {rows.length === 0 ? (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              data-testid="invoice-drop-zone"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileChange(f);
                }}
                data-testid="input-invoice-file"
              />
              <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <p className="font-medium text-foreground mb-1">
                Drop your invoice here
              </p>
              <p className="text-sm text-muted-foreground">
                PDF, JPEG, PNG, WebP, CSV, XLS, or XLSX · Max 20 MB
              </p>
              {selectedFile && (
                <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md text-sm font-medium">
                  <FileText className="w-4 h-4" />
                  {selectedFile.name}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Detected <strong>{detectedCount}</strong> frame
                  {detectedCount !== 1 ? "s" : ""} in invoice —{" "}
                  <span className="text-foreground font-medium">
                    {grouped.length} model{grouped.length !== 1 ? "s" : ""},{" "}
                    {rows.length} variant{rows.length !== 1 ? "s" : ""}
                  </span>
                  . Review before importing.
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setRows([]);
                    setImportSummary(null);
                  }}
                  data-testid="button-clear-rows"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                  Clear
                </Button>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                  New — will be added
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-500"></span>
                  Exists — quantity will update
                </span>
              </div>

              {/* Grouped cards */}
              <div className="space-y-2 overflow-y-auto max-h-[420px] pr-1">
                {grouped.map((group) => (
                  <div
                    key={group.key}
                    className="rounded-lg border border-border overflow-hidden"
                    data-testid={`group-${group.key}`}
                  >
                    {/* Group header — editable brand/model/manufacturer */}
                    <div className="px-3 py-2 bg-muted/40 border-b border-border flex items-center gap-2">
                      <div className="flex-1 min-w-0 flex flex-wrap items-center gap-1">
                        <input
                          className="font-semibold text-sm bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-primary rounded px-1 w-28 min-w-0"
                          value={group.brand}
                          onChange={(e) =>
                            updateGroupField(group.key, "brand", e.target.value)
                          }
                          data-testid={`input-group-brand-${group.key}`}
                        />
                        <input
                          className="font-semibold text-sm bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-primary rounded px-1 w-28 min-w-0"
                          value={group.model}
                          onChange={(e) =>
                            updateGroupField(group.key, "model", e.target.value)
                          }
                          data-testid={`input-group-model-${group.key}`}
                        />
                        <span className="text-muted-foreground/40 text-xs">
                          ·
                        </span>
                        <input
                          className="text-xs text-muted-foreground bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-primary rounded px-1 w-28 min-w-0"
                          value={group.manufacturer}
                          onChange={(e) =>
                            updateGroupField(
                              group.key,
                              "manufacturer",
                              e.target.value,
                            )
                          }
                          data-testid={`input-group-manufacturer-${group.key}`}
                        />
                      </div>
                      <Badge
                        variant="secondary"
                        className="text-xs flex-shrink-0"
                      >
                        {group.indices.length} variant
                        {group.indices.length !== 1 ? "s" : ""}
                      </Badge>
                    </div>

                    {/* Variant rows */}
                    {group.indices.map((rowIdx, vIdx) => {
                      const row = rows[rowIdx];
                      const isLast = vIdx === group.indices.length - 1;
                      const isExactDuplicate = existingFrames.some(
                        (f) =>
                          f.brand.toLowerCase() ===
                            row.brand.trim().toLowerCase() &&
                          f.model.toLowerCase() ===
                            row.model.trim().toLowerCase() &&
                          (f.code ?? "") === (row.code?.trim() ?? "") &&
                          f.eyeSize === Number(row.eyeSize) &&
                          f.bridge === Number(row.bridge) &&
                          f.templeLength === Number(row.templeLength),
                      );
                      return (
                        <div
                          key={rowIdx}
                          className={`px-3 py-2 flex items-center gap-1.5 hover:bg-muted/20 transition-colors ${!isLast ? "border-b border-border/50" : ""}`}
                          data-testid={`row-invoice-frame-${rowIdx}`}
                        >
                          <span className="text-muted-foreground/30 text-xs w-3 flex-shrink-0 font-mono">
                            {isLast ? "└" : "├"}
                          </span>

                          {/* Code */}
                          <input
                            className="w-14 text-xs bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-primary rounded px-1 font-mono text-muted-foreground placeholder:text-muted-foreground/30 flex-shrink-0"
                            placeholder="Code"
                            value={row.code ?? ""}
                            onChange={(e) =>
                              updateRow(rowIdx, "code", e.target.value)
                            }
                            data-testid={`input-invoice-code-${rowIdx}`}
                          />

                          {/* Color */}
                          <input
                            className="flex-1 min-w-0 text-xs bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-primary rounded px-1 text-foreground placeholder:text-muted-foreground/30"
                            placeholder="Color"
                            value={row.color}
                            onChange={(e) =>
                              updateRow(rowIdx, "color", e.target.value)
                            }
                            data-testid={`input-invoice-color-${rowIdx}`}
                          />

                          {/* Size: Eye - Bridge - Temple */}
                          <div className="flex items-center gap-0.5 text-xs font-mono flex-shrink-0">
                            <input
                              type="number"
                              className="w-9 text-center bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-primary rounded px-0.5 text-xs text-muted-foreground"
                              value={row.eyeSize}
                              onChange={(e) =>
                                updateRow(
                                  rowIdx,
                                  "eyeSize",
                                  Number(e.target.value),
                                )
                              }
                              data-testid={`input-invoice-eyesize-${rowIdx}`}
                            />
                            <span className="text-muted-foreground/40">-</span>
                            <input
                              type="number"
                              className="w-9 text-center bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-primary rounded px-0.5 text-xs text-muted-foreground"
                              value={row.bridge}
                              onChange={(e) =>
                                updateRow(
                                  rowIdx,
                                  "bridge",
                                  Number(e.target.value),
                                )
                              }
                              data-testid={`input-invoice-bridge-${rowIdx}`}
                            />
                            <span className="text-muted-foreground/40">-</span>
                            <input
                              type="number"
                              className="w-11 text-center bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-primary rounded px-0.5 text-xs text-muted-foreground"
                              value={row.templeLength}
                              onChange={(e) =>
                                updateRow(
                                  rowIdx,
                                  "templeLength",
                                  Number(e.target.value),
                                )
                              }
                              data-testid={`input-invoice-temple-${rowIdx}`}
                            />
                          </div>

                          {/* Cost */}
                          <div className="flex items-center flex-shrink-0">
                            <span className="text-xs text-muted-foreground/60">
                              $
                            </span>
                            <input
                              className="w-16 text-xs bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-primary rounded px-1 text-right text-muted-foreground"
                              value={row.cost}
                              onChange={(e) =>
                                updateRow(rowIdx, "cost", e.target.value)
                              }
                              data-testid={`input-invoice-cost-${rowIdx}`}
                            />
                          </div>

                          {/* Qty */}
                          <div className="flex items-center gap-0.5 flex-shrink-0">
                            <span className="text-xs text-muted-foreground/60">
                              ×
                            </span>
                            <input
                              type="number"
                              min={1}
                              className="w-9 text-xs bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-primary rounded px-1 text-center text-muted-foreground"
                              value={row.quantity}
                              onChange={(e) =>
                                updateRow(
                                  rowIdx,
                                  "quantity",
                                  Number(e.target.value),
                                )
                              }
                              data-testid={`input-invoice-qty-${rowIdx}`}
                            />
                          </div>

                          {/* Status badge */}
                          {isExactDuplicate ? (
                            <Badge
                              variant="outline"
                              className="text-xs flex-shrink-0 border-amber-400/60 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0"
                            >
                              Update Qty
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-xs flex-shrink-0 border-emerald-400/60 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0"
                            >
                              New
                            </Badge>
                          )}

                          {/* Remove */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive flex-shrink-0"
                            onClick={() => removeRow(rowIdx)}
                            data-testid={`button-remove-row-${rowIdx}`}
                          >
                            <Trash className="w-3 h-3" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              {importSummary && (
                <div className="rounded-md bg-muted/50 border px-4 py-3 text-sm flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span>
                    Detected <strong>{importSummary.detected}</strong> frame
                    {importSummary.detected !== 1 ? "s" : ""} in invoice.{" "}
                    Imported <strong>{importSummary.added}</strong> frame
                    {importSummary.added !== 1 ? "s" : ""}
                    {importSummary.skipped > 0 && (
                      <>
                        , <strong>{importSummary.skipped}</strong> quantity
                        updated (already exist)
                      </>
                    )}
                    .
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 pt-2 gap-2 border-t">
          {rows.length === 0 ? (
            <>
              <Button
                variant="outline"
                onClick={handleClose}
                data-testid="button-cancel-import"
              >
                Cancel
              </Button>
              <Button
                onClick={handleParse}
                disabled={!selectedFile || parsing}
                data-testid="button-parse-invoice"
              >
                {parsing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {selectedFile &&
                    /\.(csv|xlsx|xls)$/i.test(selectedFile.name)
                      ? "Reading..."
                      : "Analyzing..."}
                  </>
                ) : (
                  <>
                    <FileUp className="w-4 h-4 mr-2" />
                    {selectedFile &&
                    /\.(csv|xlsx|xls)$/i.test(selectedFile.name)
                      ? "Read Spreadsheet"
                      : "Extract with AI"}
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleClose}
                data-testid="button-close-import"
              >
                {importSummary ? "Close" : "Cancel"}
              </Button>
              {!importSummary && (
                <Button
                  onClick={handleImport}
                  disabled={importing || rows.length === 0}
                  data-testid="button-confirm-import"
                >
                  {importing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Confirm Import ({rows.length} variant
                      {rows.length !== 1 ? "s" : ""} across {grouped.length}{" "}
                      model{grouped.length !== 1 ? "s" : ""})
                    </>
                  )}
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Inventory() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [manufacturerFilter, setManufacturerFilter] = useState<string>("all");
  const [showRecent, setShowRecent] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editFrame, setEditFrame] = useState<Frame | null>(null);
  const [prefillBarcode, setPrefillBarcode] = useState<string>("");
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [foundFrame, setFoundFrame] = useState<Frame | null>(null);
  const [scanValue, setScanValue] = useState("");
  const [scanState, setScanState] = useState<"idle" | "found" | "not_found">(
    "idle",
  );
  const scanInputRef = useRef<HTMLInputElement>(null);
  const highlightedRowRef = useRef<HTMLTableRowElement>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { toast } = useToast();

  const { data: frames = [], isLoading } = useQuery<Frame[]>({
    queryKey: ["/api/frames"],
  });

  const { data: frameHoldsData = [] } = useQuery<
    { frameId: string | null; status: string }[]
  >({
    queryKey: ["/api/frame-holds"],
  });

  const activeHoldFrameIds = new Set(
    frameHoldsData
      .filter((h) => h.status === "active")
      .map((h) => h.frameId)
      .filter(Boolean),
  );

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/frames/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/frames"] });
      toast({
        title: "Frame deleted",
        description: "The frame has been removed from inventory.",
      });
      setDeleteId(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete frame.",
        variant: "destructive",
      });
    },
  });

  const uniqueManufacturers = useMemo(
    () =>
      [...new Set(frames.map((f) => f.manufacturer).filter(Boolean))].sort(),
    [frames],
  );

  const filteredBrandOptions = useMemo(() => {
    const source =
      manufacturerFilter !== "all"
        ? frames.filter((f) => f.manufacturer === manufacturerFilter)
        : frames;
    return [...new Set(source.map((f) => f.brand).filter(Boolean))].sort();
  }, [frames, manufacturerFilter]);

  const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

  const recentlyAdded = useMemo(() => {
    const cutoff = Date.now() - FIVE_DAYS_MS;
    return [...frames]
      .filter((f) => new Date(f.createdAt).getTime() >= cutoff)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }, [frames]);

  const recentManufacturers = useMemo(
    () =>
      [
        ...new Set(recentlyAdded.map((f) => f.manufacturer).filter(Boolean)),
      ].sort(),
    [recentlyAdded],
  );

  const [recentTab, setRecentTab] = useState<string>("");

  function formatRelativeDate(dateStr: string | Date) {
    const date = new Date(dateStr);
    const diffDays = Math.floor(
      (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    return `${diffDays} days ago`;
  }

  const hasActiveFilters =
    search !== "" ||
    brandFilter !== "all" ||
    manufacturerFilter !== "all" ||
    statusFilter !== "all";

  function handleManufacturerFilterChange(value: string) {
    setManufacturerFilter(value);
    if (value !== "all" && brandFilter !== "all") {
      const brandsForMfg = frames
        .filter((f) => f.manufacturer === value)
        .map((f) => f.brand);
      if (!brandsForMfg.includes(brandFilter)) {
        setBrandFilter("all");
      }
    }
  }

  function clearFilters() {
    setSearch("");
    setBrandFilter("all");
    setManufacturerFilter("all");
    setStatusFilter("all");
  }

  const filtered = frames.filter((frame) => {
    const matchesStatus =
      statusFilter === "all" || frame.status === statusFilter;
    const matchesBrand = brandFilter === "all" || frame.brand === brandFilter;
    const matchesManufacturer =
      manufacturerFilter === "all" || frame.manufacturer === manufacturerFilter;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      frame.manufacturer.toLowerCase().includes(q) ||
      frame.brand.toLowerCase().includes(q) ||
      frame.model.toLowerCase().includes(q) ||
      frame.color.toLowerCase().includes(q) ||
      (frame.barcode && frame.barcode.toLowerCase().includes(q));
    return (
      matchesStatus && matchesBrand && matchesManufacturer && matchesSearch
    );
  });

  function highlightFrame(id: string) {
    setHighlightedId(id);
    if (highlightTimer.current) clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => setHighlightedId(null), 4000);
  }

  useEffect(() => {
    if (highlightedId && highlightedRowRef.current) {
      highlightedRowRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [highlightedId]);

  const handleScan = useCallback(
    (value: string) => {
      const barcode = value.trim();
      if (!barcode) return;
      const match = frames.find(
        (f) => f.barcode && f.barcode.trim() === barcode,
      );
      if (match) {
        setScanState("found");
        setFoundFrame(match);
        highlightFrame(match.id);
        setScanValue("");
      } else {
        setScanState("not_found");
        setFoundFrame(null);
        setScanValue("");
        setPrefillBarcode(barcode);
        setEditFrame(null);
        setDialogOpen(true);
      }
    },
    [frames],
  );

  function handleScanKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleScan(scanValue);
    }
  }

  function dismissFoundCard() {
    setFoundFrame(null);
    setScanState("idle");
    scanInputRef.current?.focus();
  }

  function openEditFromFound() {
    if (!foundFrame) return;
    setFoundFrame(null);
    setScanState("idle");
    setEditFrame(foundFrame);
    setPrefillBarcode("");
    setDialogOpen(true);
  }

  function openAdd() {
    setEditFrame(null);
    setPrefillBarcode("");
    setDialogOpen(true);
  }

  function openEdit(frame: Frame) {
    setEditFrame(frame);
    setPrefillBarcode("");
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditFrame(null);
    setPrefillBarcode("");
    scanInputRef.current?.focus();
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inventory</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {frames.length} frame{frames.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setImportDialogOpen(true)}
            data-testid="button-import-invoice"
          >
            <FileUp className="w-4 h-4 mr-2" />
            Import Invoice
          </Button>
          <Button onClick={openAdd} data-testid="button-add-frame">
            <Plus className="w-4 h-4 mr-2" />
            Add Frame
          </Button>
        </div>
      </div>

      {/* Barcode scanner */}
      <div
        className={`flex items-center gap-3 p-4 rounded-lg border transition-colors duration-200 ${
          scanState === "found"
            ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/20"
            : scanState === "not_found"
              ? "border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/20"
              : "border-border bg-muted/30"
        }`}
        data-testid="barcode-scanner-panel"
      >
        <div
          className={`p-2.5 rounded-md flex-shrink-0 transition-colors duration-200 ${
            scanState === "found"
              ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400"
              : scanState === "not_found"
                ? "bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400"
                : "bg-background text-muted-foreground"
          }`}
        >
          <ScanLine className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <label
            htmlFor="scan-input"
            className="block text-sm font-medium text-foreground mb-1"
          >
            Scan Frame Barcode
          </label>
          <div className="relative">
            <Input
              id="scan-input"
              ref={scanInputRef}
              value={scanValue}
              onChange={(e) => setScanValue(e.target.value)}
              onKeyDown={handleScanKeyDown}
              placeholder="Focus here and scan with USB barcode scanner..."
              className="font-mono"
              autoComplete="off"
              data-testid="input-barcode-scan"
            />
            {scanValue && (
              <button
                onClick={() => {
                  setScanValue("");
                  scanInputRef.current?.focus();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                data-testid="button-clear-scan"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0 min-w-[90px]">
          {scanState === "found" ? (
            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" /> Frame found
            </p>
          ) : scanState === "not_found" ? (
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> Not found
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Ready to scan</p>
          )}
        </div>
      </div>

      {/* Frame found detail card */}
      {foundFrame && (
        <FrameFoundCard
          frame={foundFrame}
          onDismiss={dismissFoundCard}
          onEdit={openEditFromFound}
        />
      )}

      {/* Recently Added */}
      {recentlyAdded.length > 0 && (
        <div
          className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20"
          data-testid="section-recently-added"
        >
          <button
            className="w-full flex items-center justify-between px-4 py-3 text-left"
            onClick={() => setShowRecent(!showRecent)}
            data-testid="button-toggle-recently-added"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="font-semibold text-sm text-foreground">
                Recently Added
              </span>
              <Badge className="bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 border-0 text-xs px-2">
                {recentlyAdded.length}
              </Badge>
              <span className="text-xs text-muted-foreground">
                · within the last 5 days
              </span>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-muted-foreground transition-transform duration-200 shrink-0 ${showRecent ? "" : "-rotate-90"}`}
            />
          </button>
          {showRecent && (
            <div className="border-t border-emerald-200 dark:border-emerald-800">
              <Tabs
                value={recentTab || recentManufacturers[0] || ""}
                onValueChange={setRecentTab}
              >
                <div className="border-b border-emerald-100 dark:border-emerald-900">
                  <div className="overflow-x-auto px-4 pt-3 pb-1">
                    <TabsList className="bg-emerald-100/60 dark:bg-emerald-900/40 h-8 gap-0.5 w-max flex-nowrap">
                      {recentManufacturers.map((mfg) => (
                        <TabsTrigger
                          key={mfg}
                          value={mfg}
                          className="text-xs px-3 h-6 shrink-0 data-[state=active]:bg-white dark:data-[state=active]:bg-emerald-950 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-300"
                          data-testid={`tab-recent-${mfg}`}
                        >
                          {mfg}
                          <span className="ml-1.5 text-[10px] opacity-60">
                            (
                            {
                              recentlyAdded.filter(
                                (f) => f.manufacturer === mfg,
                              ).length
                            }
                            )
                          </span>
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>
                </div>
                {recentManufacturers.map((mfg) => (
                  <TabsContent key={mfg} value={mfg} className="mt-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs text-muted-foreground border-b border-emerald-100 dark:border-emerald-900">
                            <th className="text-left font-medium px-4 py-2">
                              Brand / Model
                            </th>
                            <th className="text-left font-medium px-4 py-2">
                              Color
                            </th>
                            <th className="text-right font-medium px-4 py-2">
                              Qty
                            </th>
                            <th className="text-right font-medium px-4 py-2">
                              Size
                            </th>
                            <th className="text-right font-medium px-4 py-2">
                              Code
                            </th>
                            <th className="text-right font-medium px-4 py-2">
                              Cost
                            </th>
                            <th className="text-right font-medium px-4 py-2">
                              Retail
                            </th>
                            <th className="text-right font-medium px-4 py-2">
                              Added
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-emerald-100 dark:divide-emerald-900/60">
                          {recentlyAdded
                            .filter((f) => f.manufacturer === mfg)
                            .map((frame) => (
                              <tr
                                key={frame.id}
                                className="hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer transition-colors"
                                onClick={() => {
                                  setEditFrame(frame);
                                  setDialogOpen(true);
                                }}
                                data-testid={`row-recently-added-${frame.id}`}
                              >
                                <td className="px-4 py-2.5">
                                  <p className="font-medium text-foreground">
                                    {frame.brand}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {frame.model}
                                  </p>
                                </td>
                                <td className="px-4 py-2.5 text-muted-foreground">
                                  {frame.color}
                                </td>
                                <td className="px-4 py-2.5 text-right font-medium text-foreground">
                                  {frame.quantity}
                                </td>
                                <td className="px-4 py-2.5 text-right text-muted-foreground whitespace-nowrap font-mono text-xs">
                                  {frame.eyeSize &&
                                  frame.bridge &&
                                  frame.templeLength
                                    ? `${frame.eyeSize}-${frame.bridge}-${frame.templeLength}`
                                    : "N/A"}
                                </td>
                                <td className="px-4 py-2.5 text-right text-muted-foreground whitespace-nowrap font-mono text-xs">
                                  {frame.code ?? "N/A"}
                                </td>
                                <td className="px-4 py-2.5 text-right text-muted-foreground whitespace-nowrap">
                                  {frame.cost
                                    ? `$${parseFloat(frame.cost).toFixed(0)}`
                                    : "—"}
                                </td>
                                <td className="px-4 py-2.5 text-right font-medium text-foreground whitespace-nowrap">
                                  {frame.retailPrice
                                    ? `$${parseFloat(frame.retailPrice).toFixed(0)}`
                                    : "—"}
                                </td>
                                <td className="px-4 py-2.5 text-right text-muted-foreground whitespace-nowrap">
                                  {formatRelativeDate(frame.createdAt)}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          )}
        </div>
      )}

      {/* Search + filter */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by brand, model, barcode..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-search"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                data-testid="button-clear-search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {(["all", "on_board", "off_board", "at_lab", "sold"] as const).map(
              (s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  data-testid={`button-filter-${s}`}
                  className={`text-sm px-3 py-1.5 rounded-md font-medium transition-colors ${
                    statusFilter === s
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {s === "all"
                    ? "All"
                    : s === "on_board"
                      ? "On Board"
                      : s === "off_board"
                        ? "Off Board"
                        : s === "at_lab"
                          ? "At Lab"
                          : "Sold"}
                </button>
              ),
            )}
          </div>
        </div>

        {/* Brand + Manufacturer dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
          <Select
            value={manufacturerFilter}
            onValueChange={handleManufacturerFilterChange}
          >
            <SelectTrigger
              className="w-48 h-9 text-sm"
              data-testid="select-filter-manufacturer"
            >
              <SelectValue placeholder="All Manufacturers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Manufacturers</SelectItem>
              {uniqueManufacturers.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={brandFilter} onValueChange={setBrandFilter}>
            <SelectTrigger
              className="w-44 h-9 text-sm"
              data-testid="select-filter-brand"
            >
              <SelectValue placeholder="All Brands" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Brands</SelectItem>
              {filteredBrandOptions.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-muted-foreground hover:text-foreground"
              data-testid="button-clear-filters"
            >
              <X className="w-3.5 h-3.5 mr-1.5" />
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <Card className="border-card-border">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="font-medium text-foreground">No frames found</p>
              <p className="text-sm mt-1">
                {hasActiveFilters
                  ? "Try adjusting your search or filters"
                  : "Add your first frame to get started"}
              </p>
              {!hasActiveFilters && (
                <Button
                  className="mt-4"
                  onClick={openAdd}
                  data-testid="button-add-first-frame"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Frame
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-card-border">
                    <TableHead className="pl-6">Brand / Model</TableHead>
                    <TableHead>Manufacturer</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead className="text-center">Size</TableHead>
                    <TableHead>
                      <span className="flex items-center gap-1">
                        <Barcode className="w-3.5 h-3.5" /> Barcode
                      </span>
                    </TableHead>
                    <TableHead className="text-right">Wholesale</TableHead>
                    <TableHead className="text-right">Retail</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                    <TableHead className="text-center">Qty / Sold</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="pr-6 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((frame) => {
                    const isHighlighted = frame.id === highlightedId;
                    return (
                      <TableRow
                        key={frame.id}
                        ref={isHighlighted ? highlightedRowRef : null}
                        data-testid={`row-frame-${frame.id}`}
                        className={`border-b border-card-border/60 last:border-0 transition-colors duration-500 ${
                          isHighlighted
                            ? "bg-primary/10 dark:bg-primary/15"
                            : ""
                        }`}
                      >
                        <TableCell className="pl-6 py-3.5">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-semibold text-foreground text-sm">
                                {frame.brand}
                              </p>
                              {activeHoldFrameIds.has(frame.id) && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 flex-shrink-0">
                                  <Clock className="w-2.5 h-2.5" />
                                  On Hold
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {frame.model}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground py-3.5">
                          {frame.manufacturer}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground py-3.5">
                          {frame.color}
                        </TableCell>
                        <TableCell className="text-sm py-3.5">
                          {frame.code ? (
                            <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded text-foreground">
                              {frame.code}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/40 text-xs italic">
                              —
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center py-3.5">
                          <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded text-muted-foreground">
                            {frame.eyeSize}/{frame.bridge}/{frame.templeLength}
                          </span>
                        </TableCell>
                        <TableCell className="py-3.5">
                          {frame.barcode ? (
                            <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded text-muted-foreground tracking-wider">
                              {frame.barcode}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground/40 italic">
                              —
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-sm py-3.5">
                          <span className="text-muted-foreground">
                            ${parseFloat(frame.cost as string).toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-sm font-semibold py-3.5">
                          ${parseFloat(frame.retailPrice as string).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right text-sm py-3.5">
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                            $
                            {(
                              parseFloat(frame.retailPrice as string) -
                              parseFloat(frame.cost as string)
                            ).toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center py-3.5">
                          <div className="flex flex-col items-center gap-0.5">
                            <span
                              className="text-sm font-semibold text-foreground"
                              data-testid={`text-qty-${frame.id}`}
                            >
                              {frame.quantity ?? 1}
                            </span>
                            <span
                              className="text-xs text-muted-foreground"
                              data-testid={`text-sold-${frame.id}`}
                            >
                              {frame.soldCount ?? 0} sold
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3.5">
                          <div className="space-y-1">
                            <StatusPill status={frame.status} />
                            {frame.status === "at_lab" && frame.labName && (
                              <p className="text-xs text-muted-foreground truncate max-w-[120px]">
                                {frame.labName}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="pr-6 text-right py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => openEdit(frame)}
                              data-testid={`button-edit-frame-${frame.id}`}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setDeleteId(frame.id)}
                              data-testid={`button-delete-frame-${frame.id}`}
                              className="text-destructive"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <FrameFormDialog
        open={dialogOpen}
        onClose={closeDialog}
        editFrame={editFrame}
        prefillBarcode={prefillBarcode}
      />

      <InvoiceImportDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
      />

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(v) => !v && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Frame</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this frame from your inventory. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
