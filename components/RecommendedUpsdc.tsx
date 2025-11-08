"use client";

import React from "react";

/** Adjust this import if your Result type lives elsewhere. 
 *  If you don’t have a Result type exported, you can keep the local ResultLite below.
 */
// import { Result } from "@/lib/datacenter";

/** Minimal shape we need from calculator results.
 *  If you already have a Result type in your lib, remove this and import that instead.
 */
type ResultLite = {
  upsVA: number;                 // computed apparent power needed
  suggestedUPS?: number;         // rounded/standard VA pick
  phase?: "1P-1P" | "3P-1P" | "3P-3P"; // preferred phase topology, if any
};

type Props = {
  result: ResultLite;
  title?: string;
};

/** Simple catalog entries for Data Center UPS (Transformerless & Modular) */
type CatalogItem = {
  brand: string;
  model: string;
  va: number;              // nominal VA rating
  topology: "Transformerless" | "Modular";
  phase: "3P-3P" | "3P-1P" | "1P-1P";
  notes?: string;
  url?: string;            // optional product page
};

// === Transformerless (monolithic frames) ===
const CATALOG_3P: CatalogItem[] = [
  { brand: "Schneider Electric", model: "Galaxy VS 20kVA",  va: 20000, topology: "Transformerless", phase: "3P-3P" },
  { brand: "Schneider Electric", model: "Galaxy VS 50kVA",  va: 50000, topology: "Transformerless", phase: "3P-3P" },
  { brand: "Schneider Electric", model: "Galaxy VM 100kVA", va: 100000, topology: "Transformerless", phase: "3P-3P" },

  { brand: "Vertiv", model: "Liebert EXS 20kVA",  va: 20000, topology: "Transformerless", phase: "3P-3P" },
  { brand: "Vertiv", model: "Liebert EXS 40kVA",  va: 40000, topology: "Transformerless", phase: "3P-3P" },
  { brand: "Vertiv", model: "Liebert EXL S1 100kVA", va: 100000, topology: "Transformerless", phase: "3P-3P" },

  { brand: "Eaton", model: "93E 20kVA",  va: 20000, topology: "Transformerless", phase: "3P-3P" },
  { brand: "Eaton", model: "93E 40kVA",  va: 40000, topology: "Transformerless", phase: "3P-3P" },
  { brand: "Eaton", model: "93PM 100kVA", va: 100000, topology: "Transformerless", phase: "3P-3P" },

  { brand: "Riello", model: "Multi Sentry 20kVA",  va: 20000, topology: "Transformerless", phase: "3P-3P" },
  { brand: "Riello", model: "Sentryum 40kVA",      va: 40000, topology: "Transformerless", phase: "3P-3P" },
  { brand: "Riello", model: "NextEnergy 100kVA",    va: 100000, topology: "Transformerless", phase: "3P-3P" },

  { brand: "Huawei", model: "UPS5000-A 20kVA",  va: 20000, topology: "Transformerless", phase: "3P-3P" },
  { brand: "Huawei", model: "UPS5000-A 50kVA",  va: 50000, topology: "Transformerless", phase: "3P-3P" },
  { brand: "Huawei", model: "UPS5000-A 100kVA", va: 100000, topology: "Transformerless", phase: "3P-3P" },
];

// === Modular frames (hot-swappable power modules) ===
const CATALOG_MODULAR: CatalogItem[] = [
  { brand: "Schneider Electric", model: "Galaxy VL (50–200kVA)", va: 200000, topology: "Modular", phase: "3P-3P", notes: "Scalable in modules" },
  { brand: "Vertiv",             model: "Liebert HPL (50–200kVA)", va: 200000, topology: "Modular", phase: "3P-3P", notes: "Scalable in modules" },
  { brand: "Eaton",              model: "93PM (50–200kVA)",        va: 200000, topology: "Modular", phase: "3P-3P", notes: "Scalable in modules" },
  { brand: "Riello",             model: "Multi Power MPW",         va: 200000, topology: "Modular", phase: "3P-3P", notes: "Scalable in modules" },
  { brand: "Huawei",             model: "FusionPower 5000-E",      va: 200000, topology: "Modular", phase: "3P-3P", notes: "Scalable in modules" },
];

/** Pick N items around the target VA, prefer equals or the next sizes up */
function pickNearest(catalog: CatalogItem[], vaNeeded: number, count = 4): CatalogItem[] {
  const list = [...catalog].sort((a, b) => a.va - b.va);
  // find first >= needed
  let idx = list.findIndex((x) => x.va >= vaNeeded);
  if (idx === -1) idx = list.length - 1;

  const start = Math.max(0, idx - 1);
  const end = Math.min(list.length, start + count);
  return list.slice(start, end);
}

export default function RecommendedUpsdc({ result, title }: Props) {
  // Use provided phase if present, otherwise default to 3P-3P (most DC rooms)
  const phase: "1P-1P" | "3P-1P" | "3P-3P" = result.phase ?? "3P-3P";

  // Choose a VA target based on the larger of computed requirement vs. “suggested”
  const vaNeeded = Math.max(result.upsVA, result.suggestedUPS ?? 0);

  // Filter by phase (most entries here are 3P-3P; adapt if you add others)
  const tlItems = CATALOG_3P.filter((m) => m.phase === phase);
  const mdItems = CATALOG_MODULAR.filter((m) => m.phase === phase);

  const tlPick = pickNearest(tlItems.length > 0 ? tlItems : CATALOG_3P, vaNeeded, 4);
  const mdPick = pickNearest(mdItems.length > 0 ? mdItems : CATALOG_MODULAR, vaNeeded, 4);

  return (
    <section className="w-full max-w-5xl bg-white border border-gray-200 rounded-2xl p-6 shadow">
      <h2 className="text-2xl font-bold mb-2">
        {title ?? "Recommended UPS (Data Center — Transformerless & Modular)"}
      </h2>
      <p className="text-sm text-gray-600 mb-4">
        Phase: <b>{phase}</b> &middot; Sizing target: <b>{Math.round(vaNeeded)} VA</b>
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="border rounded-xl p-4">
          <h3 className="font-semibold text-lg mb-2">Transformerless (Monolithic)</h3>
          <ul className="space-y-3">
            {tlPick.map((item, i) => (
              <li key={`${item.brand}-${item.model}-${i}`} className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-medium">{item.brand} — {item.model}</div>
                  <div className="text-sm text-gray-600">{item.topology} · {item.phase} · {item.va.toLocaleString()} VA</div>
                  {item.notes && <div className="text-xs text-gray-500">{item.notes}</div>}
                </div>
                {/* optional link */}
                {item.url && (
                  <a
                    className="text-sm text-blue-600 hover:underline"
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Specs
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="border rounded-xl p-4">
          <h3 className="font-semibold text-lg mb-2">Modular (Scalable)</h3>
          <ul className="space-y-3">
            {mdPick.map((item, i) => (
              <li key={`${item.brand}-${item.model}-${i}`} className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-medium">{item.brand} — {item.model}</div>
                  <div className="text-sm text-gray-600">{item.topology} · {item.phase} · {item.va.toLocaleString()} VA</div>
                  {item.notes && <div className="text-xs text-gray-500">{item.notes}</div>}
                </div>
                {item.url && (
                  <a
                    className="text-sm text-blue-600 hover:underline"
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Specs
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-4 text-xs text-gray-500">
        Note: Models are examples—always confirm local availability, runtime options (internal/external batteries), and communications (SNMP/Modbus) with your distributor.
      </p>
    </section>
  );
}
