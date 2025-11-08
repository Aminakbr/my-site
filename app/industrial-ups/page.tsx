"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Printer, Calculator, Info, Sigma, CheckCircle2, AlertTriangle } from "lucide-react";

// Pull what you actually use from the lib (no duplicates locally)
import {
  DEFAULTS,
  HEADROOM,
  STANDARD_UPS_SIZES,
  ALLOWED_SERIES,
  // STANDARD_BATTERY_SIZES, // not used here; keep/comment as needed
  // MAX_STRINGS,            // not used here
  // COLORS,                 // not used; remove to avoid duplicate
  type Chem,
  type Device,
  type Result,
  format,                   // use lib's format (do not redeclare)
} from "@/lib/industrial";

/* ────────────────────────────────────────────────────────────────────────────
   Local config wrapper (not exported)
   ──────────────────────────────────────────────────────────────────────────── */

const CONFIG = {
  STANDARD_UPS_SIZES,
  ALLOWED_SERIES,
  HEADROOM,
  DEFAULTS,
} as const;

/* ────────────────────────────────────────────────────────────────────────────
   Local-only types
   ──────────────────────────────────────────────────────────────────────────── */

type Phase = "3P-3P" | "3P-1P";
type Topology = "Transformerless" | "Transformer-based";

/* ────────────────────────────────────────────────────────────────────────────
   Local helpers (only ones not provided by the lib)
   ──────────────────────────────────────────────────────────────────────────── */

function safeW(n: unknown): number {
  const v = Number(n);
  return Number.isFinite(v) && v >= 0 ? v : 0;
}
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function pvRoundUp<T extends readonly number[]>(sizes: T, va: number): T[number] {
  for (const s of sizes) if (s >= va) return s;
  return sizes[sizes.length - 1];
}
function peukertParams(chem: Chem): { k: number; H: number } {
  if (chem === "lifepo4") return { k: 1.05, H: 1 };
  if (chem === "agm") return { k: 1.15, H: 20 };
  return { k: 1.20, H: 20 };
}
function vdcFromSeries(series: number) {
  return 12 * series;
}

/* ────────────────────────────────────────────────────────────────────────────
   Page
   ──────────────────────────────────────────────────────────────────────────── */

export default function IndustrialUpsPage() {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);

  // Inputs
  const [devices, setDevices] = useState<Device[]>([{ name: "", watts: 0 }]);
  const [chem, setChem] = useState<Chem>(CONFIG.DEFAULTS.chem);
  const [phase, setPhase] = useState<Phase>("3P-3P");
  const [topology, setTopology] = useState<Topology>("Transformerless");
  const [series, setSeries] = useState<number>(CONFIG.DEFAULTS.series);

  const [backupMin, setBackupMin] = useState<number>(CONFIG.DEFAULTS.backupMin);
  const [pf, setPf] = useState<number>(CONFIG.DEFAULTS.pf);
  const [eta, setEta] = useState<number>(CONFIG.DEFAULTS.eta);
  const [headroom, setHeadroom] = useState<number>(CONFIG.DEFAULTS.headroom);

  // Results
  const [result, setResult] = useState<Result | null>(null);
  const [selectedAh, setSelectedAh] = useState<number | null>(null);
  const [np, setNp] = useState<number>(1);
  const [runtimeMin, setRuntimeMin] = useState<number | null>(null);
  const [meets, setMeets] = useState<boolean | null>(null);

  const [search, setSearch] = useState("");
  const [searchIndex, setSearchIndex] = useState<number | null>(null);

  const addRow = () => setDevices((d) => [...d, { name: "", watts: 0 }]);
  const removeRow = (i: number) =>
    setDevices((prev) => {
      const c = [...prev];
      c.splice(i, 1);
      return c.length ? c : [{ name: "", watts: 0 }];
    });

  const LIBRARY: Device[] = useMemo(
    () => [
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
    ],
    []
  );

  const onSelectLibraryItem = (i: number, d: Device) => {
    setDevices((prev) => {
      const c = [...prev];
      c[i] = { name: d.name, watts: d.watts };
      return c;
    });
    setSearch("");
    setSearchIndex(null);
  };

  // Calculate
  const onCalculate = () => {
    const P = devices.reduce((s, d) => s + safeW(d.watts), 0);
    const m = headroom || 1;
    const Pp = P * m;

    const PF = clamp(pf, 0.6, 1.0);
    const eff = clamp(eta, 0.75, 0.98);

    const upsVA = Pp / PF;
    const suggestedUPS = pvRoundUp(CONFIG.STANDARD_UPS_SIZES, upsVA);

    const vdc = vdcFromSeries(series);
    const { k, H } = peukertParams(chem);
    const targetHours = (backupMin || 0) / 60;

    const I = Pp / (vdc * eff);
    const Creq = I * H * Math.pow(targetHours / H, 1 / k);

    // IMPORTANT: use batteryCount (matches lib Result)
    setResult({
      totalWatts: P,
      headroom: m,
      sizedWatts: Pp,
      pf: PF,
      eta: eff,
      upsVA,
      suggestedUPS,
      vdc,
      batteryCount: series,         // ← align with lib type
      H,
      k,
      targetHours,
      dischargeCurrentA: I,
      requiredAhPerString: Creq,
    });

    setSelectedAh(null);
    setNp(1);
    setRuntimeMin(null);
    setMeets(null);
  };

  const recalcRuntime = (ah: number, wantedStrings?: number) => {
    if (!result) return;
    const strings = Math.max(1, wantedStrings ?? np);

    const Ceff = ah * strings;
    const { k, H, dischargeCurrentA: I } = result;

    const t_h = H * Math.pow(Ceff / (I * H), k);
    const t_min = t_h * 60;

    const neededStrings = Math.ceil(result.requiredAhPerString / ah);
    const ok = strings >= neededStrings;

    setNp(strings);
    setRuntimeMin(t_min);
    setMeets(ok);
  };

  const handlePrint = useCallback(() => {
    if (typeof window !== "undefined") window.print();
  }, []);

  // UI bits
  const inputBase =
    "h-10 px-3 rounded border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/30";
  const btnBase =
    "h-10 px-4 rounded font-semibold transition-all duration-150 active:translate-y-px focus:outline-none";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white text-gray-900">
      <header className="w-full bg-white/90 border-b border-gray-200 py-3 px-6 flex justify-between items-center print-bg-white">
        <h1 className="text-2xl font-bold text-emerald-700">🏭 Industrial UPS Designer (Online)</h1>
        {isClient ? (
          <button
            onClick={handlePrint}
            className="no-print inline-flex items-center gap-2 bg-white text-gray-900 px-3 py-2 rounded shadow hover:shadow-md border border-gray-200"
            aria-label="Print or Save as PDF"
          >
            <Printer className="w-4 h-4" /> Print / Save as PDF
          </button>
        ) : (
          <div className="h-9 w-36 rounded bg-gray-100 border border-gray-200" aria-hidden />
        )}
      </header>

      <main id="report-section" className="py-8 px-4 sm:px-6 flex flex-col items-center gap-8" suppressHydrationWarning>
        {/* Calculator card */}
        <section className="bg-white border border-gray-200 p-6 rounded-2xl shadow w-full max-w-4xl space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Calculator className="text-emerald-700 w-6 h-6" />
              Calculator
            </h2>
            <button
              onClick={() => setDevices((d) => [...d, { name: "", watts: 0 }])}
              className={`${btnBase} bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow hover:shadow-md`}
              aria-label="Add device"
              title="Add a new device row"
            >
              + Add Device
            </button>
          </div>

          {/* Rows */}
          {devices.map((row, i) => {
            const suggestions = LIBRARY.filter((d) =>
              d.name.toLowerCase().includes((search ?? "").toLowerCase())
            ).slice(0, 8);

            return (
              <div key={i} className="relative">
                <div className="grid grid-cols-12 gap-3 items-center">
                  <div className="col-span-12 md:col-span-8">
                    <label htmlFor={`device-name-${i}`} className="sr-only">
                      Device name
                    </label>
                    <input
                      id={`device-name-${i}`}
                      type="text"
                      className={`${inputBase} w-full`}
                      placeholder="🔍 Search or type device name…"
                      value={row.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDevices((prev) => {
                          const c = [...prev];
                          c[i] = { ...c[i], name: val };
                          return c;
                        });
                        setSearchIndex(i);
                        setSearch(val);
                      }}
                      onFocus={() => setSearchIndex(i)}
                      aria-label="Device name"
                    />
                  </div>
                  <div className="col-span-6 md:col-span-2">
                    <label htmlFor={`device-watts-${i}`} className="sr-only">
                      Watts
                    </label>
                    <input
                      id={`device-watts-${i}`}
                      type="number"
                      className={`${inputBase} w-full`}
                      placeholder="Watts"
                      value={row.watts || ""}
                      onChange={(e) => {
                        const watts = Number(e.target.value);
                        setDevices((prev) => {
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
                      className={`${btnBase} w-full bg-red-600 hover:bg-red-700 text-white no-print`}
                      onClick={() => removeRow(i)}
                      aria-label="Remove device"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                {search && searchIndex === i && (
                  <div className="absolute z-10 left-0 right-0 mt-1 rounded max-h-40 overflow-y-auto border border-gray-300 bg-white no-print">
                    {suggestions.length === 0 && <div className="p-2 text-sm text-gray-500">No matches</div>}
                    {suggestions.map((d) => (
                      <div
                        key={d.name}
                        onMouseDown={() => onSelectLibraryItem(i, d)}
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
            );
          })}

          {/* Controls */}
          <div className="grid md:grid-cols-4 gap-3">
            <div>
              <label className="block text-gray-600 text-sm mb-1">Topology</label>
              <select
                className={`${inputBase} w-full`}
                value={topology}
                onChange={(e) => setTopology(e.target.value as Topology)}
              >
                <option value="Transformerless">Online — Transformerless</option>
                <option value="Transformer-based">Online — Transformer-based</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-600 text-sm mb-1">Phase</label>
              <select className={`${inputBase} w-full`} value={phase} onChange={(e) => setPhase(e.target.value as Phase)}>
                <option value="3P-3P">3Φ in / 3Φ out</option>
                <option value="3P-1P">3Φ in / 1Φ out</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-600 text-sm mb-1">Battery strings (series)</label>
              <select
                className={`${inputBase} w-full`}
                value={series}
                onChange={(e) => setSeries(Number(e.target.value))}
              >
                {CONFIG.ALLOWED_SERIES.map((s) => (
                  <option key={s} value={s}>
                    {s} × 12V → {12 * s} Vdc
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-600 text-sm mb-1">Battery Chemistry</label>
              <select className={`${inputBase} w-full`} value={chem} onChange={(e) => setChem(e.target.value as Chem)}>
                <option value="leadacid">Lead-Acid (k=1.20, H=20h)</option>
                <option value="agm">AGM / Gel (k=1.15, H=20h)</option>
                <option value="lifepo4">LiFePO₄ (k=1.05, H=1h)</option>
              </select>
            </div>
          </div>

          <div className="grid md:grid-cols-4 gap-3">
            <div>
              <label className="block text-gray-600 text-sm mb-1">Target Backup (minutes)</label>
              <input
                type="number"
                className={`${inputBase} w-full`}
                value={backupMin}
                onChange={(e) => setBackupMin(Number(e.target.value))}
                min={0}
              />
            </div>
            <div>
              <label className="block text-gray-600 text-sm mb-1">PF</label>
              <input
                type="number"
                step={0.01}
                min={0.6}
                max={1}
                className={`${inputBase} w-full`}
                value={pf}
                onChange={(e) => setPf(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-gray-600 text-sm mb-1">η (efficiency)</label>
              <input
                type="number"
                step={0.01}
                min={0.75}
                max={0.98}
                className={`${inputBase} w-full`}
                value={eta}
                onChange={(e) => setEta(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-gray-600 text-sm mb-1">Headroom</label>
              <select
                className={`${inputBase} w-full`}
                value={headroom}
                onChange={(e) => setHeadroom(Number(e.target.value))}
              >
                <option value={CONFIG.HEADROOM.none}>None (×1.00)</option>
                <option value={CONFIG.HEADROOM.electronics}>Electronics (×1.25)</option>
                <option value={CONFIG.HEADROOM.motor2_0}>Motor (×2.0)</option>
                <option value={CONFIG.HEADROOM.motor2_5}>Motor (×2.5)</option>
                <option value={CONFIG.HEADROOM.motor3_0}>Motor (×3.0)</option>
              </select>
            </div>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-900 p-3 flex items-start gap-2">
            <Info className="w-5 h-5 mt-0.5" />
            <p className="text-sm">
              <strong>Tip:</strong> Use ×1.25 for electronics and ×2.0–3.0 for motor loads (inrush).
            </p>
          </div>

          <button
            onClick={onCalculate}
            className="no-print mt-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white transition py-3 rounded-lg font-semibold text-lg"
          >
            Calculate
          </button>

          {/* Results */}
          {result && (
            <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg space-y-4 print-card">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <span className="text-emerald-700">Engineering Results</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <p>Total Load P = {format(result.totalWatts)} W</p>
                <p>Headroom m = {format(result.headroom, 2)} ⇒ P′ = <b>{format(result.sizedWatts)} W</b></p>
                <p>PF = {format(result.pf, 2)} | η = {format(result.eta, 2)} | Phase = {phase} | Topology = {topology}</p>
                <p>UPS VA = {format(result.upsVA)} VA → Suggested: <b>{result.suggestedUPS} VA</b></p>
                <p>DC Bus Vdc = {result.vdc} V via <b>{result.batteryCount}</b> × 12V blocks in series</p>
                <p>Discharge Current I = {format(result.dischargeCurrentA)} A</p>
                <p>Required C<sub>req</sub> per string = <b>{format(result.requiredAhPerString)} Ah</b></p>
                <p>Target t = {format(result.targetHours)} h, k = {format(result.k, 2)}, H = {result.H} h</p>
              </div>

              {/* battery selection */}
              <label className="block text-gray-600 text-sm mt-2">Select Battery size (Ah)</label>
              <input
                type="number"
                min={1}
                className={`${inputBase} w-full`}
                value={selectedAh ?? ""}
                onChange={(e) => {
                  const ah = Number(e.target.value);
                  setSelectedAh(ah);
                  if (ah > 0) recalcRuntime(ah, np);
                }}
                placeholder="e.g. 100"
              />

              {selectedAh && (
                <div className="grid sm:grid-cols-3 gap-2 items-end">
                  <div>
                    <label className="block text-gray-600 text-sm">Parallel strings (nₚ)</label>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      className={`${inputBase} w-full`}
                      value={np}
                      onChange={(e) => recalcRuntime(selectedAh, Number(e.target.value))}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <div className="bg-white p-3 rounded border border-gray-200 space-y-1">
                      <p>
                        Selected C<sub>sel</sub> = {selectedAh} Ah; n<sub>p</sub> = {np}; C<sub>eff</sub> = <b>{format(selectedAh * np)}</b> Ah
                      </p>
                      <p>
                        Runtime t′ = <b>{runtimeMin ? format(runtimeMin) : "0"} minutes</b>{" "}
                        {runtimeMin ? `(${format((runtimeMin as number) / 60)} h)` : ""}
                      </p>
                      <p>
                        Wiring: <strong>{result.batteryCount} in series</strong> × <strong>{np} parallel</strong> → total batteries = <strong>{result.batteryCount * np}</strong>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Conclusion */}
              {result && selectedAh && runtimeMin !== null && (
                <div className={`mt-2 rounded-xl p-4 border ${meets ? "border-emerald-300 bg-emerald-50" : "border-amber-300 bg-amber-50"}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {meets ? <CheckCircle2 className="text-emerald-600 w-5 h-5" /> : <AlertTriangle className="text-amber-600 w-5 h-5" />}
                    <h4 className="text-lg font-extrabold">{meets ? "Conclusion (Meets Target)" : "Conclusion (Adjust Needed)"}</h4>
                  </div>
                  <ul className="space-y-1 text-gray-900">
                    <li><strong>UPS to buy:</strong> <span className="font-extrabold">{result.suggestedUPS} VA</span> ({phase}, {topology})</li>
                    <li><strong>Battery layout:</strong> <span className="font-extrabold">{result.batteryCount} in series × {np} parallel</span> (total <strong>{result.batteryCount * np}</strong> batteries)</li>
                    <li><strong>Battery size (per 12 V unit):</strong> <span className="font-extrabold">{selectedAh} Ah</span></li>
                    <li><strong>Predicted runtime:</strong> <span className="font-extrabold">{format(runtimeMin)} minutes</span> ({format((runtimeMin as number) / 60)} h)</li>
                    <li><strong>Load used for sizing:</strong> <span className="font-extrabold">{format(result.sizedWatts)} W</span> (headroom ×{format(result.headroom, 2)})</li>
                  </ul>
                </div>
              )}

              {/* Show the math */}
              <details className="rounded-lg border border-gray-300 bg-white mt-2" open>
                <summary className="cursor-pointer select-none px-4 py-3 font-semibold flex items-center gap-2">
                  <Sigma className="w-5 h-5 text-emerald-700" />
                  Show the math (full spec + your numbers)
                </summary>
                <div className="px-4 pb-4 text-sm text-gray-800 space-y-4">
                  <div>
                    <h4 className="font-semibold">Symbols</h4>
                    <ul className="list-disc ml-5 space-y-1">
                      <li><b>P</b> — total real power (W): <b>{format(result.totalWatts)}</b></li>
                      <li><b>PF</b> — power factor (0.60–1.00): <b>{format(result.pf, 2)}</b></li>
                      <li><b>η</b> — inverter efficiency (0.75–0.98): <b>{format(result.eta, 2)}</b></li>
                      <li><b>H</b> — rated-hour reference: <b>{result.H} h</b></li>
                      <li><b>k</b> — Peukert exponent: <b>{format(result.k, 2)}</b></li>
                      <li><b>t</b> — target backup (h): <b>{format(result.targetHours)}</b></li>
                      <li><b>V<sub>dc</sub></b> — DC bus (V): <b>{result.vdc}</b></li>
                      <li><b>n<sub>s</sub></b> — series per string: <b>{result.batteryCount}</b></li>
                      <li><b>C<sub>req</sub></b> — required Ah per string: <b>{format(result.requiredAhPerString)}</b></li>
                    </ul>
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-semibold">Headroom</h4>
                    <p>P′ = P × m = <b>{format(result.totalWatts)}</b> × <b>{format(result.headroom, 2)}</b> = <b>{format(result.sizedWatts)} W</b></p>
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-semibold">1) UPS sizing</h4>
                    <p>UPS VA = P′ / PF = <b>{format(result.sizedWatts)}</b> / <b>{format(result.pf, 2)}</b> = <b>{format(result.upsVA)} VA</b> → pick <b>{result.suggestedUPS} VA</b></p>
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-semibold">2) DC bus</h4>
                    <p>Chosen V<sub>dc</sub> = <b>{result.vdc} V</b> → series n<sub>s</sub> = <b>{result.batteryCount}</b></p>
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-semibold">3) Discharge current</h4>
                    <p>I = P′ / (V<sub>dc</sub>·η) = <b>{format(result.sizedWatts)}</b> / (<b>{result.vdc}</b> × <b>{format(result.eta, 2)}</b>) = <b>{format(result.dischargeCurrentA)} A</b></p>
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-semibold">4) Peukert required capacity</h4>
                    <p>C<sub>req</sub> = (I·H)·(t/H)<sup>1/k</sup> = <b>{format(result.requiredAhPerString)} Ah</b> per string</p>
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-semibold">5) Strings for selected Ah (when chosen)</h4>
                    <p>n<sub>p,need</sub> = ceil(C<sub>req</sub> / C<sub>sel</sub>) ; parallel adds Ah, series adds voltage.</p>
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-semibold">6) Predicted runtime (when chosen)</h4>
                    <p>t′ = H·(C<sub>eff</sub> / (I·H))<sup>k</sup> ; report minutes = 60×t′.</p>
                  </div>
                </div>
              </details>
            </div>
          )}
        </section>

        <div className="text-xs text-gray-500 flex items-center gap-1">
          <Info className="w-4 h-4" /> Headroom presets: None (×1.00), Electronics (×1.25), Motor (×2.0–3.0).
        </div>
      </main>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          html, body {
            background: #ffffff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-card { break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}
