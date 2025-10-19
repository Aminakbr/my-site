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
  { name: "Sony 48-inch OLED TV", watts: 145 },
  { name: "LG 55-inch OLED TV", watts: 190 },
  { name: "Samsung 65-inch QLED TV", watts: 230 },
  { name: "Microwave Oven", watts: 1000 },
  { name: "Water Pump (1 HP)", watts: 750 },
  { name: "Iron", watts: 1000 },
  { name: "Hair Dryer", watts: 800 },
  { name: "Electric Kettle", watts: 1200 },
];

const STANDARD_UPS_SIZES = [600, 1000, 1500, 2000, 3000, 5000, 10000];
const STANDARD_BATTERY_SIZES = [7, 9, 18, 22, 42, 65, 100, 150];

interface Device {
  name: string;
  watts: number;
}

export default function HomeUpsPage() {
  const [devices, setDevices] = useState<Device[]>([{ name: "", watts: 0 }]);
  const [backupTimeMin, setBackupTimeMin] = useState<number>(30);
  const [searchIndex, setSearchIndex] = useState<number | null>(null);
  const [search, setSearch] = useState<string>("");
  interface Result {
  totalWatts: number;
  pf: number;
  eta: number;
  upsVA: number;
  suggestedUPS: number;
  vdc: number;
  batteryCount: number;
  batteryAhEach: number;
}

const [result, setResult] = useState<Result | null>(null);

  const [selectedBatteryAh, setSelectedBatteryAh] = useState<number | null>(null);
  const [stringCount, setStringCount] = useState<number>(1);
  const [actualBackupMin, setActualBackupMin] = useState<number | null>(null);

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

  const calculate = () => {
    const totalWatts = devices.reduce((s, d) => s + (d.watts || 0), 0);
    const pf = 0.8;
    const eta = 0.8;
    const upsVA = totalWatts / pf;
    const suggestedUPS =
      STANDARD_UPS_SIZES.find((s) => s >= upsVA) ||
      STANDARD_UPS_SIZES[STANDARD_UPS_SIZES.length - 1];

    let vdc = 12;
    let batteryCount = 1;
    if (suggestedUPS > 1000 && suggestedUPS <= 2000) {
      vdc = 24;
      batteryCount = 2;
    } else if (suggestedUPS > 2000 && suggestedUPS <= 3000) {
      vdc = 36;
      batteryCount = 3;
    } else if (suggestedUPS > 3000 && suggestedUPS <= 5000) {
      vdc = 48;
      batteryCount = 4;
    } else if (suggestedUPS > 5000) {
      vdc = 96;
      batteryCount = 8;
    }

    const batteryAhTotal = (totalWatts * backupTimeMin) / (vdc * eta * 60);
    const batteryAhEach = batteryAhTotal;

    setResult({
      totalWatts,
      pf,
      eta,
      upsVA,
      suggestedUPS,
      vdc,
      batteryCount,
      batteryAhEach,
    });

    // reset selection
    setSelectedBatteryAh(null);
    setStringCount(1);
    setActualBackupMin(null);
  };

  const recalcRuntime = (ah: number) => {
    if (!result) return;
    const { totalWatts, vdc, eta, batteryAhEach } = result;
    const strings = Math.ceil(batteryAhEach / ah);
    setStringCount(strings);
    const runtime = (ah * strings * vdc * eta * 60) / totalWatts;
    setActualBackupMin(runtime);
  };

  const format = (n: number, d = 1) => Number(n.toFixed(d));

  const COLORS = [
    "#34d399",
    "#60a5fa",
    "#fbbf24",
    "#f87171",
    "#a78bfa",
    "#fb923c",
  ];

  const chartData = devices
    .filter((d) => d.name && d.watts)
    .map((d) => ({ name: d.name, value: d.watts }));

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-6 flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-4">🏠 Home UPS Calculator (Pro+)</h1>
      <p className="text-gray-300 text-center max-w-2xl mb-6">
        Smart UPS & battery sizing tool — now with realistic battery options,
        string calculation, and runtime estimation.
      </p>

      <div className="bg-gray-800 p-6 rounded-2xl shadow-lg w-full max-w-3xl">
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

        <div className="flex gap-3 items-center">
          <button
            onClick={addDevice}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
          >
            + Add Device
          </button>

          <div className="ml-auto">
            <label className="block text-gray-400 text-sm">
              Backup Time (minutes)
            </label>
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

        <button
          onClick={calculate}
          className="mt-6 w-full bg-green-600 hover:bg-green-700 transition py-3 rounded-lg font-semibold text-lg"
        >
          Calculate
        </button>

        {result && (
          <div className="mt-6 bg-gray-700 p-4 rounded-lg space-y-4">
            <h2 className="text-xl font-bold mb-2">
              📘 Step-by-Step Engineering Explanation
            </h2>

            <div className="flex items-start gap-2">
              <Info className="w-5 h-5 mt-1 text-blue-400" />
              <p className="text-gray-300 text-sm">
                UPS systems are rated in VA (Volt-Amperes). To size the UPS, we
                convert total power (Watts) into VA using Power Factor (PF).
              </p>
            </div>

            <div>
              <p className="font-semibold">Step 1 — Total Load (W)</p>
              <p>
                Pₜₒₜₐₗ = Σ Pᵢ = {devices.map((d) => `${d.watts}`).join(" + ")} ={" "}
                {format(result.totalWatts)} W
              </p>
            </div>

            <div>
              <p className="font-semibold">Step 2 — UPS Capacity (VA)</p>
              <p>
                UPS_VA = Pₜₒₜₐₗ / PF = {format(result.totalWatts)} / {result.pf} ={" "}
                {format(result.upsVA)} VA
              </p>
              <p className="text-gray-400 text-sm mt-1">
                A power factor of 0.8 means your UPS must supply more apparent
                power than the real power drawn.
              </p>
            </div>

            <div>
              <p className="font-semibold">
                Step 3 — Battery Capacity and Configuration
              </p>
              <p>
                Ah_total = (Pₜₒₜₐₗ × Backup Time) ÷ (V_DC × η × 60)
                <br />
                = ({format(result.totalWatts)} × {backupTimeMin}) ÷ (
                {result.vdc} × {result.eta} × 60)
                <br />
                = {format(result.batteryAhEach, 2)} Ah
              </p>
              <p className="mt-2 text-gray-300">
                ⚙️ UPS Bus Voltage: <strong>{result.vdc} V DC</strong>
                <br />
                🔋 Batteries in series:{" "}
                <strong>{result.batteryCount} × 12V</strong>
              </p>
            </div>

            <div className="border-t border-gray-600 pt-3">
              <p>
                <strong>Total Load:</strong> {format(result.totalWatts)} W
              </p>
              <p>
                <strong>UPS Capacity:</strong> {format(result.upsVA)} VA (
                Suggested: {result.suggestedUPS} VA)
              </p>
              <p>
                <strong>Battery per string:</strong>{" "}
                {format(result.batteryAhEach, 2)} Ah × {result.batteryCount} (12V)
              </p>
            </div>

            {/* Battery selection & string logic */}
            <div className="mt-4 border-t border-gray-600 pt-4">
              <h3 className="font-semibold mb-2">🔋 Choose Actual Battery Size</h3>
              <select
                className="bg-gray-700 text-white p-2 rounded"
                value={selectedBatteryAh ?? ""}
                onChange={(e) => {
                  const ah = Number(e.target.value);
                  setSelectedBatteryAh(ah);
                  recalcRuntime(ah);
                }}
              >
                <option value="">-- Select Battery Ah --</option>
                {STANDARD_BATTERY_SIZES.map((ah) => (
                  <option key={ah} value={ah}>
                    {ah} Ah
                  </option>
                ))}
              </select>

              {selectedBatteryAh && (
                <div className="mt-3 bg-gray-800 p-3 rounded">
                  <p>
                    <strong>Selected Battery:</strong> {selectedBatteryAh} Ah ×{" "}
                    {result.batteryCount} (12 V each in series)
                  </p>
                  <p>
                    <strong>Parallel Strings:</strong> {stringCount}
                  </p>
                  <p>
                    <strong>Total Batteries:</strong>{" "}
                    {result.batteryCount * stringCount} pcs
                  </p>
                  <p>
                    <strong>Effective Capacity:</strong>{" "}
                    {selectedBatteryAh * stringCount} Ah @ {result.vdc} V
                  </p>
                  <p>
                    <strong>Estimated Runtime:</strong>{" "}
                    {actualBackupMin ? actualBackupMin.toFixed(1) : "--"} minutes (
                    {(actualBackupMin! / 60).toFixed(2)} hours)
                  </p>
                  <p className="text-gray-400 text-sm mt-1">
                    Based on total load {result.totalWatts} W and efficiency η ={" "}
                    {result.eta}.
                  </p>
                </div>
              )}
            </div>

            {/* Chart */}
            {chartData.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-2">
                  📊 Device Power Distribution
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name }) => name}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <RechartTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
