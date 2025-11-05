/* Types, constants, helpers shared across calculator */

export type Chem = "leadacid" | "agm" | "lifepo4";

export interface Device {
  name: string;
  watts: number;
}

export interface Result {
  totalWatts: number;          // Σ device watts (P)
  sizedWatts: number;          // P' = P * headroom
  headroom: number;            // m
  pf: number;                  // PF
  eta: number;                 // η
  upsVA: number;               // VA = P' / PF
  suggestedUPS: number;        // next standard VA
  vdc: number;                 // DC bus
  batteryCount: number;        // series per string = vdc/12
  requiredAhPerString: number; // C_req (Ah)
  k: number;                   // Peukert exponent
  H: number;                   // rated-hour reference
  targetHours: number;         // t (h)
  dischargeCurrentA: number;   // I (A)
}

/* Sizing lists */
export const STANDARD_UPS_SIZES = [600, 1000, 1500, 2000, 3000, 5000, 10000];
export const STANDARD_BATTERY_SIZES = [7, 9, 18, 22, 42, 65, 100, 150];
export const MAX_STRINGS = 3;

/* UI colors for charts */
export const COLORS = [
  "#34d399", "#60a5fa", "#fbbf24", "#f87171",
  "#a78bfa", "#fb923c", "#22c55e", "#f472b6",
];

/* Headroom presets */
export const HEADROOM = {
  none: 1.0,
  electronics: 1.25,
  motor2_0: 2.0,
  motor2_5: 2.5,
  motor3_0: 3.0,
} as const;

/* Helpers */
export const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

export const safeW = (w: number) => (Number.isFinite(w) ? w : 0);

export const format = (n: number, d = 2) =>
  Number.isFinite(n) ? Number(n.toFixed(d)) : 0;
