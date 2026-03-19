export const VISION_PLAN_OPTIONS = [
  "VSP",
  "Blue Cross Blue Shield",
  "EyeMed",
  "Aetna",
  "Tricare",
  "VA",
  "Spectera",
  "Private Pay",
  "Meritain",
] as const;

export type VisionPlan = typeof VISION_PLAN_OPTIONS[number];
