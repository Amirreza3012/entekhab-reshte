"use client";

import { useRef, useState, type CSSProperties } from "react";
import { FileDown } from "lucide-react";
import { toast } from "sonner";
import type { Choice, Major } from "@/generated/prisma/client";
import { toPersianDigits } from "@/lib/format";

type ChoiceWithMajor = Choice & { major: Major };

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

      const canvas = await html2canvas(printRef.current, {
        scale: 4,
        useCORS: true,
      });

      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      const pdf = new JsPDF("p", "mm", "a4");
      const imgData = canvas.toDataURL("image/png");

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
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
        className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
      >
        <FileDown className="h-4 w-4" />
        {exporting ? "در حال ساخت PDF..." : "خروجی PDF"}
      </button>

      {/* Off-screen printable content used only for PDF rasterization */}
      <div
        style={{ position: "fixed", top: 0, left: "-10000px", width: "750px" }}
      >
        <div
          ref={printRef}
          dir="rtl"
          style={{
            fontFamily: "var(--font-vazirmatn), Tahoma, Arial, sans-serif",
            background: "#ffffff",
            color: "#111827",
            padding: "24px",
            width: "750px",
          }}
        >
          <h1 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "4px" }}>
            لیست انتخاب‌های رشته — {studentName}
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
      </div>
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
