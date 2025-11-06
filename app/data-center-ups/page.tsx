"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Printer } from "lucide-react";
import type { Result } from "../../components/RecommendedUpsdc";

// Client-only to avoid hydration mismatch
const DataCenterCalculatorSection = dynamic(
  () => import("../../components/DataCenterCalculatorSection"),
  { ssr: false }
);

const RecommendedUpsdc = dynamic(() => import("../../components/RecommendedUpsdc"), {
  ssr: false,
});

export default function DataCenterUpsPage() {
  const [calcResult, setCalcResult] = useState<Result | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white text-gray-900">
      <header className="w-full bg-white/90 border-b border-gray-200 py-3 px-6 flex justify-between items-center print-bg-white">
        <h1 className="text-2xl font-bold text-emerald-700">🏢 Data Center UPS Designer (3Φ/3Φ)</h1>
        <button
          onClick={() => { if (typeof window !== "undefined") window.print(); }}
          className="no-print inline-flex items-center gap-2 bg-white text-gray-900 px-3 py-2 rounded shadow hover:shadow-md border border-gray-200"
          aria-label="Print or Save as PDF"
          suppressHydrationWarning
        >
          <Printer className="w-4 h-4" /> Print / Save as PDF
        </button>
      </header>

      <main className="flex flex-col items-center py-8 px-4 sm:px-8">
        <DataCenterCalculatorSection onResultChange={setCalcResult} />

        {calcResult && (
          <div className="w-full max-w-5xl mt-6">
            <RecommendedUpsdc result={calcResult} title="Data Center Recomand" />
          </div>
        )}

        <footer className="mt-10 py-4 text-center text-gray-500 text-sm border-t border-gray-200 w-full max-w-5xl">
          © 2025 Data Center UPS Calculator — Built by Amina ⚡
        </footer>
      </main>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          .print-bg-white { background: #fff !important; }
        }
      `}</style>
    </div>
  );
}
