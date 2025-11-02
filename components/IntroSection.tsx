"use client";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
} from "recharts";

/* ------------------------- Inline, print-friendly diagram ------------------------- */
function UpsDiagramSVG() {
  return (
    <svg
      viewBox="0 0 940 420"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="UPS topologies: Offline (Standby) and Line-Interactive"
      className="w-full h-auto rounded-lg border border-gray-300 bg-white"
    >
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#6b7280" />
        </marker>
      </defs>

      <text x="470" y="28" textAnchor="middle" fontSize="20" fill="#065f46" fontWeight="700">
        Home UPS Topologies: Offline (Standby) vs Line-Interactive
      </text>

      {/* Offline / Standby */}
      <g transform="translate(20, 60)">
        <rect x="0" y="0" width="440" height="320" rx="12" fill="#ffffff" stroke="#d1d5db" />
        <text x="220" y="24" textAnchor="middle" fontSize="16" fill="#1d4ed8" fontWeight="600">
          Offline (Standby) UPS
        </text>

        {/* AC Path (bypass) */}
        <rect x="18" y="70" width="70" height="30" rx="6" fill="#ffffff" stroke="#d1d5db" />
        <text x="53" y="90" textAnchor="middle" fontSize="12" fill="#111827">AC In</text>
        <line x1="88" y1="85" x2="350" y2="85" stroke="#6b7280" strokeWidth="2" markerEnd="url(#arrow)" />
        <rect x="350" y="70" width="70" height="30" rx="6" fill="#ffffff" stroke="#d1d5db" />
        <text x="385" y="90" textAnchor="middle" fontSize="12" fill="#111827">Load</text>
        <text x="220" y="115" textAnchor="middle" fontSize="12" fill="#065f46">
          Normal power: AC bypasses electronics → very high efficiency, cool & quiet
        </text>

        {/* Charger + Battery + Inverter */}
        <rect x="140" y="150" width="80" height="30" rx="6" fill="#ffffff" stroke="#d1d5db" />
        <text x="180" y="170" textAnchor="middle" fontSize="12" fill="#111827">Charger</text>

        <rect x="140" y="200" width="80" height="30" rx="6" fill="#ffffff" stroke="#d1d5db" />
        <text x="180" y="220" textAnchor="middle" fontSize="12" fill="#111827">Battery</text>

        <rect x="280" y="200" width="80" height="30" rx="6" fill="#ffffff" stroke="#d1d5db" />
        <text x="320" y="220" textAnchor="middle" fontSize="12" fill="#111827">Inverter</text>

        <line x1="180" y1="180" x2="180" y2="200" stroke="#6b7280" strokeWidth="2" />
        <line x1="220" y1="215" x2="280" y2="215" stroke="#6b7280" strokeWidth="2" markerEnd="url(#arrow)" />
        <line x1="320" y1="200" x2="320" y2="170" stroke="#6b7280" strokeWidth="2" />
        <line x1="320" y1="170" x2="350" y2="170" stroke="#6b7280" strokeWidth="2" markerEnd="url(#arrow)" />
        <text x="220" y="260" textAnchor="middle" fontSize="12" fill="#111827">
          Outage: relay switches to inverter (≈ 4–10 ms), battery powers load
        </text>
      </g>

      {/* Line-Interactive */}
      <g transform="translate(480, 60)">
        <rect x="0" y="0" width="440" height="320" rx="12" fill="#ffffff" stroke="#d1d5db" />
        <text x="220" y="24" textAnchor="middle" fontSize="16" fill="#b45309" fontWeight="600">
          Line-Interactive UPS
        </text>

        {/* AC Path via AVR */}
        <rect x="18" y="70" width="70" height="30" rx="6" fill="#ffffff" stroke="#d1d5db" />
        <text x="53" y="90" textAnchor="middle" fontSize="12" fill="#111827">AC In</text>
        <rect x="120" y="70" width="90" height="30" rx="6" fill="#ffffff" stroke="#d1d5db" />
        <text x="165" y="90" textAnchor="middle" fontSize="12" fill="#111827">AVR (Buck/Boost)</text>
        <rect x="350" y="70" width="70" height="30" rx="6" fill="#ffffff" stroke="#d1d5db" />
        <text x="385" y="90" textAnchor="middle" fontSize="12" fill="#111827">Load</text>

        <line x1="88" y1="85" x2="120" y2="85" stroke="#6b7280" strokeWidth="2" />
        <line x1="210" y1="85" x2="350" y2="85" stroke="#6b7280" strokeWidth="2" markerEnd="url(#arrow)" />
        <text x="220" y="115" textAnchor="middle" fontSize="12" fill="#065f46">
          Normal power: AC passes through AVR that corrects low/high voltage
        </text>

        {/* Charger + Battery + Inverter */}
        <rect x="140" y="150" width="80" height="30" rx="6" fill="#ffffff" stroke="#d1d5db" />
        <text x="180" y="170" textAnchor="middle" fontSize="12" fill="#111827">Charger</text>

        <rect x="140" y="200" width="80" height="30" rx="6" fill="#ffffff" stroke="#d1d5db" />
        <text x="180" y="220" textAnchor="middle" fontSize="12" fill="#111827">Battery</text>

        <rect x="280" y="200" width="80" height="30" rx="6" fill="#ffffff" stroke="#d1d5db" />
        <text x="320" y="220" textAnchor="middle" fontSize="12" fill="#111827">Inverter</text>

        <line x1="180" y1="180" x2="180" y2="200" stroke="#6b7280" strokeWidth="2" />
        <line x1="220" y1="215" x2="280" y2="215" stroke="#6b7280" strokeWidth="2" markerEnd="url(#arrow)" />
        <line x1="320" y1="200" x2="320" y2="170" stroke="#6b7280" strokeWidth="2" />
        <line x1="320" y1="170" x2="350" y2="170" stroke="#6b7280" strokeWidth="2" markerEnd="url(#arrow)" />

        <text x="220" y="260" textAnchor="middle" fontSize="12" fill="#111827">
          Outage: transfer to inverter (≈ 2–6 ms). AVR helps ride through brownouts without battery.
        </text>
      </g>
    </svg>
  );
}

/* --------------------------------- Component --------------------------------- */
export default function IntroSection() {
  const efficiencyData = [
    { type: "Offline (Standby)", efficiency: 96 },
    { type: "Line-Interactive", efficiency: 94 },
    { type: "Online (Double Conversion)", efficiency: 88 },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-gray-200 rounded-2xl p-6 mb-8 max-w-3xl print-card"
    >
      <h2 className="text-2xl font-bold mb-2">⚡ The Right UPS for Homes: Offline & Line-Interactive</h2>

      <p className="text-gray-700 leading-7">
        For <strong>home and small-office</strong> use, the best fit is almost always an{" "}
        <strong>Offline (Standby)</strong> or <strong>Line-Interactive</strong> UPS. Both deliver clean,
        reliable backup for <em>computers, routers, TVs, game consoles, NAS drives, LED lighting,
        small fridges, pumps, boilers and control boards</em>—without the constant heat and noise of
        an “online” double-conversion UPS. The key idea: when utility power is healthy, they let AC
        pass straight through (Line-Interactive adds automatic voltage regulation, AVR). When power
        dips or fails, a relay transfers to the inverter and the battery takes over.
      </p>

      <h3 className="mt-4 font-semibold text-lg">How They Work</h3>
      <ul className="list-disc pl-6 text-gray-700 leading-7">
        <li>
          <strong>Offline (Standby)</strong> — In normal operation, your load is connected directly to
          the mains via a bypass path. The battery stays charged. If the mains fails, a small relay
          switches to the inverter in about <strong>4–10 ms</strong> and the battery powers the load.
        </li>
        <li>
          <strong>Line-Interactive</strong> — Same idea, plus an <strong>AVR (buck/boost transformer)</strong> that
          corrects low or high voltage <em>without</em> using the battery. Transfer to the inverter on real
          outages is typically <strong>2–6 ms</strong>, and the AVR often eliminates needless battery cycles during
          brownouts and sags.
        </li>
      </ul>

      <div className="my-4">
        <UpsDiagramSVG />
        <p className="text-xs text-gray-500 mt-1 text-center">
          Normal power: AC flows directly (offline) or through AVR (line-interactive). During an outage:
          a relay transfers to the inverter and the battery runs the load.
        </p>
      </div>

      <h3 className="mt-4 font-semibold text-lg">Why They’re Ideal for Homes</h3>
      <ul className="list-disc pl-6 text-gray-700 leading-7">
        <li>
          <strong>High efficiency, low heat</strong> — Bypass mode avoids constant AC→DC→AC conversion.
          That means <em>less wasted power</em>, cooler operation, and <em>lower electricity bills</em>.
        </li>
        <li>
          <strong>Quiet</strong> — Fans don’t need to run all the time. Most of the day, you won’t hear it.
        </li>
        <li>
          <strong>Longer battery life</strong> — Fewer unnecessary discharge cycles (especially with AVR) and cooler temps
          help batteries last longer.
        </li>
        <li>
          <strong>Cost-effective</strong> — Lower purchase price and operating costs than online UPS models.
        </li>
        <li>
          <strong>Simple & reliable</strong> — Fewer always-on power stages → fewer parts running hot → fewer headaches.
        </li>
      </ul>

      {/* ---------------------- Pure sine vs simulated sine ---------------------- */}
      <h3 className="mt-4 font-semibold text-lg">Pure Sine vs Simulated Sine</h3>
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <p className="text-gray-700 leading-7">
          Many home UPS models output either a <strong>pure sine wave</strong> or a <strong>simulated (stepped) sine wave</strong> on battery.
          For most basic electronics, both will work. However:
        </p>
        <ul className="list-disc pl-6 text-gray-700 leading-7 mt-2">
          <li>
            For <strong>PCs with active PFC power supplies</strong>, modern TVs, audio gear, and appliances with
            <strong> AC motors or compressors</strong>, choose a <strong>pure sine-wave UPS</strong> to minimize noise, heat, and stress.
          </li>
          <li>
            Simulated sine is fine for <strong>routers, ONTs, small LED lighting, low-power electronics</strong>,
            and many <strong>budget PCs</strong>, but check the PSU specifications if unsure.
          </li>
          <li>
            If a device <em>buzzes</em> or runs <em>hotter</em> on battery, upgrade to pure sine or increase UPS VA rating.
          </li>
        </ul>
      </div>

      <h3 className="mt-4 font-semibold text-lg">Will They Work with My Equipment?</h3>
      <ul className="list-disc pl-6 text-gray-700 leading-7">
        <li>
          <strong>Computers, routers, TVs, game consoles, monitors</strong> — Yes. Modern PSUs typically tolerate brief
          transfer times (up to ~20 ms) thanks to input capacitors.
        </li>
        <li>
          <strong>NAS / home servers</strong> — Yes; pair with a USB or network-signaling UPS if you want auto-shutdown.
        </li>
        <li>
          <strong>Fridges, pumps, small motors</strong> — Yes, but size your UPS generously to handle <em>inrush current</em>.
          If the motor is large (deep-well pump, big compressor), consider a dedicated inverter or higher-VA UPS.
        </li>
        <li>
          <strong>Audio gear & TVs</strong> — Prefer a <em>pure sine-wave</em> output model (many line-interactive units offer this).
        </li>
      </ul>

      <h3 className="mt-4 font-semibold text-lg">When Would I Choose an Online UPS?</h3>
      <p className="text-gray-700 leading-7">
        Online (double-conversion) UPS keeps the inverter running <em>all the time</em> for the absolute
        lowest transfer time (0 ms) and tightest voltage/frequency control. That’s valuable for
        certain <strong>labs, medical devices, harsh generator power, or mission-critical servers</strong>.
        For typical homes, the noise, heat, and energy penalty usually aren’t worth it.
      </p>

      <h3 className="mt-4 font-semibold text-lg">Common Myths (Quick Facts)</h3>
      <ul className="list-disc pl-6 text-gray-700 leading-7">
        <li>
          <strong>“Transfer time will crash my PC.”</strong> — Unlikely. ATX PSUs hold up for short dips;
          4–10 ms (offline) or 2–6 ms (line-interactive) is normally fine.
        </li>
        <li>
          <strong>“Line-interactive can’t handle computers.”</strong> — It can. They’re widely used for IT loads.
          Pick <em>pure sine-wave output</em> if your gear is sensitive.
        </li>
        <li>
          <strong>“AVR is the same as a stabilizer.”</strong> — AVR inside a line-interactive UPS is <em>automatic</em>
          buck/boost designed to reduce battery use during sags/overvoltage.
        </li>
      </ul>

      {/* --------------------------- Quick sizing checklist --------------------------- */}
      <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <h4 className="font-semibold mb-2">Quick Sizing Checklist</h4>
        <ol className="list-decimal pl-6 text-gray-700 leading-7 space-y-1">
          <li>
            <strong>List your loads</strong> (W): PC, monitor, router, TV, fridge, pump, etc. Sum the watts.
          </li>
          <li>
            <strong>Add headroom</strong>: × <code>1.25</code> for electronics, × <code>2.0–3.0</code> for motor loads (to handle inrush).
          </li>
          <li>
            <strong>Convert to VA</strong>: divide by <em>power factor</em> (typ. 0.8). Example: 600 W ÷ 0.8 ≈ 750 VA.
          </li>
          <li>
            <strong>Pick a UPS size</strong> at or above the VA you computed (choose the nearest standard VA rating).
          </li>
          <li>
            <strong>Choose output type</strong>: Prefer <em>pure sine</em> if you have active-PFC PSUs, audio gear, or motors.
          </li>
          <li>
            <strong>Battery runtime</strong>: Use the calculator (next section) to select Ah and strings for your target minutes.
          </li>
          <li>
            <strong>Noise/placement</strong>: Line-interactive is quiet most of the time; leave space for airflow and batteries.
          </li>
        </ol>
      </div>

      {/* ----------- Manual page break so next content starts on a new page ----------- */}
      <div className="print-break" />

      <h3 className="mt-4 font-semibold text-lg">Efficiency Comparison (Typical)</h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={efficiencyData}>
          <XAxis dataKey="type" />
          <YAxis />
          <RechartsTooltip wrapperClassName="recharts-default-tooltip no-print" />
          <Bar dataKey="efficiency" radius={8} />
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <h4 className="font-semibold mb-2">Quick recommendation</h4>
        <ul className="list-disc pl-6 text-gray-700 leading-7">
          <li>
            For <strong>most homes</strong>: a <strong>line-interactive, pure sine-wave</strong> UPS sized for your total watts
            (plus headroom for inrush) gives the best balance of protection, silence, and efficiency.
          </li>
          <li>
            For <strong>budget backup of small loads</strong> (router, LED lights, a single PC): a
            <strong> quality offline (standby)</strong> unit is excellent value.
          </li>
          <li>
            Consider <strong>online UPS</strong> only when you truly need zero transfer and very tight regulation,
            and you’re OK with extra heat, noise, and cost.
          </li>
        </ul>
      </div>
    </motion.section>
  );
}
