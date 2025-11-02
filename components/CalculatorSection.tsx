"use client";
import { motion } from "framer-motion";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import { Calculator, Battery, Zap } from "lucide-react";
import {
  Device,
  Chem,
  Result,
  STANDARD_BATTERY_SIZES,
  MAX_STRINGS,
  COLORS,
  safeW,
  format,
} from "../lib/ups";

type Props = {
  devices: Device[];
  setDevices: React.Dispatch<React.SetStateAction<Device[]>>;
  addDevice: () => void;
  removeDevice: (i: number) => void;

  batteryType: Chem;
  setBatteryType: (c: Chem) => void;

  backupTimeMin: number;
  setBackupTimeMin: (n: number) => void;

  pf: number;
  setPf: (n: number) => void;

  eta: number;
  setEta: (n: number) => void;

  result: Result | null;
  selectedBatteryAh: number | null;
  setSelectedBatteryAh: (n: number | null) => void;
  stringCount: number;
  actualBackupMin: number | null;
  meetsTarget: boolean | null;

  calculate: () => void;
  recalcRuntime: (ah: number) => void;

  search: string;
  setSearch: (s: string) => void;
  searchIndex: number | null;
  setSearchIndex: (i: number | null) => void;
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

export default function CalculatorSection(props: Props) {
  const {
    devices,
    setDevices,
    addDevice,
    removeDevice,
    batteryType,
    setBatteryType,
    backupTimeMin,
    setBackupTimeMin,
    pf,
    setPf,
    eta,
    setEta,
    result,
    selectedBatteryAh,
    setSelectedBatteryAh,
    stringCount,
    actualBackupMin,
    meetsTarget,
    calculate,
    recalcRuntime,
    search,
    setSearch,
    searchIndex,
    setSearchIndex,
    onSelectLibraryItem,
  } = props;

  const chartData = devices
    .filter((d) => d.name && safeW(d.watts))
    .map((d) => ({ name: d.name, value: d.watts }));

  const cRatePerString =
    selectedBatteryAh && result ? result.dischargeCurrentA / selectedBatteryAh : 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-gray-200 p-6 rounded-2xl shadow w-full max-w-3xl space-y-6"
    >
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <Calculator className="text-green-600 w-6 h-6" /> UPS & Battery Calculator
      </h2>

      {/* Device Inputs */}
      {devices.map((device, i) => {
        const suggestions = LIBRARY.filter((d) =>
          d.name.toLowerCase().includes((search ?? "").toLowerCase())
        ).slice(0, 8);

        return (
          <div key={i} className="mb-5 relative">
            <label htmlFor={`device-name-${i}`} className="sr-only">
              Device name
            </label>
            <input
              id={`device-name-${i}`}
              type="text"
              className="w-full p-2 rounded bg-gray-100 text-gray-900 border border-gray-300"
              placeholder="🔍 Search or type device name..."
              value={device.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const val = e.target.value;
                setDevices((prev) => {
                  const copy = [...prev];
                  copy[i] = { ...copy[i], name: val };
                  return copy;
                });
                setSearchIndex(i);
                setSearch(val);
              }}
              onFocus={() => setSearchIndex(i)}
              aria-label="Device name"
            />

            {search && searchIndex === i && (
              <div className="absolute z-10 bg-white w-full mt-1 rounded max-h-40 overflow-y-auto border border-gray-300 no-print">
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

            <div className="flex gap-3 mt-2 items-center">
              <label htmlFor={`device-watts-${i}`} className="sr-only">
                Watts
              </label>
              <input
                id={`device-watts-${i}`}
                type="number"
                className="w-32 p-2 rounded bg-gray-100 text-gray-900 border border-gray-300"
                placeholder="Watts"
                value={device.watts || ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const watts = Number(e.target.value);
                  setDevices((prev) => {
                    const copy = [...prev];
                    copy[i] = { ...copy[i], watts };
                    return copy;
                  });
                }}
                aria-label="Device watts"
                min={0}
              />
              <button
                className="no-print bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
                onClick={() => removeDevice(i)}
                aria-label="Remove device"
              >
                Remove
              </button>
            </div>
          </div>
        );
      })}

      {/* Controls */}
      <div className="flex flex-wrap gap-3 justify-between items-end">
        <button
          onClick={addDevice}
          className="no-print bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          aria-label="Add device"
        >
          + Add Device
        </button>
        <div className="flex flex-col sm:flex-row gap-3">
          <div>
            <label className="block text-gray-600 text-sm" htmlFor="battery-type">
              Battery Type
            </label>
            <select
              id="battery-type"
              className="bg-gray-100 text-gray-900 p-2 rounded border border-gray-300"
              value={batteryType}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setBatteryType(e.target.value as Chem)
              }
            >
              <option value="leadacid">Lead-Acid (k=1.20, H=20h)</option>
              <option value="agm">AGM / Gel (k=1.15, H=20h)</option>
              <option value="lifepo4">LiFePO₄ (k=1.05, H=1h)</option>
            </select>
          </div>
          <div>
            <label className="block text-gray-600 text-sm" htmlFor="target-min">
              Target Backup (minutes)
            </label>
            <input
              id="target-min"
              type="number"
              value={backupTimeMin}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setBackupTimeMin(Number(e.target.value))
              }
              className="w-28 p-2 rounded bg-gray-100 text-gray-900 border border-gray-300"
              min={0}
            />
          </div>
          <div>
            <label className="block text-gray-600 text-sm" htmlFor="pf">
              Power Factor
            </label>
            <input
              id="pf"
              type="number"
              step={0.01}
              min={0.6}
              max={1}
              value={pf}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setPf(Number(e.target.value))
              }
              className="w-24 p-2 rounded bg-gray-100 text-gray-900 border border-gray-300"
            />
          </div>
          <div>
            <label className="block text-gray-600 text-sm" htmlFor="eta">
              Inverter η
            </label>
            <input
              id="eta"
              type="number"
              step={0.01}
              min={0.75}
              max={0.98}
              value={eta}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setEta(Number(e.target.value))
              }
              className="w-24 p-2 rounded bg-gray-100 text-gray-900 border border-gray-300"
            />
          </div>
        </div>
      </div>

      <button
        onClick={calculate}
        className="no-print mt-4 w-full bg-green-600 hover:bg-green-700 transition py-3 rounded-lg font-semibold text-lg text-white"
        aria-label="Calculate"
      >
        Calculate
      </button>

      {/* Results */}
      {result && (
        <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg space-y-4">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Battery className="text-green-600 w-5 h-5" /> Engineering Results
          </h3>
          <p>Total Load = {format(result.totalWatts)} W</p>
          <p>PF = {format(result.pf, 2)} | Inverter η = {format(result.eta, 2)}</p>
          <p>UPS Capacity = {format(result.upsVA)} VA → Suggested: {result.suggestedUPS} VA</p>
          <p>DC Bus = {result.vdc} V ({result.batteryCount} × 12 V in series)</p>
          <p>Discharge Current = {format(result.dischargeCurrentA)} A</p>
          <p>Required Ah per string (Peukert) = {format(result.requiredAhPerString)} Ah</p>

          <label className="block text-gray-600 text-sm" htmlFor="battery-ah">
            Select Battery Size (Ah)
          </label>
          <select
            id="battery-ah"
            className="bg-gray-100 text-gray-900 p-2 rounded border border-gray-300"
            value={selectedBatteryAh ?? ""}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
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
            <div className="bg-white p-3 rounded border border-gray-200 space-y-1">
              <p>
                Selected Battery: {selectedBatteryAh} Ah × {result.batteryCount} (12 V each in series)
              </p>
              <p>
                Parallel Strings: {stringCount} / Max {MAX_STRINGS}
              </p>
              {actualBackupMin !== null && (
                <p>
                  Runtime: {format(actualBackupMin)} min ({format((actualBackupMin as number) / 60)} h)
                </p>
              )}
              <p className={batteryType !== "lifepo4" && cRatePerString > 0.3 ? "text-yellow-600" : "text-gray-700"}>
                Estimated C-rate per string: {format(cRatePerString, 2)}C
                {batteryType !== "lifepo4" && cRatePerString > 0.3 &&
                  " — high for lead-acid; consider bigger Ah or more strings."}
              </p>
              <p className="text-gray-700">
                Wiring guide: <strong>{result.batteryCount} in series</strong> × <strong>{stringCount} parallel</strong> → total batteries ={" "}
                {result.batteryCount * stringCount}
              </p>
              {meetsTarget ? (
                <p className="text-green-700">✅ Meets target runtime</p>
              ) : (
                <p className="text-yellow-700">⚠️ Limited by {MAX_STRINGS} strings — cannot reach full target</p>
              )}
            </div>
          )}

          {chartData.length > 0 && (
            <div>
              <h4 className="font-semibold mt-4 flex items-center gap-2">
                <Zap className="text-yellow-600 w-5 h-5" /> Load Distribution
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
  );
}
