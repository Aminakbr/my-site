"use client";
import React, { Fragment, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Calculator, Battery, Zap, PlusCircle, Info, Sigma, CheckCircle2, AlertTriangle,
} from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer,
} from "recharts";
import type { Result as RecoResult } from "./RecommendedUpsh";

/* ───────────────────────────── TYPES & CONSTANTS ───────────────────────────── */
type Device = { name: string; watts: number };
type Chem = "leadacid" | "agm" | "lifepo4";
type PhaseKey = "L1" | "L2" | "L3";

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

const UPS_CLASSES_3P: number[] = [
  10000, 15000, 20000, 30000, 40000, 60000, 80000, 100000, 120000, 160000, 200000,
];

const COLORS = ["#166534", "#1e40af", "#92400e", "#7f1d1d", "#5b21b6", "#9a3412"];
const inputBase =
  "h-10 px-3 rounded border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-600/40";
const btnBase =
  "h-10 px-4 rounded font-semibold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2";
const safeW = (n: number) => (Number.isFinite(n) && n >= 0 ? n : 0);
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const fmt = (n: number, d: number = 2) => (Number.isFinite(n) ? Number(n.toFixed(d)) : 0);

/** Fixed policy: series is 32 or 40 (12V blocks per string) */
function seriesOptionsForClass(_va: number): number[] {
  return [32, 40];
}

const PEUKERT: Record<Chem, { k: number; H: number; label: string }> = {
  leadacid: { k: 1.20, H: 20, label: "Lead-Acid (k=1.20, H=20h)" },
  agm: { k: 1.15, H: 20, label: "AGM / Gel (k=1.15, H=20h)" },
  lifepo4: { k: 1.05, H: 1, label: "LiFePO₄ (k=1.05, H=1h)" },
};

const HEADROOM = {
  none: 1.0,
  electronics: 1.25,
  motor2_0: 2.0,
  motor2_5: 2.5,
  motor3_0: 3.0,
} as const;

const STANDARD_BATTERY_SIZES = [7, 9, 18, 22, 42, 65, 100, 150];
const MAX_STRINGS = 3;

/** Hospital/medical loads (avg W; inrush handled by headroom) */
const LIBRARY: Device[] = [
  { name: "Exam Light (LED)", watts: 30 },
  { name: "Ultrasound (portable)", watts: 250 },
  { name: "Patient Monitor", watts: 80 },
  { name: "Infusion Pump", watts: 40 },
  { name: "Syringe Pump", watts: 25 },
  { name: "ECG/EKG", watts: 60 },
  { name: "Ventilator (ICU)", watts: 350 },
  { name: "Anesthesia Workstation", watts: 600 },
  { name: "Defibrillator (idle avg)", watts: 40 },
  { name: "Suction Pump", watts: 250 },
  { name: "C-Arm (idle avg)", watts: 600 },
  { name: "X-Ray DR (console/idle avg)", watts: 500 },
  { name: "OR Table + Controls", watts: 200 },
  { name: "Surgical Light System", watts: 200 },
  { name: "Autoclave (hold)", watts: 300 },
  { name: "Lab Centrifuge (avg)", watts: 400 },
  { name: "Blood Analyzer", watts: 250 },
  { name: "Microscope w/LED", watts: 40 },
  { name: "Nurse Call & PoE Switch", watts: 60 },
  { name: "Access Point (Wi-Fi 6)", watts: 12 },
  { name: "Workstation PC (tower)", watts: 350 },
  { name: "Monitor 27″", watts: 45 },
  { name: "Medical Refrigerator (avg)", watts: 180 },
  { name: "Small Air Compressor (avg)", watts: 500 },
];

/* ───────────────────────────── CORE COMPUTATION ───────────────────────────── */
function computeHospital(params: {
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
  const pf = clamp(params.pf, 0.85, 1.0);
  const eta = clamp(params.eta, 0.85, 0.95);
  const t = params.backupMin / 60;

  // headroom per phase for balance check
  const Pp_L1 = P_L1 * m;
  const Pp_L2 = P_L2 * m;
  const Pp_L3 = P_L3 * m;
  const Pp_total = Pp_L1 + Pp_L2 + Pp_L3;

  // UPS sizing from total
  const upsVA = Pp_total / pf;
  const upsClass = UPS_CLASSES_3P.find((v) => v >= upsVA) ?? UPS_CLASSES_3P[UPS_CLASSES_3P.length - 1];

  // per-phase VA and limit
  const VA_L1 = Pp_L1 / pf;
  const VA_L2 = Pp_L2 / pf;
  const VA_L3 = Pp_L3 / pf;
  const limitPhaseVA = upsClass / 3;
  const maxPhaseVA = Math.max(VA_L1, VA_L2, VA_L3);
  const unbalanced = maxPhaseVA > limitPhaseVA;

  // battery series (32 or 40 blocks)
  const series = params.seriesChoice;
  const vdc = series * 12;

  // Peukert
  const { k, H } = PEUKERT[params.chem];

  // DC current at battery bus
  const I = Pp_total / (vdc * eta);

  // required Ah per string
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

/* ───────────────────────────── PROPS ───────────────────────────── */
type Props = {
  onResultChange?: (r: RecoResult | null) => void;
};

/* ───────────────────────────── COMPONENT ───────────────────────────── */
export default function HospitalCalculatorSection({ onResultChange }: Props) {
  // per-phase device lists
  const [devicesL1, setL1] = useState<Device[]>([{ name: "", watts: 0 }]);
  const [devicesL2, setL2] = useState<Device[]>([{ name: "", watts: 0 }]);
  const [devicesL3, setL3] = useState<Device[]>([{ name: "", watts: 0 }]);

  const perPhaseDevices = useMemo(
    () => ({ L1: devicesL1, L2: devicesL2, L3: devicesL3 }),
    [devicesL1, devicesL2, devicesL3]
  );

  // params
  const [chem, setChem] = useState<Chem>("leadacid");
  const [backupMin, setBackupMin] = useState(60);
  const [pf, setPf] = useState(0.9);
  const [eta, setEta] = useState(0.92);
  const [headroom, setHeadroom] = useState<number>(HEADROOM.motor2_0);

  // results
  const [result, setResult] = useState<InternalResult | null>(null);
  const [seriesChoice, setSeriesChoice] = useState<number>(40); // default 40 per your policy

  // battery selection
  const [selectedBatteryAh, setSelectedBatteryAh] = useState<number | null>(null);
  const [stringCount, setStringCount] = useState<number>(1);
  const [actualBackupMin, setActualBackupMin] = useState<number | null>(null);
  const [meetsTarget, setMeetsTarget] = useState<boolean | null>(null);

  // search UI
  const [search, setSearch] = useState<string>("");
  const [searchPhase, setSearchPhase] = useState<PhaseKey | null>(null);
  const [searchIndex, setSearchIndex] = useState<number | null>(null);

  const [showMath, setShowMath] = useState(false);

  // helpers
  const addRow = (phase: PhaseKey) => {
    const setter = phase === "L1" ? setL1 : phase === "L2" ? setL2 : setL3;
    setter((rows) => [...rows, { name: "", watts: 0 }]);
  };
  const removeRow = (phase: PhaseKey, i: number) => {
    const setter = phase === "L1" ? setL1 : phase === "L2" ? setL2 : setL3;
    setter((prev) => {
      const copy = [...prev];
      copy.splice(i, 1);
      return copy.length ? copy : [{ name: "", watts: 0 }];
    });
  };
  const onSelectLibraryItem = (phase: PhaseKey, i: number, d: Device) => {
    const setter = phase === "L1" ? setL1 : phase === "L2" ? setL2 : setL3;
    setter((prev) => {
      const c = [...prev];
      c[i] = { name: d.name, watts: d.watts };
      return c;
    });
    setSearch("");
    setSearchIndex(null);
    setSearchPhase(null);
  };

  // compute
  const calculate = () => {
    const r = computeHospital({
      perPhaseDevices,
      pf,
      eta,
      headroom,
      chem,
      backupMin,
      seriesChoice,
    });
    setResult(r);
    // push a slim result for recommendations
    onResultChange?.({
      upsVA: r.upsVA,
      suggestedUPS: undefined,
      phase: "3P-3P",
      sizedWatts: r.sizedWatts,
      pf: r.pf,
      eta: r.eta,
    });

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

    const neededStrings = Math.ceil(requiredAhPerString / selectedAh);
    const cappedStrings = Math.min(MAX_STRINGS, Math.max(1, neededStrings));
    const effectiveAh = selectedAh * cappedStrings;

    const I = sizedWatts / (vdc * eff);
    const t_hours = H * Math.pow(effectiveAh / (I * H), k);
    const t_min = t_hours * 60;
    const meets = effectiveAh >= requiredAhPerString && neededStrings <= MAX_STRINGS;

    setStringCount(cappedStrings);
    setActualBackupMin(t_min);
    setMeetsTarget(meets);
  };

  // charts
  const allDevices = useMemo<Device[]>(
    () => [...devicesL1, ...devicesL2, ...devicesL3].filter((d) => d.name && safeW(d.watts)),
    [devicesL1, devicesL2, devicesL3]
  );
  const chartData = allDevices.map((d) => ({ name: d.name, value: d.watts }));

  const totals = useMemo(
    () => ({
      L1: devicesL1.reduce((s, d) => s + safeW(d.watts), 0),
      L2: devicesL2.reduce((s, d) => s + safeW(d.watts), 0),
      L3: devicesL3.reduce((s, d) => s + safeW(d.watts), 0),
    }),
    [devicesL1, devicesL2, devicesL3]
  );
  const totalP = totals.L1 + totals.L2 + totals.L3;

  const math = useMemo(() => {
    if (!result) return null;
    const P = totalP,
      m = result.headroom,
      Pp = result.sizedWatts,
      PF = result.pf;
    const UPS_VA = result.upsVA,
      UPS_pick = result.upsClass;
    const Vdc = result.vdc,
      ns = result.batteryCount,
      eff = result.eta,
      I = result.dischargeCurrentA;
    const H = result.H,
      k = result.k,
      t = result.targetHours,
      Creq = result.requiredAhPerString;
    const Csel = selectedBatteryAh ?? 0,
      np = stringCount,
      Ceff = Csel * np;
    const tPrimeMin = actualBackupMin ?? 0,
      tPrime = tPrimeMin / 60;
    const cRate = Csel > 0 ? I / Csel : 0;
    return {
      P,
      m,
      Pp,
      PF,
      UPS_VA,
      UPS_pick,
      Vdc,
      ns,
      eff,
      I,
      H,
      k,
      t,
      Creq,
      Csel,
      np,
      Ceff,
      tPrime,
      tPrimeMin: tPrimeMin,
      cRate,
    };
  }, [result, selectedBatteryAh, stringCount, actualBackupMin, totalP]);

  const cRatePerString = selectedBatteryAh && result ? result.dischargeCurrentA / selectedBatteryAh : 0;

  // Phase table
  const PhaseTable = () =>
    result ? (
      <div className="rounded-md border border-gray-200 bg-white p-3">
        <div className="grid grid-cols-4 gap-2 text-sm">
          <div className="font-semibold">Phase</div>
          <div className="font-semibold">P′ (W)</div>
          <div className="font-semibold">VA (PF={fmt(result.pf, 2)})</div>
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
            ? `⚠️ Phase imbalance: Max phase ${fmt(result.maxPhaseVA)} VA > per-phase limit ${fmt(result.perPhaseLimitVA)} VA. Move some loads to other phases.`
            : "✅ Phase check: Each phase VA is within per-phase limit."}
        </p>
      </div>
    ) : null;

  // One phase editor
  const PhaseBlock = ({
    phase,
    rows,
    setRows,
  }: {
    phase: PhaseKey;
    rows: Device[];
    setRows: React.Dispatch<React.SetStateAction<Device[]>>;
  }) => {
    const suggestions = LIBRARY.filter((d) =>
      d.name.toLowerCase().includes((search ?? "").toLowerCase())
    ).slice(0, 10);

    return (
      <div className="bg-white border border-gray-200 p-4 rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">{phase}</h3>
          <button
            onClick={() => addRow(phase)}
            className={`${btnBase} no-print inline-flex items-center gap-2 bg-rose-700 text-white hover:bg-rose-800 focus:ring-rose-700`}
            aria-label={`Add device to ${phase}`}
          >
            <PlusCircle className="w-5 h-5" /> Add Row
          </button>
        </div>

        {rows.map((device, i) => (
          <div key={`${phase}-${i}`} className="relative">
            <div className="grid grid-cols-12 gap-3 items-center">
              <div className="col-span-12 md:col-span-8">
                <label htmlFor={`${phase}-name-${i}`} className="sr-only">
                  Device name
                </label>
                <input
                  id={`${phase}-name-${i}`}
                  type="text"
                  className={`${inputBase} w-full`}
                  placeholder="🔍 Search or type device name…"
                  value={device.name}
                  onChange={(e) => {
                    const val = e.target.value;
                    setRows((prev) => {
                      const c = [...prev];
                      c[i] = { ...c[i], name: val };
                      return c;
                    });
                    setSearch(val);
                    setSearchIndex(i);
                    setSearchPhase(phase);
                  }}
                  onFocus={() => {
                    setSearchIndex(i);
                    setSearchPhase(phase);
                  }}
                  aria-label="Device name"
                />
              </div>
              <div className="col-span-6 md:col-span-2">
                <label htmlFor={`${phase}-watts-${i}`} className="sr-only">
                  Watts
                </label>
                <input
                  id={`${phase}-watts-${i}`}
                  type="number"
                  className={`${inputBase} w-full`}
                  placeholder="Watts"
                  value={device.watts || ""}
                  onChange={(e) => {
                    const watts = Number(e.target.value);
                    setRows((prev) => {
                      const c = [...prev];
                      c[i] = { ...c[i], watts };
                      return c;
                    });
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
                {suggestions.length === 0 && (
                  <div className="p-2 text-sm text-gray-500">No matches</div>
                )}
                {suggestions.map((d) => (
                  <div
                    key={`${phase}-${d.name}`}
                    onMouseDown={() => onSelectLibraryItem(phase, i, d)}
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
    <motion.section
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-gray-200 p-6 rounded-2xl shadow w-full max-w-5xl space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Calculator className="text-rose-700 w-6 h-6" /> Hospital UPS — Transformer-Based (3Φ / 3Φ, Per-Phase)
        </h2>
      </div>

      {/* Guidance */}
      <div className="rounded-lg border border-rose-200 bg-rose-50 text-rose-900 p-4">
        <p className="text-sm leading-relaxed">
          <strong>Recommendation:</strong> Use a <strong>transformer-based online (double-conversion) UPS</strong> with{" "}
          <strong>3-phase input/output</strong>. For medical gear with <strong>inrush</strong> (compressors, pumps, OR tables),
          use headroom ×<strong>2.0–3.0</strong>. Distribute loads across phases to avoid per-phase overload.
        </p>
      </div>

      {/* PHASE ENTRY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <PhaseBlock phase="L1" rows={devicesL1} setRows={setL1} />
        <PhaseBlock phase="L2" rows={devicesL2} setRows={setL2} />
        <PhaseBlock phase="L3" rows={devicesL3} setRows={setL3} />
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-3 items-end">
        <div className="md:col-span-2">
          <label className="block text-gray-700 text-sm mb-1" htmlFor="chem">
            Battery Chemistry
          </label>
          <select
            id="chem"
            className={`${inputBase} w-full`}
            value={chem}
            onChange={(e) => setChem(e.target.value as Chem)}
          >
            {Object.entries(PEUKERT).map(([key, v]) => (
              <option key={key} value={key}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-gray-700 text-sm mb-1" htmlFor="backup">
            Target Backup (minutes)
          </label>
          <input
            id="backup"
            type="number"
            value={backupMin}
            onChange={(e) => setBackupMin(Number(e.target.value))}
            className={`${inputBase} w-full`}
            min={0}
          />
        </div>
        <div>
          <label className="block text-gray-700 text-sm mb-1" htmlFor="pf">
            Power Factor (3Φ)
          </label>
          <input
            id="pf"
            type="number"
            step={0.01}
            min={0.85}
            max={1}
            value={pf}
            onChange={(e) => setPf(Number(e.target.value))}
            className={`${inputBase} w-full`}
          />
        </div>
        <div>
          <label className="block text-gray-700 text-sm mb-1" htmlFor="eta">
            UPS Efficiency η
          </label>
          <input
            id="eta"
            type="number"
            step={0.01}
            min={0.85}
            max={0.95}
            value={eta}
            onChange={(e) => setEta(Number(e.target.value))}
            className={`${inputBase} w-full`}
          />
        </div>

        {/* Series Choice (32 or 40) */}
        <div className="md:col-span-2">
          <div className="text-sm text-gray-700 mb-1 font-semibold">Battery series (12 V blocks)</div>
          <div className="flex items-center gap-4 bg-rose-50 border border-rose-200 rounded-lg p-3">
            {seriesOptionsForClass(0).map((n) => (
              <label key={n} className="inline-flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="seriesChoice"
                  value={n}
                  checked={seriesChoice === n}
                  onChange={() => setSeriesChoice(n)}
                  className="h-4 w-4 accent-rose-700"
                />
                <span>{n} batteries (Vdc = {n * 12} V)</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-600 mt-1">
            Series is fixed to <b>32 or 40</b> for 10–200 kVA. To increase capacity, add <b>parallel strings</b>.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-900 p-3 flex items-start gap-2">
        <Info className="w-5 h-5 mt-0.5" />
        <p className="text-sm">
          <strong>Tip:</strong> Motors/Compressors → use headroom ×2.0–3.0. Keep phases balanced.
        </p>
      </div>

      <button
        onClick={calculate}
        className="no-print mt-2 w-full bg-rose-700 hover:bg-rose-800 text-white transition py-3 rounded-lg font-extrabold tracking-wide focus:ring-rose-700 focus:ring-2 focus:ring-offset-2"
        aria-label="Calculate"
      >
        Calculate
      </button>

      {/* RESULTS */}
      {result && (
        <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg space-y-4 print-card">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Battery className="text-rose-700 w-5 h-5" /> Engineering Results — Transformer-Based (3Φ/3Φ)
          </h3>

          {/* Summary grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <p>Total Load P = {fmt(result.totalWatts)} W</p>
            <p>Headroom m = {fmt(result.headroom, 2)} ⇒ P′ = {fmt(result.sizedWatts)} W</p>
            <p>PF (3Φ) = {fmt(result.pf, 2)} | η = {fmt(result.eta, 2)}</p>
            <p>UPS VA (3Φ) = {fmt(result.upsVA)} VA → Suggested class: <b>{result.upsClass.toLocaleString()} VA</b></p>
            <p>DC Bus = {result.vdc} V → series nₛ = <b>{result.batteryCount}</b> (12 V per block)</p>
            <p>Discharge Current I = {fmt(result.dischargeCurrentA)} A</p>
            <p>Required C<sub>req</sub> per string = <b>{fmt(result.requiredAhPerString)} Ah</b></p>
            <p>Target t = {fmt(result.targetHours)} h, k = {fmt(result.k, 2)}, H = {result.H} h</p>
          </div>

          {/* Per-phase table */}
          <div className="mt-2">
            <div className="rounded-md border border-gray-200 bg-white p-3">
              <div className="grid grid-cols-4 gap-2 text-sm">
                <div className="font-semibold">Phase</div>
                <div className="font-semibold">P′ (W)</div>
                <div className="font-semibold">VA (PF={fmt(result.pf, 2)})</div>
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
                  ? `⚠️ Phase imbalance: Max phase ${fmt(result.maxPhaseVA)} VA > per-phase limit ${fmt(result.perPhaseLimitVA)} VA. Move some loads to other phases.`
                  : "✅ Phase check: Each phase VA is within per-phase limit."}
              </p>
            </div>
          </div>

          {/* Battery Ah selection */}
          <label className="block text-gray-700 text-sm" htmlFor="battery-ah">
            Select Battery Size (Ah)
          </label>
          <select
            id="battery-ah"
            className={`${inputBase} w-full`}
            value={selectedBatteryAh ?? ""}
            onChange={(e) => {
              const ah = Number(e.target.value);
              setSelectedBatteryAh(ah);
              recalcRuntime(ah);
              setShowMath(true);
            }}
          >
            <option value="">-- Select Battery Size --</option>
            {STANDARD_BATTERY_SIZES.map((ah) => (
              <option key={ah} value={ah}>
                {ah} Ah
              </option>
            ))}
          </select>

          {selectedBatteryAh && (
            <div className="bg-white p-3 rounded border border-gray-200 space-y-1">
              <p>Selected C<sub>sel</sub> = {selectedBatteryAh} Ah × series nₛ = {result.batteryCount}</p>
              <p>Parallel strings nₚ = {stringCount} / Max {MAX_STRINGS}</p>
              {actualBackupMin !== null && <p>Runtime t′ = <b>{fmt(actualBackupMin)} min</b> ({fmt((actualBackupMin as number) / 60)} h)</p>}
              <p className={result.peukertModel !== "lifepo4" && (selectedBatteryAh ? result.dischargeCurrentA / selectedBatteryAh : 0) > 0.3 ? "text-amber-700 font-medium" : "text-gray-700"}>
                C-rate per string = {fmt(selectedBatteryAh ? result.dischargeCurrentA / selectedBatteryAh : 0, 2)}C{result.peukertModel !== "lifepo4" && (selectedBatteryAh ? result.dischargeCurrentA / selectedBatteryAh : 0) > 0.3 && " — high for lead-acid; increase Ah or add a string."}
              </p>
              <p className="text-gray-700">Wiring: <strong>{result.batteryCount} in series</strong> × <strong>{stringCount} parallel</strong> → total batteries = <strong>{result.batteryCount * stringCount}</strong></p>
            </div>
          )}

          {/* Show the math (short) */}
          {result && (
            <details open={showMath} onToggle={(e) => setShowMath((e.target as HTMLDetailsElement).open)} className="rounded-lg border border-gray-300 bg-white">
              <summary className="cursor-pointer select-none px-4 py-3 font-semibold flex items-center gap-2">
                <Sigma className="w-5 h-5 text-rose-700" />
                Show the math (key formulas + your numbers)
              </summary>
              <div className="px-4 pb-4 text-sm text-gray-800 space-y-3">
                <p><b>UPS VA</b> = P′ / PF = {fmt(result.sizedWatts)} / {fmt(result.pf,2)} = {fmt(result.upsVA)} VA</p>
                <p><b>I</b> = P′ / (Vdc·η) = {fmt(result.sizedWatts)} / ({result.vdc} × {fmt(result.eta,2)}) = {fmt(result.dischargeCurrentA)} A</p>
                <p><b>Creq</b> = (I·H)·(t/H)^(1/k) = <b>{fmt(result.requiredAhPerString)} Ah</b> per string</p>
              </div>
            </details>
          )}

          {/* Visual distribution */}
          {chartData.length > 0 && (
            <div>
              <h4 className="font-semibold mt-4 flex items-center gap-2"><Zap className="text-yellow-700 w-5 h-5" /> Load Distribution (all devices)</h4>
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

          {/* Bold Conclusion */}
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
                <li><strong>Predicted runtime:</strong> <span className="font-extrabold">{fmt(actualBackupMin)} minutes</span> ({fmt((actualBackupMin as number) / 60)} h)</li>
                <li><strong>Load used for sizing:</strong> <span className="font-extrabold">{fmt(result.sizedWatts)} W</span> (headroom ×{fmt(result.headroom, 2)})</li>
              </ul>
            </div>
          )}
        </div>
      )}
    </motion.section>
  );
}
