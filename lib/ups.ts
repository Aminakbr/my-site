// Shared constants, types, helpers

export type Chem = "leadacid" | "agm" | "lifepo4";

export interface Device { name: string; watts: number; }

export interface Result {
  totalWatts: number;
  pf: number;
  eta: number;
  upsVA: number;
  suggestedUPS: number;
  vdc: number;
  batteryCount: number;
  requiredAhPerString: number;
  k: number;
  targetHours: number;
  dischargeCurrentA: number;
}

export const STANDARD_UPS_SIZES = [600, 1000, 1500, 2000, 3000, 5000, 10000];
export const STANDARD_BATTERY_SIZES = [7, 9, 18, 22, 42, 65, 100, 150];
export const MAX_STRINGS = 3;

export const PEUKERT: Record<Chem, { k: number; H: number }> = {
  leadacid: { k: 1.2, H: 20 },
  agm: { k: 1.15, H: 20 },
  lifepo4: { k: 1.05, H: 1 },
};

export function pickDCBusFromUps(upsVA: number) {
  if (upsVA <= 1000) return { vdc: 12, batteryCount: 1 } as const;
  if (upsVA <= 2000) return { vdc: 24, batteryCount: 2 } as const;
  if (upsVA <= 5000) return { vdc: 48, batteryCount: 4 } as const;
  return { vdc: 96, batteryCount: 8 } as const;
}

export const COLORS = ["#34d399", "#60a5fa", "#fbbf24", "#f87171", "#a78bfa", "#fb923c"];

export const format = (n: number, d = 2) => (Number.isFinite(n) ? Number(n.toFixed(d)) : 0);
export const safeW = (w: number) => (Number.isFinite(w) && w > 0 ? w : 0);
