"use client";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer,
} from "recharts";
import { Calculator, Battery, Zap, PlusCircle, Info, Sigma, CheckCircle2, AlertTriangle } from "lucide-react";
import {
  Device, Chem, Result, STANDARD_BATTERY_SIZES, MAX_STRINGS, COLORS, safeW, format, HEADROOM,
} from "../lib/ups";

type Props = {
  devices: Device[];
  setDevices: React.Dispatch<React.SetStateAction<Device[]>>;
  addDevice: () => void;
  removeDevice: (i: number) => void;
  batteryType: Chem; setBatteryType: (c: Chem) => void;
  backupTimeMin: number; setBackupTimeMin: (n: number) => void;
  pf: number; setPf: (n: number) => void;
  eta: number; setEta: (n: number) => void;
  headroom: number; setHeadroom: (n: number) => void;
  result: Result | null;
  selectedBatteryAh: number | null; setSelectedBatteryAh: (n: number | null) => void;
  stringCount: number; actualBackupMin: number | null; meetsTarget: boolean | null;
  calculate: () => void; recalcRuntime: (ah: number) => void;
  search: string; setSearch: (s: string) => void;
  searchIndex: number | null; setSearchIndex: (i: number | null) => void;
  onSelectLibraryItem: (index: number, d: Device) => void;
};

const LIBRARY: Device[] = [
  { name: "LED Bulb (10W)", watts: 10 },
  { name: "Ceiling Fan", watts: 75 },
  { name: "WiFi Router", watts: 15 },
  { name: "Laptop", watts: 65 },
  { name: "Desktop PC", watts: 250 },
  { name: "Refrigerator (Single Door)", watts: 120 },
  { name: "Refrigerator (Double Door)", watts: 250 },
  { name: "Air Conditioner (1 Ton)", watts: 1200 },
  { name: "Air Conditioner (1.5 Ton)", watts: 1800 },
  { name: "Television (32-inch LED)", watts: 80 },
  { name: "Microwave Oven", watts: 1000 },
  { name: "Water Pump (1 HP)", watts: 750 },
  { name: "Iron", watts: 1000 },
  { name: "Hair Dryer", watts: 800 },
  { name: "Electric Kettle", watts: 1200 },
];

const inputBase = "h-10 px-3 rounded bg-gray-100 text-gray-900 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-600/30";
const btnBase = "h-10 px-4 rounded font-medium transition-all duration-150 active:translate-y-px";

export default function CalculatorSection(props: Props) {
  const {
    devices, setDevices, addDevice, removeDevice,
    batteryType, setBatteryType, backupTimeMin, setBackupTimeMin,
    pf, setPf, eta, setEta, headroom, setHeadroom,
    result, selectedBatteryAh, setSelectedBatteryAh,
    stringCount, actualBackupMin, meetsTarget,
    calculate, recalcRuntime,
    search, setSearch, searchIndex, setSearchIndex, onSelectLibraryItem,
  } = props;

  const [showMath, setShowMath] = useState(false);

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

  return (
    <motion.section initial={false} animate={{ opacity: 1, y: 0 }} className="bg-white border border-gray-200 p-6 rounded-2xl shadow w-full max-w-3xl space-y-6">
      {/* Title + Add */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Calculator className="text-green-600 w-6 h-6" /> UPS &amp; Battery Calculator
        </h2>
        <button onClick={addDevice} className={`${btnBase} no-print inline-flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow hover:shadow-md`} aria-label="Add device" title="Add a new device row" suppressHydrationWarning>
          <PlusCircle className="w-5 h-5" /> Add Device
        </button>
      </div>

      {/* Device rows */}
      {devices.map((device, i) => {
        const suggestions = LIBRARY.filter(d => d.name.toLowerCase().includes((search ?? "").toLowerCase())).slice(0, 8);
        return (
          <div key={i} className="relative">
            <div className="grid grid-cols-12 gap-3 items-center">
              <div className="col-span-12 md:col-span-8">
                <label htmlFor={`device-name-${i}`} className="sr-only">Device name</label>
                <input id={`device-name-${i}`} type="text" className={`${inputBase} w-full`} placeholder="🔍 Search or type device name..." value={device.name}
                  onChange={(e) => { const val = e.target.value; setDevices(prev => { const copy = [...prev]; copy[i] = { ...copy[i], name: val }; return copy; }); setSearchIndex(i); setSearch(val); }}
                  onFocus={() => setSearchIndex(i)} aria-label="Device name" suppressHydrationWarning />
              </div>
              <div className="col-span-6 md:col-span-2">
                <label htmlFor={`device-watts-${i}`} className="sr-only">Watts</label>
                <input id={`device-watts-${i}`} type="number" className={`${inputBase} w-full`} placeholder="Watts" value={device.watts || ""}
                  onChange={(e) => { const watts = Number(e.target.value); setDevices(prev => { const copy = [...prev]; copy[i] = { ...copy[i], watts }; return copy; }); }}
                  aria-label="Device watts" min={0} suppressHydrationWarning />
              </div>
              <div className="col-span-6 md:col-span-2">
                <button className={`${btnBase} w-full bg-red-600 hover:bg-red-700 text-white no-print`} onClick={() => removeDevice(i)} aria-label="Remove device" suppressHydrationWarning>
                  Remove
                </button>
              </div>
            </div>

            {search && searchIndex === i && (
              <div className="absolute z-10 left-0 right-0 mt-1 rounded max-height-40 overflow-y-auto border border-gray-300 bg-white no-print">
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

      {/* Controls (bottom-aligned + no-wrap labels) */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
        <div>
          <label className="block text-gray-600 text-sm mb-1 whitespace-nowrap" htmlFor="battery-type">Battery Type</label>
          <select id="battery-type" className={`${inputBase} w-full`} value={batteryType} onChange={(e) => props.setBatteryType(e.target.value as Chem)} suppressHydrationWarning>
            <option value="leadacid">Lead-Acid (k=1.20, H=20h)</option>
            <option value="agm">AGM / Gel (k=1.15, H=20h)</option>
            <option value="lifepo4">LiFePO₄ (k=1.05, H=1h)</option>
          </select>
        </div>
        <div>
          <label className="block text-gray-600 text-sm mb-1 whitespace-nowrap" htmlFor="target-min">Target Backup (minutes)</label>
          <input id="target-min" type="number" value={backupTimeMin} onChange={(e) => setBackupTimeMin(Number(e.target.value))} className={`${inputBase} w-full`} min={0} suppressHydrationWarning />
        </div>
        <div>
          <label className="block text-gray-600 text-sm mb-1 whitespace-nowrap" htmlFor="pf">Power Factor</label>
          <input id="pf" type="number" step={0.01} min={0.6} max={1} value={pf} onChange={(e) => setPf(Number(e.target.value))} className={`${inputBase} w-full`} suppressHydrationWarning />
        </div>
        <div>
          <label className="block text-gray-600 text-sm mb-1 whitespace-nowrap" htmlFor="eta">Inverter η</label>
          <input id="eta" type="number" step={0.01} min={0.75} max={0.98} value={eta} onChange={(e) => setEta(Number(e.target.value))} className={`${inputBase} w-full`} suppressHydrationWarning />
        </div>
        <div>
          <label className="block text-gray-600 text-sm mb-1 whitespace-nowrap" htmlFor="headroom">Headroom</label>
          <select id="headroom" className={`${inputBase} w-full`} value={headroom} onChange={(e) => setHeadroom(Number(e.target.value))} suppressHydrationWarning>
            <option value={HEADROOM.none}>None (×1.00)</option>
            <option value={HEADROOM.electronics}>Electronics (×1.25)</option>
            <option value={HEADROOM.motor2_0}>Motor (×2.0)</option>
            <option value={HEADROOM.motor2_5}>Motor (×2.5)</option>
            <option value={HEADROOM.motor3_0}>Motor (×3.0)</option>
          </select>
        </div>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-900 p-3 flex items-start gap-2">
        <Info className="w-5 h-5 mt-0.5" />
        <p className="text-sm"><strong>Add headroom:</strong> ×1.25 for electronics, ×2.0–3.0 for motor loads (to handle inrush).</p>
      </div>

      <button onClick={calculate} className="no-print mt-2 w-full bg-green-600 hover:bg-green-700 transition py-3 rounded-lg font-semibold text-lg text-white" aria-label="Calculate" suppressHydrationWarning>
        Calculate
      </button>

      {/* Results */}
      {result && (
        <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg space-y-4 print-card">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Battery className="text-green-600 w-5 h-5" /> Engineering Results
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <p>Total Load P = {format(result.totalWatts)} W</p>
            <p>Headroom m = {format(result.headroom, 2)} ⇒ P′ = {format(result.sizedWatts)} W</p>
            <p>PF = {format(result.pf, 2)} | η = {format(result.eta, 2)}</p>
            <p>UPS VA = {format(result.upsVA)} VA → Suggested: <b>{result.suggestedUPS} VA</b></p>
            <p>DC Bus Vdc = {result.vdc} V (series nₛ = {result.batteryCount})</p>
            <p>Discharge Current I = {format(result.dischargeCurrentA)} A</p>
            <p>Required C<sub>req</sub> per string = <b>{format(result.requiredAhPerString)} Ah</b></p>
            <p>Target t = {format(result.targetHours)} h, k = {format(result.k, 2)}, H = {result.H} h</p>
          </div>

          {/* Pick battery size */}
          <label className="block text-gray-600 text-sm" htmlFor="battery-ah">Select Battery Size (Ah)</label>
          <select id="battery-ah" className={`${inputBase} w-full`} value={selectedBatteryAh ?? ""} onChange={(e) => { const ah = Number(e.target.value); props.setSelectedBatteryAh(ah); recalcRuntime(ah); setShowMath(true); }} suppressHydrationWarning>
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

          {/* FULL “Show the math” */}
          {result && (
            <details open={showMath} onToggle={(e) => setShowMath((e.target as HTMLDetailsElement).open)} className="rounded-lg border border-gray-300 bg-white">
              <summary className="cursor-pointer select-none px-4 py-3 font-semibold flex items-center gap-2">
                <Sigma className="w-5 h-5 text-green-700" />
                Show the math (full spec + your numbers)
              </summary>
              <div className="px-4 pb-4 text-sm text-gray-800 space-y-4">
                <div>
                  <h4 className="font-semibold">Symbols</h4>
                  <ul className="list-disc ml-5 space-y-1">
                    <li><b>P</b> — total real power (W): <b>{format(math!.P)}</b></li>
                    <li><b>PF</b> — power factor (0.60–1.00): <b>{format(math!.PF,2)}</b></li>
                    <li><b>η</b> — inverter efficiency (0.75–0.98): <b>{format(math!.eff,2)}</b></li>
                    <li><b>H</b> — rated-hour reference: <b>{math!.H} h</b></li>
                    <li><b>k</b> — Peukert exponent: <b>{format(math!.k,2)}</b></li>
                    <li><b>t</b> — target backup (h): <b>{format(math!.t)}</b></li>
                    <li><b>V<sub>dc</sub></b> — DC bus (V): <b>{math!.Vdc}</b></li>
                    <li><b>n<sub>s</sub></b> — series per string: <b>{math!.ns}</b></li>
                    <li><b>n<sub>p</sub></b> — parallel strings: <b>{math!.np}</b></li>
                    <li><b>C<sub>req</sub></b> — required Ah per string: <b>{format(math!.Creq)}</b></li>
                    <li><b>C<sub>sel</sub></b> — chosen battery Ah: <b>{format(math!.Csel)}</b></li>
                  </ul>
                </div>

                <div className="space-y-1">
                  <h4 className="font-semibold">Headroom</h4>
                  <p>P′ = P × m = <b>{format(math!.P)}</b> × <b>{format(math!.m,2)}</b> = <b>{format(math!.Pp)}</b> W</p>
                </div>

                <div className="space-y-1">
                  <h4 className="font-semibold">1) UPS sizing</h4>
                  <p>UPS VA = P′ / PF = <b>{format(math!.Pp)}</b> / <b>{format(math!.PF,2)}</b> = <b>{format(math!.UPS_VA)}</b> VA → pick <b>{math!.UPS_pick} VA</b></p>
                </div>

                <div className="space-y-1">
                  <h4 className="font-semibold">2) DC bus</h4>
                  <p>Chosen V<sub>dc</sub> = <b>{math!.Vdc} V</b> → series n<sub>s</sub> = <b>{math!.ns}</b></p>
                </div>

                <div className="space-y-1">
                  <h4 className="font-semibold">3) Discharge current</h4>
                  <p>I = P′ / (V<sub>dc</sub>·η) = <b>{format(math!.Pp)}</b> / (<b>{math!.Vdc}</b> × <b>{format(math!.eff,2)}</b>) = <b>{format(math!.I)}</b> A</p>
                </div>

                <div className="space-y-1">
                  <h4 className="font-semibold">4) Peukert required capacity</h4>
                  <p>C<sub>req</sub> = (I·H)·(t/H)<sup>1/k</sup> = <b>{format(math!.Creq)}</b> Ah per string</p>
                </div>

                <div className="space-y-1">
                  <h4 className="font-semibold">5) Strings for selected Ah</h4>
                  <p>n<sub>p,need</sub> = ceil(C<sub>req</sub> / C<sub>sel</sub>) ; we clamp to max {MAX_STRINGS}. Current n<sub>p</sub> = <b>{math!.np}</b>; C<sub>eff</sub> = C<sub>sel</sub>·n<sub>p</sub> = <b>{format(math!.Ceff)}</b> Ah</p>
                  <p>Total batteries = n<sub>s</sub>·n<sub>p</sub> = <b>{math!.ns * math!.np}</b></p>
                </div>

                <div className="space-y-1">
                  <h4 className="font-semibold">6) Predicted runtime</h4>
                  <p>t′ = H·(C<sub>eff</sub> / (I·H))<sup>k</sup> = <b>{format(math!.tPrime)}</b> h = <b>{format(math!.tPrimeMin)}</b> min</p>
                </div>

                <div className="space-y-1">
                  <h4 className="font-semibold">7) C-rate sanity</h4>
                  <p>C-rate per string = I / C<sub>sel</sub> = <b>{format(math!.cRate,2)}C</b> (for lead-acid aim ≤ 0.3C)</p>
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
                    {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <RechartsTooltip wrapperClassName="recharts-default-tooltip no-print" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Bold Conclusion */}
          {result && selectedBatteryAh && actualBackupMin !== null && (
            <div className={`mt-4 rounded-xl p-4 border ${meetsTarget ? "border-emerald-300 bg-emerald-50" : "border-amber-300 bg-amber-50"}`}>
              <div className="flex items-center gap-2 mb-2">
                {meetsTarget ? <CheckCircle2 className="text-emerald-600 w-5 h-5" /> : <AlertTriangle className="text-amber-600 w-5 h-5" />}
                <h4 className="text-lg font-extrabold">{meetsTarget ? "Conclusion (Meets Target)" : "Conclusion (Adjust Needed)"}</h4>
              </div>
              <ul className="space-y-1 text-gray-900">
                <li><strong>UPS to buy:</strong> <span className="font-extrabold">{result.suggestedUPS} VA</span></li>
                <li><strong>Battery layout:</strong> <span className="font-extrabold">{result.batteryCount} in series × {stringCount} parallel</span> (total <strong>{result.batteryCount * stringCount}</strong> batteries)</li>
                <li><strong>Battery size (per 12 V unit):</strong> <span className="font-extrabold">{selectedBatteryAh} Ah</span></li>
                <li><strong>Predicted runtime:</strong> <span className="font-extrabold">{format(actualBackupMin)} minutes</span> ({format(actualBackupMin / 60)} h)</li>
                <li><strong>Load used for sizing:</strong> <span className="font-extrabold">{format(result.sizedWatts)} W</span> (headroom ×{format(result.headroom, 2)})</li>
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="text-xs text-gray-500 flex items-center gap-1">
        <Info className="w-4 h-4" /> Headroom presets: None (×1.00), Electronics (×1.25), Motor (×2.0–3.0).
      </div>
    </motion.section>
  );
}
