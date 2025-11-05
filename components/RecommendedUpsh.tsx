"use client";

import React from "react";
import { CheckCircle2, AlertTriangle, ExternalLink, Building2 } from "lucide-react";

export type Result = {
  upsVA: number;              // computed VA needed (apparent power)
  suggestedUPS?: number;      // optional for 1P flows
  phase?: "1P-1P" | "3P-3P";  // single or three phase
  sizedWatts: number;         // P′ with headroom
  pf: number;                 // power factor used
  eta: number;                // efficiency
};

type Props = {
  result: Result;
  /** Optional custom section title (e.g., "Hospital Recomand") */
  title?: string;
};

/** Utility: round up to next model from a list */
function pickModel(vaNeeded: number, options: UpsModel[]) {
  const sorted = [...options].sort((a, b) => a.va - b.va);
  return sorted.find((m) => m.va >= vaNeeded) ?? sorted[sorted.length - 1];
}

type UpsModel = {
  brand: "GTEC" | "GE" | "BOORI";
  series: string;
  topology: "Online" | "Line-Interactive" | "Offline";
  phase: "1P-1P" | "3P-3P";
  va: number;
  url: string; // put your real product/affiliate link here
  notes?: string;
};

/* === Catalogs (edit names/links to match your real SKUs) === */
const CATALOG_1P: UpsModel[] = [
  // GTEC
  { brand: "GTEC", series: "APM 1K", topology: "Online", phase: "1P-1P", va: 1000, url: "/go/gtec-1k" },
  { brand: "GTEC", series: "APM 2K", topology: "Online", phase: "1P-1P", va: 2000, url: "/go/gtec-2k" },
  { brand: "GTEC", series: "APM 3K", topology: "Online", phase: "1P-1P", va: 3000, url: "/go/gtec-3k" },
  { brand: "GTEC", series: "APM 6K", topology: "Online", phase: "1P-1P", va: 6000, url: "/go/gtec-6k" },
  { brand: "GTEC", series: "APM 10K", topology: "Online", phase: "1P-1P", va: 10000, url: "/go/gtec-10k" },

  // GE
  { brand: "GE", series: "VH Series 1K", topology: "Online", phase: "1P-1P", va: 1000, url: "/go/ge-1k" },
  { brand: "GE", series: "VH Series 2K", topology: "Online", phase: "1P-1P", va: 2000, url: "/go/ge-2k" },
  { brand: "GE", series: "VH Series 3K", topology: "Online", phase: "1P-1P", va: 3000, url: "/go/ge-3k" },
  { brand: "GE", series: "TLE Single 6K", topology: "Online", phase: "1P-1P", va: 6000, url: "/go/ge-6k" },
  { brand: "GE", series: "TLE Single 10K", topology: "Online", phase: "1P-1P", va: 10000, url: "/go/ge-10k" },

  // BOORI
  { brand: "BOORI", series: "ProLine 1K", topology: "Online", phase: "1P-1P", va: 1000, url: "/go/boori-1k" },
  { brand: "BOORI", series: "ProLine 2K", topology: "Online", phase: "1P-1P", va: 2000, url: "/go/boori-2k" },
  { brand: "BOORI", series: "ProLine 3K", topology: "Online", phase: "1P-1P", va: 3000, url: "/go/boori-3k" },
  { brand: "BOORI", series: "ProLine 6K", topology: "Online", phase: "1P-1P", va: 6000, url: "/go/boori-6k" },
  { brand: "BOORI", series: "ProLine 10K", topology: "Online", phase: "1P-1P", va: 10000, url: "/go/boori-10k" },
];

const CATALOG_3P: UpsModel[] = [
  // GTEC
  { brand: "GTEC", series: "ThreePhase 10K", topology: "Online", phase: "3P-3P", va: 10000, url: "/go/gtec-3p-10k" },
  { brand: "GTEC", series: "ThreePhase 20K", topology: "Online", phase: "3P-3P", va: 20000, url: "/go/gtec-3p-20k" },
  { brand: "GTEC", series: "ThreePhase 30K", topology: "Online", phase: "3P-3P", va: 30000, url: "/go/gtec-3p-30k" },
  { brand: "GTEC", series: "ThreePhase 40K", topology: "Online", phase: "3P-3P", va: 40000, url: "/go/gtec-3p-40k" },
  { brand: "GTEC", series: "ThreePhase 60K", topology: "Online", phase: "3P-3P", va: 60000, url: "/go/gtec-3p-60k" },
  { brand: "GTEC", series: "ThreePhase 80K", topology: "Online", phase: "3P-3P", va: 80000, url: "/go/gtec-3p-80k" },
  { brand: "GTEC", series: "ThreePhase 100K", topology: "Online", phase: "3P-3P", va: 100000, url: "/go/gtec-3p-100k" },
  { brand: "GTEC", series: "ThreePhase 160K", topology: "Online", phase: "3P-3P", va: 160000, url: "/go/gtec-3p-160k" },
  { brand: "GTEC", series: "ThreePhase 200K", topology: "Online", phase: "3P-3P", va: 200000, url: "/go/gtec-3p-200k" },

  // GE
  { brand: "GE", series: "TLE 10K", topology: "Online", phase: "3P-3P", va: 10000, url: "/go/ge-3p-10k" },
  { brand: "GE", series: "TLE 20K", topology: "Online", phase: "3P-3P", va: 20000, url: "/go/ge-3p-20k" },
  { brand: "GE", series: "TLE 30K", topology: "Online", phase: "3P-3P", va: 30000, url: "/go/ge-3p-30k" },
  { brand: "GE", series: "TLE 40K", topology: "Online", phase: "3P-3P", va: 40000, url: "/go/ge-3p-40k" },
  { brand: "GE", series: "TLE 60K", topology: "Online", phase: "3P-3P", va: 60000, url: "/go/ge-3p-60k" },
  { brand: "GE", series: "TLE 80K", topology: "Online", phase: "3P-3P", va: 80000, url: "/go/ge-3p-80k" },
  { brand: "GE", series: "TLE 100K", topology: "Online", phase: "3P-3P", va: 100000, url: "/go/ge-3p-100k" },
  { brand: "GE", series: "TLE 160K", topology: "Online", phase: "3P-3P", va: 160000, url: "/go/ge-3p-160k" },
  { brand: "GE", series: "TLE 200K", topology: "Online", phase: "3P-3P", va: 200000, url: "/go/ge-3p-200k" },

  // BOORI
  { brand: "BOORI", series: "TriGuard 10K", topology: "Online", phase: "3P-3P", va: 10000, url: "/go/boori-3p-10k" },
  { brand: "BOORI", series: "TriGuard 20K", topology: "Online", phase: "3P-3P", va: 20000, url: "/go/boori-3p-20k" },
  { brand: "BOORI", series: "TriGuard 30K", topology: "Online", phase: "3P-3P", va: 30000, url: "/go/boori-3p-30k" },
  { brand: "BOORI", series: "TriGuard 40K", topology: "Online", phase: "3P-3P", va: 40000, url: "/go/boori-3p-40k" },
  { brand: "BOORI", series: "TriGuard 60K", topology: "Online", phase: "3P-3P", va: 60000, url: "/go/boori-3p-60k" },
  { brand: "BOORI", series: "TriGuard 80K", topology: "Online", phase: "3P-3P", va: 80000, url: "/go/boori-3p-80k" },
  { brand: "BOORI", series: "TriGuard 100K", topology: "Online", phase: "3P-3P", va: 100000, url: "/go/boori-3p-100k" },
  { brand: "BOORI", series: "TriGuard 160K", topology: "Online", phase: "3P-3P", va: 160000, url: "/go/boori-3p-160k" },
  { brand: "BOORI", series: "TriGuard 200K", topology: "Online", phase: "3P-3P", va: 200000, url: "/go/boori-3p-200k" },
];

function Card({ m }: { m: UpsModel }) {
  return (
    <a
      href={m.url}
      className="block rounded-xl border border-gray-200 hover:border-gray-300 bg-white p-4 shadow-sm hover:shadow-md transition"
      target="_blank"
      rel="noopener noreferrer"
    >
      <div className="flex items-center gap-2 text-gray-700 mb-1">
        <Building2 className="w-4 h-4" />
        <span className="text-xs uppercase tracking-wide">{m.brand}</span>
      </div>
      <h4 className="text-lg font-bold">{m.series}</h4>
      <p className="text-sm text-gray-600">
        {m.topology} • {m.phase} • {m.va.toLocaleString()} VA
      </p>
      {m.notes && <p className="text-xs text-gray-500 mt-1">{m.notes}</p>}
      <div className="mt-3 inline-flex items-center gap-1 text-green-700 text-sm font-medium">
        View details <ExternalLink className="w-4 h-4" />
      </div>
    </a>
  );
}

export default function RecommendedUpsh({ result, title }: Props) {
  const phase = result.phase ?? (result.upsVA <= 10000 ? "1P-1P" : "3P-3P");
  const vaNeeded = Math.max(result.upsVA, result.suggestedUPS ?? 0);
  const source = phase === "3P-3P" ? CATALOG_3P : CATALOG_1P;

  const gtecPick  = pickModel(vaNeeded, source.filter((m) => m.brand === "GTEC"  && m.phase === phase));
  const gePick    = pickModel(vaNeeded, source.filter((m) => m.brand === "GE"    && m.phase === phase));
  const booriPick = pickModel(vaNeeded, source.filter((m) => m.brand === "BOORI" && m.phase === phase));

  const picks = [gtecPick, gePick, booriPick].filter(Boolean) as UpsModel[];

  return (
    <section className="w-full max-w-5xl mt-6">
      <div className="flex items-center gap-2 mb-2">
        <CheckCircle2 className="w-5 h-5 text-emerald-700" />
        <h3 className="text-xl font-bold">
          {title ?? "Recommended UPS (sized from your load)"}
        </h3>
      </div>

      <p className="text-sm text-gray-700 mb-4">
        We size to the next model at or above <b>{vaNeeded.toLocaleString()} VA</b> ({phase}). For motor/inrush-heavy
        loads, stepping one size higher is often wise.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {picks.map((m) => (
          <Card key={`${m.brand}-${m.series}-${m.va}-${m.phase}`} m={m} />
        ))}
      </div>

      <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 text-amber-900 p-3 text-sm flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 mt-0.5" />
        <p>
          <b>Note:</b> Replace <code>url</code> fields with your real product pages or affiliate links. Edit the
          catalogs to match your exact VA steps and model names.
        </p>
      </div>
    </section>
  );
}
