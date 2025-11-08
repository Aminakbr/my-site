// lib/industrial.ts
// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for industrial UPS sizing (data center/industrial)
// ─────────────────────────────────────────────────────────────────────────────

/* =========================
 *        TYPES
 * ========================= */
export type Chem = "leadacid" | "agm" | "lifepo4";
export type Phase = "3P-3P" | "3P-1P";
export type Topology = "Transformerless" | "Transformer-based";
export type Device = { name: string; watts: number };

export type AllowedSeries = 16 | 20 | 32 | 40;
export type SuggestedVA =
  | 1000 | 2000 | 3000
  | 6000 | 10000 | 20000 | 30000 | 40000 | 60000 | 80000 | 100000;

export interface Result {
  totalWatts: number;
  headroom: number;
  sizedWatts: number;
  pf: number;
  eta: number;
  upsVA: number;
  suggestedUPS: SuggestedVA;
  vdc: number;
  batteryCount: number; // series per string
  H: number;
  k: number;
  targetHours: number;
  dischargeCurrentA: number;
  requiredAhPerString: number;
}

/* =========================
 *     CONSTANTS / DATA
 * ========================= */

// Example defaults for the device library (you can extend this)
export const defaultLibrary: Device[] = [
  { name: "Server (1U)", watts: 250 },
  { name: "Storage Array", watts: 600 },
  { name: "Network Switch (48p)", watts: 150 },
  { name: "Core Router", watts: 400 },
  { name: "PLC Rack", watts: 120 },
  { name: "HMI Panel", watts: 80 },
  { name: "Industrial PC", watts: 300 },
  { name: "Air Compressor Starter", watts: 1200 },
  { name: "Boiler Controller", watts: 60 },
  { name: "Lighting Circuit (LED)", watts: 300 },
];

// Standard VA ladder for industrial/data-center pages
export const STANDARD_UPS_SIZES: readonly SuggestedVA[] = [
  1000, 2000, 3000, 6000, 10000, 20000, 30000, 40000, 60000, 80000, 100000,
] as const;

// Permitted series counts for industrial frames
export const ALLOWED_SERIES: readonly AllowedSeries[] = [16, 20, 32, 40] as const;

export const HEADROOM = {
  none: 1.0,
  electronics: 1.25,
  motor2_0: 2.0,
  motor2_5: 2.5,
  motor3_0: 3.0,
} as const;

export const DEFAULTS = {
  pf: 0.90,
  eta: 0.92,
  backupMin: 30,
  chem: "leadacid" as Chem,
  headroom: HEADROOM.electronics,
  phase: "3P-3P" as Phase,
  topology: "Transformerless" as Topology,
  series: 40 as AllowedSeries,
} as const;

export const MAX_STRINGS = 6;
export const STANDARD_BATTERY_SIZES = [7, 9, 18, 22, 26, 33, 42, 65, 75, 100, 120, 150, 200];

export const COLORS = [
  "#34d399", "#60a5fa", "#fbbf24", "#f87171",
  "#a78bfa", "#fb923c", "#10b981", "#6366f1",
];

/* =========================
 *     UTILITIES
 * ========================= */
export function safeW(n: unknown): number {
  const v = Number(n);
  return Number.isFinite(v) && v >= 0 ? v : 0;
}

export function format(n: number, d = 2): string {
  if (!Number.isFinite(n)) return "0";
  return Number(Math.round(n * 10 ** d) / 10 ** d).toFixed(d);
}

export function peukertParams(chem: Chem): { k: number; H: number } {
  if (chem === "lifepo4") return { k: 1.05, H: 1 };
  if (chem === "agm") return { k: 1.15, H: 20 };
  return { k: 1.20, H: 20 };
}

export function suggestUPS(va: number): SuggestedVA {
  for (const s of STANDARD_UPS_SIZES) {
    if (s >= va) return s;
  }
  return STANDARD_UPS_SIZES[STANDARD_UPS_SIZES.length - 1];
}

// Map suggested VA to typical industrial DC bus (allow override via userSeries)
export function mapVaToVdcAndSeries(
  suggested: SuggestedVA,
  userSeries?: number
): { vdc: number; series: AllowedSeries } {
  if (userSeries && ALLOWED_SERIES.includes(userSeries as AllowedSeries)) {
    return { vdc: userSeries * 12, series: userSeries as AllowedSeries };
  }
  // Typical mapping by frame
  if (suggested <= 3000)  return { vdc: 192, series: 16 }; // small frames
  if (suggested <= 6000)  return { vdc: 240, series: 20 };
  if (suggested <= 10000) return { vdc: 384, series: 32 };
  return { vdc: 480, series: 40 };
}

/* =========================
 *     CORE CALCULATIONS
 * ========================= */
export function calculateIndustrial(
  devices: Device[],
  chem: Chem,
  backupMin: number,
  pfIn: number,
  etaIn: number,
  headroom: number,
  userSeries?: number
): Result {
  const P = devices.reduce((s, d) => s + safeW(d.watts), 0);
  const m = headroom || 1;
  const Pp = P * m;

  const PF  = Math.max(0.6, Math.min(1, pfIn || DEFAULTS.pf));
  const eff = Math.max(0.75, Math.min(0.98, etaIn || DEFAULTS.eta));

  const UPS_VA = Pp / PF;
  const suggested = suggestUPS(UPS_VA as number);
  const { vdc, series } = mapVaToVdcAndSeries(suggested, userSeries);

  const targetHours = (backupMin || 0) / 60;
  const { k, H } = peukertParams(chem);

  const I = Pp / (vdc * eff);
  const Creq = (I * H) * Math.pow(targetHours / H, 1 / k);

  return {
    totalWatts: P,
    headroom: m,
    sizedWatts: Pp,
    pf: PF,
    eta: eff,
    upsVA: UPS_VA,
    suggestedUPS: suggested,
    vdc,
    batteryCount: series,
    H,
    k,
    targetHours,
    dischargeCurrentA: I,
    requiredAhPerString: Creq,
  };
}

export function runtimeFromSelection(
  result: Result,
  selectedAh: number,
  strings: number
) {
  const { k, H, dischargeCurrentA: I, targetHours } = result;
  const np = Math.max(1, Math.min(MAX_STRINGS, Math.floor(strings)));
  const Ceff = selectedAh * np;
  const t_h  = H * Math.pow(Ceff / (I * H), k);
  const t_min = t_h * 60;
  return { np, Ceff, t_min, meets: t_min >= targetHours * 60 };
}

/* =========================
 *     CSV HELPERS
 * ========================= */
export function buildCsv(rows: string[][], filename: string) {
  const csv = rows
    .map(r => r.map(c => `"${(c ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
