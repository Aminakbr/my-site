"use client";

import React from "react";

/** Types for dynamic imports without using `any` */
type JsPdfModule = typeof import("jspdf");
type JsPDFClass = JsPdfModule["jsPDF"];

type Html2CanvasModule = typeof import("html2canvas");
type Html2CanvasFn = Html2CanvasModule["default"];

/** Narrow a dynamic jsPDF import into a constructor (handles default/named) */
function resolveJsPDF(mod: unknown): JsPDFClass | null {
  const m = mod as Partial<JsPdfModule> & { default?: JsPDFClass };
  if (m && typeof m.jsPDF === "function") return m.jsPDF;
  if (m && typeof m.default === "function") return m.default as JsPDFClass;
  return null;
}

/** Narrow a dynamic html2canvas import into the function */
function resolveHtml2Canvas(mod: unknown): Html2CanvasFn | null {
  const m = mod as Partial<Html2CanvasModule> & { default?: Html2CanvasFn };
  return typeof m?.default === "function" ? (m.default as Html2CanvasFn) : null;
}

/**
 * Export the element with id="report-section" as a multi-page A4 PDF.
 * Uses dynamic imports so it never runs during SSR.
 */
export default function PdfButton({
  filename = "UPS_Report.pdf",
  targetId = "report-section",
}: {
  filename?: string;
  targetId?: string;
}) {
  const handleExport = async () => {
    try {
      // Load libs only in the browser
      const [h2cMod, jspdfMod] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      const html2canvas = resolveHtml2Canvas(h2cMod);
      const JsPDF = resolveJsPDF(jspdfMod);

      if (!html2canvas || !JsPDF) {
        console.error("Failed to resolve html2canvas or jsPDF module.");
        alert("Could not load PDF libraries. Please check console.");
        return;
      }

      const el = document.getElementById(targetId);
      if (!el) {
        alert(`Element #${targetId} not found`);
        return;
      }

      // Render the DOM to canvas
      const canvas = await html2canvas(el, {
        backgroundColor: "#ffffff", // solid background helps PDFs
        useCORS: true,
        scale: 2, // sharper output
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new JsPDF("p", "mm", "a4");
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      const imgW = pageW;
      const imgH = (canvas.height * imgW) / canvas.width;

      // First page
      let y = 0;
      pdf.addImage(imgData, "PNG", 0, y, imgW, imgH);

      // Additional pages if needed
      let remaining = imgH - pageH;
      while (remaining > 0) {
        pdf.addPage();
        y -= pageH;
        pdf.addImage(imgData, "PNG", 0, y, imgW, imgH);
        remaining -= pageH;
      }

      pdf.save(filename);
    } catch (err) {
      console.error(err);
      alert(
        'PDF export failed. Ensure "jspdf" and "html2canvas" are installed and that you are running in the browser.'
      );
    }
  };

  return (
    <button
      onClick={handleExport}
      className="no-print inline-flex items-center gap-2 bg-white text-gray-900 px-3 py-2 rounded shadow hover:shadow-md border border-gray-200"
      aria-label="Export as PDF"
      title="Export as PDF"
    >
      📄 Export PDF
    </button>
  );
}
