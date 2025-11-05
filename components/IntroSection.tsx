"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  LabelList,
  CartesianGrid,
} from "recharts";

/* Simple inline diagram (no external images → print/CORS safe) */
function UpsDiagramSVG() {
  return (
    <svg
      viewBox="0 0 940 420"
      className="w-full h-auto rounded-xl border border-gray-200 bg-white"
      role="img"
      aria-label="UPS topologies: Offline (Standby) and Line-Interactive"
    >
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#6b7280" />
        </marker>
        <linearGradient id="card" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#ffffff" />
        </linearGradient>
      </defs>

      <text x="470" y="28" textAnchor="middle" fontSize="20" fill="#065f46" fontWeight="700">
        Home UPS Topologies: Offline (Standby) vs Line-Interactive
      </text>

      {/* Offline / Standby */}
      <g transform="translate(20, 60)">
        <rect x="0" y="0" width="440" height="320" rx="14" fill="url(#card)" stroke="#e5e7eb" />
        <text x="220" y="24" textAnchor="middle" fontSize="16" fill="#1d4ed8" fontWeight="600">
          Offline (Standby) UPS
        </text>

        <rect x="18" y="70" width="70" height="30" rx="8" fill="#ffffff" stroke="#d1d5db" />
        <text x="53" y="90" textAnchor="middle" fontSize="12" fill="#111827">AC In</text>
        <line x1="88" y1="85" x2="350" y2="85" stroke="#6b7280" strokeWidth="2" markerEnd="url(#arrow)" />
        <rect x="350" y="70" width="70" height="30" rx="8" fill="#ffffff" stroke="#d1d5db" />
        <text x="385" y="90" textAnchor="middle" fontSize="12" fill="#111827">Load</text>
        <text x="220" y="115" textAnchor="middle" fontSize="12" fill="#065f46">
          Normal power: AC bypasses electronics → very high efficiency, cool & quiet
        </text>

        <rect x="140" y="150" width="90" height="30" rx="8" fill="#ffffff" stroke="#d1d5db" />
        <text x="185" y="170" textAnchor="middle" fontSize="12" fill="#111827">Charger</text>

        <rect x="140" y="200" width="90" height="30" rx="8" fill="#ffffff" stroke="#d1d5db" />
        <text x="185" y="220" textAnchor="middle" fontSize="12" fill="#111827">Battery</text>

        <rect x="280" y="200" width="90" height="30" rx="8" fill="#ffffff" stroke="#d1d5db" />
        <text x="325" y="220" textAnchor="middle" fontSize="12" fill="#111827">Inverter</text>

        <line x1="185" y1="180" x2="185" y2="200" stroke="#6b7280" strokeWidth="2" />
        <line x1="230" y1="215" x2="280" y2="215" stroke="#6b7280" strokeWidth="2" markerEnd="url(#arrow)" />
        <line x1="325" y1="200" x2="325" y2="170" stroke="#6b7280" strokeWidth="2" />
        <line x1="325" y1="170" x2="350" y2="170" stroke="#6b7280" strokeWidth="2" markerEnd="url(#arrow)" />
        <text x="220" y="260" textAnchor="middle" fontSize="12" fill="#111827">
          Outage: relay switches to inverter (≈ 4–10 ms)
        </text>
      </g>

      {/* Line-Interactive */}
      <g transform="translate(480, 60)">
        <rect x="0" y="0" width="440" height="320" rx="14" fill="url(#card)" stroke="#e5e7eb" />
        <text x="220" y="24" textAnchor="middle" fontSize="16" fill="#b45309" fontWeight="600">
          Line-Interactive UPS
        </text>

        <rect x="18" y="70" width="70" height="30" rx="8" fill="#ffffff" stroke="#d1d5db" />
        <text x="53" y="90" textAnchor="middle" fontSize="12" fill="#111827">AC In</text>
        <rect x="120" y="70" width="110" height="30" rx="8" fill="#ffffff" stroke="#d1d5db" />
        <text x="175" y="90" textAnchor="middle" fontSize="12" fill="#111827">AVR (Buck/Boost)</text>
        <rect x="350" y="70" width="70" height="30" rx="8" fill="#ffffff" stroke="#d1d5db" />
        <text x="385" y="90" textAnchor="middle" fontSize="12" fill="#111827">Load</text>

        <line x1="88" y1="85" x2="120" y2="85" stroke="#6b7280" strokeWidth="2" />
        <line x1="230" y1="85" x2="350" y2="85" stroke="#6b7280" strokeWidth="2" markerEnd="url(#arrow)" />
        <text x="220" y="115" textAnchor="middle" fontSize="12" fill="#065f46">
          Normal power: AC passes through AVR that corrects low/high voltage
        </text>

        <rect x="140" y="150" width="90" height="30" rx="8" fill="#ffffff" stroke="#d1d5db" />
        <text x="185" y="170" textAnchor="middle" fontSize="12" fill="#111827">Charger</text>

        <rect x="140" y="200" width="90" height="30" rx="8" fill="#ffffff" stroke="#d1d5db" />
        <text x="185" y="220" textAnchor="middle" fontSize="12" fill="#111827">Battery</text>

        <rect x="280" y="200" width="90" height="30" rx="8" fill="#ffffff" stroke="#d1d5db" />
        <text x="325" y="220" textAnchor="middle" fontSize="12" fill="#111827">Inverter</text>

        <line x1="185" y1="180" x2="185" y2="200" stroke="#6b7280" strokeWidth="2" />
        <line x1="230" y1="215" x2="280" y2="215" stroke="#6b7280" strokeWidth="2" markerEnd="url(#arrow)" />
        <line x1="325" y1="200" x2="325" y2="170" stroke="#6b7280" strokeWidth="2" />
        <line x1="325" y1="170" x2="350" y2="170" stroke="#6b7280" strokeWidth="2" markerEnd="url(#arrow)" />
        <text x="220" y="260" textAnchor="middle" fontSize="12" fill="#111827">
          Outage: transfer to inverter (≈ 2–6 ms). AVR helps ride through brownouts without battery.
        </text>
      </g>
    </svg>
  );
}

export default function IntroSection() {
  // render chart only on client to avoid hydration mismatch
  const [mounted, setMounted] = useState(false);
  const [showChart, setShowChart] = useState(true);
  useEffect(() => setMounted(true), []);

  const efficiencyData = [
    { type: "Offline (Standby)", efficiency: 96 },
    { type: "Line-Interactive", efficiency: 94 },
    { type: "Online (Double Conversion)", efficiency: 88 },
  ];

  return (
    <motion.section
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-gray-200 rounded-2xl p-6 mb-8 max-w-3xl print-card"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-inner" />
        <h2 className="text-2xl font-bold">The Right UPS for Homes: Offline &amp; Line-Interactive</h2>
      </div>

      {/* ===== Your full text (verbatim) ===== */}
      <div className="prose prose-gray max-w-none">
        <p>
          For home and small-office use, the best fit is almost always an Offline (Standby) or Line-Interactive UPS. Both
          deliver clean, reliable backup for computers, routers, TVs, game consoles, NAS drives, LED lighting, small
          fridges, pumps, boilers and control boards—without the constant heat and noise of an “online” double-conversion
          UPS. The key idea: when utility power is healthy, they let AC pass straight through (Line-Interactive adds
          automatic voltage regulation, AVR). When power dips or fails, a relay transfers to the inverter and the battery
          takes over.
        </p>

        <h3>How They Work</h3>
        <p>
          <strong>Offline (Standby)</strong> — In normal operation, your load is connected directly to the mains via a bypass
          path. The battery stays charged. If the mains fails, a small relay switches to the inverter in about 4–10 ms and
          the battery powers the load.
          <br />
          <strong>Line-Interactive</strong> — Same idea, plus an AVR (buck/boost transformer) that corrects low or high voltage
          without using the battery. Transfer to the inverter on real outages is typically 2–6 ms, and the AVR often
          eliminates needless battery cycles during brownouts and sags.
        </p>
      </div>

      <div className="my-4">
        <UpsDiagramSVG />
        <p className="text-xs text-gray-500 mt-2 text-center">
          Normal power: AC flows directly (offline) or through AVR (line-interactive). During an outage: a relay transfers to
          the inverter and the battery runs the load.
        </p>
      </div>

      <div className="prose prose-gray max-w-none">
        <h3>Why They’re Ideal for Homes</h3>
        <ul>
          <li><strong>High efficiency, low heat</strong> — Bypass mode avoids constant AC→DC→AC conversion. That means less wasted power, cooler operation, and lower electricity bills.</li>
          <li><strong>Quiet</strong> — Fans don’t need to run all the time. Most of the day, you won’t hear it.</li>
          <li><strong>Longer battery life</strong> — Fewer unnecessary discharge cycles (especially with AVR) and cooler temps help batteries last longer.</li>
          <li><strong>Cost-effective</strong> — Lower purchase price and operating costs than online UPS models.</li>
          <li><strong>Simple &amp; reliable</strong> — Fewer always-on power stages → fewer parts running hot → fewer headaches.</li>
        </ul>

        <h3>Pure Sine vs Simulated Sine</h3>
        <p>
          Many home UPS models output either a pure sine wave or a simulated (stepped) sine wave on battery. For most basic
          electronics, both will work. However:
        </p>
        <ul>
          <li>For PCs with active PFC power supplies, modern TVs, audio gear, and appliances with AC motors or compressors, choose a pure sine-wave UPS to minimize noise, heat, and stress.</li>
          <li>Simulated sine is fine for routers, ONTs, small LED lighting, low-power electronics, and many budget PCs, but check the PSU specifications if unsure.</li>
          <li>If a device buzzes or runs hotter on battery, upgrade to pure sine or increase UPS VA rating.</li>
        </ul>

        <h3>Will They Work with My Equipment?</h3>
        <ul>
          <li>Computers, routers, TVs, game consoles, monitors — Yes. Modern PSUs typically tolerate brief transfer times (up to ~20 ms) thanks to input capacitors.</li>
          <li>NAS / home servers — Yes; pair with a USB or network-signaling UPS if you want auto-shutdown.</li>
          <li>Fridges, pumps, small motors — Yes, but size your UPS generously to handle inrush current. If the motor is large (deep-well pump, big compressor), consider a dedicated inverter or higher-VA UPS.</li>
          <li>Audio gear &amp; TVs — Prefer a pure sine-wave output model (many line-interactive units offer this).</li>
        </ul>

        <h3>When Would I Choose an Online UPS?</h3>
        <p>
          Online (double-conversion) UPS keeps the inverter running all the time for the absolute lowest transfer time (0 ms)
          and tightest voltage/frequency control. That’s valuable for certain labs, medical devices, harsh generator power,
          or mission-critical servers. For typical homes, the noise, heat, and energy penalty usually aren’t worth it.
        </p>

        <h3>Common Myths (Quick Facts)</h3>
        <ul>
          <li>“Transfer time will crash my PC.” — Unlikely. ATX PSUs hold up for short dips; 4–10 ms (offline) or 2–6 ms (line-interactive) is normally fine.</li>
          <li>“Line-interactive can’t handle computers.” — It can. They’re widely used for IT loads. Pick pure sine-wave output if your gear is sensitive.</li>
          <li>“AVR is the same as a stabilizer.” — AVR inside a line-interactive UPS is automatic buck/boost designed to reduce battery use during sags/overvoltage.</li>
        </ul>

        <h3>Quick Sizing Checklist</h3>
        <ol>
          <li>List your loads (W): PC, monitor, router, TV, fridge, pump, etc. Sum the watts.</li>
          <li>Add headroom: × 1.25 for electronics, × 2.0–3.0 for motor loads (to handle inrush).</li>
          <li>Convert to VA: divide by power factor (typ. 0.8). Example: 600 W ÷ 0.8 ≈ 750 VA.</li>
          <li>Pick a UPS size at or above the VA you computed (choose the nearest standard VA rating).</li>
          <li>Choose output type: Prefer pure sine if you have active-PFC PSUs, audio gear, or motors.</li>
          <li>Battery runtime: Use the calculator to select Ah and strings for your target minutes.</li>
          <li>Placement: keep ventilation space for inverter and batteries.</li>
        </ol>
      </div>

      {/* Efficiency Chart (client-only) */}
      <div className="mt-6">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Efficiency Comparison (Typical)</h3>
          {mounted && (
            <button
              type="button"
              onClick={() => setShowChart((s) => !s)}
              className="text-sm px-3 py-1 rounded-lg border border-gray-300 hover:bg-gray-50"
            >
              {showChart ? "Hide chart" : "Show chart"}
            </button>
          )}
        </div>

        {!mounted && (
          <div className="mt-3 rounded-xl border border-gray-200 p-6 bg-gray-50 text-gray-500 text-sm">
            Chart loads on the client…
          </div>
        )}

        {mounted && showChart && (
          <div className="mt-3 rounded-xl border border-gray-200 p-3 bg-white">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={efficiencyData} barCategoryGap={40}>
                <defs>
                  <linearGradient id="barGreen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="type" tick={{ fill: "#374151", fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fill: "#374151", fontSize: 12 }} />
                <RechartsTooltip contentStyle={{ borderRadius: 8, borderColor: "#e5e7eb" }} formatter={(v) => [`${v}%`, "Efficiency"]} />
                <Bar dataKey="efficiency" radius={[10, 10, 10, 10]} fill="url(#barGreen)">
                  <LabelList
                    dataKey="efficiency"
                    position="top"
                    formatter={(label) => (typeof label === "number" ? `${label}%` : label ?? "")}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <p className="mt-6 text-gray-700">
        <strong>Quick recommendation:</strong> For most homes: a <strong>line-interactive, pure sine-wave UPS</strong> sized
        for your watts plus headroom gives the best balance of protection, silence, and efficiency. For small loads (router,
        lights, single PC), a quality offline unit is excellent value. Choose online UPS only when you truly need zero
        transfer and very tight regulation.
      </p>
    </motion.section>
  );
}
