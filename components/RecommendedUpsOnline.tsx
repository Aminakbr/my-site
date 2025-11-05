"use client";
import { useMemo, useState } from "react";
import { Store, Link as LinkIcon, Info } from "lucide-react";
import type { Result } from "./OfficeCalculatorSection";

// Supported Amazon marketplaces
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
export type AmazonTags = Partial<Record<MarketCode, string>>;

const DEFAULT_TAGS: AmazonTags = {
  US: "yourtag-20",
  UK: "yourtag-21",
  DE: "deintag-21",
};

// Online UPS brand families (pure sine, double-conversion)
type BrandBucket = {
  brand: string;
  family: string;
  notes?: string;
  topology: "online";
  typicalVA: number[];
  searchTerms: string[];
};

const CATALOG_ONLINE: BrandBucket[] = [
  {
    brand: "APC",
    family: "Smart-UPS Online (SRT/SURT)",
    topology: "online",
    typicalVA: [1000, 1500, 2200, 3000, 5000, 6000, 8000, 10000],
    searchTerms: ["APC Smart-UPS Online SRT double conversion pure sine"],
    notes: "Enterprise-grade; network cards available; wide range of VA.",
  },
  {
    brand: "Eaton",
    family: "9PX / 9SX",
    topology: "online",
    typicalVA: [1000, 1500, 2200, 3000, 5000, 6000],
    searchTerms: ["Eaton 9PX online double conversion UPS"],
    notes: "High efficiency online; robust management options.",
  },
  {
    brand: "Vertiv (Liebert)",
    family: "GXT5",
    topology: "online",
    typicalVA: [750, 1000, 1500, 2000, 3000],
    searchTerms: ["Vertiv Liebert GXT5 online UPS pure sine"],
    notes: "Popular in server/network closets; compact form factors.",
  },
  {
    brand: "CyberPower",
    family: "OL Series",
    topology: "online",
    typicalVA: [1000, 1500, 2000, 3000, 5000, 6000],
    searchTerms: ["CyberPower OL Online UPS double conversion"],
    notes: "Budget-friendly online series; check fan noise specs.",
  },
];

const STANDARD_CLASSES = [600, 700, 800, 900, 1000, 1200, 1500, 1600, 2000, 2200, 3000, 5000, 6000, 8000, 10000];
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

function format(n: number, d = 2) { return Number.isFinite(n) ? Number(n.toFixed(d)) : 0; }

type Props = {
  result: Result;
  initialMarket?: MarketCode;
  amazonTags?: AmazonTags;
  regionLabel?: string;
};

export default function RecommendedUpsOnline({
  result,
  initialMarket = "US",
  amazonTags = DEFAULT_TAGS,
  regionLabel = "Global",
}: Props) {
  const [market, setMarket] = useState<MarketCode>(initialMarket);

  const recs = useMemo(() => {
    if (!result) return null;
    const targetVA = Math.ceil(result.upsVA);
    const classVA = pickClosestClass(targetVA);
    const shortlist = CATALOG_ONLINE.filter(b => b.typicalVA.some(v => v >= classVA * 0.8 && v <= classVA * 1.5)).slice(0, 6);
    return { targetVA, classVA, shortlist };
  }, [result]);

  if (!recs || recs.shortlist.length === 0) return null;

  const tag = amazonTags[market];

  return (
    <section className="bg-white border border-gray-200 p-6 rounded-2xl shadow w-full max-w-3xl space-y-4 print-card mt-6">
      <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-900 p-3 text-sm flex items-start gap-2">
        <Info className="w-5 h-5 mt-0.5" />
        <div>
          We may earn a commission from qualifying purchases (at no extra cost to you). <span className="font-medium">Sponsored / Affiliate</span>.
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Store className="w-5 h-5 text-blue-700" />
          Online UPS picks (based on your sizing)
        </h3>
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
          Sizing load: <b>{format(result.sizedWatts)} W</b> with PF {format(result.pf, 2)} → UPS VA ≈ <b>{format(result.upsVA)} VA</b>.
          For offices, <b>Online (double-conversion)</b> ensures 0 ms transfer and tight regulation.
        </p>
        <p className="mt-1">
          Target class: <b>{recs.classVA} VA</b> — Region: <b>{regionLabel}</b>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {recs.shortlist.map((b, i) => {
          const keyword = `${b.brand} ${b.family} ${recs.classVA}VA online double conversion UPS`;
          const shopUrl = tag
            ? buildAmazonSearchUrl(keyword, market, tag)
            : `https://www.google.com/search?q=${encodeURIComponent(keyword)}`;

          return (
            <div key={i} className="rounded-xl border border-gray-200 p-4 flex flex-col justify-between">
              <div>
                <div className="text-sm text-gray-500">{b.brand}</div>
                <div className="text-lg font-semibold">{b.family}</div>
                <div className="mt-1 text-xs">
                  <span className="inline-block rounded bg-blue-50 text-blue-700 px-2 py-0.5 mr-1">
                    online
                  </span>
                </div>
                {b.notes && <p className="text-gray-600 text-sm mt-2">{b.notes}</p>}
              </div>
              <div className="mt-3">
                <a
                  className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-900 underline"
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
          <p className="font-semibold">Before you buy</p>
          <ul className="list-disc ml-5 mt-1 space-y-1">
            <li>Confirm input/output plugs, hardwire options if needed.</li>
            <li>Check fan noise and efficiency ratings (online runs active).</li>
            <li>Network management (SNMP/Modbus) for graceful shutdown.</li>
            <li>Battery pack model & replacement availability/cost.</li>
            <li>3-year warranty typical; verify local support.</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
