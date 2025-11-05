"use client";
import { useMemo, useState } from "react";
import { Store, Link as LinkIcon, Info } from "lucide-react";
import { Result, format } from "../lib/ups";

/** Supported Amazon marketplaces */
const AMAZON_MARKETS = {
  US: "www.amazon.com",
  UK: "www.amazon.co.uk",
  DE: "www.amazon.de",
  FR: "www.amazon.fr",
  IT: "www.amazon.it",
  ES: "www.amazon.es",
  CA: "www.amazon.ca",
  JP: "www.amazon.co.jp",
  AU: "www.amazon.com.au",
  AE: "www.amazon.ae",
  IN: "www.amazon.in",
} as const;

type MarketCode = keyof typeof AMAZON_MARKETS;

/** Your affiliate tags per marketplace (fill in what you have; leave others blank) */
export type AmazonTags = Partial<Record<MarketCode, string>>;
const DEFAULT_TAGS: AmazonTags = {
  US: "yourtag-20",
  UK: "yourtag-21",
  DE: "deintag-21",
  // Add more as you obtain tags
};

/** Brand buckets (broad families, not exact SKUs) */
type BrandBucket = {
  brand: string;
  family: string;
  notes?: string;
  sine: "pure" | "simulated";
  topology: "line-interactive" | "offline" | "online";
  typicalVA: number[];
  searchTerms: string[];
};

const CATALOG: BrandBucket[] = [
  {
    brand: "APC",
    family: "Back-UPS Pro (BR/PR series)",
    sine: "pure",
    topology: "line-interactive",
    typicalVA: [700, 900, 1000, 1200, 1500, 1600],
    searchTerms: ["APC Back-UPS Pro pure sine line-interactive"],
    notes: "Great for PC/NAS/AV; USB; replaceable battery.",
  },
  {
    brand: "Eaton",
    family: "5SC / 5PX / Ellipse PRO",
    sine: "pure",
    topology: "line-interactive",
    typicalVA: [650, 850, 1200, 1600, 2200],
    searchTerms: ["Eaton line interactive pure sine UPS 5SC 5PX Ellipse PRO"],
    notes: "Solid AVR; good for IT and small racks.",
  },
  {
    brand: "CyberPower",
    family: "PFC Sinewave (CP/PR series)",
    sine: "pure",
    topology: "line-interactive",
    typicalVA: [600, 900, 1000, 1350, 1500],
    searchTerms: ["CyberPower PFC Sinewave UPS line interactive"],
    notes: "Active-PFC friendly; competitive pricing.",
  },
  {
    brand: "Vertiv (Liebert)",
    family: "PSI/PSI5",
    sine: "pure",
    topology: "line-interactive",
    typicalVA: [750, 1000, 1500, 2200, 3000],
    searchTerms: ["Vertiv Liebert PSI line interactive pure sine UPS"],
    notes: "Enterprise quality; USB/network options.",
  },
  {
    brand: "APC",
    family: "Back-UPS (BE/BX)",
    sine: "simulated",
    topology: "offline",
    typicalVA: [600, 700, 850, 900, 1100],
    searchTerms: ["APC Back-UPS standby simulated sine"],
    notes: "Budget choice for routers/modems/light loads.",
  },
];

const STANDARD_CLASSES = [600, 700, 800, 900, 1000, 1200, 1500, 1600, 2000, 2200, 3000, 5000, 10000];
function pickClosestClass(targetVA: number) {
  for (const v of STANDARD_CLASSES) if (v >= targetVA) return v;
  return STANDARD_CLASSES[STANDARD_CLASSES.length - 1];
}

function buildAmazonSearchUrl(keyword: string, market: MarketCode, tag?: string) {
  const host = AMAZON_MARKETS[market];
  const u = new URL(`https://${host}/s`);
  u.searchParams.set("k", keyword);
  if (tag) u.searchParams.set("tag", tag);
  return u.toString();
}

type Props = {
  result: Result;
  initialMarket?: MarketCode;
  amazonTags?: AmazonTags;
  /** Label shown next to the class and above the cards */
  regionLabel?: string;
  /** Back-compat: if `region` is passed, it maps to regionLabel */
  region?: string;
};

export default function RecommendedUps({
  result,
  initialMarket = "US",
  amazonTags = DEFAULT_TAGS,
  regionLabel,
  region,
}: Props) {
  const [market, setMarket] = useState<MarketCode>(initialMarket);
  const effectiveRegionLabel = regionLabel ?? region ?? "Global";

  const recs = useMemo(() => {
    if (!result) return null;
    const targetVA = Math.ceil(result.upsVA);
    const classVA = pickClosestClass(targetVA);

    const preferred = CATALOG.filter(
      (b) =>
        b.topology === "line-interactive" &&
        b.sine === "pure" &&
        b.typicalVA.some((v) => v >= classVA * 0.8 && v <= classVA * 1.5)
    );
    const alternates = CATALOG.filter(
      (b) =>
        (b.topology === "line-interactive" || b.topology === "offline") &&
        b.typicalVA.some((v) => v >= classVA * 0.8 && v <= classVA * 1.5) &&
        !preferred.includes(b)
    );
    const shortlist = [...preferred.slice(0, 4), ...alternates.slice(0, 2)];
    return { targetVA, classVA, shortlist };
  }, [result]);

  if (!recs || recs.shortlist.length === 0) return null;

  const tag = amazonTags[market];

  return (
    <section className="bg-white border border-gray-200 p-6 rounded-2xl shadow w-full max-w-3xl space-y-4 print-card">
      {/* Affiliate disclosure (English only) */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-900 p-3 text-sm flex items-start gap-2">
        <Info className="w-5 h-5 mt-0.5" />
        <div>
          We may earn a commission from qualifying purchases (at no extra cost to you). <span className="font-medium">Sponsored / Affiliate</span>.
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Store className="w-5 h-5 text-green-700" />
          Recommended UPS models (based on your sizing)
        </h3>
        {/* Marketplace selector */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-600">Marketplace:</span>
          <select
            className="h-9 px-2 rounded border border-gray-300 bg-white"
            value={market}
            onChange={(e) => setMarket(e.target.value as MarketCode)}
          >
            {Object.keys(AMAZON_MARKETS).map((m) => (
              <option key={m} value={m}>
                {m} — {AMAZON_MARKETS[m as MarketCode].replace("www.", "")}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="text-sm text-gray-700">
        <p>
          Sizing load: <b>{format(result.sizedWatts)} W</b> with PF {format(result.pf, 2)} → UPS VA ≈{" "}
          <b>{format(result.upsVA)} VA</b>. For homes, <b>Line-Interactive (Pure Sine)</b> is typically the best choice.
        </p>
        <p className="mt-1">
          Target class: <b>{recs.classVA} VA</b> — Region: <b>{effectiveRegionLabel}</b>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {recs.shortlist.map((b, i) => {
          const keyword = `${b.brand} ${b.family} ${recs.classVA}VA ${b.topology} ${b.sine} sine UPS`;
          const shopUrl = tag
            ? buildAmazonSearchUrl(keyword, market, tag)
            : `https://www.google.com/search?q=${encodeURIComponent(keyword)}`;

          return (
            <div key={i} className="rounded-xl border border-gray-200 p-4 flex flex-col justify-between">
              <div>
                <div className="text-sm text-gray-500">{b.brand}</div>
                <div className="text-lg font-semibold">{b.family}</div>
                <div className="mt-1 text-xs">
                  <span className="inline-block rounded bg-emerald-50 text-emerald-700 px-2 py-0.5 mr-1">
                    {b.topology}
                  </span>
                  <span className="inline-block rounded bg-indigo-50 text-indigo-700 px-2 py-0.5 mr-1">
                    {b.sine} sine
                  </span>
                </div>
                {b.notes && <p className="text-gray-600 text-sm mt-2">{b.notes}</p>}
              </div>
              <div className="mt-3">
                <a
                  className="inline-flex items-center gap-2 text-sm font-medium text-green-700 hover:text-green-900 underline"
                  href={shopUrl}
                  target="_blank"
                  rel="sponsored nofollow noopener"
                >
                  <LinkIcon className="w-4 h-4" /> Shop / Compare {recs.classVA} VA
                </a>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border border-blue-100 bg-blue-50 text-blue-900 p-3 flex items-start gap-2 text-sm">
        <Info className="w-5 h-5 mt-0.5" />
        <div>
          <p className="font-semibold">Checklist before buying</p>
          <ul className="list-disc ml-5 mt-1 space-y-1">
            <li>Outlet types and counts (battery-backed vs surge-only).</li>
            <li>USB/Serial/Network for graceful shutdown (PC/NAS).</li>
            <li>Prefer <b>Pure Sine</b> for Active-PFC PSUs, AV gear, and motors.</li>
            <li>Battery part number and replacement availability/cost.</li>
            <li>2–3 year warranty and local service support.</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
