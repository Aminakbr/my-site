"use client";
import { useRef, useState } from "react";
import { Printer } from "lucide-react";
import { useReactToPrint } from "react-to-print";

import CalculatorSection from "../../components/CalculatorSection";
import IntroSection from "../../components/IntroSection";
import {
  Chem,
  Device,
  Result,
  STANDARD_UPS_SIZES,
  MAX_STRINGS,
  PEUKERT,
  pickDCBusFromUps,
  safeW,
} from "../../lib/ups";

export default function HomeUpsPage() {
  const reportRef = useRef<HTMLDivElement>(null);

  // --- State (shared) ---
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

  // tunables
  const [pf, setPf] = useState<number>(0.8);
  const [eta, setEta] = useState<number>(0.88);

  // --- Print to PDF ---
  const handlePrint = useReactToPrint({
    contentRef: reportRef,
    documentTitle: "UPS_Report",
    pageStyle: `
      @page { size: A4; margin: 12mm; }
      html, body { background: #ffffff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
      .print-card { break-inside: avoid; page-break-inside: avoid; }
      .print-break { page-break-before: always; break-before: page; }
    `,
  });

  // --- Actions / logic ---
  const addDevice = () => setDevices((prev) => [...prev, { name: "", watts: 0 }]);
  const removeDevice = (i: number) => {
    const copy = [...devices];
    copy.splice(i, 1);
    setDevices(copy.length ? copy : [{ name: "", watts: 0 }]);
  };

  const handleSelect = (index: number, d: Device) => {
    const updated = [...devices];
    updated[index] = { name: d.name, watts: d.watts };
    setDevices(updated);
    setSearch("");
    setSearchIndex(null);
  };

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

  return (
    // Suppress hydration warnings from extensions injecting attributes (e.g., fdprocessedid)
    <div
      className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white"
      suppressHydrationWarning
    >
      <style jsx global>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-bg-white { background: #ffffff !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Header */}
      <header
        className="w-full bg-gray-900/80 border-b border-gray-700 py-3 px-6 flex justify-between items-center print-bg-white"
        suppressHydrationWarning
      >
        <h1 className="text-2xl font-bold text-green-600">🔋 Smart UPS Designer</h1>
        <button
          onClick={handlePrint}
          className="no-print inline-flex items-center gap-2 bg-white text-gray-900 px-3 py-2 rounded shadow hover:shadow-md"
          aria-label="Print or Save as PDF"
          suppressHydrationWarning
        >
          <Printer className="w-4 h-4" /> Print / Save as PDF
        </button>
      </header>

      {/* Printable body */}
      <main
        ref={reportRef}
        id="report-section"
        className="flex flex-col items-center py-8 px-4 sm:px-8 bg-white text-gray-900"
        suppressHydrationWarning
      >
        {/* 1) Calculator FIRST */}
        <CalculatorSection
          devices={devices}
          setDevices={setDevices}
          addDevice={addDevice}
          removeDevice={removeDevice}
          batteryType={batteryType}
          setBatteryType={setBatteryType}
          backupTimeMin={backupTimeMin}
          setBackupTimeMin={setBackupTimeMin}
          pf={pf}
          setPf={setPf}
          eta={eta}
          setEta={setEta}
          result={result}
          selectedBatteryAh={selectedBatteryAh}
          setSelectedBatteryAh={setSelectedBatteryAh}
          stringCount={stringCount}
          actualBackupMin={actualBackupMin}
          meetsTarget={meetsTarget}
          calculate={calculate}
          recalcRuntime={recalcRuntime}
          search={search}
          setSearch={setSearch}
          searchIndex={searchIndex}
          setSearchIndex={setSearchIndex}
          onSelectLibraryItem={handleSelect}
        />

        {/* Optional: page break before the long description when printing */}
        <div className="print-break" />

        {/* 2) Description SECOND */}
        <IntroSection />

        <footer className="mt-10 py-4 text-center text-gray-600 text-sm border-t border-gray-200 w-full max-w-3xl">
          © 2025 Smart UPS Calculator — Built by Amina ⚡
        </footer>
      </main>
    </div>
  );
}
