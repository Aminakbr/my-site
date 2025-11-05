"use client";

import { useCallback, useEffect, useState } from "react";
import { Printer } from "lucide-react";
import OfficeCalculatorSection from "../../components/OfficeCalculatorSection";
import OfficeIntroSection from "../../components/OfficeIntroSection";
import RecommendedUpsOnline from "../../components/RecommendedUpsOnline";

export default function OfficeUpsPage() {
  // Hydration-safe print button
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);
  const onPrint = useCallback(() => {
    if (typeof window !== "undefined") window.print();
  }, []);

  // Calculator state (kept here so we can pass to recommender)
  const [result, setResult] = useState<ReturnType<typeof OfficeCalculatorSection["calcShape"]> | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white text-gray-900">
      <header className="w-full bg-white/90 border-b border-gray-200 py-3 px-6 flex justify-between items-center print-bg-white">
        <h1 className="text-2xl font-bold text-blue-700">🏢 Office UPS Designer (Online, 1Φ in / 1Φ out)</h1>
        {isClient ? (
          <button
            onClick={onPrint}
            className="no-print inline-flex items-center gap-2 bg-white text-gray-900 px-3 py-2 rounded shadow hover:shadow-md border border-gray-200"
            aria-label="Print or Save as PDF"
          >
            <Printer className="w-4 h-4" /> Print / Save as PDF
          </button>
        ) : (
          <div className="h-9 w-36 rounded bg-gray-100 border border-gray-200" aria-hidden />
        )}
      </header>

      <main id="office-report" className="flex flex-col items-center py-8 px-4 sm:px-8">
        <OfficeCalculatorSection onResult={setResult} />
        {result && <RecommendedUpsOnline result={result} regionLabel="Global" />}
        <OfficeIntroSection />
      </main>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          html, body { background: #ffffff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-card { break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}
