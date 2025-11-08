"use client";
import React, { useMemo, useState } from "react";
import { Calculator, Battery, Zap, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import {
  Device, Chem, Result, STANDARD_BATTERY_SIZES, MAX_STRINGS, COLORS,
  safeW, format, calculateIndustrial, runtimeFromSelection, defaultLibrary, HEADROOM
} from "@/lib/industrial";

import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";

type Props = {
  devices: Device[]; setDevices: React.Dispatch<React.SetStateAction<Device[]>>;
  addDevice: () => void; removeDevice: (i: number) => void;
  batteryType: Chem; setBatteryType: (c: Chem) => void;
  backupTimeMin: number; setBackupTimeMin: (n: number) => void;
  pf: number; setPf: (n: number) => void;
  eta: number; setEta: (n: number) => void;
  headroom: number; setHeadroom: (n: number) => void;

  result: Result | null; setResult: (r: Result | null) => void;

  selectedBatteryAh: number | null; setSelectedBatteryAh: (n: number | null) => void;
  stringCount: number; setStringCount: (n: number) => void;
  actualBackupMin: number | null; setActualBackupMin: (n: number | null) => void;
  meetsTarget: boolean | null; setMeetsTarget: (b: boolean | null) => void;
};

const inputBase = "h-10 px-3 rounded border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/30";
const btnBase = "h-10 px-4 rounded font-semibold transition-all duration-150 active:translate-y-px";

export default function IndustrialCalculatorSection(props: Props) {
  const {
    devices, setDevices, addDevice, removeDevice,
    batteryType, setBatteryType, backupTimeMin, setBackupTimeMin,
    pf, setPf, eta, setEta, headroom, setHeadroom,
    result, setResult,
    selectedBatteryAh, setSelectedBatteryAh,
    stringCount, setStringCount,
    actualBackupMin, setActualBackupMin,
    meetsTarget, setMeetsTarget,
  } = props;

  const [search, setSearch] = useState<string>("");
  const [searchIndex, setSearchIndex] = useState<number | null>(null);
  const [showMath, setShowMath] = useState<boolean>(false);

  const chartData = devices.filter((d) => d.name && safeW(d.watts)).map((d) => ({ name: d.name, value: d.watts }));
  const totals = useMemo(() => ({ P: devices.reduce((s, d) => s + safeW(d.watts), 0) }), [devices]);

  const onCalculate = () => {
    const r = calculateIndustrial(devices, batteryType, backupTimeMin, pf, eta, headroom);
    setResult(r);
    setSelectedBatteryAh(null);
    setStringCount(1);
    setActualBackupMin(null);
    setMeetsTarget(null);
    setShowMath(true);
  };

  const onSelectAh = (ah: number) => {
    if (!result) return;
    const { np, Ceff, t_min, meets } = runtimeFromSelection(result, ah, Math.ceil(result.requiredAhPerString / Math.max(ah, 1)));
    setSelectedBatteryAh(ah);
    setStringCount(np);
    setActualBackupMin(t_min);
    setMeetsTarget(meets);
  };

  const cRatePerString = selectedBatteryAh && result ? result.dischargeCurrentA / selectedBatteryAh : 0;

  return (
    <section className="bg-white border border-gray-200 p-6 rounded-2xl shadow w-full max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Calculator className="text-emerald-700 w-6 h-6" /> Industrial UPS &amp; Battery Calculator
        </h2>
        <button
          onClick={addDevice}
          className={`${btnBase} no-print inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow hover:shadow-md`}
          aria-label="Add device"
          title="Add a new device row"
        >
          + Add Device
        </button>
      </div>

      {/* Device rows */}
      {devices.map((device, i) => {
        const suggestions = defaultLibrary.filter(d => d.name.toLowerCase().includes((search ?? "").toLowerCase())).slice(0, 8);
        return (
          <div key={i} className="relative">
            <div className="grid grid-cols-12 gap-3 items-center">
              <div className="col-span-12 md:col-span-8">
                <label htmlFor={`device-name-${i}`} className="sr-only">Device name</label>
                <input
                  id={`device-name-${i}`}
                  type="text"
                  className={`${inputBase} w-full`}
                  placeholder="🔍 Search or type device name..."
                  value={device.name}
                  onChange={(e) => { const val = e.target.value; setDevices(prev => { const copy = [...prev]; copy[i] = { ...copy[i], name: val }; return copy; }); setSearchIndex(i); setSearch(val); }}
                  onFocus={() => setSearchIndex(i)}
                  aria-label="Device name"
                />
              </div>
              <div className="col-span-6 md:col-span-2">
                <label htmlFor={`device-watts-${i}`} className="sr-only">Watts</label>
                <input
                  id={`device-watts-${i}`}
                  type="number"
                  className={`${inputBase} w-full`}
                  placeholder="Watts"
                  value={device.watts || ""}
                  onChange={(e) => { const watts = Number(e.target.value); setDevices(prev => { const copy = [...prev]; copy[i] = { ...copy[i], watts }; return copy; }); }}
                  aria-label="Device watts"
                  min={0}
                />
              </div>
              <div className="col-span-6 md:col-span-2">
                <button
                  className={`${btnBase} w-full bg-red-600 hover:bg-red-700 text-white no-print`}
                  onClick={() => removeDevice(i)}
                  aria-label="Remove device"
                >
                  Remove
                </button>
              </div>
            </div>

            {search && searchIndex === i && (
              <div className="absolute z-10 left-0 right-0 mt-1 rounded max-h-48 overflow-y-auto border border-gray-300 bg-white no-print">
                {suggestions.length === 0 && <div className="p-2 text-sm text-gray-500">No matches</div>}
                {suggestions.map(d => (
                  <div
                    key={d.name}
                    onMouseDown={() => {
                      setDevices(prev => { const copy = [...prev]; copy[i] = { name: d.name, watts: d.watts }; return copy; });
                      setSearch(""); setSearchIndex(null);
                    }}
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
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
        <div>
          <label className="block text-gray-600 text-sm mb-1" htmlFor="battery-type">Battery Type</label>
          <select id="battery-type" className={`${inputBase} w-full`} value={batteryType} onChange={(e) => props.setBatteryType(e.target.value as Chem)}>
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
          <input id="pf" type="number" step={0.01} min={0.6} max={1} value={pf} onChange={(e) => setPf(Number(e.target.value))} className={`${inputBase} w-full`} />
        </div>
        <div>
          <label className="block text-gray-600 text-sm mb-1" htmlFor="eta">Inverter η</label>
          <input id="eta" type="number" step={0.01} min={0.75} max={0.98} value={eta} onChange={(e) => setEta(Number(e.target.value))} className={`${inputBase} w-full`} />
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
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-900 p-3 flex items-start gap-2">
        <Info className="w-5 h-5 mt-0.5" />
        <p className="text-sm"><strong>Add headroom:</strong> ×1.25 for electronics, ×2.0–3.0 for motor loads (inrush).</p>
      </div>

      <button onClick={onCalculate} className="no-print mt-2 w-full bg-emerald-600 hover:bg-emerald-700 transition py-3 rounded-lg font-semibold text-lg text-white" aria-label="Calculate">
        Calculate
      </button>

      {/* Results */}
      {result && (
        <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg space-y-4">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Battery className="text-emerald-700 w-5 h-5" /> Engineering Results
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

          {/* Battery selection */}
          <label className="block text-gray-600 text-sm" htmlFor="battery-ah">Select Battery Size (Ah)</label>
          <select
            id="battery-ah"
            className={`${inputBase} w-full`}
            value={selectedBatteryAh ?? ""}
            onChange={(e) => onSelectAh(Number(e.target.value))}
          >
            <option value="">-- Select Battery Size --</option>
            {STANDARD_BATTERY_SIZES.map(ah => <option key={ah} value={ah}>{ah} Ah</option>)}
          </select>

          {selectedBatteryAh && actualBackupMin !== null && (
            <div className="bg-white p-3 rounded border border-gray-200 space-y-1">
              <p>Selected C<sub>sel</sub> = {selectedBatteryAh} Ah × series nₛ = {result.batteryCount} (12 V each)</p>
              <p>Parallel strings nₚ = {stringCount} / Max {MAX_STRINGS}</p>
              <p>Runtime t′ = <b>{format(actualBackupMin)} min</b> ({format(actualBackupMin / 60)} h)</p>
              <p className={batteryType !== "lifepo4" && cRatePerString > 0.3 ? "text-amber-700 font-medium" : "text-gray-700"}>
                C-rate per string = {format(cRatePerString, 2)}C{batteryType !== "lifepo4" && cRatePerString > 0.3 && " — high for lead-acid; consider higher Ah or more strings."}
              </p>
              <p className="text-gray-700">Wiring: <strong>{result.batteryCount} in series</strong> × <strong>{stringCount} parallel</strong> → total batteries = <strong>{result.batteryCount * stringCount}</strong></p>
            </div>
          )}

          {/* Show the math */}
          <details open={showMath} onToggle={(e) => setShowMath((e.target as HTMLDetailsElement).open)} className="rounded-lg border border-gray-300 bg-white">
            <summary className="cursor-pointer select-none px-4 py-3 font-semibold">Show the math (full spec + your numbers)</summary>
            {result && (
              <div className="px-4 pb-4 text-sm text-gray-800 space-y-2">
                <p><b>Headroom:</b> P′ = P × m = <b>{format(result.totalWatts)}</b> × <b>{format(result.headroom,2)}</b> = <b>{format(result.sizedWatts)} W</b></p>
                <p><b>UPS sizing:</b> VA = P′ / PF = <b>{format(result.sizedWatts)}</b> / <b>{format(result.pf,2)}</b> = <b>{format(result.upsVA)} VA</b> → pick <b>{result.suggestedUPS} VA</b></p>
                <p><b>Discharge current:</b> I = P′ / (Vdc·η) = <b>{format(result.sizedWatts)}</b> / (<b>{result.vdc}</b> × <b>{format(result.eta,2)}</b>) = <b>{format(result.dischargeCurrentA)} A</b></p>
                <p><b>Peukert (required Ah per string):</b> C<sub>req</sub> = (I·H)·(t/H)<sup>1/k</sup> = <b>{format(result.requiredAhPerString)} Ah</b></p>
                <p><b>Runtime with selection:</b> t′ = H·(C<sub>eff</sub> / (I·H))<sup>k</sup> ⇒ minutes = <b>{selectedBatteryAh ? format(actualBackupMin ?? 0) : "-"}</b></p>
              </div>
            )}
          </details>

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
    </section>
  );
}
