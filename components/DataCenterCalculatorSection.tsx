"use client";

import React, { useMemo, useState } from "react";

/** Concrete union for the phase topology */
type Phase = "1P-1P" | "3P-1P" | "3P-3P";

/** Keep in sync with what RecommendedUpsdc expects */
type ResultLite = {
  upsVA: number;
  suggestedUPS?: number;
  phase?: Phase;
};

type Props = {
  /** Parent will pass setResult from page.tsx */
  setResult: React.Dispatch<React.SetStateAction<ResultLite | null>>;
};

/** Standard VA steps for data center frames (edit as you like) */
const STANDARD_DC_UPS_VA = [
  20000, 30000, 40000, 50000, 60000, 80000, 100000, 120000, 160000, 200000,
] as const;

/** Helpers */
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function fmt(n: number, d = 0) {
  if (!Number.isFinite(n)) return "0";
  return (Math.round(n * 10 ** d) / 10 ** d).toLocaleString(undefined, {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
}

export default function DataCenterCalculatorSection({ setResult }: Props) {
  // Minimal device list (you can expand it later)
  const [rows, setRows] = useState<{ name: string; watts: number }[]>([
    { name: "", watts: 0 },
  ]);

  // Inputs
  const [pf, setPf] = useState<number>(0.9);
  const [headroom, setHeadroom] = useState<number>(1.25);
  const [phase, setPhase] = useState<Phase>("3P-3P");

  // Derived
  const totalW = useMemo(
    () => rows.reduce((s, r) => s + (Number.isFinite(r.watts) ? r.watts : 0), 0),
    [rows]
  );
  const sizedW = useMemo(() => totalW * (headroom || 1), [totalW, headroom]);
  const upsVA = useMemo(() => sizedW / clamp(pf, 0.6, 1), [sizedW, pf]);
  const suggestedUPS = useMemo(() => {
    for (const v of STANDARD_DC_UPS_VA) if (v >= upsVA) return v;
    return STANDARD_DC_UPS_VA[STANDARD_DC_UPS_VA.length - 1];
  }, [upsVA]);

  const addRow = () => setRows((r) => [...r, { name: "", watts: 0 }]);
  const removeRow = (i: number) =>
    setRows((r) => (r.length === 1 ? [{ name: "", watts: 0 }] : r.filter((_, idx) => idx !== i)));

  const onCalc = () => {
    setResult({
      upsVA,
      suggestedUPS,
      phase,
    });
  };

  const inputBase =
    "h-10 px-3 rounded bg-white text-gray-900 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-600/30";
  const btn =
    "h-10 px-4 rounded font-semibold transition-all duration-150 active:translate-y-[1px]";
  const card = "bg-white border border-gray-200 p-6 rounded-2xl shadow w-full max-w-4xl";

  return (
    <section className={card}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-indigo-700">Data Center Load &amp; Sizing</h2>
        <button
          onClick={addRow}
          className={`${btn} bg-indigo-600 text-white hover:bg-indigo-700`}
          aria-label="Add device row"
          title="Add device row"
        >
          + Add Load
        </button>
      </div>

      {/* Device rows */}
      <div className="space-y-3">
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-12 gap-3 items-center">
            <div className="col-span-12 md:col-span-8">
              <label htmlFor={`name-${i}`} className="sr-only">
                Load name
              </label>
              <input
                id={`name-${i}`}
                className={`${inputBase} w-full`}
                placeholder="e.g., Rack A (servers)"
                value={r.name}
                onChange={(e) => {
                  const v = e.target.value;
                  setRows((prev) => {
                    const c = [...prev];
                    c[i] = { ...c[i], name: v };
                    return c;
                  });
                }}
              />
            </div>
            <div className="col-span-6 md:col-span-2">
              <label htmlFor={`watts-${i}`} className="sr-only">
                Watts
              </label>
              <input
                id={`watts-${i}`}
                type="number"
                className={`${inputBase} w-full`}
                placeholder="Watts"
                value={r.watts || ""}
                onChange={(e) => {
                  const w = Number(e.target.value);
                  setRows((prev) => {
                    const c = [...prev];
                    c[i] = { ...c[i], watts: Number.isFinite(w) ? w : 0 };
                    return c;
                  });
                }}
                min={0}
              />
            </div>
            <div className="col-span-6 md:col-span-2">
              <button
                className={`${btn} w-full bg-red-600 text-white hover:bg-red-700`}
                onClick={() => removeRow(i)}
                aria-label="Remove device"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-6">
        <div>
          <label className="block text-gray-600 text-sm mb-1">Power Factor (PF)</label>
          <input
            type="number"
            step={0.01}
            min={0.6}
            max={1}
            value={pf}
            onChange={(e) => setPf(Number(e.target.value))}
            className={`${inputBase} w-full`}
          />
        </div>
        <div>
          <label className="block text-gray-600 text-sm mb-1">Headroom</label>
          <select
            value={headroom}
            onChange={(e) => setHeadroom(Number(e.target.value))}
            className={`${inputBase} w-full`}
          >
            <option value={1.0}>None (×1.00)</option>
            <option value={1.25}>Electronics (×1.25)</option>
            <option value={1.5}>Medium (×1.50)</option>
            <option value={2.0}>High (×2.00)</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Tip: Use higher headroom if you expect future IT expansion or inrush peaks.
          </p>
        </div>
        <div>
          <label className="block text-gray-600 text-sm mb-1">Phase Topology</label>
          <select
            value={phase}
            onChange={(e) => setPhase(e.target.value as Phase)}
            className={`${inputBase} w-full`}
          >
            <option value="3P-3P">3Φ in / 3Φ out</option>
            <option value="3P-1P">3Φ in / 1Φ out</option>
            <option value="1P-1P">1Φ in / 1Φ out</option>
          </select>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
        <div className="p-3 rounded border border-gray-200 bg-gray-50">
          <div className="text-gray-600">Total Watts</div>
          <div className="font-semibold">{fmt(totalW)} W</div>
        </div>
        <div className="p-3 rounded border border-gray-200 bg-gray-50">
          <div className="text-gray-600">Sized Watts (with headroom)</div>
          <div className="font-semibold">{fmt(sizedW)} W</div>
        </div>
        <div className="p-3 rounded border border-gray-200 bg-gray-50">
          <div className="text-gray-600">UPS VA (calc)</div>
          <div className="font-semibold">{fmt(upsVA)} VA</div>
        </div>
      </div>

      <div className="mt-2 p-3 rounded border border-indigo-200 bg-indigo-50">
        Suggested frame size: <b>{fmt(suggestedUPS)} VA</b>
      </div>

      <button
        onClick={onCalc}
        className={`${btn} mt-4 w-full bg-indigo-600 text-white hover:bg-indigo-700`}
        aria-label="Calculate & Recommend"
        title="Calculate & Recommend"
      >
        Calculate &amp; Recommend
      </button>
    </section>
  );
}
