"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { Printer } from "lucide-react";

// ✅ Import the recommendation component (default export)
import RecommendedUpsdc from "../../components/RecommendedUpsdc";

/** Minimal shape the recommendation component needs. 
 *  If you already have a lib type, you can replace this with:
 *    import type { Result } from "@/lib/datacenter";
 *  and then change ResultLite -> Result below.
 */
type ResultLite = {
  upsVA: number;                 // computed apparent power needed
  suggestedUPS?: number;         // rounded/standard VA pick
  phase?: "1P-1P" | "3P-1P" | "3P-3P";
};

// ✅ Dynamically import the calculator to avoid hydration issues
const DataCenterCalculatorSection = dynamic(
  () => import("../../components/DataCenterCalculatorSection"),
  { ssr: false }
);

export default function DataCenterUpsPage() {
  // Calculator state (keep it minimal here; the Section can handle details)
  const [result, setResult] = useState<ResultLite | null>(null);

  const handlePrint = () => window.print();

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="w-full bg-white/90 border-b border-gray-200 py-3 px-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-indigo-700">🏢 Data Center UPS Designer</h1>
        <button
          onClick={handlePrint}
          className="no-print inline-flex items-center gap-2 bg-white text-gray-900 px-3 py-2 rounded shadow hover:shadow-md border border-gray-200"
          aria-label="Print or Save as PDF"
        >
          <Printer className="w-4 h-4" /> Print / Save as PDF
        </button>
      </header>

      <main id="report-section" className="py-8 px-4 sm:px-6 flex flex-col items-center gap-8">
        {/* The calculator should call setResult(...) with an object matching ResultLite */}
        <DataCenterCalculatorSection setResult={setResult} />

        {/* Show recommendations when we have a result */}
        {result && <RecommendedUpsdc result={result} title="Recommended UPS (Data Center — Transformerless & Modular)" />}

        <footer className="text-xs text-gray-500 py-8">
          © 2025 Data Center UPS Calculator — Built by Amina ⚡
        </footer>
      </main>
    </div>
  );
}
