import ExcelJS from "exceljs";
import { extractMajorRows, type ExtractedMajorRow } from "./pdf-to-majors";

const isNum = (s: string) => /^\d+$/.test(s);

// A strong signal of mis-attributed wrap-line stitching: the same 3+ word
// phrase appearing twice in one field (content bled in from an adjacent
// row), or a page/section-header word leaking into the title.
function looksCorrupted(text: string): boolean {
  const words = text.split(" ").filter(Boolean);
  const seen = new Set<string>();
  for (let i = 0; i + 3 <= words.length; i++) {
    const gram = words.slice(i, i + 3).join(" ");
    if (seen.has(gram)) return true;
    seen.add(gram);
  }
  return /استان|دانشکده|دانشگاه/.test(text);
}

// The project's convention (established by the original seed data) is that
// "field group" means the specific discipline (پزشکی، دندان‌پزشکی، ...), not
// the broad exam group — derived from the title by stripping the generic
// MD/DDS/PharmD-level prefix used for those three disciplines in the booklet.
function deriveFieldGroup(title: string): string {
  return title.replace(/^دکتری عمومی\s+/, "").trim() || title;
}

type ResolvedRow = {
  gender: string;
  termType: string;
  capacity: number | null;
};

function resolveGenderTermCapacity(row: ExtractedMajorRow): ResolvedRow[] {
  const zanIsNum = isNum(row.zan);
  const mardIsNum = isNum(row.mard);
  const avalIsNum = isNum(row.aval);
  const domIsNum = isNum(row.dom);
  const term = avalIsNum ? "اول" : domIsNum ? "دوم" : "نامشخص";

  if (zanIsNum || mardIsNum) {
    const results: ResolvedRow[] = [];
    if (zanIsNum) results.push({ gender: "زن", termType: term, capacity: Number(row.zan) });
    if (mardIsNum) results.push({ gender: "مرد", termType: term, capacity: Number(row.mard) });
    return results;
  }

  const zanWord = row.zan === "زن";
  const mardWord = row.mard === "مرد";
  const capacity = avalIsNum ? Number(row.aval) : domIsNum ? Number(row.dom) : null;

  if (zanWord && mardWord) return [{ gender: "هردو", termType: term, capacity }];
  if (zanWord) return [{ gender: "زن", termType: term, capacity }];
  if (mardWord) return [{ gender: "مرد", termType: term, capacity }];
  return [{ gender: "هردو", termType: term, capacity }];
}

async function main() {
  const [, , pdfPath, firstPageArg, lastPageArg, examYearArg, outPathArg] = process.argv;
  const first = Number(firstPageArg ?? 1);
  const last = Number(lastPageArg ?? first);
  const examYear = Number(examYearArg ?? 1404);
  const outPath = outPathArg ?? "majors-output.xlsx";

  const extracted = extractMajorRows(pdfPath, first, last);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("رشته‌ها");
  sheet.views = [{ rightToLeft: true }];
  sheet.columns = [
    { header: "سال کنکور", key: "examYear", width: 10 },
    { header: "گروه آزمایشی", key: "fieldGroup", width: 14 },
    { header: "استان", key: "province", width: 18 },
    { header: "دانشگاه", key: "university", width: 40 },
    { header: "دوره تحصیلی", key: "studyPeriod", width: 14 },
    { header: "کدرشته محل", key: "majorCode", width: 12 },
    { header: "عنوان رشته", key: "title", width: 28 },
    { header: "ظرفیت", key: "capacity", width: 8 },
    { header: "نیمسال", key: "termType", width: 10 },
    { header: "جنسیت", key: "gender", width: 10 },
    { header: "توضیحات", key: "description", width: 40 },
    { header: "بررسی لازم", key: "needsReview", width: 12 },
    { header: "صفحه منبع", key: "page", width: 10 },
  ];
  sheet.getRow(1).font = { bold: true };

  let reviewCount = 0;
  let totalOutputRows = 0;

  for (const row of extracted) {
    const flagged = looksCorrupted(row.description) || looksCorrupted(row.title);
    const resolved = resolveGenderTermCapacity(row);
    for (const r of resolved) {
      totalOutputRows++;
      if (flagged) reviewCount++;
      const excelRow = sheet.addRow({
        examYear,
        fieldGroup: deriveFieldGroup(row.title),
        province: row.province.replace(/^استان\s*/, ""),
        university: row.university,
        studyPeriod: row.studyPeriod,
        majorCode: row.majorCode,
        title: row.title,
        capacity: r.capacity,
        termType: r.termType,
        gender: r.gender,
        description: row.description,
        needsReview: flagged ? "بله" : "",
        page: row.page,
      });
      if (flagged) {
        excelRow.eachCell((cell) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFFF3CD" },
          };
        });
      }
    }
  }

  await workbook.xlsx.writeFile(outPath);

  console.log(`Extracted ${extracted.length} source rows -> ${totalOutputRows} output rows.`);
  console.log(`Flagged for review: ${reviewCount} output rows.`);
  console.log(`Written to ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
