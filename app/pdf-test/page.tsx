"use client";
import { useEffect, useRef, useState } from "react";

/**
 * PDF Diagnostics Page (strict-typed, ESLint clean)
 */
type EnvInfo = {
  ua: string;
  dpr: number;
  width: number;
  height: number;
};

export default function PdfDiagnosticsPage() {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [env, setEnv] = useState<EnvInfo>({
    ua: "",
    dpr: 1,
    width: 0,
    height: 0,
  });
  const [log, setLog] = useState<string[]>([]);

  const append = (line: string) => setLog((l) => [...l, line]);

  useEffect(() => {
    setEnv({
      ua: typeof navigator !== "undefined" ? navigator.userAgent : "",
      dpr: typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1,
      width: typeof window !== "undefined" ? window.innerWidth : 0,
      height: typeof window !== "undefined" ? window.innerHeight : 0,
    });
  }, []);

  function getErrorMessage(e: unknown): string {
    if (e instanceof Error) return e.message;
    if (typeof e === "string") return e;
    try {
      return JSON.stringify(e);
    } catch {
      return "Unknown error";
    }
  }

  async function testDownloadPermission(): Promise<void> {
    try {
      const blob = new Blob(["hello"], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "diagnostic.txt";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      append("✔ Download anchor click worked (if you see diagnostic.txt).");
    } catch (e: unknown) {
      append("✖ Download anchor failed: " + getErrorMessage(e));
    }
  }

  async function testCanvasMaxSize(): Promise<void> {
    try {
      const canvas = document.createElement("canvas");
      let size = 20000; // start large
      let ok = false;

      while (size > 2000) {
        try {
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            throw new Error("No 2D context");
          }
          ctx.fillStyle = "#000";
          ctx.fillRect(0, 0, 1, 1);
          const data = ctx.getImageData(0, 0, 1, 1);
          if (data.data.length >= 4) {
            ok = true;
            break;
          }
        } catch {
          // shrink and retry
        }
        size = Math.floor(size * 0.7);
      }

      if (ok) append(`✔ Canvas creation worked up to ~${size}x${size}px`);
      else append("✖ Could not create a sufficiently large canvas (restrictive GPU/driver).");
    } catch (e: unknown) {
      append("✖ Canvas test error: " + getErrorMessage(e));
    }
  }

  async function exportMinimalPdf(): Promise<void> {
    try {
      if (!boxRef.current) {
        append("✖ No boxRef element to capture.");
        return;
      }

      const [{ default: html2canvas }, jsPDFModule] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const { jsPDF } = jsPDFModule as unknown as {
        jsPDF: typeof import("jspdf").jsPDF;
      };

      const canvas = await html2canvas(boxRef.current, {
        backgroundColor: "#1f2937",
        useCORS: true,
        scale: Math.min(2, window.devicePixelRatio || 1),
        logging: false,
      });

      const pdf = new jsPDF("p", "mm", "a4");
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = pageW;
      const imgH = (canvas.height * imgW) / canvas.width;

      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, imgW, Math.min(imgH, pageH), undefined, "FAST");

      try {
        pdf.save("PDF_Diagnostics.pdf");
        append("✔ jsPDF.save attempted (check if file downloaded).");
      } catch (e: unknown) {
        append("⚠ jsPDF.save threw, using bloburl fallback: " + getErrorMessage(e));
        const blobUrl = pdf.output("bloburl");
        window.open(blobUrl, "_blank");
      }
    } catch (e: unknown) {
      append("✖ Minimal export failed: " + getErrorMessage(e));
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0b1220", color: "white", padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>PDF Diagnostics</h1>
      <p style={{ opacity: 0.8, marginBottom: 16 }}>
        This page checks whether your browser/system can download files and capture a tiny DOM into a PDF.
      </p>

      <div
        ref={boxRef}
        style={{
          background: "#1f2937",
          border: "1px solid #334155",
          borderRadius: 12,
          padding: 16,
          width: 420,
          marginBottom: 16,
        }}
      >
        <h2 style={{ margin: 0, marginBottom: 8 }}>Minimal Capture Box</h2>
        <p style={{ margin: 0, opacity: 0.9 }}>Plain text + inline SVG (no external images)</p>
        <svg width="380" height="80" viewBox="0 0 380 80" role="img" aria-label="Test SVG">
          <rect x="0" y="0" width="380" height="80" rx="8" fill="#111827" stroke="#374151" />
          <circle cx="40" cy="40" r="16" fill="#22c55e" />
          <text x="72" y="46" fill="#e5e7eb" fontSize="16">
            Hello, PDF!
          </text>
        </svg>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <button onClick={testDownloadPermission} style={btnStyle}>
          Test Download
        </button>
        <button onClick={testCanvasMaxSize} style={btnStyle}>
          Test Canvas Limit
        </button>
        <button onClick={exportMinimalPdf} style={btnStyle}>
          Export Minimal PDF
        </button>
      </div>

      <div style={{ background: "#111827", border: "1px solid #334155", borderRadius: 8, padding: 12 }}>
        <p style={{ margin: 0, fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
          UA: {env.ua}
          {"\n"}DPR: {env.dpr} | Viewport: {env.width}×{env.height}
          {"\n"}Logs:
          {"\n"}
          {log.map((entry) => `• ${entry}`).join("\n")}
        </p>
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  background: "#22c55e",
  color: "#0b1220",
  border: "none",
  padding: "10px 14px",
  borderRadius: 8,
  fontWeight: 700,
  cursor: "pointer",
};
