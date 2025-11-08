"use client";
import React, { useMemo, useRef } from "react";
import { Save } from "lucide-react";
import { buildCsv } from "@/lib/industrial";


type Props = {
  project: string;
  outputs: number;
  hasSBP: boolean;
  hasMBP: boolean;
};

type Pt = { x: number; y: number };
const line = (p1: Pt, p2: Pt) => (<line key={`WL-${p1.x}-${p1.y}-${p2.x}-${p2.y}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="black" strokeWidth={2} strokeLinecap="round" />);
const text = (p: Pt, s: string, size = 12) => (<text key={`WT-${p.x}-${p.y}-${s}`} x={p.x} y={p.y} fontSize={size} fill="black">{s}</text>);
const rect = (p: Pt, w: number, h: number, label: string) => (
  <g key={`WR-${p.x}-${p.y}-${label}`}>
    <rect x={p.x} y={p.y} width={w} height={h} fill="white" stroke="black" rx={4} />
    <text x={p.x + 4} y={p.y + h / 2 + 4} fill="black" fontSize={12}>{label}</text>
  </g>
);

export default function WiringSchematicIndustrial({ project, outputs, hasSBP, hasMBP }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const model = useMemo(() => {
    const width = 1200, height = 600;
    const blocks: { key: string; x: number; y: number; w: number; h: number; label: string }[] = [];
    const wires: { p1: Pt; p2: Pt }[] = [];
    const texts: { p: Pt; s: string; size?: number }[] = [];

    // Terminal Strip XT1 (signals)
    blocks.push({ key: "XT1", x: 60, y: 80, w: 120, h: 220, label: "XT1 (Signals)" });
    const signals = ["On Battery", "On Bypass", "UPS Fault", "Battery Low", "EPO", "Remote Inhibit"];
    signals.forEach((sig, i) => {
      texts.push({ p: { x: 70, y: 100 + i * 30 }, s: `${i + 1}. ${sig}` });
    });

    // UPS I/O block (dry contacts)
    blocks.push({ key: "UPS_IO", x: 320, y: 80, w: 180, h: 220, label: "UPS Dry Contacts" });
    signals.forEach((sig, i) => {
      wires.push({ p1: { x: 180, y: 100 + i * 30 }, p2: { x: 320, y: 100 + i * 30 } });
      texts.push({ p: { x: 330, y: 100 + i * 30 }, s: sig });
    });

    // Communication
    blocks.push({ key: "COMMS", x: 320, y: 330, w: 180, h: 80, label: "Comms (Modbus TCP/SNMP)" });
    wires.push({ p1: { x: 120, y: 330 + 40 }, p2: { x: 320, y: 330 + 40 } });
    texts.push({ p: { x: 70, y: 330 + 45 }, s: "LAN" });

    // Output breakers terminals XT2
    blocks.push({ key: "XT2", x: 640, y: 80, w: 140, h: 30 + outputs * 24, label: "XT2 (Output Feeders)" });
    for (let i = 0; i < outputs; i++) {
      const y = 110 + i * 24;
      texts.push({ p: { x: 650, y }, s: `QF${i + 1} → LOAD-${i + 1}` });
    }

    // Maintenance Bypass note
    if (hasMBP) texts.push({ p: { x: 60, y: 30 }, s: "Include MBP interlocks in control wiring.", size: 12 });

    // Header
    texts.push({ p: { x: 60, y: 560 }, s: `PROJECT: ${project} — Wiring Schematic`, size: 14 });

    return { width, height, blocks, wires, texts, signals };
  }, [project, outputs, hasSBP, hasMBP]);

  const downloadSVG = () => {
    const el = svgRef.current; if (!el) return;
    const src = new XMLSerializer().serializeToString(el);
    const blob = new Blob([src], { type: "image/svg+xml;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${project.replace(/\s+/g, "_")}_WIRING.svg`;
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
      doc.save(`${project.replace(/\s+/g, "_")}_WIRING.pdf`);
    } catch {
      alert("Please install jsPDF: npm i jspdf");
    }
  };

  const downloadTerminalCsv = () => {
    // Simple terminals mapping
    const rows: string[][] = [["Terminal Strip", "Terminal", "Signal/Load", "From", "To"]];
    model.signals.forEach((sig, i) => rows.push(["XT1", String(i + 1), sig, "UPS Dry Contact", `BMS/Panel`]));
    for (let i = 0; i < outputs; i++) rows.push(["XT2", `F${i + 1}`, `QF${i + 1} → LOAD-${i + 1}`, "UPS Output", `Field Load ${i + 1}`]);
    buildCsv(rows, `${project.replace(/\s+/g, "_")}_Terminals.csv`);
  };

  const downloadCableCsv = () => {
    const rows: string[][] = [["Cable Tag", "Type", "Cores", "Length (m)", "From", "To", "Notes"]];
    model.signals.forEach((sig, i) => rows.push([`CBL-CTL-${100 + i}`, "LIYCY/Belden", "2-3", "", "UPS Dry Contact", `BMS/PLC`, sig]));
    for (let i = 0; i < outputs; i++) rows.push([`CBL-PWR-${200 + i}`, "Cu LSZH", "3/4", "", `QF${i + 1}`, `LOAD-${i + 1}`, "Size per calc"]);
    buildCsv(rows, `${project.replace(/\s+/g, "_")}_Cables.csv`);
  };

  return (
    <section className="bg-white border border-gray-200 p-6 rounded-2xl shadow w-full max-w-5xl space-y-4">
      <h2 className="text-xl font-bold">Wiring / Terminals (Auto-Generated)</h2>
      <div className="rounded border border-gray-300 bg-white overflow-auto">
        <svg ref={svgRef} width={model.width} height={model.height} viewBox={`0 0 ${model.width} ${model.height}`}>
          {model.blocks.map((b) => rect({ x: b.x, y: b.y }, b.w, b.h, b.label))}
          {model.wires.map((w) => line(w.p1, w.p2))}
          {model.texts.map((t) => text(t.p, t.s, t.size))}
        </svg>
      </div>
      <div className="flex flex-wrap gap-3">
        <button className="h-10 px-4 rounded font-semibold bg-emerald-700 hover:bg-emerald-800 text-white" onClick={downloadSVG}>Download SVG</button>
        <button className="h-10 px-4 rounded font-semibold bg-emerald-700 hover:bg-emerald-800 text-white" onClick={downloadPDF}>Download PDF</button>
        <button className="h-10 px-4 rounded font-semibold bg-blue-700 hover:bg-blue-800 text-white" onClick={downloadTerminalCsv}>Terminals CSV</button>
        <button className="h-10 px-4 rounded font-semibold bg-blue-700 hover:bg-blue-800 text-white" onClick={downloadCableCsv}>Cables CSV</button>
      </div>
    </section>
  );
}
