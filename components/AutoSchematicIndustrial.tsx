"use client";
import React, { useMemo, useRef } from "react";
import { Save } from "lucide-react";

/** Props controlling the SLD */
type Props = {
  project: string; setProject: (s: string) => void;
  acSpec: string; setAcSpec: (s: string) => void;
  backupMin: number;
  upsType: "online-double";
  outputs: number; setOutputs: (n: number) => void;
  hasSBP: boolean; setHasSBP: (b: boolean) => void;
  hasMBP: boolean; setHasMBP: (b: boolean) => void;
  hasXFMR: boolean; setHasXFMR: (b: boolean) => void;
  series: number; setSeries: (n: number) => void;
  vdc: number; setVdc: (n: number) => void;
};

const inputCls = "h-10 px-3 rounded border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/40";
const btnCls = "h-10 px-4 rounded font-semibold transition-all duration-150 focus:outline-none focus:ring-2 bg-emerald-700 hover:bg-emerald-800 text-white";

type Pt = { x: number; y: number };
const line = (p1: Pt, p2: Pt) => (<line key={`L-${p1.x}-${p1.y}-${p2.x}-${p2.y}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="black" strokeWidth={2} strokeLinecap="round" />);
const rect = (p: Pt, w: number, h: number, label: string) => (
  <g key={`R-${p.x}-${p.y}-${label}`}>
    <rect x={p.x} y={p.y} width={w} height={h} fill="white" stroke="black" rx={4} />
    <text x={p.x + 4} y={p.y + h / 2 + 4} fill="black" fontSize={12}>{label}</text>
  </g>
);
const text = (p: Pt, s: string, size = 12) => (<text key={`T-${p.x}-${p.y}-${s}`} x={p.x} y={p.y} fontSize={size} fill="black">{s}</text>);

type DxfEntity =
  | { kind: "LINE"; x1: number; y1: number; x2: number; y2: number; layer?: string }
  | { kind: "TEXT"; x: number; y: number; h: number; text: string; layer?: string }
  | { kind: "RECT"; x: number; y: number; w: number; h: number; layer?: string };

function dxfHeader() {
  return [
    "0","SECTION","2","HEADER","9","$ACADVER","1","AC1009","0","ENDSEC",
    "0","SECTION","2","TABLES","0","TABLE","2","LAYER","70","3",
    "0","LAYER","2","0","70","0","62","7","6","CONTINUOUS",
    "0","LAYER","2","PWR_SLD","70","0","62","7","6","CONTINUOUS",
    "0","LAYER","2","PWR_BOX","70","0","62","8","6","CONTINUOUS",
    "0","LAYER","2","PWR_TEXT","70","0","62","7","6","CONTINUOUS",
    "0","ENDTAB","0","ENDSEC","0","SECTION","2","ENTITIES"
  ].join("\n");
}
function dxfEntity(e: DxfEntity): string {
  const layer = e.layer ?? (e.kind === "TEXT" ? "PWR_TEXT" : e.kind === "RECT" ? "PWR_BOX" : "PWR_SLD");
  if (e.kind === "LINE") return ["0","LINE","8",layer,"10",e.x1,"20",e.y1,"11",e.x2,"21",e.y2].join("\n");
  if (e.kind === "TEXT") return ["0","TEXT","8",layer,"10",e.x,"20",e.y,"40",e.h,"1",e.text].join("\n");
  if (e.kind === "RECT") {
    const { x, y, w, h } = e;
    return [
      dxfEntity({ kind:"LINE", x1:x, y1:y, x2:x+w, y2:y, layer }),
      dxfEntity({ kind:"LINE", x1:x+w, y1:y, x2:x+w, y2:y+h, layer }),
      dxfEntity({ kind:"LINE", x1:x+w, y1:y+h, x2:x, y2:y+h, layer }),
      dxfEntity({ kind:"LINE", x1:x, y1:y+h, x2:x, y2:y, layer }),
    ].join("\n");
  }
  return "";
}
function dxfFooter(){ return ["0","ENDSEC","0","EOF"].join("\n"); }
function buildDXF(ents: DxfEntity[]) { return [dxfHeader(), ...ents.map(dxfEntity), dxfFooter()].join("\n"); }

export default function AutoSchematicIndustrial(props: Props) {
  const {
    project, setProject, acSpec, setAcSpec, backupMin,
    upsType, outputs, setOutputs, hasSBP, setHasSBP, hasMBP, setHasMBP,
    hasXFMR, setHasXFMR, series, setSeries, vdc, setVdc
  } = props;

  const svgRef = useRef<SVGSVGElement>(null);
  const model = useMemo(() => {
    const H = 44;
    const gap = 160;
    const yMain = 120;
    const yBP = 210;
    let x = 60;

    const blocks: { key: string; x: number; y: number; w: number; h: number; label: string }[] = [];
    const wires: { p1: Pt; p2: Pt }[] = [];
    const texts: { p: Pt; s: string; size?: number }[] = [];

    // QF-IN
    blocks.push({ key: "QFIN", x, y: yMain, w: 100, h: H, label: "QF-IN" });
    const xQFINRight = x + 100; x += gap;

    // Rectifier
    blocks.push({ key: "REC", x, y: yMain, w: 130, h: H, label: "RECTIFIER" });
    const xRECRight = x + 130; x += gap;

    // Inverter
    blocks.push({ key: "INV", x, y: yMain, w: 130, h: H, label: "INVERTER" });
    const xINVRight = x + 130; x += gap;

    // Optional XFMR
    if (hasXFMR) { blocks.push({ key: "XFMR", x, y: yMain, w: 130, h: H, label: "XFMR" }); x += gap; }

    // QF-OUT (bus feeder)
    blocks.push({ key: "QFOUT", x, y: yMain, w: 120, h: H, label: "QF-OUT" });
    const xBus = x + 160;

    // Battery block under Rectifier
    blocks.push({ key: "BAT", x: xRECRight - 40, y: yMain + 90, w: 180, h: H, label: `BAT ${series}×12V → ${vdc}Vdc` });

    // Static Bypass
    if (hasSBP) {
      blocks.push({ key: "SBP", x: (xQFINRight + xINVRight) / 2 - 65, y: yBP, w: 130, h: H, label: "STATIC BYPASS" });
      wires.push({ p1: { x: xQFINRight, y: yBP + H / 2 }, p2: { x: (xQFINRight + xINVRight) / 2 - 65, y: yBP + H / 2 } });
      wires.push({ p1: { x: (xQFINRight + xINVRight) / 2 + 65, y: yBP + H / 2 }, p2: { x: xBus - 40, y: yBP + H / 2 } });
      wires.push({ p1: { x: xINVRight - 40, y: yMain }, p2: { x: xINVRight - 40, y: yBP + H } });
      wires.push({ p1: { x: xQFINRight + 10, y: yMain }, p2: { x: xQFINRight + 10, y: yBP + H } });
    }
    // Battery down wire
    wires.push({ p1: { x: xRECRight - 40, y: yMain + H }, p2: { x: xRECRight - 40, y: yMain + 90 } });

    // Main path
    wires.push({ p1: { x: xQFINRight, y: yMain + H / 2 }, p2: { x: xRECRight, y: yMain + H / 2 } });
    wires.push({ p1: { x: xRECRight, y: yMain + H / 2 }, p2: { x: xINVRight, y: yMain + H / 2 } });
    const lastRight = hasXFMR ? xINVRight + gap : xINVRight;
    wires.push({ p1: { x: lastRight, y: yMain + H / 2 }, p2: { x: x, y: yMain + H / 2 } }); // to QF-OUT

    // Output bus & feeders
    const n = Math.max(1, Math.min(24, outputs));
    const busX = xBus;
    const busTop = 60;
    const busBot = 340;
    wires.push({ p1: { x: busX, y: busTop }, p2: { x: busX, y: busBot } });
    texts.push({ p: { x: busX - 22, y: busTop - 12 }, s: "OUTPUT BUS" });

    const step = (busBot - busTop - 20) / n;
    for (let i = 0; i < n; i++) {
      const yTap = busTop + 10 + i * step;
      wires.push({ p1: { x: busX, y: yTap }, p2: { x: busX + 40, y: yTap } });
      blocks.push({ key: `QF${i + 1}`, x: busX + 40, y: yTap - H / 2, w: 100, h: H, label: `QF${i + 1}` });
      wires.push({ p1: { x: busX + 140, y: yTap }, p2: { x: busX + 190, y: yTap } });
      texts.push({ p: { x: busX + 195, y: yTap + 5 }, s: `LOAD-${i + 1}` });
    }

    if (hasMBP) {
      texts.push({ p: { x: 60, y: 360 }, s: "Note: External Maintenance Bypass Panel with interlocks.", size: 11 });
    }
    texts.push({ p: { x: 60, y: 30 }, s: `PROJECT: ${project}`, size: 13 });
    texts.push({ p: { x: 60, y: 48 }, s: `UPS: Online Double | AC: ${acSpec} | Backup: ${backupMin} min`, size: 12 });

    return { blocks, wires, texts, width: 1200, height: 390 };
  }, [project, acSpec, backupMin, upsType, outputs, hasSBP, hasMBP, hasXFMR, series, vdc]);

  const downloadSVG = () => {
    const el = svgRef.current;
    if (!el) return;
    const src = new XMLSerializer().serializeToString(el);
    const blob = new Blob([src], { type: "image/svg+xml;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${project.replace(/\s+/g, "_")}_SLD.svg`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const downloadDXF = () => {
    const ents: DxfEntity[] = [];
    model.blocks.forEach((b) => {
      ents.push({ kind: "RECT", x: b.x, y: 600 - b.y - b.h, w: b.w, h: b.h, layer: "PWR_BOX" });
      ents.push({ kind: "TEXT", x: b.x + 4, y: 600 - (b.y + b.h / 2 - 4), h: 2.5, text: b.label, layer: "PWR_TEXT" });
    });
    model.wires.forEach((w) => ents.push({ kind: "LINE", x1: w.p1.x, y1: 600 - w.p1.y, x2: w.p2.x, y2: 600 - w.p2.y, layer: "PWR_SLD" }));
    model.texts.forEach((t) => ents.push({ kind: "TEXT", x: t.p.x, y: 600 - t.p.y, h: 2.5, text: t.s, layer: "PWR_TEXT" }));
    const dxf = [dxfHeader(), ...ents.map(e => dxfEntity(e)), dxfFooter()].join("\n");
    const blob = new Blob([dxf], { type: "application/dxf" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${project.replace(/\s+/g, "_")}_SLD.dxf`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const downloadPDF = async () => {
    try {
      const { default: jsPDF } = await import("jspdf");
      const el = svgRef.current; if (!el) return;
      const svg = new XMLSerializer().serializeToString(el);
      const svg64 = btoa(unescape(encodeURIComponent(svg)));
      const imgSrc = "data:image/svg+xml;base64," + svg64;
      const doc = new jsPDF({ orientation: "l", unit: "pt", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const pad = 24;
      const imgW = pageW - pad * 2;
      const imgH = (imgW * model.height) / model.width;
      const y = pad + Math.max(0, (pageH - pad * 2 - imgH) / 2);
      doc.addImage(imgSrc, "SVG", pad, y, imgW, imgH);
      doc.save(`${project.replace(/\s+/g, "_")}_SLD.pdf`);
    } catch {
      alert("Please install jsPDF: npm i jspdf");
    }
  };

  return (
    <section className="bg-white border border-gray-200 p-6 rounded-2xl shadow w-full max-w-5xl space-y-6">
      <h2 className="text-xl font-bold">Single-Line Diagram (Auto-Generated)</h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div><label className="text-sm">Project</label><input className={inputCls} value={project} onChange={(e)=>setProject(e.target.value)} /></div>
        <div><label className="text-sm">AC Spec</label><input className={inputCls} value={acSpec} onChange={(e)=>setAcSpec(e.target.value)} /></div>
        <div><label className="text-sm">Outputs</label><input type="number" min={1} max={24} className={inputCls} value={outputs} onChange={(e)=>setOutputs(Number(e.target.value||1))} /></div>
        <div><label className="text-sm">Battery Series (×12V)</label><input type="number" className={inputCls} value={series} onChange={(e)=>setSeries(Number(e.target.value||0))} /></div>
        <div><label className="text-sm">Vdc</label><input type="number" className={inputCls} value={vdc} onChange={(e)=>setVdc(Number(e.target.value||0))} /></div>
        <div><label className="text-sm">Static Bypass</label>
          <select className={inputCls} value={hasSBP ? "yes":"no"} onChange={(e)=>setHasSBP(e.target.value==="yes")}><option value="yes">Yes</option><option value="no">No</option></select>
        </div>
        <div><label className="text-sm">Maintenance Bypass</label>
          <select className={inputCls} value={hasMBP ? "yes":"no"} onChange={(e)=>setHasMBP(e.target.value==="yes")}><option value="yes">Yes</option><option value="no">No</option></select>
        </div>
        <div><label className="text-sm">Isolation Transformer</label>
          <select className={inputCls} value={hasXFMR ? "yes":"no"} onChange={(e)=>setHasXFMR(e.target.value==="yes")}><option value="no">No</option><option value="yes">Yes</option></select>
        </div>
      </div>

      <div className="rounded border border-gray-300 bg-white overflow-auto">
        <svg ref={svgRef} width={model.width} height={model.height} viewBox={`0 0 ${model.width} ${model.height}`}>
          {/* blocks */}
          {model.blocks.map((b) => rect({ x: b.x, y: b.y }, b.w, b.h, b.label))}
          {/* wires */}
          {model.wires.map((w, i) => line(w.p1, w.p2))}
          {/* texts */}
          {model.texts.map((t) => text(t.p, t.s, t.size ?? 12))}
        </svg>
      </div>

      <div className="flex flex-wrap gap-3">
        <button className={btnCls} onClick={downloadSVG}>Download SVG</button>
        <button className={btnCls} onClick={downloadDXF}>Download DXF</button>
        <button className={btnCls} onClick={downloadPDF}>Download PDF</button>
      </div>
    </section>
  );
}
