import { z } from "zod";

// This file acts as the local replacement for the `@shared/schema` package.
// Several UI pages import zod schemas + types from `@shared/schema`, so Vercel
// needs a resolvable module at build time.

export const insertFrameSchema = z.object({
  status: z.enum(["on_board", "off_board", "at_lab", "sold"]),
  manufacturer: z.string().min(1, "Manufacturer is required"),
  brand: z.string().min(1, "Brand is required"),
  model: z.string().min(1, "Model is required"),
  color: z.string().min(1, "Color is required"),
  // Optional internal code (SKU/barcode label) used by the inventory UI.
  code: z.string().optional().nullable(),
});

export type FrameStatus = z.infer<typeof insertFrameSchema>["status"];

// The UI mostly treats these as “shape-compatible” records coming from API responses.
// Keeping them broad avoids over-coupling the UI build to backend schema details.
export type Frame = Record<string, unknown>;
export type Manufacturer = Record<string, unknown>;
export type Brand = Record<string, unknown>;
export type Lab = Record<string, unknown>;
export type Clinic = Record<string, unknown>;
export type LabOrder = Record<string, unknown>;
export type FrameHold = Record<string, unknown>;
export type WeeklyMetric = Record<string, unknown>;

