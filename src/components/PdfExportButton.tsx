"use client";

import { useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { FileDown } from "lucide-react";
import { toast } from "sonner";
import type { Choice, Major } from "@/generated/prisma/client";
import { toPersianDigits } from "@/lib/format";

type ChoiceWithMajor = Choice & { major: Major };
const subscribeToClient = () => () => {};

export function PdfExportButton({
  studentName,
  choices,
  fileName,
}: {
  studentName: string;
  choices: ChoiceWithMajor[];
  fileName: string;
}) {
  const printRef = useRef<HTMLDivElement>(null);
  const timestampRef = useRef<HTMLParagraphElement>(null);
  const [exporting, setExporting] = useState(false);
  const isClient = useSyncExternalStore(
    subscribeToClient,
    () => true,
    () => false
  );
  const portalTarget = isClient ? document.body : null;

  const handleExport = async () => {
    if (!printRef.current) return;
    setExporting(true);
    try {
      if (timestampRef.current) {
        const now = new Date();
        timestampRef.current.textContent = `تاریخ و ساعت خروجی: ${now.toLocaleDateString(
          "fa-IR"
        )} ${now.toLocaleTimeString("fa-IR")}`;
      }

      const [{ default: html2canvas }, { default: JsPDF }] =
        await Promise.all([import("html2canvas"), import("jspdf")]);

      // Keep the printable area independent from the app theme and wait for
      // the Persian font to be fully shaped before rasterizing it.
      await document.fonts.ready;
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve())
      );

      // Capture at a scale matching html2canvas's own rasterization so DOM
      // row boundaries (in CSS px) map directly to canvas pixels. Scale 3
      // renders at roughly print-quality (~270 DPI at A4 width) while still
      // staying well under scale 4's pixel count (and file size).
      const SCALE = 3;
      const canvas = await html2canvas(printRef.current, {
        scale: SCALE,
        useCORS: true,
      });

      const imgWidth = 210;
      const pageHeight = 297;
      const topMarginMM = 10;
      const canvasPxPerMM = canvas.width / imgWidth;
      const pageHeightPx = pageHeight * canvasPxPerMM;
      const topMarginPx = topMarginMM * canvasPxPerMM;

      // Never let a page break fall in the middle of a table row: collect
      // every <tr>'s bottom edge (in canvas px) as the only allowed break
      // points, so each page always ends exactly between two rows.
      const containerTop = printRef.current.getBoundingClientRect().top;
      const rowBoundariesPx = Array.from(
        printRef.current.querySelectorAll("tr")
      )
        .map((row) => (row.getBoundingClientRect().bottom - containerTop) * SCALE)
        .filter((y) => y > 0 && y <= canvas.height)
        .sort((a, b) => a - b);

      // Capture the column-header row once so it can be re-drawn at the top
      // of every page after the first (page 1 already has it in place).
      const theadRow = printRef.current.querySelector("thead tr");
      let headerCanvas: HTMLCanvasElement | null = null;
      let headerHeightPx = 0;
      if (theadRow) {
        const rect = theadRow.getBoundingClientRect();
        const headerTopPx = (rect.top - containerTop) * SCALE;
        headerHeightPx = Math.round((rect.bottom - containerTop) * SCALE - headerTopPx);
        if (headerHeightPx > 0) {
          headerCanvas = document.createElement("canvas");
          headerCanvas.width = canvas.width;
          headerCanvas.height = headerHeightPx;
          headerCanvas
            .getContext("2d")
            ?.drawImage(
              canvas,
              0,
              headerTopPx,
              canvas.width,
              headerHeightPx,
              0,
              0,
              canvas.width,
              headerHeightPx
            );
        }
      }

      const pdf = new JsPDF("p", "mm", "a4");
      let cursor = 0;
      let firstPage = true;

      while (cursor < canvas.height) {
        const repeatHeader = !firstPage && headerCanvas !== null;
        const pageTopMarginPx = firstPage ? 0 : topMarginPx;
        const availableBodyPx =
          pageHeightPx - pageTopMarginPx - (repeatHeader ? headerHeightPx : 0);
        const idealBottom = Math.min(cursor + availableBodyPx, canvas.height);
        const candidates = rowBoundariesPx.filter(
          (y) => y > cursor && y <= idealBottom
        );
        const sliceBottom =
          candidates.length > 0
            ? candidates[candidates.length - 1]
            : idealBottom;
        const bodyHeight = Math.max(1, Math.round(sliceBottom - cursor));
        const pageCanvasHeight = bodyHeight + (repeatHeader ? headerHeightPx : 0);

        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = pageCanvasHeight;
        const ctx = pageCanvas.getContext("2d");
        // JPEG has no alpha channel, so any untouched pixel would otherwise
        // encode as black — fill white first as a safety net.
        if (ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        }
        let destY = 0;
        if (repeatHeader && headerCanvas) {
          ctx?.drawImage(headerCanvas, 0, 0);
          destY = headerHeightPx;
        }
        ctx?.drawImage(
          canvas,
          0,
          cursor,
          canvas.width,
          bodyHeight,
          0,
          destY,
          canvas.width,
          bodyHeight
        );

        if (!firstPage) pdf.addPage();
        firstPage = false;
        pdf.addImage(
          pageCanvas.toDataURL("image/jpeg", 0.95),
          "JPEG",
          0,
          pageTopMarginPx / canvasPxPerMM,
          imgWidth,
          pageCanvasHeight / canvasPxPerMM
        );

        cursor = sliceBottom;
      }

      pdf.save(fileName);
    } catch {
      toast.error("خروجی گرفتن از فایل با خطا مواجه شد.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleExport}
        disabled={exporting}
        className="flex items-center gap-2 rounded-xl border border-white/15 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:text-violet-600 disabled:opacity-60"
      >
        <FileDown className="h-4 w-4" />
        {exporting ? "در حال ساخت PDF..." : "خروجی PDF"}
      </button>

      {/* Render outside app-main so dashboard styles cannot leak into the PDF. */}
      {portalTarget && createPortal(<div
        aria-hidden="true"
        style={{
          position: "fixed",
          top: 0,
          left: "-10000px",
          width: "750px",
          pointerEvents: "none",
        }}
      >
        <div
          ref={printRef}
          dir="rtl"
          style={{
            fontFamily: "var(--font-vazirmatn), Tahoma, Arial, sans-serif",
            letterSpacing: "normal",
            fontVariantLigatures: "normal",
            textRendering: "optimizeLegibility",
            background: "#ffffff",
            color: "#111827",
            padding: "24px",
            width: "750px",
          }}
        >
          <h1 style={{ fontSize: "18px", fontWeight: 700, letterSpacing: "normal", wordSpacing: "normal", marginBottom: "4px" }}>
            لیست انتخاب‌های رشته - {studentName}
          </h1>
          <p
            ref={timestampRef}
            style={{ fontSize: "12px", color: "#6b7280", marginBottom: "16px" }}
          />

          <div
            style={{
              borderRadius: "10px",
              overflow: "hidden",
              border: "1px solid #e2e8f0",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "11px",
              }}
            >
              <thead>
                <tr style={{ background: "#1e293b" }}>
                  <th style={headerCellStyle}>رتبه</th>
                  <th style={headerCellStyle}>عنوان رشته</th>
                  <th style={headerCellStyle}>دوره تحصیلی</th>
                  <th style={headerCellStyle}>استان</th>
                  <th style={headerCellStyle}>دانشگاه</th>
                  <th style={headerCellStyle}>کدرشته‌محل</th>
                </tr>
              </thead>
              <tbody>
                {choices.map((choice, index) => {
                  const rowStyle: CSSProperties = {
                    background: index % 2 === 0 ? "#ffffff" : "#f8fafc",
                  };
                  return (
                    <tr key={choice.id} style={rowStyle}>
                      <td style={cellStyle}>{toPersianDigits(choice.rank)}</td>
                      <td style={cellStyle}>{choice.major.title}</td>
                      <td style={cellStyle}>{choice.major.studyPeriod}</td>
                      <td style={cellStyle}>{choice.major.province}</td>
                      <td style={cellStyle}>{choice.major.university}</td>
                      <td style={{ ...cellStyle, direction: "ltr", textAlign: "right" }}>
                        {toPersianDigits(choice.major.majorCode)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>, portalTarget)}
    </>
  );
}

const headerCellStyle: CSSProperties = {
  padding: "10px 12px",
  textAlign: "right",
  verticalAlign: "middle",
  color: "#ffffff",
  fontWeight: 600,
};

const cellStyle: CSSProperties = {
  padding: "9px 12px",
  textAlign: "right",
  verticalAlign: "middle",
  borderBottom: "1px solid #e2e8f0",
  color: "#1e293b",
};
