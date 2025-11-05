"use client";
import { motion } from "framer-motion";

export default function OfficeIntroSection() {
  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-gray-200 p-6 rounded-2xl shadow w-full max-w-3xl space-y-4 mt-8">
      <h2 className="text-xl font-bold">Why Online (Double-Conversion) UPS for Offices?</h2>
      <p className="text-gray-700">
        Online UPS keeps the inverter running 24/7. Input AC → rectifier → DC bus → inverter → clean output AC.
        Transfer time is effectively <b>0 ms</b>, voltage and frequency regulation are tight, and the load is isolated from
        sags, surges, brownouts, and generator noise. This is ideal for servers, storage, VoIP, medical/lab instruments,
        and sensitive IT rooms where continuity and power quality matter.
      </p>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
          <h3 className="font-semibold">Typical Benefits</h3>
          <ul className="list-disc ml-5 mt-2 space-y-1 text-gray-800">
            <li>Zero transfer time — no glitches during switchover.</li>
            <li>Excellent voltage/frequency regulation, low THD output.</li>
            <li>Superior performance on generators and “dirty” mains.</li>
            <li>Plays nicely with Active-PFC PSUs, AV gear, lab instruments.</li>
          </ul>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
          <h3 className="font-semibold">Trade-offs</h3>
          <ul className="list-disc ml-5 mt-2 space-y-1 text-gray-800">
            <li>Lower efficiency vs line-interactive (more heat, fan noise).</li>
            <li>Higher cost and larger size.</li>
            <li>Battery strings must be sized carefully for runtime.</li>
          </ul>
        </div>
      </div>

      <div className="text-gray-700">
        <h3 className="font-semibold">Single-Phase In / Single-Phase Out</h3>
        <p>
          This calculator assumes 1Φ input and 1Φ output (common in offices). It sizes the UPS VA class, DC bus (series count),
          and battery capacity using Peukert’s law with chemistry-specific parameters.
        </p>
      </div>

      <div className="text-gray-700">
        <h3 className="font-semibold">Sizing Quick Steps</h3>
        <ol className="list-decimal ml-5 mt-2 space-y-1">
          <li>List loads (W) and add headroom (×1.25 electronics, ×2.0–3.0 motors/inrush).</li>
          <li>Compute VA = P′ / PF (online PF ≈ 0.9–1.0).</li>
          <li>Pick the next standard VA class; map to DC bus voltage (12/24/36/48/96 V).</li>
          <li>Use Peukert to size Ah per string, choose battery capacity and number of parallel strings.</li>
          <li>Check predicted runtime and C-rate per string; adjust as needed.</li>
        </ol>
      </div>
    </motion.section>
  );
}
