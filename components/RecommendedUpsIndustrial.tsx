"use client";
import React from "react";
import { Result, format } from"@/lib/industrial";

import { CheckCircle2 } from "lucide-react";

type Props = { result: Result };

const cards: { brand: string; model: string; vaMin: number; vaMax: number; notes: string }[] = [
  { brand: "GE", model: "SG Series / TLE", vaMin: 10000, vaMax: 100000, notes: "Online double, high efficiency, scalable." },
  { brand: "GTEC", model: "APM / TM Series", vaMin: 10000, vaMax: 80000, notes: "Modular options, transformer-based variants." },
  { brand: "BOORI", model: "Industrial Online", vaMin: 3000, vaMax: 60000, notes: "Industrial frames, robust DC bus." },
];

export default function RecommendedUpsIndustrial({ result }: Props) {
  const match = cards.filter(c => result.suggestedUPS >= c.vaMin && result.suggestedUPS <= c.vaMax);
  const list = match.length ? match : cards;

  return (
    <section className="bg-white border border-gray-200 p-6 rounded-2xl shadow w-full max-w-5xl space-y-4">
      <h2 className="text-xl font-bold flex items-center gap-2"><CheckCircle2 className="text-emerald-700 w-5 h-5" /> Recommended Industrial UPS (Transformer-based / Online)</h2>
      <p className="text-sm text-gray-600">Based on your sizing <b>{format(result.upsVA)} VA</b> and runtime, these families are a good fit. Confirm specs, topology (with/without isolation transformer), and local standards.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {list.map((c) => (
          <div key={`${c.brand}-${c.model}`} className="rounded-lg border border-gray-200 p-4">
            <div className="text-lg font-semibold">{c.brand}</div>
            <div className="text-gray-800">{c.model}</div>
            <div className="text-xs text-gray-500">Range: {c.vaMin}–{c.vaMax} VA</div>
            <div className="text-sm mt-2">{c.notes}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
