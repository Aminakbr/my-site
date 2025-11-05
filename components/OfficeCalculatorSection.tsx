"use client";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Calculator, Battery, Zap, PlusCircle, Info, Sigma, CheckCircle2, AlertTriangle } from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer,
} from "recharts";

/* ---------- Types / constants (local, self-contained) ---------- */
export type Device = { name: string; watts: number };
export type Chem = "leadacid" | "agm" | "lifepo4";
export type Result = {
  totalWatts: number;
  sizedWatts: number; headroom: number;
  pf: number; eta: number;
  upsVA: number; suggestedUPS: (600|1000|1500|2000|3000|5000|6000|10000);
  vdc: number; batteryCount: number;
  H: number; k: number; targetHours: number;
  dischargeCurrentA: number; requiredAhPerString: number;
};

const STANDARD_UPS_SIZES = [600, 1000, 1500, 2000, 3000, 5000, 6000, 10000] as const;
const STANDARD_BATTERY_SIZES = [7, 9, 18, 22, 42, 65, 100, 150];
const MAX_STRINGS = 3;
const COLORS = ["#34d399", "#60a5fa", "#fbbf24", "#f87171", "#a78bfa", "#fb923c"];
const inputBase = "h-10 px-3 rounded bg-gray-100 text-gray-900 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600/30";
const btnBase = "h-10 px-4 rounded font-medium transition-all duration-150 active:translate-y-px";

export const HEADROOM = {
  none: 1.0,
  electronics: 1.25,
  motor2_0: 2.0,
  motor2_5: 2.5,
  motor3_0: 3.0,
} as const;

/** Expanded office load library (typical active power, not peak) */
const LIBRARY: Device[] = [
  { name: "Workstation PC (tower)", watts: 350 },
  { name: "Workstation PC (SFF/Mini)", watts: 200 },
  { name: "Laptop (charging/working)", watts: 65 },
  { name: 'Monitor 24"', watts: 25 },
  { name: 'Monitor 27"', watts: 45 },
  { name: "Thin Client", watts: 15 },
  { name: "PoE Switch (8-port, light PoE)", watts: 35 },
  { name: "PoE Switch (24-port, mid PoE)", watts: 120 },
  { name: "PoE Switch (48-port, heavy PoE)", watts: 300 },
  { name: "Non-PoE Switch (8–24 port)", watts: 20 },
  { name: "Router (branch)", watts: 20 },
  { name: "Firewall/UTM (SMB)", watts: 45 },
  { name: "Access Point (Wi-Fi 6)", watts: 12 },
  { name: "IP Phone", watts: 5 },
  { name: "NAS (2-bay)", watts: 35 },
  { name: "NAS (4-bay)", watts: 55 },
  { name: "Entry Server (1U)", watts: 250 },
  { name: "Mid Server (2U)", watts: 450 },
  { name: "NVR (8–16 cams)", watts: 40 },
  { name: "CCTV Camera (per cam via PoE)", watts: 8 },
  { name: "Payment Terminal", watts: 10 },
  { name: "Label Printer (avg)", watts: 15 },
  { name: "Laser Printer (idle avg)", watts: 30 },
  { name: "Inkjet/OfficeJet (idle avg)", watts: 15 },
  { name: "Conference Speaker/Mic", watts: 12 },
  { name: 'LED TV 43"', watts: 60 },
  { name: "Projector (eco)", watts: 180 },
  { name: "Mini PC (NUC)", watts: 65 },
  { name: "External HDD/SSD Dock", watts: 10 },
];

/** Chemistry params */
const PEUKERT: Record<Chem, { k: number; H: number }> = {
  leadacid: { k: 1.20, H: 20 },
  agm:      { k: 1.15, H: 20 },
  lifepo4:  { k: 1.05, H: 1 },
};

const COLORS_SAFE = COLORS;
const safeW = (n: number) => (Number.isFinite(n) && n >= 0 ? n : 0);
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
export const format = (n: number, d: number = 2) => (Number.isFinite(n) ? Number(n.toFixed(d)) : 0);

/* ---------- Battery series mapping & options (12 V blocks) ---------- */
/**
 * Options per VA class (your rule):
 * - 1 kVA  → [2, 3]
 * - 2 kVA  → [4, 6]
 * - 3 kVA  → [6, 8]
 * - 6 kVA  → [16]
 * - 10 kVA → [16]
 * - Above 6 kVA → [16]
 */
function seriesOptionsForClass(vaClass: number): number[] {
  if (vaClass <= 1000) return [2, 3];
  if (vaClass <= 2000) return [4, 6];
  if (vaClass <= 3000) return [6, 8];
  if (vaClass <= 6000) return [16];
  return [16]; // 10 kVA and up
}

function defaultSeriesForClass(vaClass: number): number {
  const opts = seriesOptionsForClass(vaClass);
  // Default to the larger option you requested earlier
  return opts[opts.length - 1];
}

/* ---------- Core computation (with optional series override) ---------- */
function computeOnline(params: {
  devices: Device[]; pf: number; eta: number; headroom: number; chem: Chem; backupMin: number; seriesOverride?: number | null;
}) {
  const P = params.devices.reduce((s, d) => s + safeW(d.watts), 0);
  const m = params.headroom || 1;
  const Pp = P * m;

  const pf = clamp(params.pf, 0.8, 1.0);     // online pf ≈ 0.9–1.0 typical
  const eta = clamp(params.eta, 0.80, 0.96); // online η lower than line-interactive
  const upsVA = Pp / pf;

  const suggestedUPS =
    STANDARD_UPS_SIZES.find((s) => s >= upsVA) ?? STANDARD_UPS_SIZES[STANDARD_UPS_SIZES.length - 1];

  // Series selection (override if provided)
  const series = params.seriesOverride ?? defaultSeriesForClass(suggestedUPS);
  const vdc = series * 12; // 12 V blocks

  const { k, H } = PEUKERT[params.chem];
  const tHours = params.backupMin / 60;
  const I = Pp / (vdc * eta);

  // Peukert capacity per string
  const Creq = (I * H) * Math.pow(tHours / H, 1 / k);

  const result: Result = {
    totalWatts: P,
    sizedWatts: Pp,
    headroom: m,
    pf, eta,
    upsVA, suggestedUPS: suggestedUPS as Result["suggestedUPS"],
    vdc, batteryCount: series,
    H, k, targetHours: tHours,
    dischargeCurrentA: I, requiredAhPerString: Creq,
  };
  return result;
}

/* ---------- Component ---------- */
const OfficeCalculatorSectionComponent = function OfficeCalculatorSection({
  onResult,
}: {
  onResult: (r: ReturnType<typeof computeOnline>) => void;
}) {
  /* UI state */
  const [devices, setDevices] = useState<Device[]>([{ name: "", watts: 0 }]);
  const [batteryType, setBatteryType] = useState<Chem>("leadacid");
  const [backupTimeMin, setBackupTimeMin] = useState<number>(30);
  const [pf, setPf] = useState<number>(0.9);
  const [eta, setEta] = useState<number>(0.92); // typical online η
  const [headroom, setHeadroom] = useState<number>(HEADROOM.electronics);

  const [result, setResult] = useState<Result | null>(null);
  const [selectedBatteryAh, setSelectedBatteryAh] = useState<number | null>(null);
  const [stringCount, setStringCount] = useState<number>(1);
  const [actualBackupMin, setActualBackupMin] = useState<number | null>(null);
  const [meetsTarget, setMeetsTarget] = useState<boolean | null>(null);

  const [search, setSearch] = useState<string>("");
  const [searchIndex, setSearchIndex] = useState<number | null>(null);
  const [showMath, setShowMath] = useState(false);

  // NEW: user-selectable series override (12 V blocks per string)
  const [seriesOverride, setSeriesOverride] = useState<number | null>(null);

  const addDevice = () => setDevices((d) => [...d, { name: "", watts: 0 }]);
  const removeDevice = (i: number) =>
    setDevices((prev) => {
      const copy = [...prev];
      copy.splice(i, 1);
      return copy.length ? copy : [{ name: "", watts: 0 }];
    });
  const onSelectLibraryItem = (i: number, d: Device) => {
    setDevices((prev) => { const c = [...prev]; c[i] = { name: d.name, watts: d.watts }; return c; });
    setSearch(""); setSearchIndex(null);
  };

  /* compute & runtime */
  const calculate = () => {
    const r = computeOnline({
      devices,
      pf, eta, headroom,
      chem: batteryType,
      backupMin: backupTimeMin,
      seriesOverride, // may be null; computeOnline handles it
    });
    setResult(r);
    // keep user's selected Ah/strings but recompute runtime after result is updated
    if (selectedBatteryAh) {
      // Recompute runtime with new Vdc/req
      const recalc = () => recalcRuntime(selectedBatteryAh);
      // microtask to ensure state set before recalc
      Promise.resolve().then(recalc);
    } else {
      setStringCount(1); setActualBackupMin(null); setMeetsTarget(null);
    }
    onResult(r);
  };

  const recalcRuntime = (selectedAh: number) => {
    if (!result) return;
    const { sizedWatts, vdc, eta: eff, k, H, requiredAhPerString } = result;

    const neededStrings = Math.ceil(requiredAhPerString / selectedAh);
    const cappedStrings = Math.min(MAX_STRINGS, Math.max(1, neededStrings));
    const effectiveAh = selectedAh * cappedStrings;

    const I = sizedWatts / (vdc * eff);
    const t_hours = H * Math.pow(effectiveAh / (I * H), k);
    const t_min = t_hours * 60;
    const meets = effectiveAh >= requiredAhPerString && neededStrings <= MAX_STRINGS;

    setStringCount(cappedStrings); setActualBackupMin(t_min); setMeetsTarget(meets);
  };

  /* charts / math view */
  const chartData = devices.filter(d => d.name && safeW(d.watts)).map(d => ({ name: d.name, value: d.watts }));
  const totals = useMemo(() => ({ P: devices.reduce((s, d) => s + safeW(d.watts), 0) }), [devices]);

  const math = useMemo(() => {
    if (!result) return null;
    const P = totals.P, m = result.headroom, Pp = result.sizedWatts, PF = result.pf;
    const UPS_VA = result.upsVA, UPS_pick = result.suggestedUPS;
    const Vdc = result.vdc, ns = result.batteryCount, eff = result.eta, I = result.dischargeCurrentA;
    const H = result.H, k = result.k, t = result.targetHours, Creq = result.requiredAhPerString;
    const Csel = selectedBatteryAh ?? 0, np = stringCount, Ceff = Csel * np;
    const tPrimeMin = actualBackupMin ?? 0, tPrime = tPrimeMin / 60, totalBatteries = ns * np;
    const cRate = Csel > 0 ? I / Csel : 0;
    return { P, m, Pp, PF, UPS_VA, UPS_pick, Vdc, ns, eff, I, H, k, t, Creq, Csel, np, Ceff, tPrime, tPrimeMin, totalBatteries, cRate };
  }, [result, selectedBatteryAh, stringCount, actualBackupMin, totals.P]);

  const cRatePerString = selectedBatteryAh && result ? result.dischargeCurrentA / selectedBatteryAh : 0;

  // When result changes, refresh series options
  const seriesOptions = result ? seriesOptionsForClass(result.suggestedUPS) : [];

  return (
    <motion.section initial={false} animate={{ opacity: 1, y: 0 }} className="bg-white border border-gray-200 p-6 rounded-2xl shadow w-full max-w-3xl space-y-6">
      {/* Title + Add */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Calculator className="text-blue-600 w-6 h-6" /> Online UPS &amp; Battery Calculator (1Φ / 1Φ)
        </h2>
        <button onClick={addDevice} className={`${btnBase} no-print inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow hover:shadow-md`} aria-label="Add device" title="Add a new device row">
          <PlusCircle className="w-5 h-5" /> Add Device
        </button>
      </div>

      {/* Device rows */}
      {devices.map((device, i) => {
        const suggestions = LIBRARY.filter(d => d.name.toLowerCase().includes((search ?? "").toLowerCase())).slice(0, 12);
        return (
          <div key={i} className="relative">
            <div className="grid grid-cols-12 gap-3 items-center">
              <div className="col-span-12 md:col-span-8">
                <label htmlFor={`device-name-${i}`} className="sr-only">Device name</label>
                <input id={`device-name-${i}`} type="text" className={`${inputBase} w-full`} placeholder="🔍 Search or type device name..." value={device.name}
                  onChange={(e) => { const val = e.target.value; setDevices(prev => { const copy = [...prev]; copy[i] = { ...copy[i], name: val }; return copy; }); setSearchIndex(i); setSearch(val); }}
                  onFocus={() => setSearchIndex(i)} aria-label="Device name" />
              </div>
              <div className="col-span-6 md:col-span-2">
                <label htmlFor={`device-watts-${i}`} className="sr-only">Watts</label>
                <input id={`device-watts-${i}`} type="number" className={`${inputBase} w-full`} placeholder="Watts" value={device.watts || ""}
                  onChange={(e) => { const watts = Number(e.target.value); setDevices(prev => { const copy = [...prev]; copy[i] = { ...copy[i], watts }; return copy; }); }}
                  aria-label="Device watts" min={0} />
              </div>
              <div className="col-span-6 md:col-span-2">
                <button className={`${btnBase} w-full bg-red-600 hover:bg-red-700 text-white no-print`} onClick={() => removeDevice(i)} aria-label="Remove device">
                  Remove
                </button>
              </div>
            </div>

            {search && searchIndex === i && (
              <div className="absolute z-10 left-0 right-0 mt-1 rounded max-height-48 overflow-y-auto border border-gray-300 bg-white no-print">
                {suggestions.length === 0 && <div className="p-2 text-sm text-gray-500">No matches</div>}
                {suggestions.map(d => (
                  <div key={d.name} onMouseDown={() => onSelectLibraryItem(i, d)} className="p-2 hover:bg-gray-100 cursor-pointer" role="button" aria-label={`Select ${d.name}`}>
                    {d.name} — {d.watts} W
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
        <div>
          <label className="block text-gray-600 text-sm mb-1" htmlFor="battery-type">Battery Type</label>
          <select id="battery-type" className={`${inputBase} w-full`} value={batteryType} onChange={(e) => setBatteryType(e.target.value as Chem)}>
            <option value="leadacid">Lead-Acid (k=1.20, H=20h)</option>
            <option value="agm">AGM / Gel (k=1.15, H=20h)</option>
            <option value="lifepo4">LiFePO₄ (k=1.05, H=1h)</option>
          </select>
        </div>
        <div>
          <label className="block text-gray-600 text-sm mb-1" htmlFor="target-min">Target Backup (minutes)</label>
          <input id="target-min" type="number" value={backupTimeMin} onChange={(e) => setBackupTimeMin(Number(e.target.value))} className={`${inputBase} w-full`} min={0} />
        </div>
        <div>
          <label className="block text-gray-600 text-sm mb-1" htmlFor="pf">Power Factor</label>
          <input id="pf" type="number" step={0.01} min={0.8} max={1} value={pf} onChange={(e) => setPf(Number(e.target.value))} className={`${inputBase} w-full`} />
        </div>
        <div>
          <label className="block text-gray-600 text-sm mb-1" htmlFor="eta">Inverter η</label>
          <input id="eta" type="number" step={0.01} min={0.8} max={0.96} value={eta} onChange={(e) => setEta(Number(e.target.value))} className={`${inputBase} w-full`} />
        </div>
        <div>
          <label className="block text-gray-600 text-sm mb-1" htmlFor="headroom">Headroom</label>
          <select id="headroom" className={`${inputBase} w-full`} value={headroom} onChange={(e) => setHeadroom(Number(e.target.value))}>
            <option value={HEADROOM.none}>None (×1.00)</option>
            <option value={HEADROOM.electronics}>Electronics (×1.25)</option>
            <option value={HEADROOM.motor2_0}>Motor (×2.0)</option>
            <option value={HEADROOM.motor2_5}>Motor (×2.5)</option>
            <option value={HEADROOM.motor3_0}>Motor (×3.0)</option>
          </select>
        </div>
        <div className="text-xs text-gray-500">
          <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-900 p-2 flex items-start gap-2">
            <Info className="w-4 h-4 mt-0.5" />
            <p><strong>Headroom:</strong> ×1.25 for electronics, ×2.0–3.0 for motors/inrush.</p>
          </div>
        </div>
      </div>

      <button onClick={calculate} className="no-print mt-2 w-full bg-blue-600 hover:bg-blue-700 transition py-3 rounded-lg font-semibold text-lg text-white" aria-label="Calculate">
        Calculate
      </button>

      {/* Results */}
      {result && (
        <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg space-y-4 print-card">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Battery className="text-blue-600 w-5 h-5" /> Engineering Results (Online UPS)
          </h3>

          {/* NEW: Battery series selector (only shows when there are multiple options for this VA class) */}
          <div className="rounded-md border border-blue-100 bg-blue-50 text-blue-900 p-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium">UPS class:</span>
              <span>{result.suggestedUPS} VA</span>
              <span className="ml-3 font-medium">Battery series options:</span>
              <div className="flex items-center gap-2">
                {seriesOptions.map((n) => (
                  <label key={n} className="inline-flex items-center gap-1 text-sm">
                    <input
                      type="radio"
                      name="seriesChoice"
                      value={n}
                      checked={(seriesOverride ?? result.batteryCount) === n}
                      onChange={() => {
                        setSeriesOverride(n);
                        // Recompute with override, and keep runtime if Ah already chosen
                        const r = computeOnline({
                          devices, pf, eta, headroom,
                          chem: batteryType, backupMin: backupTimeMin,
                          seriesOverride: n,
                        });
                        setResult(r);
                        onResult(r);
                        if (selectedBatteryAh) {
                          Promise.resolve().then(() => recalcRuntime(selectedBatteryAh));
                        } else {
                          setStringCount(1); setActualBackupMin(null); setMeetsTarget(null);
                        }
                      }}
                      className="h-4 w-4"
                    />
                    <span>{n} batteries (Vdc = {n * 12} V)</span>
                  </label>
                ))}
                {seriesOptions.length === 0 && (
                  <span className="text-sm">Fixed: {result.batteryCount} batteries (Vdc = {result.vdc} V)</span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <p>Total Load P = {format(result.totalWatts)} W</p>
            <p>Headroom m = {format(result.headroom, 2)} ⇒ P′ = {format(result.sizedWatts)} W</p>
            <p>PF = {format(result.pf, 2)} | η = {format(result.eta, 2)}</p>
            <p>UPS VA = {format(result.upsVA)} VA → Suggested: <b>{result.suggestedUPS} VA</b></p>
            <p>DC Bus = {result.vdc} V → series nₛ = <b>{result.batteryCount}</b> (12 V batteries)</p>
            <p>Discharge Current I = {format(result.dischargeCurrentA)} A</p>
            <p>Required C<sub>req</sub> per string = <b>{format(result.requiredAhPerString)} Ah</b></p>
            <p>Target t = {format(result.targetHours)} h, k = {format(result.k, 2)}, H = {result.H} h</p>
          </div>

          {/* Battery selector */}
          <label className="block text-gray-600 text-sm" htmlFor="battery-ah">Select Battery Size (Ah)</label>
          <select
            id="battery-ah"
            className={`${inputBase} w-full`}
            value={selectedBatteryAh ?? ""}
            onChange={(e) => { const ah = Number(e.target.value); setSelectedBatteryAh(ah); recalcRuntime(ah); setShowMath(true); }}
          >
            <option value="">-- Select Battery Size --</option>
            {STANDARD_BATTERY_SIZES.map(ah => <option key={ah} value={ah}>{ah} Ah</option>)}
          </select>

          {selectedBatteryAh && (
            <div className="bg-white p-3 rounded border border-gray-200 space-y-1">
              <p>Selected C<sub>sel</sub> = {selectedBatteryAh} Ah × series nₛ = {result.batteryCount} (12 V each)</p>
              <p>Parallel strings nₚ = {stringCount} / Max {MAX_STRINGS}</p>
              {actualBackupMin !== null && <p>Runtime t′ = <b>{format(actualBackupMin)} min</b> ({format((actualBackupMin as number) / 60)} h)</p>}
              <p className={batteryType !== "lifepo4" && cRatePerString > 0.3 ? "text-yellow-700 font-medium" : "text-gray-700"}>
                C-rate per string = {format(cRatePerString, 2)}C{batteryType !== "lifepo4" && cRatePerString > 0.3 && " — high for lead-acid; consider higher Ah or more strings."}
              </p>
              <p className="text-gray-700">Wiring: <strong>{result.batteryCount} in series</strong> × <strong>{stringCount} parallel</strong> → total batteries = <strong>{result.batteryCount * stringCount}</strong></p>
            </div>
          )}

          {/* Show the math (fully explicit) */}
          {result && (
            <details open={showMath} onToggle={(e) => setShowMath((e.target as HTMLDetailsElement).open)} className="rounded-lg border border-gray-300 bg-white">
              <summary className="cursor-pointer select-none px-4 py-3 font-semibold flex items-center gap-2">
                <Sigma className="w-5 h-5 text-blue-700" />
                Show the math (full spec + your numbers)
              </summary>
              <div className="px-4 pb-4 text-sm text-gray-800 space-y-4">
                <div>
                  <h4 className="font-semibold">Symbols</h4>
                  <ul className="list-disc ml-5 space-y-1">
                    <li><b>P</b> — total real power (W): <b>{format(math!.P)}</b></li>
                    <li><b>m</b> — headroom multiplier: <b>{format(math!.m,2)}</b></li>
                    <li><b>P′</b> — sized watts = P×m: <b>{format(math!.Pp)}</b> W</li>
                    <li><b>PF</b> — power factor (0.80–1.00): <b>{format(math!.PF,2)}</b></li>
                    <li><b>η</b> — inverter efficiency (0.80–0.96): <b>{format(math!.eff,2)}</b></li>
                    <li><b>t</b> — target backup (h): <b>{format(math!.t)}</b></li>
                    <li><b>H</b> — rated-hour reference: <b>{math!.H} h</b></li>
                    <li><b>k</b> — Peukert exponent: <b>{format(math!.k,2)}</b></li>
                    <li><b>V<sub>dc</sub></b> — DC bus (V): <b>{math!.Vdc}</b></li>
                    <li><b>n<sub>s</sub></b> — series per string: <b>{math!.ns}</b></li>
                    <li><b>n<sub>p</sub></b> — parallel strings: <b>{math!.np}</b></li>
                    <li><b>C<sub>req</sub></b> — required Ah per string: <b>{format(math!.Creq)}</b></li>
                    <li><b>C<sub>sel</sub></b> — chosen battery Ah: <b>{format(math!.Csel)}</b></li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold">1) UPS sizing</h4>
                  <p>UPS VA = P′ / PF = <b>{format(math!.Pp)}</b> / <b>{format(math!.PF,2)}</b> = <b>{format(math!.UPS_VA)}</b> VA → pick <b>{math!.UPS_pick} VA</b></p>
                </div>

                <div>
                  <h4 className="font-semibold">2) DC bus / series count</h4>
                  <p>Choose n<sub>s</sub> from the options above → V<sub>dc</sub> = 12 × n<sub>s</sub> = <b>{math!.Vdc} V</b></p>
                </div>

                <div>
                  <h4 className="font-semibold">3) Discharge current</h4>
                  <p>I = P′ / (V<sub>dc</sub>·η) = <b>{format(math!.I)}</b> A</p>
                </div>

                <div>
                  <h4 className="font-semibold">4) Peukert required capacity per string</h4>
                  <p>C<sub>req</sub> = (I·H)·(t/H)<sup>1/k</sup> = <b>{format(math!.Creq)}</b> Ah</p>
                </div>

                <div>
                  <h4 className="font-semibold">5) Strings for selected battery size</h4>
                  <p>n<sub>p,need</sub> = ceil(C<sub>req</sub>/C<sub>sel</sub>); clamp to max {MAX_STRINGS}. Current n<sub>p</sub>=<b>{math!.np}</b>, C<sub>eff</sub>=C<sub>sel</sub>·n<sub>p</sub>=<b>{format(math!.Ceff)}</b> Ah</p>
                </div>

                <div>
                  <h4 className="font-semibold">6) Predicted runtime</h4>
                  <p>t′ = H·(C<sub>eff</sub>/(I·H))<sup>k</sup> = <b>{format(math!.tPrime)}</b> h = <b>{format(math!.tPrimeMin)}</b> min</p>
                </div>

                <div>
                  <h4 className="font-semibold">7) C-rate per string</h4>
                  <p>C-rate = I / C<sub>sel</sub> = <b>{format(math!.cRate,2)}C</b></p>
                </div>
              </div>
            </details>
          )}

          {/* Load Distribution */}
          {chartData.length > 0 && (
            <div>
              <h4 className="font-semibold mt-4 flex items-center gap-2"><Zap className="text-yellow-600 w-5 h-5" /> Load Distribution</h4>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                    {chartData.map((_, i) => <Cell key={i} fill={COLORS_SAFE[i % COLORS_SAFE.length]} />)}
                  </Pie>
                  <RechartsTooltip wrapperClassName="recharts-default-tooltip no-print" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Bold conclusion */}
          {result && selectedBatteryAh && actualBackupMin !== null && (
            <div className={`mt-4 rounded-xl p-4 border ${meetsTarget ? "border-emerald-300 bg-emerald-50" : "border-amber-300 bg-amber-50"}`}>
              <div className="flex items-center gap-2 mb-2">
                {meetsTarget ? <CheckCircle2 className="text-emerald-600 w-5 h-5" /> : <AlertTriangle className="text-amber-600 w-5 h-5" />}
                <h4 className="text-lg font-extrabold">{meetsTarget ? "Conclusion (Meets Target)" : "Conclusion (Adjust Needed)"}</h4>
              </div>
              <ul className="space-y-1 text-gray-900">
                <li><strong>UPS to buy:</strong> <span className="font-extrabold">{result.suggestedUPS} VA (Online)</span></li>
                <li><strong>Battery layout:</strong> <span className="font-extrabold">{result.batteryCount} in series × {stringCount} parallel</span> (total <strong>{result.batteryCount * stringCount}</strong> batteries)</li>
                <li><strong>Battery size (per 12 V unit):</strong> <span className="font-extrabold">{selectedBatteryAh} Ah</span></li>
                <li><strong>Predicted runtime:</strong> <span className="font-extrabold">{format(actualBackupMin)} minutes</span> ({format(actualBackupMin / 60)} h)</li>
                <li><strong>Load used for sizing:</strong> <span className="font-extrabold">{format(result.sizedWatts)} W</span> (headroom ×{format(result.headroom, 2)})</li>
              </ul>
            </div>
          )}
        </div>
      )}
    </motion.section>
  );
};

// Expose calc type to page for its state typing & external use
OfficeCalculatorSectionComponent.calcShape = computeOnline;

export default Object.assign(OfficeCalculatorSectionComponent, { calcShape: computeOnline });
