"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from "recharts";
import { Calculator, Battery, Zap } from "lucide-react";
import Image from "next/image";

/* ──────────────────────────────── CONSTANTS ──────────────────────────────── */
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
  { name: "Microwave Oven", watts: 1000 },
  { name: "Water Pump (1 HP)", watts: 750 },
  { name: "Iron", watts: 1000 },
  { name: "Hair Dryer", watts: 800 },
  { name: "Electric Kettle", watts: 1200 },
];
const STANDARD_UPS_SIZES = [600, 1000, 1500, 2000, 3000, 5000, 10000];
const STANDARD_BATTERY_SIZES = [7, 9, 18, 22, 42, 65, 100, 150];
const MAX_STRINGS = 3;

/* Chemistry typing */
type Chem = "leadacid" | "agm" | "lifepo4";

/* Peukert k and base-hour H per chemistry */
const PEUKERT: Record<Chem, { k: number; H: number }> = {
  leadacid: { k: 1.2, H: 20 },
  agm: { k: 1.15, H: 20 },
  lifepo4: { k: 1.05, H: 1 }, // many LiFePO₄ cells are rated at 1h
};

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
  batteryCount: number;
  requiredAhPerString: number;
  k: number;
  targetHours: number;
  dischargeCurrentA: number;
}

/* ──────────────────────────────── HELPERS ──────────────────────────────── */
function pickDCBusFromUps(upsVA: number) {
  if (upsVA <= 1000) return { vdc: 12, batteryCount: 1 } as const;
  if (upsVA <= 2000) return { vdc: 24, batteryCount: 2 } as const;
  if (upsVA <= 5000) return { vdc: 48, batteryCount: 4 } as const;
  return { vdc: 96, batteryCount: 8 } as const;
}

const COLORS = ["#34d399", "#60a5fa", "#fbbf24", "#f87171", "#a78bfa", "#fb923c"];

const format = (n: number, d = 2) => (Number.isFinite(n) ? Number(n.toFixed(d)) : 0);
const safeW = (w: number) => (Number.isFinite(w) && w > 0 ? w : 0);

/* ──────────────────────────────── COMPONENT ──────────────────────────────── */
export default function HomeUpsPage() {
  const [devices, setDevices] = useState<Device[]>([{ name: "", watts: 0 }]);
  const [backupTimeMin, setBackupTimeMin] = useState<number>(30);
  const [batteryType, setBatteryType] = useState<Chem>("leadacid");
  const [result, setResult] = useState<Result | null>(null);
  const [selectedBatteryAh, setSelectedBatteryAh] = useState<number | null>(null);
  const [stringCount, setStringCount] = useState<number>(1);
  const [actualBackupMin, setActualBackupMin] = useState<number | null>(null);
  const [meetsTarget, setMeetsTarget] = useState<boolean | null>(null);
  const [search, setSearch] = useState<string>("");
  const [searchIndex, setSearchIndex] = useState<number | null>(null);

  // user-tweakable PF & inverter efficiency
  const [pf, setPf] = useState<number>(0.8);
  const [eta, setEta] = useState<number>(0.88);

  /* ───────────── DEVICE INPUT HANDLERS ───────────── */
  const addDevice = () => setDevices((prev) => [...prev, { name: "", watts: 0 }]);
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

  /* ───────────── MAIN CALCULATION ───────────── */
  const calculate = () => {
    const totalWatts = devices.reduce((s, d) => s + safeW(d.watts), 0);
    if (totalWatts <= 0) {
      setResult(null);
      setSelectedBatteryAh(null);
      setStringCount(1);
      setActualBackupMin(null);
      setMeetsTarget(null);
      return;
    }

    const clampedPf = Math.max(0.6, Math.min(pf, 1));
    const upsVA = totalWatts / clampedPf;
    const suggestedUPS =
      STANDARD_UPS_SIZES.find((s) => s >= upsVA) ||
      STANDARD_UPS_SIZES[STANDARD_UPS_SIZES.length - 1];

    const { vdc, batteryCount } = pickDCBusFromUps(suggestedUPS);

    const targetHours = Math.max(0, backupTimeMin) / 60;
    const { k, H } = PEUKERT[batteryType];

    const eff = Math.max(0.75, Math.min(eta, 0.98));
    const I = totalWatts / (vdc * eff);

    const requiredAhPerString = I * H * Math.pow(targetHours / H, 1 / k);

    setResult({
      totalWatts,
      pf: clampedPf,
      eta: eff,
      upsVA,
      suggestedUPS,
      vdc,
      batteryCount,
      requiredAhPerString,
      k,
      targetHours,
      dischargeCurrentA: I,
    });

    setSelectedBatteryAh(null);
    setStringCount(1);
    setActualBackupMin(null);
    setMeetsTarget(null);
  };

  /* ───────────── PEUKERT RUNTIME ───────────── */
  const recalcRuntime = (selectedAh: number) => {
    if (!result || !Number.isFinite(selectedAh) || selectedAh <= 0) return;
    const { requiredAhPerString, totalWatts, vdc, eta: eff, k } = result;
    const { H } = PEUKERT[batteryType];

    const neededStrings = Math.ceil(requiredAhPerString / selectedAh);
    const cappedStrings = Math.min(MAX_STRINGS, Math.max(1, neededStrings));
    const effectiveAh = selectedAh * cappedStrings;

    const I = totalWatts / (vdc * eff);
    const t_hours = H * Math.pow(effectiveAh / (I * H), k);
    const t_min = t_hours * 60;
    const meets = effectiveAh >= requiredAhPerString && neededStrings <= MAX_STRINGS;

    setStringCount(cappedStrings);
    setActualBackupMin(t_min);
    setMeetsTarget(meets);
  };

  /* ───────────── PDF EXPORT (robust + multi-page) ───────────── */
  const downloadReport = async () => {
    if (typeof window === "undefined") return;

    const section = document.getElementById("report-section");
    if (!section) return;

    // Temporarily reduce transitions to avoid capture artifacts
    const originalTransition = section.style.transition;
    section.style.transition = "none";

    // Dynamic import to avoid SSR issues
    const [{ default: html2canvas }, jsPDFModule] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]);
    const { jsPDF } = jsPDFModule as unknown as { jsPDF: typeof import("jspdf").jsPDF };

    // brief wait for fonts/images
    await new Promise((r) => setTimeout(r, 50));

    const canvas = await html2canvas(section, {
      backgroundColor: "#1f2937",
      useCORS: true,
      scale: Math.min(2, window.devicePixelRatio || 1),
      logging: false,
      // Skip live tooltips or any element you mark as no-print
      ignoreElements: (el: Element) => {
        const cls = (el as HTMLElement).className?.toString?.() || "";
        const hasNoPrint = cls.includes("no-print");
        const isRechartsTooltip = cls.includes("recharts-default-tooltip");
        return hasNoPrint || isRechartsTooltip;
      },
    });

    // Restore styles
    section.style.transition = originalTransition;

    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();

    const imgW = pageW;
    const imgH = (canvas.height * imgW) / canvas.width;

    let yOffset = 0;
    while (yOffset < imgH) {
      if (yOffset > 0) pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, -yOffset, imgW, imgH, undefined, "FAST");
      yOffset += pageH;
    }

    pdf.save("UPS_Report.pdf");
  };

  // Derived data for charts
  const chartData = devices
    .filter((d) => d.name && safeW(d.watts))
    .map((d) => ({ name: d.name, value: d.watts }));
  const efficiencyData = [
    { type: "Offline UPS", efficiency: 97 },
    { type: "Line-Interactive", efficiency: 95 },
    { type: "Online UPS", efficiency: 88 },
  ];

  // C-rate per string (informational)
  const cRatePerString = selectedBatteryAh && result
    ? result.dischargeCurrentA / selectedBatteryAh
    : 0;

  /* ───────────── UI ───────────── */
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      <header className="w-full bg-gray-900/80 border-b border-gray-700 py-3 px-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-green-400">🔋 Smart UPS Designer</h1>
        <a
          href="https://github.com/"
          className="text-gray-400 hover:text-green-400 text-sm"
          aria-label="View project on GitHub"
        >
          View on GitHub
        </a>
      </header>

      <main className="flex flex-col items-center py-8 px-4 sm:px-8" id="report-section">
        {/* Explanation Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800/70 border border-gray-700 rounded-2xl p-6 mb-8 max-w-3xl text-gray-200 prose prose-invert"
        >
          <h2>⚡ Why Choose Offline or Line-Interactive UPS?</h2>
          <ul>
            <li>Higher efficiency (≈95–98% vs 85–90% for online)</li>
            <li>Quiet operation – no constant fan</li>
            <li>Less heat and energy loss</li>
            <li>Longer battery life & lower cost</li>
          </ul>
          <div className="my-4 text-center">
            <Image
              src="/ups-types-diagram.png" // keep this image in /public to avoid CORS
              alt="UPS comparison"
              width={600}
              height={300}
              className="rounded-lg border border-gray-600 mx-auto"
            />
            <p className="text-xs text-gray-400 mt-1">
              (Offline/Line-Interactive UPS passes AC directly; Online UPS double-converts, wasting power.)
            </p>
          </div>
          <h3>Efficiency Comparison</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={efficiencyData}>
              <XAxis dataKey="type" />
              <YAxis />
              <RechartsTooltip wrapperClassName="recharts-default-tooltip no-print" />
              <Bar dataKey="efficiency" fill="#22c55e" radius={8} />
            </BarChart>
          </ResponsiveContainer>
        </motion.section>

        {/* Calculator Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800 p-6 rounded-2xl shadow-lg w-full max-w-3xl space-y-6"
        >
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calculator className="text-green-400 w-6 h-6" /> UPS & Battery Calculator
          </h2>

          {/* Device Inputs */}
          {devices.map((device, i) => (
            <div key={i} className="mb-5 relative">
              <label htmlFor={`device-name-${i}`} className="sr-only">Device name</label>
              <input
                id={`device-name-${i}`}
                type="text"
                className="w-full p-2 rounded bg-gray-700 text-white"
                placeholder="🔍 Search or type device name..."
                value={device.name}
                onChange={(e) => {
                  const val = e.target.value;
                  const copy = [...devices];
                  copy[i].name = val;
                  setDevices(copy);
                  setSearchIndex(i);
                  setSearch(val);
                }}
                onFocus={() => setSearchIndex(i)}
                aria-label="Device name"
              />

              {search && searchIndex === i && (
                <div className="absolute z-10 bg-gray-700 w-full mt-1 rounded max-h-40 overflow-y-auto border border-gray-600">
                  {filteredDevices.slice(0, 8).map((d) => (
                    <div
                      key={d.name}
                      onMouseDown={() => handleSelect(i, d)}
                      className="p-2 hover:bg-gray-600 cursor-pointer"
                      role="button"
                      aria-label={`Select ${d.name}`}
                    >
                      {d.name} — {d.watts} W
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3 mt-2 items-center">
                <label htmlFor={`device-watts-${i}`} className="sr-only">Watts</label>
                <input
                  id={`device-watts-${i}`}
                  type="number"
                  className="w-32 p-2 rounded bg-gray-700 text-white"
                  placeholder="Watts"
                  value={device.watts || ""}
                  onChange={(e) => {
                    const copy = [...devices];
                    copy[i].watts = Number(e.target.value);
                    setDevices(copy);
                  }}
                  aria-label="Device watts"
                  min={0}
                />
                <button
                  className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded"
                  onClick={() => removeDevice(i)}
                  aria-label="Remove device"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}

          {/* Controls */}
          <div className="flex flex-wrap gap-3 justify-between items-end">
            <button onClick={addDevice} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded" aria-label="Add device">
              + Add Device
            </button>
            <div className="flex flex-col sm:flex-row gap-3">
              <div>
                <label className="block text-gray-400 text-sm" htmlFor="battery-type">Battery Type</label>
                <select
                  id="battery-type"
                  className="bg-gray-700 text-white p-2 rounded"
                  value={batteryType}
                  onChange={(e) => setBatteryType(e.target.value as Chem)}
                >
                  <option value="leadacid">Lead-Acid (k=1.20, H=20h)</option>
                  <option value="agm">AGM / Gel (k=1.15, H=20h)</option>
                  <option value="lifepo4">LiFePO₄ (k=1.05, H=1h)</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-400 text-sm" htmlFor="target-min">Target Backup (minutes)</label>
                <input
                  id="target-min"
                  type="number"
                  value={backupTimeMin}
                  onChange={(e) => setBackupTimeMin(Number(e.target.value))}
                  className="w-28 p-2 rounded bg-gray-700 text-white"
                  min={0}
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm" htmlFor="pf">Power Factor</label>
                <input
                  id="pf"
                  type="number"
                  step="0.01"
                  min={0.6}
                  max={1}
                  value={pf}
                  onChange={(e) => setPf(Number(e.target.value))}
                  className="w-24 p-2 rounded bg-gray-700 text-white"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm" htmlFor="eta">Inverter η</label>
                <input
                  id="eta"
                  type="number"
                  step="0.01"
                  min={0.75}
                  max={0.98}
                  value={eta}
                  onChange={(e) => setEta(Number(e.target.value))}
                  className="w-24 p-2 rounded bg-gray-700 text-white"
                />
              </div>
            </div>
          </div>

          <button
            onClick={calculate}
            className="mt-4 w-full bg-green-600 hover:bg-green-700 transition py-3 rounded-lg font-semibold text-lg"
            aria-label="Calculate"
          >
            Calculate
          </button>

          {/* Results */}
          {result && (
            <div className="bg-gray-700 p-4 rounded-lg space-y-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Battery className="text-green-400 w-5 h-5" /> Engineering Results
              </h3>
              <p>Total Load = {format(result.totalWatts)} W</p>
              <p>PF = {format(result.pf, 2)} | Inverter η = {format(result.eta, 2)}</p>
              <p>UPS Capacity = {format(result.upsVA)} VA → Suggested: {result.suggestedUPS} VA</p>
              <p>DC Bus = {result.vdc} V ({result.batteryCount} × 12 V in series)</p>
              <p>Discharge Current = {format(result.dischargeCurrentA)} A</p>
              <p>Required Ah per string (Peukert) = {format(result.requiredAhPerString)} Ah</p>

              <label className="block text-gray-400 text-sm" htmlFor="battery-ah">Select Battery Size (Ah)</label>
              <select
                id="battery-ah"
                className="bg-gray-700 text-white p-2 rounded"
                value={selectedBatteryAh ?? ""}
                onChange={(e) => {
                  const ah = Number(e.target.value);
                  setSelectedBatteryAh(ah);
                  recalcRuntime(ah);
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
                <div className="bg-gray-800 p-3 rounded space-y-1">
                  <p>
                    Selected Battery: {selectedBatteryAh} Ah × {result.batteryCount} (12 V each in series)
                  </p>
                  <p>Parallel Strings: {stringCount} / Max {MAX_STRINGS}</p>
                  {actualBackupMin !== null && (
                    <p>
                      Runtime: {format(actualBackupMin)} min ({format((actualBackupMin as number) / 60)} h)
                    </p>
                  )}
                  <p className={batteryType !== "lifepo4" && cRatePerString > 0.3 ? "text-yellow-300" : "text-gray-300"}>
                    Estimated C-rate per string: {format(cRatePerString, 2)}C
                    {batteryType !== "lifepo4" && cRatePerString > 0.3 &&
                      " — high for lead-acid; consider bigger Ah or more strings."}
                  </p>
                  <p className="text-gray-300">
                    Wiring guide: <strong>{result.batteryCount} in series</strong> × <strong>{stringCount} parallel</strong> → total batteries = {result.batteryCount * stringCount}
                  </p>
                  {meetsTarget ? (
                    <p className="text-green-400">✅ Meets target runtime</p>
                  ) : (
                    <p className="text-yellow-300">⚠️ Limited by {MAX_STRINGS} strings — cannot reach full target</p>
                  )}
                </div>
              )}

              {chartData.length > 0 && (
                <div>
                  <h4 className="font-semibold mt-4 flex items-center gap-2">
                    <Zap className="text-yellow-400 w-5 h-5" /> Load Distribution
                  </h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={chartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label
                      >
                        {chartData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip wrapperClassName="recharts-default-tooltip no-print" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}
        </motion.section>

        {/* Footer */}
        <footer className="mt-10 py-4 text-center text-gray-500 text-sm border-t border-gray-700 w-full max-w-3xl">
          © 2025 Smart UPS Calculator — Built by Amina ⚡
          <br />
          <button
            onClick={downloadReport}
            className="mt-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-white"
            aria-label="Export PDF Report"
          >
            📄 Export PDF Report
          </button>
        </footer>
      </main>
    </div>
  );
}
