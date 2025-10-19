"use client";
import { useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartTooltip,
  ResponsiveContainer,
} from "recharts";
import { Info } from "lucide-react";

/* ──────────────────────────────────────────────
   Device Library
────────────────────────────────────────────── */
const DEVICE_LIBRARY = [
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
  { name: "Television (48-inch OLED)", watts: 150 },
  { name: "Microwave Oven", watts: 1000 },
  { name: "Water Pump (1 HP)", watts: 750 },
  { name: "Iron", watts: 1000 },
  { name: "Hair Dryer", watts: 800 },
  { name: "Electric Kettle", watts: 1200 },
];

const STANDARD_UPS_SIZES = [600, 1000, 1500, 2000, 3000, 5000, 10000];
const STANDARD_BATTERY_SIZES = [7, 9, 18, 22, 42, 65, 100, 150];
const MAX_STRINGS = 3; // your rule: do not go beyond 3 strings

interface Device {
  name: string;
  watts: number;
}

interface Result {
  totalWatts: number;
  pf: number;
  eta: number;
  upsVA: number;
  suggestedUPS: number;
  vdc: number;
  batteryCount: number; // series count of 12V batteries
  // Required Ah *per string* to meet target time using Peukert (this is what we try to reach with up to 3 strings)
  requiredAhPerString: number;
  // Linear (for education/contrast) — not used for sizing anymore
  linearAhPerString: number;
  // Peukert exponent used
  k: number;
  // Target time (hours)
  targetHours: number;
  // Discharge current at load (A)
  dischargeCurrentA: number;
}

export default function HomeUpsPage() {
  const [devices, setDevices] = useState<Device[]>([{ name: "", watts: 0 }]);
  const [backupTimeMin, setBackupTimeMin] = useState<number>(30);
  const [searchIndex, setSearchIndex] = useState<number | null>(null);
  const [search, setSearch] = useState<string>("");
  const [batteryType, setBatteryType] = useState<string>("leadacid");
  const [result, setResult] = useState<Result | null>(null);

  // User selection: real battery size and strings derived
  const [selectedBatteryAh, setSelectedBatteryAh] = useState<number | null>(null);
  const [stringCount, setStringCount] = useState<number>(1);
  const [actualBackupMin, setActualBackupMin] = useState<number | null>(null);
  const [meetsTarget, setMeetsTarget] = useState<boolean | null>(null);

  // Typical Peukert exponents
  const PEUKERT_VALUES: Record<string, number> = {
    leadacid: 1.20,
    agm: 1.15,
    lifepo4: 1.05,
  };

  /* ──────────────────────────────────────────────
     Device handlers
  ─────────────────────────────────────────────── */
  const addDevice = () => setDevices([...devices, { name: "", watts: 0 }]);

  const removeDevice = (i: number) => {
    const copy = [...devices];
    copy.splice(i, 1);
    setDevices(copy.length ? copy : [{ name: "", watts: 0 }]);
  };

  const filteredDevices = DEVICE_LIBRARY.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (index: number, d: Device) => {
    const updated = [...devices];
    updated[index] = { name: d.name, watts: d.watts };
    setDevices(updated);
    setSearch("");
    setSearchIndex(null);
  };

  /* ──────────────────────────────────────────────
     Main sizing calc (uses Peukert to compute REQUIRED Ah)
  ─────────────────────────────────────────────── */
  const calculate = () => {
    const totalWatts = devices.reduce((s, d) => s + (d.watts || 0), 0);
    const pf = 0.8;      // power factor
    const eta = 0.8;     // inverter efficiency
    const upsVA = totalWatts / pf;

    const suggestedUPS =
      STANDARD_UPS_SIZES.find((s) => s >= upsVA) ||
      STANDARD_UPS_SIZES[STANDARD_UPS_SIZES.length - 1];

    // Select DC bus voltage & number of 12V batteries in series
    let vdc = 12;
    let batteryCount = 1;
    if (suggestedUPS > 1000 && suggestedUPS <= 2000) {
      vdc = 24; batteryCount = 2;
    } else if (suggestedUPS > 2000 && suggestedUPS <= 3000) {
      vdc = 36; batteryCount = 3;
    } else if (suggestedUPS > 3000 && suggestedUPS <= 5000) {
      vdc = 48; batteryCount = 4;
    } else if (suggestedUPS > 5000) {
      vdc = 96; batteryCount = 8;
    }

    const targetHours = backupTimeMin / 60;
    const k = PEUKERT_VALUES[batteryType];

    // Discharge current at the DC bus (A)
    // I = P / (V * η)
    const I = totalWatts > 0 ? totalWatts / (vdc * eta) : 0;

    // Linear (for explanation contrast only):
    // Ah_linear = (P * T) / (V * η)
    const linearAhPerString = totalWatts > 0
      ? (totalWatts * targetHours) / (vdc * eta)
      : 0;

    // Peukert sizing to meet targetHours:
    // t = H * (C / (I * H))^k  =>  C = (I * H) * (t/H)^(1/k)
    // We size "per string" capacity target; parallel strings multiply Ah.
    const H = 10; // 10-hour rating
    const requiredAhPerString =
      totalWatts > 0
        ? (I * H) * Math.pow(targetHours / H, 1 / k)
        : 0;

    setResult({
      totalWatts,
      pf,
      eta,
      upsVA,
      suggestedUPS,
      vdc,
      batteryCount,
      requiredAhPerString,
      linearAhPerString,
      k,
      targetHours,
      dischargeCurrentA: I,
    });

    // Reset user selection states
    setSelectedBatteryAh(null);
    setStringCount(1);
    setActualBackupMin(null);
    setMeetsTarget(null);
  };

  /* ──────────────────────────────────────────────
     Runtime calc for the SELECTED real battery
     - choose minimum strings to MEET required Ah, but cap at 3 strings
     - if cap reached and still below, show achievable time
  ─────────────────────────────────────────────── */
  const recalcRuntime = (selectedAh: number) => {
    if (!result) return;

    const { requiredAhPerString, totalWatts, vdc, eta, k } = result;

    // Needed strings to reach required Ah
    const neededStrings = Math.ceil(requiredAhPerString / selectedAh);
    const cappedStrings = Math.min(MAX_STRINGS, Math.max(1, neededStrings));


    // Effective capacity with capped strings
    const effectiveAh = selectedAh * cappedStrings;

    // Discharge current (A)
    const I = totalWatts / (vdc * eta);
    const H = 10;

    // Peukert runtime (hours)
    const t_hours = H * Math.pow(effectiveAh / (I * H), k);
    const t_min = t_hours * 60;

    // Do we meet or exceed the target with <= 3 strings?
    const meets = effectiveAh >= requiredAhPerString && neededStrings <= MAX_STRINGS;

    setStringCount(cappedStrings);
    setActualBackupMin(t_min);
    setMeetsTarget(meets);
  };

  const format = (n: number, d = 2) => Number.isFinite(n) ? Number(n.toFixed(d)) : 0;

  /* ──────────────────────────────────────────────
     Chart data
  ─────────────────────────────────────────────── */
  const COLORS = ["#34d399", "#60a5fa", "#fbbf24", "#f87171", "#a78bfa", "#fb923c"];
  const chartData = devices
    .filter((d) => d.name && d.watts)
    .map((d) => ({ name: d.name, value: d.watts }));

  /* ──────────────────────────────────────────────
     UI
  ─────────────────────────────────────────────── */
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-6 flex flex-col items-center">
{/* ─────────────── UPS TYPE EXPLANATION ─────────────── */}
<section className="bg-gray-800/70 border border-gray-700 rounded-2xl p-6 mb-8 max-w-3xl text-gray-200">
  <h2 className="text-2xl font-semibold mb-3 flex items-center gap-2">
    ⚡ Why Choose an Offline or Line-Interactive UPS?
  </h2>

  <p className="mb-3">
    For most homes and small offices, <strong>Offline</strong> (Standby) or 
    <strong> Line-Interactive UPS</strong> units are the better choice compared to 
    <strong> Online (Double-Conversion) UPS</strong>.
  </p>

  <ul className="list-disc ml-6 space-y-2 text-sm">
    <li><strong>Higher Efficiency:</strong> They deliver power directly from the grid until an outage,
      reaching 96–98% efficiency versus only 85–90% for online UPS.</li>
    <li><strong>Less Fan Noise &amp; Heat:</strong> Because the inverter runs only during backup,
      there’s little continuous heat or fan sound—perfect for bedrooms or study rooms.</li>
    <li><strong>Lower Power Consumption:</strong> Online UPS constantly convert AC→DC→AC,
      wasting energy even when idle. Line-interactive units draw minimal standby current.</li>
    <li><strong>Longer Battery Life:</strong> Batteries rest until actually needed, reducing wear.</li>
    <li><strong>Cost-Effective:</strong> Usually 30–50% cheaper for the same load rating.</li>
  </ul>

  <div className="mt-5 text-center">
    <img
      src="/ups-types-diagram.png"
      alt="Offline vs Line-Interactive vs Online UPS diagram"
      className="mx-auto rounded-xl shadow-lg border border-gray-600 max-w-full"
    />
    <p className="text-xs text-gray-400 mt-2">
      (Offline &amp; Line-Interactive UPS pass utility power directly until an outage.
      Online UPS always run through the inverter—quieter and less efficient.)
    </p>
  </div>

  <h3 className="text-lg font-semibold mt-6 mb-2">🧮 How to Size a Home UPS</h3>
  <p className="text-sm leading-6">
    1️⃣ Add up your essential devices’ wattage to get total load (W).<br />
    2️⃣ Divide by <strong>0.8</strong> to convert watts to VA (UPS rating).<br />
    3️⃣ Decide your desired backup time (e.g., 30 min).<br />
    4️⃣ The calculator below uses <strong>Peukert’s Law</strong> to estimate 
    realistic battery capacity and runtime, considering inverter efficiency and 
    battery chemistry.
  </p>
</section>

      <h1 className="text-3xl font-bold mb-4">🏠 UPS & Battery Calculator (Peukert-Corrected)</h1>
      <p className="text-gray-300 text-center max-w-3xl mb-6">
        Realistic sizing with <strong>non-linear battery discharge</strong>.  
        Pick a real battery size, we’ll add up to <strong>{MAX_STRINGS} parallel strings</strong>.  
        If that still can’t reach your target time, we show the <strong>best achievable runtime</strong>.
      </p>

      <div className="bg-gray-800 p-6 rounded-2xl shadow-lg w-full max-w-3xl">
        {/* Device inputs */}
        {devices.map((device, i) => (
          <div key={i} className="mb-5 relative">
            <input
              type="text"
              className="w-full p-2 rounded bg-gray-700 text-white"
              placeholder="🔍 Search or type device name..."
              value={device.name}
              onChange={(e) => {
                setSearch(e.target.value);
                setSearchIndex(i);
                const copy = [...devices];
                copy[i].name = e.target.value;
                setDevices(copy);
              }}
              onFocus={() => setSearchIndex(i)}
            />
            {search && searchIndex === i && (
              <div className="absolute z-10 bg-gray-700 w-full mt-1 rounded max-h-40 overflow-y-auto border border-gray-600">
                {filteredDevices.slice(0, 8).map((d) => (
                  <div
                    key={d.name}
                    onMouseDown={() => handleSelect(i, d)}
                    className="p-2 hover:bg-gray-600 cursor-pointer"
                  >
                    {d.name} — {d.watts} W
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3 mt-2 items-center">
              <input
                type="number"
                className="w-32 p-2 rounded bg-gray-700 text-white"
                placeholder="Watts"
                value={device.watts || ""}
                onChange={(e) => {
                  const copy = [...devices];
                  copy[i].watts = Number(e.target.value);
                  setDevices(copy);
                }}
              />
              <button
                className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded"
                onClick={() => removeDevice(i)}
              >
                Remove
              </button>
            </div>
          </div>
        ))}

        {/* Controls */}
        <div className="flex gap-3 items-center">
          <button
            onClick={addDevice}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
          >
            + Add Device
          </button>

          <div className="ml-auto flex items-end gap-3">
            <div>
              <label className="block text-gray-400 text-sm">Battery Type</label>
              <select
                className="bg-gray-700 text-white p-2 rounded"
                value={batteryType}
                onChange={(e) => setBatteryType(e.target.value)}
              >
                <option value="leadacid">Lead-Acid (k=1.20)</option>
                <option value="agm">AGM / Gel (k=1.15)</option>
                <option value="lifepo4">LiFePO₄ (k=1.05)</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-400 text-sm">Target Backup (minutes)</label>
              <input
                type="number"
                min={1}
                step={1}
                value={backupTimeMin}
                onChange={(e) => setBackupTimeMin(Number(e.target.value))}
                className="w-28 p-2 rounded bg-gray-700 text-white"
              />
            </div>
          </div>
        </div>

        <button
          onClick={calculate}
          className="mt-6 w-full bg-green-600 hover:bg-green-700 transition py-3 rounded-lg font-semibold text-lg"
        >
          Calculate
        </button>

        {/* Results */}
        {result && (
          <div className="mt-6 bg-gray-700 p-4 rounded-lg space-y-5">
            <h2 className="text-xl font-bold">📘 Step-by-Step Calculations</h2>

            <div className="text-sm leading-7">
              <p><strong>Step 1 — Total Load</strong></p>
              <p>
                P<sub>total</sub> = Σ P<sub>i</sub> = {devices.map((d) => d.watts || 0).join(" + ")} ={" "}
                {format(result.totalWatts, 1)} W
              </p>
            </div>

            <div className="text-sm leading-7">
              <p className="font-semibold">Step 2 — UPS Capacity (VA)</p>
              <p>
                UPS<sub>VA</sub> = P<sub>total</sub> / PF =
                {" "}{format(result.totalWatts,1)} / {result.pf} =
                {" "}{format(result.upsVA,1)} VA
              </p>
              <p className="text-gray-300">
                Suggested standard UPS: <strong>{result.suggestedUPS} VA</strong>
              </p>
            </div>

            <div className="text-sm leading-7">
              <p className="font-semibold">Step 3 — Choose DC Bus & Series Batteries</p>
              <p>
                V<sub>DC</sub> = <strong>{result.vdc} V</strong>,
                {" "}Series batteries = <strong>{result.batteryCount} × 12 V</strong>
              </p>
            </div>

            <div className="text-sm leading-7">
              <p className="font-semibold">Step 4 — Discharge Current at DC Side</p>
              <p>
                I = P / (V × η) = {format(result.totalWatts,1)} / ({result.vdc} × {result.eta}) =
                {" "}<strong>{format(result.dischargeCurrentA,2)} A</strong>
              </p>
            </div>

            <div className="text-sm leading-7">
              <p className="font-semibold">Step 5 — REQUIRED Capacity using Peukert (for your target time)</p>
              <p>
                Peukert: t = H × (C / (I × H))<sup>k</sup> ⇒
                {" "}C = (I × H) × (t/H)<sup>1/k</sup>
              </p>
              <p>
                H = 10 h, k = {result.k}. Target t = {format(result.targetHours,2)} h
              </p>
              <p>
                C<sub>required per string</sub> = ( {format(result.dischargeCurrentA,2)} × 10 ) ×
                {" "}( {format(result.targetHours,2)} / 10 )<sup>1/{result.k}</sup> =
                {" "}<strong>{format(result.requiredAhPerString,2)} Ah</strong>
              </p>
              <p className="text-gray-400">
                (Linear reference — not used for sizing: A·h<sub>linear</sub> = (P × t) / (V × η) ={" "}
                {format(result.linearAhPerString,2)} Ah)
              </p>
            </div>

            <div className="border-t border-gray-600 pt-4 text-sm leading-7">
              <p className="font-semibold">Step 6 — Select Real Battery & Auto-Strings (max {MAX_STRINGS})</p>

              <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                <div>
                  <label className="block text-gray-400 text-xs mb-1">Battery Size (Ah)</label>
                  <select
                    className="bg-gray-700 text-white p-2 rounded"
                    value={selectedBatteryAh ?? ""}
                    onChange={(e) => {
                      const ah = Number(e.target.value);
                      setSelectedBatteryAh(ah);
                      recalcRuntime(ah);
                    }}
                  >
                    <option value="">-- choose --</option>
                    {STANDARD_BATTERY_SIZES.map((ah) => (
                      <option key={ah} value={ah}>{ah} Ah</option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedBatteryAh && actualBackupMin !== null && (
                <div className="mt-3 bg-gray-800 p-3 rounded">
                  <p>Selected battery: <strong>{selectedBatteryAh} Ah</strong> × {result.batteryCount} (in series)</p>
                  <p>Parallel strings auto-chosen: <strong>{stringCount}</strong> (capped at {MAX_STRINGS})</p>
                  <p>Total batteries: <strong>{result.batteryCount * stringCount}</strong></p>
                  <p>Effective capacity: <strong>{selectedBatteryAh * stringCount} Ah @ {result.vdc} V</strong></p>
                  <p className="mt-1">
                    Peukert runtime: <strong>{format(actualBackupMin / 60, 2)} h</strong>{" "}
                    ({format(actualBackupMin,1)} min)
                  </p>

                  {meetsTarget === true && (
                    <p className="text-emerald-400 mt-1">
                      ✅ Meets or exceeds your target of {format(result.targetHours,2)} h with ≤ {MAX_STRINGS} strings.
                    </p>
                  )}
                  {meetsTarget === false && (
                    <p className="text-amber-300 mt-1">
                      ⚠️ With ≤ {MAX_STRINGS} strings, the best achievable runtime is{" "}
                      <strong>{format(actualBackupMin/60,2)} h</strong>, which is below your target of{" "}
                      {format(result.targetHours,2)} h. Consider a larger Ah battery or reducing load.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Distribution chart */}
            {chartData.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-2">📊 Load Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name }) => name}
                      outerRadius={120}
                      dataKey="value"
                    >
                      {chartData.map((_, idx) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="text-xs text-gray-300 flex gap-2 items-start">
              <Info className="w-4 h-4 mt-0.5" />
              <p>
                Why the linear step is “not true”: actual capacity drops at higher current.
                Peukert’s law (exponent k) corrects this. Lead-acid loses the most (k≈1.20),
                LiFePO₄ is close to linear (k≈1.05).
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
