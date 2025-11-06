"use client";

import React from "react";
import { CheckCircle2, AlertTriangle, ExternalLink, Building2, Cpu } from "lucide-react";

/* Public result shape coming from the calculator */
export type Result = {
  upsVA: number;              // computed VA needed
  suggestedUPS?: number;      // not used for 3P flow, but allowed
  phase?: "1P-1P" | "3P-3P";  // calculator may pass this; we default to 3P-3P
  sizedWatts: number;         // P′ after headroom
  pf: number;
  eta: number;
};

type Props = {
  result: Result;
  title?: string; // e.g., "Data Center Recomand"
};

type UpsModel = {
  brand: "GTEC" | "GE" | "BOORI";
  series: string;
  phase: "1P-1P" | "3P-3P";
  va: number;
  category: "Transformerless" | "Modular";
  url: string;     // put your real product/affiliate link or a /go/slug
  notes?: string;
};

/* Catalog (edit names/links to match your SKUs) */
const CATALOG_3P: UpsModel[] = [
  // ===== Transformer-less (Double Conversion w/o output transformer) =====
  { brand: "GTEC",  series: "TLX 10K",   phase: "3P-3P", va: 10000,  category: "Transformerless", url: "/go/gtec-tlx-10k" },
  { brand: "GTEC",  series: "TLX 20K",   phase: "3P-3P", va: 20000,  category: "Transformerless", url: "/go/gtec-tlx-20k" },
  { brand: "GTEC",  series: "TLX 40K",   phase: "3P-3P", va: 40000,  category: "Transformerless", url: "/go/gtec-tlx-40k" },
  { brand: "GTEC",  series: "TLX 80K",   phase: "3P-3P", va: 80000,  category: "Transformerless", url: "/go/gtec-tlx-80k" },
  { brand: "GTEC",  series: "TLX 120K",  phase: "3P-3P", va: 120000, category: "Transformerless", url: "/go/gtec-tlx-120k" },

  { brand: "GE",    series: "TLE 10K",   phase: "3P-3P", va: 10000,  category: "Transformerless", url: "/go/ge-tle-10k" },
  { brand: "GE",    series: "TLE 20K",   phase: "3P-3P", va: 20000,  category: "Transformerless", url: "/go/ge-tle-20k" },
  { brand: "GE",    series: "TLE 40K",   phase: "3P-3P", va: 40000,  category: "Transformerless", url: "/go/ge-tle-40k" },
  { brand: "GE",    series: "TLE 80K",   phase: "3P-3P", va: 80000,  category: "Transformerless", url: "/go/ge-tle-80k" },
  { brand: "GE",    series: "TLE 120K",  phase: "3P-3P", va: 120000, category: "Transformerless", url: "/go/ge-tle-120k" },

  { brand: "BOORI", series: "DataLine TL 10K",  phase: "3P-3P", va: 10000,  category: "Transformerless", url: "/go/boori-tl-10k" },
  { brand: "BOORI", series: "DataLine TL 20K",  phase: "3P-3P", va: 20000,  category: "Transformerless", url: "/go/boori-tl-20k" },
  { brand: "BOORI", series: "DataLine TL 40K",  phase: "3P-3P", va: 40000,  category: "Transformerless", url: "/go/boori-tl-40k" },
  { brand: "BOORI", series: "DataLine TL 80K",  phase: "3P-3P", va: 80000,  category: "Transformerless", url: "/go/boori-tl-80k" },
  { brand: "BOORI", series: "DataLine TL 120K", phase: "3P-3P", va: 120000, category: "Transformerless", url: "/go/boori-tl-120k" },

  // ===== Modular (frame + power modules; N+1 scaling) =====
  { brand: "GTEC",  series: "ModuRack 60K (N+1)",  phase: "3P-3P", va: 60000,  category: "Modular", url: "/go/gtec-mod-60k", notes: "Scalable frame, hot-swappable modules" },
  { brand: "GTEC",  series: "ModuRack 120K (N+1)", phase: "3P-3P", va: 120000, category: "Modular", url: "/go/gtec-mod-120k", notes: "Add modules as you grow" },

  { brand: "GE",    series: "Modular 60K (N+1)",   phase: "3P-3P", va: 60000,  category: "Modular", url: "/go/ge-mod-60k", notes: "Redundant modules, front-serviceable" },
  { brand: "GE",    series: "Modular 120K (N+1)",  phase: "3P-3P", va: 120000, category: "Modular", url: "/go/ge-mod-120k" },

  { brand: "BOORI", series: "RackMod 60K (N+1)",   phase: "3P-3P", va: 60000,  category: "Modular", url: "/go/boori-mod-60k" },
  { brand: "BOORI", series: "RackMod 120K (N+1)",  phase: "3P-3P", va: 120000, category: "Modular", url: "/go/boori-mod-120k" },
];

function pickNext(vaNeeded: number, items: UpsModel[]) {
  const sorted = [...items].sort((a, b) => a.va - b.va);
  return sorted.find((m) => m.va >= vaNeeded) ?? sorted[sorted.length - 1];
}

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
        {m.category} • {m.phase} • {m.va.toLocaleString()} VA
      </p>
      {m.notes && <p className="text-xs text-gray-500 mt-1">{m.notes}</p>}
      <div className="mt-3 inline-flex items-center gap-1 text-emerald-700 text-sm font-medium">
        View details <ExternalLink className="w-4 h-4" />
      </div>
    </a>
  );
}

export default function RecommendedUpsdc({ result, title }: Props) {
  // prefer the calculator's phase, but default to 3P-3P
  const phase = (result.phase ?? "3P-3P") as const;
  const vaNeeded = Math.max(result.upsVA, result.suggestedUPS ?? 0);

  const tlItems  = CATALOG_3P.filter((m) => m.category === "Transformerless");
  const modItems = CATALOG_3P.filter((m) => m.category === "Modular");

  const picksTL = ["GTEC", "GE", "BOORI"]
    .map((brand) => pickNext(vaNeeded, tlItems.filter((m) => m.brand === (brand as UpsModel["brand"]))))
    .filter(Boolean) as UpsModel[];

  const picksMod = ["GTEC", "GE", "BOORI"]
    .map((brand) => pickNext(vaNeeded, modItems.filter((m) => m.brand === (brand as UpsModel["brand"]))))
    .filter(Boolean) as UpsModel[];

  return (
    <section className="w-full max-w-5xl mt-6">
      <div className="flex items-center gap-2 mb-2">
        <CheckCircle2 className="w-5 h-5 text-emerald-700" />
        <h3 className="text-xl font-bold">{title ?? "Recommended UPS for Data Center"}</h3>
      </div>

      <p className="text-sm text-gray-700 mb-4 flex items-center gap-2">
        <Cpu className="w-4 h-4" />
        We size to the next model at or above <b>{vaNeeded.toLocaleString()} VA</b> ({phase}).
        For growth and maintenance windows, consider one size higher or Modular (N+1).
      </p>

      <h4 className="text-lg font-semibold mb-2">Transformer-less (Double Conversion)</h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {picksTL.map((m) => (
          <Card key={`${m.brand}-${m.series}-${m.va}-${m.category}`} m={m} />
        ))}
      </div>

      <h4 className="text-lg font-semibold mt-6 mb-2">Modular (N+1 / Scalable)</h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {picksMod.map((m) => (
          <Card key={`${m.brand}-${m.series}-${m.va}-${m.category}`} m={m} />
        ))}
      </div>

      <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 text-amber-900 p-3 text-sm flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 mt-0.5" />
        <p>
          <b>Note:</b> Replace <code>url</code> values with your real product pages or affiliate links,
          or point them to your <code>/go/[slug]</code> redirector.
        </p>
      </div>
    </section>
  );
}
