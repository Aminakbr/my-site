"use client";
import React, { Fragment, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Calculator, Battery, Zap, PlusCircle, Info, Sigma, CheckCircle2, AlertTriangle, Server
} from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer,
} from "recharts";
import type { Result as RecoResult } from "./RecommendedUpsdc";

/* ───────── Types & helpers ───────── */
type Device = { name: string; watts: number };
type Chem = "leadacid" | "agm" | "lifepo4";
type PhaseKey = "L1" | "L2" | "L3";

const fmt = (n: number, d: number = 2) => (Number.isFinite(n) ? Number(n.toFixed(d)) : 0);
const safeW = (n: number) => (Number.isFinite(n) && n >= 0 ? n : 0);
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

const COLORS = ["#166534", "#1e40af", "#92400e", "#7f1d1d", "#5b21b6", "#9a3412"];
const inputBase = "h-10 px-3 rounded border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/40";
const btnBase = "h-10 px-4 rounded font-semibold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2";

/* Typical 3P data center UPS classes (VA) */
const UPS_CLASSES_3P = [10000, 20000, 30000, 40000, 60000, 80000, 100000, 120000, 160000, 200000];

/* Peukert presets */
const PEUKERT: Record<Chem, { k: number; H: number; label: string }> = {
  leadacid: { k: 1.20, H: 20, label: "Lead-Acid (k=1.20, H=20h)" },
  agm:      { k: 1.15, H: 20, label: "AGM / Gel (k=1.15, H=20h)" },
  lifepo4:  { k: 1.05, H: 1,  label: "LiFePO₄ (k=1.05, H=1h)" },
};

/* Headroom for IT */
const HEADROOM = {
  none: 1.0,
  electronics: 1.25,
  burst1_5: 1.5,
} as const;

const STANDARD_BATTERY_SIZES = [7, 9, 18, 22, 42, 65, 100, 150];
const MAX_STRINGS = 3;
const seriesOptions = [32, 40];

/* Library — IT loads (typical averages) */
const LIBRARY: Device[] = [
  { name: "Rack Server (1U, avg)", watts: 150 },
  { name: "Blade Chassis (avg)", watts: 1200 },
  { name: "Storage Array (12-bay)", watts: 400 },
  { name: "Top-of-Rack Switch", watts: 120 },
  { name: "Core Switch", watts: 500 },
  { name: "Firewall Appliance", watts: 200 },
  { name: "KVM + Console", watts: 60 },
  { name: "PDUs (rack total)", watts: 30 },
  { name: "Access Point (PoE via switch)", watts: 15 },
  { name: "Hyperconverged Node", watts: 600 },
  { name: "GPU Server (1x high-end)", watts: 800 },
  { name: "GPU Server (4x high-end)", watts: 2400 },
];

/* Result shape (internal) */
type InternalResult = {
  totalWatts: number;
  sizedWatts: number;
  headroom: number;
  pf: number;
  eta: number;
  targetHours: number;

  upsVA: number;
  upsClass: number;
  phase: "3P-3P";

  H: number;
  k: number;
  batteryCount: number;
  vdc: number;

  dischargeCurrentA: number;
  requiredAhPerString: number;

  perPhaseWatts: Record<PhaseKey, number>;
  perPhaseVA: Record<PhaseKey, number>;
  perPhaseShare: Record<PhaseKey, number>;
  maxPhaseVA: number;
  perPhaseLimitVA: number;
  unbalanced: boolean;
  peukertModel: Chem;
};

/* Compute core */
function compute(params: {
  perPhaseDevices: Record<PhaseKey, Device[]>;
  pf: number;
  eta: number;
  headroom: number;
  chem: Chem;
  backupMin: number;
  seriesChoice: number;
}): InternalResult {
  const P_L1 = params.perPhaseDevices.L1.reduce((s, d) => s + safeW(d.watts), 0);
  const P_L2 = params.perPhaseDevices.L2.reduce((s, d) => s + safeW(d.watts), 0);
  const P_L3 = params.perPhaseDevices.L3.reduce((s, d) => s + safeW(d.watts), 0);
  const P_total = P_L1 + P_L2 + P_L3;

  const m = params.headroom || 1;
  const pf = clamp(params.pf, 0.9, 1.0);
  const eta = clamp(params.eta, 0.9, 0.97);
  const t = params.backupMin / 60;

  const Pp_L1 = P_L1 * m;
  const Pp_L2 = P_L2 * m;
  const Pp_L3 = P_L3 * m;
  const Pp_total = Pp_L1 + Pp_L2 + Pp_L3;

  const upsVA = Pp_total / pf;
  const upsClass = UPS_CLASSES_3P.find((v) => v >= upsVA) ?? UPS_CLASSES_3P[UPS_CLASSES_3P.length - 1];

  const VA_L1 = Pp_L1 / pf;
  const VA_L2 = Pp_L2 / pf;
  const VA_L3 = Pp_L3 / pf;
  const limitPhaseVA = upsClass / 3;
  const maxPhaseVA = Math.max(VA_L1, VA_L2, VA_L3);
  const unbalanced = maxPhaseVA > limitPhaseVA;

  const series = params.seriesChoice;
  const vdc = series * 12;

  const { k, H } = PEUKERT[params.chem];
  const I = Pp_total / (vdc * eta);
  const Creq = I * H * Math.pow(t / H, 1 / k);

  const share = (x: number) => (Pp_total > 0 ? (x / Pp_total) * 100 : 0);

  return {
    totalWatts: P_total,
    sizedWatts: Pp_total,
    headroom: m,
    pf,
    eta,
    targetHours: t,

    upsVA,
    upsClass,
    phase: "3P-3P",

    H,
    k,
    batteryCount: series,
    vdc,
    dischargeCurrentA: I,
    requiredAhPerString: Creq,

    perPhaseWatts: { L1: Pp_L1, L2: Pp_L2, L3: Pp_L3 },
    perPhaseVA: { L1: VA_L1, L2: VA_L2, L3: VA_L3 },
    perPhaseShare: { L1: share(Pp_L1), L2: share(Pp_L2), L3: share(Pp_L3) },
    maxPhaseVA,
    perPhaseLimitVA: limitPhaseVA,
    unbalanced,
    peukertModel: params.chem,
  };
}

/* Props */
type Props = {
  onResultChange?: (r: RecoResult | null) => void;
};

export default function DataCenterCalculatorSection({ onResultChange }: Props) {
  const [L1, setL1] = useState<Device[]>([{ name: "", watts: 0 }]);
  const [L2, setL2] = useState<Device[]>([{ name: "", watts: 0 }]);
  const [L3, setL3] = useState<Device[]>([{ name: "", watts: 0 }]);

  const perPhaseDevices = useMemo(() => ({ L1, L2, L3 }), [L1, L2, L3]);

  // parameters (IT-friendly defaults)
  const [chem, setChem] = useState<Chem>("leadacid");
  const [backupMin, setBackupMin] = useState(15); // data centers often aim 5–30 min + generators
  const [pf, setPf] = useState(0.95);
  const [eta, setEta] = useState(0.96);          // transformer-less is efficient
  const [headroom, setHeadroom] = useState<number>(HEADROOM.electronics);

  // series (32 or 40)
  const [seriesChoice, setSeriesChoice] = useState<number>(40);

  // results & battery selection
  const [result, setResult] = useState<InternalResult | null>(null);
  const [selectedBatteryAh, setSelectedBatteryAh] = useState<number | null>(null);
  const [stringCount, setStringCount] = useState<number>(1);
  const [actualBackupMin, setActualBackupMin] = useState<number | null>(null);
  const [meetsTarget, setMeetsTarget] = useState<boolean | null>(null);

  // search suggestion
  const [search, setSearch] = useState<string>("");
  const [searchPhase, setSearchPhase] = useState<PhaseKey | null>(null);
  const [searchIndex, setSearchIndex] = useState<number | null>(null);

  const [showMath, setShowMath] = useState(false);

  const addRow = (ph: PhaseKey) => {
    (ph === "L1" ? setL1 : ph === "L2" ? setL2 : setL3)((rows) => [...rows, { name: "", watts: 0 }]);
  };
  const removeRow = (ph: PhaseKey, i: number) => {
    const setter = ph === "L1" ? setL1 : ph === "L2" ? setL2 : setL3;
    setter((prev) => {
      const copy = [...prev];
      copy.splice(i, 1);
      return copy.length ? copy : [{ name: "", watts: 0 }];
    });
  };
  const onSelectItem = (ph: PhaseKey, i: number, d: Device) => {
    const setter = ph === "L1" ? setL1 : ph === "L2" ? setL2 : setL3;
    setter((prev) => {
      const c = [...prev];
      c[i] = { name: d.name, watts: d.watts };
      return c;
    });
    setSearch("");
    setSearchIndex(null);
    setSearchPhase(null);
  };

  const calculate = () => {
    const r = compute({
      perPhaseDevices,
      pf,
      eta,
      headroom,
      chem,
      backupMin,
      seriesChoice,
    });
    setResult(r);
    onResultChange?.({ upsVA: r.upsVA, suggestedUPS: undefined, phase: "3P-3P", sizedWatts: r.sizedWatts, pf: r.pf, eta: r.eta });

    if (selectedBatteryAh) {
      Promise.resolve().then(() => recalcRuntime(selectedBatteryAh));
    } else {
      setStringCount(1);
      setActualBackupMin(null);
      setMeetsTarget(null);
    }
  };

  const recalcRuntime = (selectedAh: number) => {
    if (!result) return;
    const { sizedWatts, vdc, eta: eff, k, H, requiredAhPerString } = result;

    const needStrings = Math.ceil(requiredAhPerString / selectedAh);
    const np = Math.min(MAX_STRINGS, Math.max(1, needStrings));
    const Ceff = selectedAh * np;

    const I = sizedWatts / (vdc * eff);
    const t_hours = H * Math.pow(Ceff / (I * H), k);
    const t_min = t_hours * 60;
    const ok = Ceff >= requiredAhPerString && needStrings <= MAX_STRINGS;

    setStringCount(np);
    setActualBackupMin(t_min);
    setMeetsTarget(ok);
  };

  // charts
  const allDevices = useMemo(() => [...L1, ...L2, ...L3].filter((d) => d.name && safeW(d.watts)), [L1, L2, L3]);
  const chartData = allDevices.map((d) => ({ name: d.name, value: d.watts }));

  const totals = useMemo(
    () => ({
      L1: L1.reduce((s, d) => s + safeW(d.watts), 0),
      L2: L2.reduce((s, d) => s + safeW(d.watts), 0),
      L3: L3.reduce((s, d) => s + safeW(d.watts), 0),
    }),
    [L1, L2, L3]
  );
  const totalP = totals.L1 + totals.L2 + totals.L3;

  const math = useMemo(() => {
    if (!result) return null;
    const P = totalP, m = result.headroom, Pp = result.sizedWatts, PF = result.pf;
    const UPS_VA = result.upsVA, UPS_pick = result.upsClass;
    const Vdc = result.vdc, ns = result.batteryCount, eff = result.eta, I = result.dischargeCurrentA;
    const H = result.H, k = result.k, t = result.targetHours, Creq = result.requiredAhPerString;
    const Csel = selectedBatteryAh ?? 0, np = stringCount, Ceff = Csel * np;
    const tPrimeMin = actualBackupMin ?? 0, tPrime = tPrimeMin / 60;
    const cRate = Csel > 0 ? I / Csel : 0;
    return { P, m, Pp, PF, UPS_VA, UPS_pick, Vdc, ns, eff, I, H, k, t, Creq, Csel, np, Ceff, tPrime, tPrimeMin, cRate };
  }, [result, selectedBatteryAh, stringCount, actualBackupMin, totalP]);

  const PhaseBlock = ({ phase, rows, setRows }: { phase: PhaseKey; rows: Device[]; setRows: React.Dispatch<React.SetStateAction<Device[]>>; }) => {
    const suggestions = LIBRARY.filter((d) =>
      d.name.toLowerCase().includes((search ?? "").toLowerCase())
    ).slice(0, 10);

    return (
      <div className="bg-white border border-gray-200 p-4 rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg flex items-center gap-2"><Server className="w-5 h-5 text-emerald-700" /> {phase}</h3>
          <button
            onClick={() => addRow(phase)}
            className={`${btnBase} no-print inline-flex items-center gap-2 bg-emerald-700 text-white hover:bg-emerald-800 focus:ring-emerald-700`}
            aria-label={`Add device to ${phase}`}
          >
            <PlusCircle className="w-5 h-5" /> Add Row
          </button>
        </div>

        {rows.map((device, i) => (
          <div key={`${phase}-${i}`} className="relative">
            <div className="grid grid-cols-12 gap-3 items-center">
              <div className="col-span-12 md:col-span-8">
                <label htmlFor={`${phase}-name-${i}`} className="sr-only">Device name</label>
                <input
                  id={`${phase}-name-${i}`}
                  type="text"
                  className={`${inputBase} w-full`}
                  placeholder="🔍 Search or type device name…"
                  value={device.name}
                  onChange={(e) => {
                    const val = e.target.value;
                    setRows((prev) => { const c = [...prev]; c[i] = { ...c[i], name: val }; return c; });
                    setSearch(val); setSearchIndex(i); setSearchPhase(phase);
                  }}
                  onFocus={() => { setSearchIndex(i); setSearchPhase(phase); }}
                  aria-label="Device name"
                />
              </div>
              <div className="col-span-6 md:col-span-2">
                <label htmlFor={`${phase}-watts-${i}`} className="sr-only">Watts</label>
                <input
                  id={`${phase}-watts-${i}`}
                  type="number"
                  className={`${inputBase} w-full`}
                  placeholder="Watts"
                  value={device.watts || ""}
                  onChange={(e) => {
                    const watts = Number(e.target.value);
                    setRows((prev) => { const c = [...prev]; c[i] = { ...c[i], watts }; return c; });
                  }}
                  min={0}
                  aria-label="Device watts"
                />
              </div>
              <div className="col-span-6 md:col-span-2">
                <button
                  className={`${btnBase} w-full bg-red-700 text-white hover:bg-red-800 focus:ring-red-700 no-print`}
                  onClick={() => removeRow(phase, i)}
                  aria-label="Remove device"
                >
                  Remove
                </button>
              </div>
            </div>

            {search && searchPhase === phase && searchIndex === i && (
              <div className="absolute z-10 left-0 right-0 mt-1 rounded max-h-52 overflow-y-auto border border-gray-300 bg-white no-print">
                {suggestions.length === 0 && <div className="p-2 text-sm text-gray-500">No matches</div>}
                {suggestions.map((d) => (
                  <div
                    key={`${phase}-${d.name}`}
                    onMouseDown={() => onSelectItem(phase, i, d)}
                    className="p-2 hover:bg-gray-100 cursor-pointer"
                    role="button"
                    aria-label={`Select ${d.name}`}
                  >
                    {d.name} — {d.watts} W
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        <div className="text-sm text-gray-700">
          Phase subtotal: <b>{fmt(rows.reduce((s, d) => s + safeW(d.watts), 0))} W</b>
        </div>
      </div>
    );
  };

  return (
    <motion.section initial={false} animate={{ opacity: 1, y: 0 }} className="bg-white border border-gray-200 p-6 rounded-2xl shadow w-full max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Calculator className="text-emerald-700 w-6 h-6" /> Data Center UPS — 3Φ / 3Φ (Transformer-less / Modular)
        </h2>
      </div>

      <div className="rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-900 p-4">
        <p className="text-sm leading-relaxed">
          <strong>Recommendation:</strong> For server rooms and data centers, use <strong>transformer-less</strong> or <strong>modular (N+1)</strong> online UPS.
          Use <strong>electronics headroom ×1.25</strong> and check per-phase balance.
        </p>
      </div>

      {/* Per-phase editors */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <PhaseBlock phase="L1" rows={L1} setRows={setL1} />
        <PhaseBlock phase="L2" rows={L2} setRows={setL2} />
        <PhaseBlock phase="L3" rows={L3} setRows={setL3} />
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-3 items-end">
        <div className="md:col-span-2">
          <label className="block text-gray-700 text-sm mb-1" htmlFor="chem">Battery Chemistry</label>
          <select id="chem" className={`${inputBase} w-full`} value={chem} onChange={(e) => setChem(e.target.value as Chem)}>
            {Object.entries(PEUKERT).map(([key, v]) => (<option key={key} value={key}>{v.label}</option>))}
          </select>
        </div>
        <div>
          <label className="block text-gray-700 text-sm mb-1" htmlFor="backup">Target Backup (minutes)</label>
          <input id="backup" type="number" value={backupMin} onChange={(e) => setBackupMin(Number(e.target.value))} className={`${inputBase} w-full`} min={0} />
        </div>
        <div>
          <label className="block text-gray-700 text-sm mb-1" htmlFor="pf">PF (3Φ)</label>
          <input id="pf" type="number" step={0.01} min={0.9} max={1} value={pf} onChange={(e) => setPf(Number(e.target.value))} className={`${inputBase} w-full`} />
        </div>
        <div>
          <label className="block text-gray-700 text-sm mb-1" htmlFor="eta">UPS Efficiency η</label>
          <input id="eta" type="number" step={0.01} min={0.9} max={0.97} value={eta} onChange={(e) => setEta(Number(e.target.value))} className={`${inputBase} w-full`} />
        </div>

        {/* Series choice */}
        <div className="md:col-span-2">
          <div className="text-sm text-gray-700 mb-1 font-semibold">Battery series (12 V blocks)</div>
          <div className="flex items-center gap-4 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            {seriesOptions.map((n) => (
              <label key={n} className="inline-flex items-center gap-2 text-sm">
                <input type="radio" name="seriesChoice" value={n} checked={seriesChoice === n} onChange={() => setSeriesChoice(n)} className="h-4 w-4 accent-emerald-700" />
                <span>{n} batteries (Vdc = {n * 12} V)</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-600 mt-1">Series fixed to <b>32 or 40</b> in practice. Expand energy with parallel strings.</p>
        </div>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-900 p-3 flex items-start gap-2">
        <Info className="w-5 h-5 mt-0.5" />
        <p className="text-sm"><strong>Tip:</strong> Data center UPS rarely backs chillers/CRAC compressors; keep the UPS bus for IT loads only.</p>
      </div>

      <button onClick={calculate} className="no-print mt-2 w-full bg-emerald-700 hover:bg-emerald-800 text-white transition py-3 rounded-lg font-extrabold tracking-wide focus:ring-emerald-700 focus:ring-2 focus:ring-offset-2" aria-label="Calculate">
        Calculate
      </button>

      {/* Results */}
      {result && (
        <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg space-y-4 print-card">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Battery className="text-emerald-700 w-5 h-5" /> Engineering Results — Data Center (3Φ/3Φ)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <p>Total Load P = {fmt(result.totalWatts)} W</p>
            <p>Headroom m = {fmt(result.headroom, 2)} ⇒ P′ = {fmt(result.sizedWatts)} W</p>
            <p>PF = {fmt(result.pf, 2)} | η = {fmt(result.eta, 2)}</p>
            <p>UPS VA (3Φ) = {fmt(result.upsVA)} VA → Suggested class: <b>{result.upsClass.toLocaleString()} VA</b></p>
            <p>DC Bus = {result.vdc} V → series nₛ = <b>{result.batteryCount}</b></p>
            <p>Discharge Current I = {fmt(result.dischargeCurrentA)} A</p>
            <p>Required C<sub>req</sub> per string = <b>{fmt(result.requiredAhPerString)} Ah</b></p>
            <p>Target t = {fmt(result.targetHours)} h, k = {fmt(result.k, 2)}, H = {result.H} h</p>
          </div>

          {/* Per-phase summary */}
          <div className="rounded-md border border-gray-200 bg-white p-3">
            <div className="grid grid-cols-4 gap-2 text-sm">
              <div className="font-semibold">Phase</div>
              <div className="font-semibold">P′ (W)</div>
              <div className="font-semibold">VA</div>
              <div className="font-semibold">Share</div>

              {(["L1","L2","L3"] as PhaseKey[]).map((ph) => (
                <Fragment key={`row-${ph}`}>
                  <div>{ph}</div>
                  <div>{fmt(result.perPhaseWatts[ph])}</div>
                  <div>{fmt(result.perPhaseVA[ph])}</div>
                  <div>{fmt(result.perPhaseShare[ph])}%</div>
                </Fragment>
              ))}
            </div>
            <p className={`mt-2 text-sm ${result.unbalanced ? "text-amber-700" : "text-emerald-700"}`}>
              {result.unbalanced
                ? `⚠️ Imbalance: Max phase ${fmt(result.maxPhaseVA)} VA > per-phase cap ${fmt(result.perPhaseLimitVA)} VA — shift loads.`
                : "✅ Phase check OK."}
            </p>
          </div>

          {/* Battery Ah selection */}
          <label className="block text-gray-700 text-sm" htmlFor="battery-ah">Select Battery Size (Ah)</label>
          <select
            id="battery-ah"
            className={`${inputBase} w-full`}
            value={selectedBatteryAh ?? ""}
            onChange={(e) => { const ah = Number(e.target.value); setSelectedBatteryAh(ah); recalcRuntime(ah); setShowMath(true); }}
          >
            <option value="">-- Select Battery Size --</option>
            {STANDARD_BATTERY_SIZES.map((ah) => <option key={ah} value={ah}>{ah} Ah</option>)}
          </select>

          {selectedBatteryAh && (
            <div className="bg-white p-3 rounded border border-gray-200 space-y-1">
              <p>Selected C<sub>sel</sub> = {selectedBatteryAh} Ah × series nₛ = {result.batteryCount}</p>
              <p>Parallel strings nₚ = {stringCount} / Max {MAX_STRINGS}</p>
              {actualBackupMin !== null && <p>Runtime t′ = <b>{fmt(actualBackupMin)} min</b> ({fmt((actualBackupMin as number) / 60)} h)</p>}
              <p className={result.peukertModel !== "lifepo4" && selectedBatteryAh && (result.dischargeCurrentA / selectedBatteryAh > 0.3) ? "text-amber-700 font-medium" : "text-gray-700"}>
                C-rate per string = {fmt(selectedBatteryAh ? result.dischargeCurrentA / selectedBatteryAh : 0, 2)}C
              </p>
              <p className="text-gray-700">Wiring: <strong>{result.batteryCount} in series</strong> × <strong>{stringCount} parallel</strong> → total batteries = <strong>{result.batteryCount * stringCount}</strong></p>
            </div>
          )}

          {/* Show the math (concise) */}
          {result && (
            <details open={showMath} onToggle={(e) => setShowMath((e.target as HTMLDetailsElement).open)} className="rounded-lg border border-gray-300 bg-white">
              <summary className="cursor-pointer select-none px-4 py-3 font-semibold flex items-center gap-2">
                <Sigma className="w-5 h-5 text-emerald-700" />
                Show the math (key formulas + your numbers)
              </summary>
              <div className="px-4 pb-4 text-sm text-gray-800 space-y-3">
                <p><b>UPS VA</b> = P′ / PF = {fmt(result.sizedWatts)} / {fmt(result.pf,2)} = {fmt(result.upsVA)} VA</p>
                <p><b>I</b> = P′ / (Vdc·η) = {fmt(result.sizedWatts)} / ({result.vdc} × {fmt(result.eta,2)}) = {fmt(result.dischargeCurrentA)} A</p>
                <p><b>Creq</b> = (I·H)·(t/H)^(1/k) = <b>{fmt(result.requiredAhPerString)} Ah</b> per string</p>
              </div>
            </details>
          )}

          {/* Pie (optional) */}
          {chartData.length > 0 && (
            <div>
              <h4 className="font-semibold mt-4 flex items-center gap-2"><Zap className="text-yellow-700 w-5 h-5" /> Load Distribution</h4>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                    {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <RechartsTooltip wrapperClassName="recharts-default-tooltip no-print" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Bold conclusion */}
          {result && selectedBatteryAh && actualBackupMin !== null && (
            <div className={`mt-4 rounded-xl p-4 border ${meetsTarget ? "border-emerald-400 bg-emerald-50" : "border-amber-400 bg-amber-50"}`}>
              <div className="flex items-center gap-2 mb-2">
                {meetsTarget ? <CheckCircle2 className="text-emerald-700 w-5 h-5" /> : <AlertTriangle className="text-amber-700 w-5 h-5" />}
                <h4 className="text-lg font-extrabold">{meetsTarget ? "Conclusion (Meets Target)" : "Conclusion (Adjust Needed)"}</h4>
              </div>
              <ul className="space-y-1 text-gray-900">
                <li><strong>UPS class to buy (3Φ/3Φ):</strong> <span className="font-extrabold">{result.upsClass.toLocaleString()} VA</span></li>
                <li><strong>Battery layout:</strong> <span className="font-extrabold">{result.batteryCount} in series × {stringCount} parallel</span> (total <strong>{result.batteryCount * stringCount}</strong> batteries)</li>
                <li><strong>Battery size (per 12 V unit):</strong> <span className="font-extrabold">{selectedBatteryAh} Ah</span></li>
                <li><strong>Predicted runtime:</strong> <span className="font-extrabold">{fmt(actualBackupMin)} minutes</span> ({fmt((actualBackupMin / 60))} h)</li>
                <li><strong>Load used for sizing:</strong> <span className="font-extrabold">{fmt(result.sizedWatts)} W</span> (headroom ×{fmt(result.headroom, 2)})</li>
              </ul>
            </div>
          )}
        </div>
      )}
    </motion.section>
  );
}
