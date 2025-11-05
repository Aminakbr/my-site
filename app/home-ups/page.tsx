"use client";

import { useCallback, useEffect, useState } from "react";
import { Printer } from "lucide-react";

import CalculatorSection from "../../components/CalculatorSection";
import IntroSection from "../../components/IntroSection";
import RecommendedUps from "../../components/RecommendedUps";

import {
  Chem, Device, Result, MAX_STRINGS, STANDARD_UPS_SIZES, clamp, HEADROOM,
} from "../../lib/ups";

export default function HomeUpsPage() {
  // ----- client-mount guard to avoid hydration mismatches -----
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);

  const onPrint = useCallback(() => {
    if (typeof window !== "undefined") window.print();
  }, []);

  // ----- calculator state -----
  const [devices, setDevices] = useState<Device[]>([{ name: "", watts: 0 }]);
  const [batteryType, setBatteryType] = useState<Chem>("leadacid");
  const [backupTimeMin, setBackupTimeMin] = useState<number>(30);
  const [pf, setPf] = useState<number>(0.8);
  const [eta, setEta] = useState<number>(0.88);
  const [headroom, setHeadroom] = useState<number>(HEADROOM.none);
  const [result, setResult] = useState<Result | null>(null);
  const [selectedBatteryAh, setSelectedBatteryAh] = useState<number | null>(null);
  const [stringCount, setStringCount] = useState<number>(1);
  const [actualBackupMin, setActualBackupMin] = useState<number | null>(null);
  const [meetsTarget, setMeetsTarget] = useState<boolean | null>(null);
  const [search, setSearch] = useState<string>("");
  const [searchIndex, setSearchIndex] = useState<number | null>(null);

  const addDevice = () => setDevices((d) => [...d, { name: "", watts: 0 }]);
  const removeDevice = (i: number) =>
    setDevices((prev) => {
      const copy = [...prev];
      copy.splice(i, 1);
      return copy.length ? copy : [{ name: "", watts: 0 }];
    });

  const onSelectLibraryItem = (i: number, d: Device) => {
    setDevices((prev) => {
      const c = [...prev];
      c[i] = { name: d.name, watts: d.watts };
      return c;
    });
    setSearch("");
    setSearchIndex(null);
  };

  // ----- calculations -----
  const calculate = () => {
    const P = devices.reduce((s, d) => s + (Number.isFinite(d.watts) ? d.watts : 0), 0);
    const m = headroom || 1;
    const Pp = P * m;

    const clampedPf = clamp(pf, 0.6, 1);
    const eff = clamp(eta, 0.75, 0.98);

    const upsVA = Pp / clampedPf;
    const suggestedUPS =
      STANDARD_UPS_SIZES.find((s) => s >= upsVA) ??
      STANDARD_UPS_SIZES[STANDARD_UPS_SIZES.length - 1];

    let vdc = 12,
      seriesCount = 1;
    if (suggestedUPS > 1000 && suggestedUPS <= 2000) {
      vdc = 24;
      seriesCount = 2;
    } else if (suggestedUPS > 2000 && suggestedUPS <= 3000) {
      vdc = 36;
      seriesCount = 3;
    } else if (suggestedUPS > 3000 && suggestedUPS <= 5000) {
      vdc = 48;
      seriesCount = 4;
    } else if (suggestedUPS > 5000) {
      vdc = 96;
      seriesCount = 8;
    }

    const tHours = backupTimeMin / 60;
    const I = Pp / (vdc * eff);

    const H = batteryType === "lifepo4" ? 1 : 20;
    const k =
      batteryType === "leadacid" ? 1.2 : batteryType === "agm" ? 1.15 : 1.05;

    const Creq = I * H * Math.pow(tHours / H, 1 / k);

    setResult({
      totalWatts: P,
      sizedWatts: Pp,
      headroom: m,
      pf: clampedPf,
      eta: eff,
      upsVA,
      suggestedUPS,
      vdc,
      batteryCount: seriesCount,
      requiredAhPerString: Creq,
      k,
      H,
      targetHours: tHours,
      dischargeCurrentA: I,
    });

    setSelectedBatteryAh(null);
    setStringCount(1);
    setActualBackupMin(null);
    setMeetsTarget(null);
  };

  const recalcRuntime = (selectedAh: number) => {
    if (!result) return;
    const { sizedWatts, vdc, eta: eff, k, H, requiredAhPerString } = result;

    const neededStrings = Math.ceil(requiredAhPerString / selectedAh);
    const cappedStrings = Math.min(MAX_STRINGS, Math.max(1, neededStrings));
    const effectiveAh = selectedAh * cappedStrings;

    const I = sizedWatts / (vdc * eff);
    const t_hours = H * Math.pow(effectiveAh / (I * H), k);
    const t_min = t_hours * 60;

    const meets =
      effectiveAh >= requiredAhPerString && neededStrings <= MAX_STRINGS;

    setStringCount(cappedStrings);
    setActualBackupMin(t_min);
    setMeetsTarget(meets);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white text-gray-900">
      <header className="w-full bg-white/90 border-b border-gray-200 py-3 px-6 flex justify-between items-center print-bg-white">
        <h1 className="text-2xl font-bold text-green-700">🔋 Smart UPS Designer</h1>

        {/* Render the print button only after the client hydrates */}
        {isClient ? (
          <button
            onClick={onPrint}
            className="no-print inline-flex items-center gap-2 bg-white text-gray-900 px-3 py-2 rounded shadow hover:shadow-md border border-gray-200"
            aria-label="Print or Save as PDF"
          >
            <Printer className="w-4 h-4" /> Print / Save as PDF
          </button>
        ) : (
          // tiny placeholder to keep layout stable during SSR
          <div className="h-9 w-36 rounded bg-gray-100 border border-gray-200" aria-hidden />
        )}
      </header>

      <main
        id="report-section"
        className="flex flex-col items-center py-8 px-4 sm:px-8"
        suppressHydrationWarning
      >
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
          headroom={headroom}
          setHeadroom={setHeadroom}
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
          onSelectLibraryItem={onSelectLibraryItem}
        />

        {result && <RecommendedUps result={result} region="EU" />}

        <IntroSection />
      </main>

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          html,
          body {
            background: #ffffff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-card {
            break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}
