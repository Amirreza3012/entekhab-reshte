import { execFileSync } from "node:child_process";
import ExcelJS from "exceljs";
import { extractMajorRows, type ExtractedMajorRow, type ExtractionReport, type LayoutName } from "./pdf-to-majors";

const isNum = (s: string) => /^\d+$/.test(s);

// A strong signal of mis-attributed wrap-line stitching: the same 3+ word
// phrase appearing twice in one field (content bled in from an adjacent
// row), or a page/section-header word leaking into the title.
function looksCorrupted(text: string, isTitle: boolean): boolean {
  const words = text.split(" ").filter(Boolean);
  const seen = new Set<string>();
  // Titles: a repeated 3-word phrase is stitching damage. Descriptions can
  // legitimately repeat a short phrase («سپاه پاسداران انقلاب ...» twice), so
  // they need a much longer repeat.
  const n = isTitle ? 3 : 6;
  for (let i = 0; i + n <= words.length; i++) {
    const gram = words.slice(i, i + n).join(" ");
    if (seen.has(gram)) return true;
    seen.add(gram);
  }
  // Descriptions legitimately mention universities/provinces; only a title
  // or boilerplate phrases leaking into a description are suspicious.
  if (isTitle) return /(^|\s)(استان|دانشکده|دانشگاه)(\s|$)|اسامی چند برابر/.test(text);
  return /دفترچه راهنمای انتخاب رشته|اسامی چند برابر|نحوه پذیرش/.test(text);
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

// --- reference data for the "unknown value" checks --------------------------

const KNOWN_PROVINCES = new Set([
  "آذربایجان شرقی",
  "آذربایجان غربی",
  "اردبیل",
  "اصفهان",
  "البرز",
  "ایلام",
  "بوشهر",
  "تهران",
  "چهارمحال و بختیاری",
  "خراسان جنوبی",
  "خراسان رضوی",
  "خراسان شمالی",
  "خوزستان",
  "زنجان",
  "سمنان",
  "سیستان و بلوچستان",
  "فارس",
  "قزوین",
  "قم",
  "کردستان",
  "کرمان",
  "کرمانشاه",
  "کهگیلویه و بویراحمد",
  "گلستان",
  "گیلان",
  "لرستان",
  "مازندران",
  "مرکزی",
  "هرمزگان",
  "همدان",
  "یزد",
]);

// University name with the trailing «(محل تحصیل ...)» campus qualifier removed.
const universityBase = (u: string) => u.replace(/\s*\(محل تحصیل.*$/, "").trim();

const KNOWN_UNIVERSITY_PATTERNS: RegExp[] = [
  /^دانشگاه علوم پزشکی و خدمات بهداشتی درمانی \S/,
  /^دانشکده علوم پزشکی و خدمات بهداشتی درمانی \S/,
  /^دانشگاه آزاد اسلامی (استان .+ - )?واحد \S/,
];
const KNOWN_UNIVERSITIES = new Set([
  "دانشگاه علوم پزشکی ارتش جمهوری اسلامی ایران",
  "دانشگاه علوم پزشکی بقیه الله(عج) – تهران",
  "دانشگاه علوم پزشکی بقیه الله(عج)",
  "دانشگاه افسری امام علی (ع) - تهران - وابسته به نیروی زمینی ارتش جمهوری اسلامی ایران",
  "دانشگاه افسری خاتم الانبیاء (ص) - تهران - وابسته به نیروی پدافند هوایی ارتش جمهوری اسلامی ایران",
  "دانشگاه افسری شهید ستاری - تهران - وابسته به نیروی هوایی ارتش جمهوری اسلامی ایران",
  "دانشکده علوم و فنون فارابی - تهران - وابسته به ارتش جمهوری اسلامی ایران",
  "دانشگاه شاهد - تهران",
  "دانشگاه علوم توانبخشی و سلامت اجتماعی - تهران",
  "مؤسسه آموزش عالی علمی - کاربردی هلال ایران",
]);

const KNOWN_ADMISSION_MODES = new Set(["با آزمون", "صرفا با سوابق تحصیلی"]);
const KNOWN_STUDY_PERIODS = new Set([
  "روزانه",
  "شهریه پرداز",
  "آزاد تمام وقت",
  "خودگردان آزاد",
  // Ministry-of-Science universities (phase 4)
  "نوبت دوم",
  "مجازی",
  "پردیس خودگردان",
  "روزانه - غیردولتی",
]);

const norm = (s: string) => s.replace(/\s+/g, " ").trim();

const RECORDS_INSTITUTION_PATTERNS: RegExp[] = [
  /^(موسسه|مؤسسه|دانشگاه|دانشکده|آموزشکده)\s+غیرانتفاعی\s+\S/,
  /^(موسسه|مؤسسه)\s+آموزش\s+عالی\s+\S/,
  /^دانشگاه\s+پیام\s+نور\s+استان\s+.+\s-\s\S/,
  /^دانشگاه\s+آزاد\s+اسلامی\s+(استان\s+.+\s-\s)?واحد\s+\S/,
];
const MINISTRY_INSTITUTION_PATTERN = /^(دانشگاه|دانشکده|موسسه|مؤسسه|مرکز\s+آموزش\s+عالی|مجتمع\s+آموزش\s+عالی|آموزشکده|پردیس)\s+\S/;
const FARHANGIAN_CAMPUS_PATTERN = /^(پردیس|دانشگاه|دانشکده|مرکز|آموزشکده)\s+\S/;

let reviewLayout: LayoutName = "regular";
function unknownUniversity(r: ExtractedMajorRow): boolean {
  const base = universityBase(norm(r.university));
  if (reviewLayout === "records") return !RECORDS_INSTITUTION_PATTERNS.some((re) => re.test(base));
  if (reviewLayout === "farhangian") return !FARHANGIAN_CAMPUS_PATTERN.test(base);
  if (reviewLayout === "ministry") return !MINISTRY_INSTITUTION_PATTERN.test(base);
  if (KNOWN_UNIVERSITIES.has(base)) return false;
  return !KNOWN_UNIVERSITY_PATTERNS.some((re) => re.test(base));
}

// --- run options ------------------------------------------------------------

// «نوع پذیرش» labels. Phase 1 = عادی; commitment pages are mapped by range.
type TypeRange = { from: number; to: number; label: string };
type Options = {
  layout: LayoutName;
  firstPage: number;
  lastPage: number;
  typeRanges: TypeRange[];
  // university base name -> provinces it appears under in phase 1
  universityProvinces: Map<string, Set<string>> | null;
};

const FARHANGIAN_LABEL = "فرهنگیان";
const SERVICE = "تعهد خدمت";
const NATIVE = "تعهد بومی استان";
const typeOf = (page: number, o: Options) =>
  o.typeRanges.find((r) => page >= r.from && page <= r.to)?.label ?? "عادی";

// The sub-heading style must agree with the type of its page range.
const SUBHEADING_STYLE: Record<string, RegExp> = {
  [SERVICE]: /^پذیرش از تمام متقاضیان/,
  [NATIVE]: /^مخصوص متقاضیان بومی/,
  [FARHANGIAN_LABEL]: /^مخصوص متقاضیان بومی/,
};

// Provinces of a university in phase 1; falls back to a phase-1 name that
// extends it with « - city» (the commitment cells sometimes omit the city).
function lookupProvinces(map: Map<string, Set<string>>, base: string): Set<string> | undefined {
  const exact = map.get(base);
  if (exact) return exact;
  const ext = [...map.entries()].filter(([k]) => k.startsWith(`${base} - `));
  return ext.length ? new Set(ext.flatMap(([, v]) => [...v])) : undefined;
}

// Province of the university (place of study), as in phase 1. The sub-heading
// only names the NATIVE province, which often differs (e.g. Kerman's seats
// reserved for natives of Sistan-Baluchestan), so it stays in the description.
const PROVINCE_BY_SPACELESS = new Map([...KNOWN_PROVINCES].map((p) => [p.replace(/ /g, ""), p]));
function provinceOf(row: ExtractedMajorRow, o: Options): string {
  if (o.layout === "records" || o.layout === "farhangian") {
    // «چهار محال و بختیاری», «سیستان وبلوچستان»: unify spacing to the canonical name.
    return PROVINCE_BY_SPACELESS.get(norm(row.province).replace(/ /g, "")) ?? row.province;
  }
  if (o.layout !== "commitment" || !o.universityProvinces) return row.province;
  const known = lookupProvinces(o.universityProvinces, universityBase(norm(row.university)));
  if (!known) return row.province;
  if (known.size === 1) return [...known][0];
  return known.has(norm(row.province)) ? norm(row.province) : row.province;
}

// --- split-word repair (commitment layout) ---------------------------------
// The commitment pages' justified text makes poppler emit fragments of one
// word as separate tokens («مح ل», «خ وابگاه», «حی د ریه»). A run of 2-3
// tokens is glued back when the glued form is a common word elsewhere in the
// booklet text and at least one piece is itself a rare fragment.
const MIN_WORD_COUNT = 3;
const wordCounts = new Map<string, number>();
const tokenize = (t: string) => t.split(" ").filter(Boolean);
function addVocabulary(texts: (string | null | undefined)[]) {
  for (const t of texts) for (const w of tokenize(t ?? "")) wordCounts.set(w, (wordCounts.get(w) ?? 0) + 1);
}
const count = (w: string) => wordCounts.get(w) ?? 0;

function repairSplitWords(text: string): { text: string; repairs: string[] } {
  const toks = tokenize(text);
  const out: string[] = [];
  const repairs: string[] = [];
  for (let i = 0; i < toks.length; ) {
    let merged = false;
    for (const n of [3, 2]) {
      const parts = toks.slice(i, i + n);
      if (parts.length < n || !parts.every((p) => /^[ء-ۓ]+$/.test(p))) continue;
      const glued = parts.join("");
      const rare = (p: string) => count(p) < MIN_WORD_COUNT;
      const joinable =
        count(glued) >= MIN_WORD_COUNT &&
        (parts.some((p) => p.length <= 1 && p !== "و") || parts.every(rare) || (count(glued) >= 20 && parts.some(rare)));
      if (joinable) {
        out.push(glued);
        repairs.push(`${parts.join(" ")}→${glued}`);
        i += n;
        merged = true;
        break;
      }
    }
    if (!merged) out.push(toks[i++]);
  }
  return { text: out.join(" "), repairs };
}

// Phase 2 puts the sub-heading on every row's description, verbatim.
function composeDescription(row: ExtractedMajorRow, layout: LayoutName): string {
  if (layout === "farhangian") {
    // The sub-heading, the «دامنه پذیرش» text and the «محل خدمت» value all
    // matter to the applicant, so all three stay, labelled by their columns.
    return [
      row.subheading ? `[${row.subheading}]` : "",
      row.description ? `دامنه پذیرش: ${row.description}` : "",
      row.serviceLocation ? `محل خدمت: ${row.serviceLocation}` : "",
    ]
      .filter(Boolean)
      .join(" — ");
  }
  if (layout !== "commitment" || !row.subheading) return row.description;
  return row.description ? `[${row.subheading}] — ${row.description}` : `[${row.subheading}]`;
}

async function loadUniversityProvinces(xlsxPath: string): Promise<Map<string, Set<string>> | null> {
  try {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(xlsxPath);
    const ws = wb.worksheets[0];
    const hdr = (ws.getRow(1).values as ExcelJS.CellValue[]).slice(1).map(String);
    const uCol = hdr.indexOf("دانشگاه") + 1;
    const pCol = hdr.indexOf("استان") + 1;
    const tCol = hdr.indexOf("عنوان رشته") + 1;
    const dCol = hdr.indexOf("توضیحات") + 1;
    const map = new Map<string, Set<string>>();
    ws.eachRow((r, n) => {
      if (n === 1) return;
      const base = universityBase(norm(String(r.getCell(uCol).value ?? "")));
      const prov = norm(String(r.getCell(pCol).value ?? ""));
      addVocabulary([String(r.getCell(uCol).value ?? ""), String(r.getCell(tCol).value ?? ""), String(r.getCell(dCol).value ?? "")]);
      if (base) map.set(base, (map.get(base) ?? new Set()).add(prov));
    });
    return map;
  } catch {
    return null;
  }
}

// --- row-level review -------------------------------------------------------

type ReviewedRow = { row: ExtractedMajorRow; reasons: string[] };

// Every 5-digit token in the whole PDF's text (the «۵» glyph digit normalized).
// Maps each 5-digit token to the pages (1-based) it appears on.
function allPdfCodes(pdfPath: string): Map<string, number[]> {
  const text = execFileSync("pdftotext", ["-raw", pdfPath, "-"], { maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] }).toString("utf-8");
  const map = new Map<string, number[]>();
  text.split("\f").forEach((pageText, i) => {
    const ascii = pageText.replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
    for (const code of ascii.match(/(?<!\d)\d{5}(?!\d)/g) ?? []) map.set(code, [...(map.get(code) ?? []), i + 1]);
  });
  return map;
}

function reviewRows(rows: ExtractedMajorRow[], report: ExtractionReport, opts: Options, pdfPath: string): ReviewedRow[] {
  reviewLayout = opts.layout;
  const reviewed: ReviewedRow[] = rows.map((row) => ({ row, reasons: [...row.reasons] }));
  const flag = (i: number, reason: string) => {
    if (i >= 0 && i < reviewed.length) reviewed[i].reasons.push(reason);
  };

  reviewed.forEach(({ row }, i) => {
    if (looksCorrupted(row.description, false) || looksCorrupted(row.title, true)) {
      flag(i, "متن عنوان/توضیحات احتمالاً با ردیف مجاور درهم شده");
    }
    if (!KNOWN_PROVINCES.has(norm(provinceOf(row, opts)))) flag(i, `استان ناشناخته: ${provinceOf(row, opts)}`);
    if (unknownUniversity(row)) flag(i, `دانشگاه ناشناخته: ${row.university.slice(0, 50)}`);
    const azadProvince = row.university.match(/استان (.+?) - واحد/)?.[1];
    if (azadProvince && norm(azadProvince).replace(/ /g, "") !== norm(provinceOf(row, opts)).replace(/ /g, "")) {
      flag(i, "استان دانشگاه آزاد با استان سرصفحه نمی‌خواند");
    }
    if (opts.layout !== "farhangian" && !KNOWN_ADMISSION_MODES.has(norm(row.admissionMode))) {
      flag(i, `نحوه پذیرش ناشناخته: ${row.admissionMode}`);
    }
    if ((opts.layout === "regular" || opts.layout === "ministry") && !KNOWN_STUDY_PERIODS.has(norm(row.studyPeriod))) {
      flag(i, `دوره تحصیلی ناشناخته: ${row.studyPeriod}`);
    }

    // Capacity consistency.
    if (opts.layout === "farhangian") {
      const style = SUBHEADING_STYLE[FARHANGIAN_LABEL];
      if (!style.test(row.subheading)) flag(i, "عنوان بخش فرهنگیان «مخصوص متقاضیان بومی استان» نیست");
      if (!row.serviceLocation) flag(i, "محل خدمت خالی است");
      // One capacity number and one gender word per row.
      if (!isNum(row.aval)) flag(i, "ظرفیت عددی یافت نشد");
      if (row.zan !== "زن" && row.zan !== "مرد") flag(i, "جنسیت (زن/مرد) یافت نشد");
      if (row.dom || row.mard) flag(i, "سلول غیرمنتظره در ستون‌های ظرفیت");
      return;
    }
    const nums = [row.aval, row.dom, row.zan, row.mard].filter(isNum);
    if (isNum(row.aval) && isNum(row.dom)) flag(i, "ظرفیت در هر دو نیمسال اول و دوم عدد است");
    if (!isNum(row.aval) && !isNum(row.dom)) flag(i, "ظرفیت عددی برای هیچ نیمسالی نیست");
    const total = isNum(row.aval) ? Number(row.aval) : isNum(row.dom) ? Number(row.dom) : null;
    if (isNum(row.zan) || isNum(row.mard)) {
      const split = (isNum(row.zan) ? Number(row.zan) : 0) + (isNum(row.mard) ? Number(row.mard) : 0);
      if (total !== null && total !== split) flag(i, `جمع ظرفیت (${total}) با مجموع زن+مرد (${split}) نمی‌خواند`);
      if (row.zan === "زن" || row.mard === "مرد") flag(i, "ترکیب عدد و کلمه در ستون‌های جنسیت");
    } else if (row.zan !== "زن" && row.mard !== "مرد") {
      flag(i, "جنسیت مشخص نیست");
    }
    void nums;

    // The two entry signals must agree. In the commitment layout the
    // description may legitimately omit «شروع تحصیل مهرماه 1406» under the
    // mehr section, but never mention it outside that section.
    if (row.sectionEntryYear !== row.descriptionEntryYear) {
      if (!row.sectionEntryYear) flag(i, "توضیحات «شروع تحصیل مهرماه 1406» دارد ولی در بخش مهر ۱۴۰۶ نیست");
      else if (opts.layout === "regular") flag(i, "بخش مهر ۱۴۰۶ است ولی توضیحات «شروع تحصیل مهرماه 1406» ندارد");
    }

    if (opts.layout === "commitment") {
      const type = typeOf(row.page, opts);
      const style = SUBHEADING_STYLE[type];
      if (!style) flag(i, "نوع پذیرش این صفحه تعریف نشده است");
      else if (!style.test(row.subheading)) flag(i, `عنوان بخش با نوع «${type}» نمی‌خواند`);
      // Province derived from the sub-heading must match the university's
      // province as seen in phase 1 (same university, same province).
      if (opts.universityProvinces) {
        const known = lookupProvinces(opts.universityProvinces, universityBase(norm(row.university)));
        if (!known) flag(i, "دانشگاه در فاز ۱ نیست (استان از عنوان بخش گرفته شد)");
        else if (known.size > 1) flag(i, `دانشگاه در فاز ۱ در چند استان آمده (${[...known].join("/")})`);
      }
    }
  });

  // Duplicate codes.
  const byCode = new Map<string, number[]>();
  rows.forEach((r, i) => byCode.set(r.majorCode, [...(byCode.get(r.majorCode) ?? []), i]));
  for (const [code, idxs] of byCode) {
    if (idxs.length > 1) idxs.forEach((i) => flag(i, `کد تکراری ${code}`));
  }

  // Sequence: codes are not listed in numeric order (a campus's rows can be
  // grouped apart from its code block), so test the SORTED set: the main
  // series first-code..last-code must have no hole, and a hole flags the rows
  // holding the neighbouring codes. A few majors carry codes from other
  // blocks (357xx, 366xx, 1xxxx, ...), outside that range and exempt.
  const codes = rows.map((r) => Number(r.majorCode));
  if (opts.layout !== "regular") {
    // Several code blocks (385xx-390xx service, 376xx/380xx native, odd
    // singles): flag the neighbours of any hole of up to 5 codes inside a
    // block, and just report bigger jumps as block boundaries.
    const sorted = [...new Set(codes)].sort((a, b) => a - b);
    const idxByCode = new Map(codes.map((c, i) => [c, i]));
    const jumps: string[] = [];
    let pdfCodes: Map<string, number[]> | undefined;
    for (let k = 1; k < sorted.length; k++) {
      const gap = sorted[k] - sorted[k - 1] - 1;
      if (gap <= 0) continue;
      if (gap <= 5) {
        // A hole is only suspicious if its codes appear SOMEWHERE in the PDF
        // (an extraction miss or a row on another page). Codes absent from the
        // whole document are unused codes in the booklet: just reported.
        pdfCodes ??= allPdfCodes(pdfPath);
        const missing = Array.from({ length: gap }, (_, g) => sorted[k - 1] + 1 + g);
        // Only a code printed on a page of THIS run's range is an extraction
        // miss; one that appears only on other pages belongs to another phase.
        const present = missing.filter((c) =>
          (pdfCodes!.get(String(c)) ?? []).some((pg) => pg >= opts.firstPage && pg <= opts.lastPage)
        );
        if (present.length) {
          const msg = `کد ${present.join("، ")} در PDF هست ولی ردیفی برایش در توالی استخراج نشد`;
          flag(idxByCode.get(sorted[k - 1]) ?? -1, msg);
          flag(idxByCode.get(sorted[k]) ?? -1, msg);
        } else {
          report.pageWarnings.push({ page: 0, message: `کدهای ${missing.join("، ")} (بین ${sorted[k - 1]} و ${sorted[k]}) در صفحه‌های این بازه نیست` });
        }
      } else jumps.push(`${sorted[k - 1]}→${sorted[k]}`);
    }
    if (jumps.length) report.pageWarnings.push({ page: 0, message: `مرز بلوک‌های کد: ${jumps.join(", ")}` });
  } else if (codes.length > 0) {
    const lo = codes[0];
    const hi = codes[codes.length - 1];
    const idxByCode = new Map(codes.map((c, i) => [c, i]));
    const holes: number[] = [];
    for (let c = lo; c <= hi; c++) if (!idxByCode.has(c)) holes.push(c);
    for (const c of holes) {
      const msg = `کد ${c} در توالی کدها وجود ندارد`;
      flag(idxByCode.get(c - 1) ?? -1, msg);
      flag(idxByCode.get(c + 1) ?? -1, msg);
    }
    if (holes.length > 0) {
      report.pageWarnings.push({ page: 0, message: `کدهای مفقود در سری اصلی: ${holes.slice(0, 30).join(", ")}` });
    }
  }

  // A code present in the page's raw text but not extracted: flag the rows
  // around it on that page.
  for (const m of report.missingCodes) {
    const onPage = rows.map((r, i) => (r.page === m.page ? i : -1)).filter((i) => i >= 0);
    onPage.forEach((i) => flag(i, `کد ${m.code} در متن خام صفحه هست ولی ردیفی برایش استخراج نشد`));
  }

  return reviewed;
}

// Farhangian rows carry ONE capacity and ONE gender word; there is no term.
function resolveRow(row: ExtractedMajorRow, layout: LayoutName): ResolvedRow[] {
  if (layout !== "farhangian") return resolveGenderTermCapacity(row);
  return [{ gender: row.zan === "مرد" || row.zan === "زن" ? row.zan : "هردو", termType: "نامشخص", capacity: isNum(row.aval) ? Number(row.aval) : null }];
}

// «دوره تحصیلی» is required by the DB but absent from these tables:
//  commitment -> «روزانه» (the notes tie them to the daily course)
//  records    -> from the institution kind: غیرانتفاعی / آزاد / پیام نور
//  farhangian -> «-» (placeholder)
function studyPeriodOf(row: ExtractedMajorRow, layout: LayoutName, counts: Map<string, number>): string {
  let period = row.studyPeriod;
  if (layout === "commitment") period = "روزانه";
  else if (layout === "farhangian") period = "-";
  else if (layout === "records") {
    period = /پیام\s+نور/.test(row.university) ? "پیام نور" : /آزاد\s+اسلامی/.test(row.university) ? "آزاد" : /غیرانتفاعی/.test(row.university) ? "غیرانتفاعی" : "-";
  }
  counts.set(period, (counts.get(period) ?? 0) + 1);
  return period;
}

async function main() {
  // Usage: <pdf> <first> <last> <examYear> <out.xlsx> [--layout regular|commitment]
  //        [--types 103-140:تعهد خدمت,142-171:تعهد بومی استان] [--ref phase1.xlsx]
  const flagIdx = process.argv.findIndex((a) => a.startsWith("--"));
  const positional = flagIdx === -1 ? process.argv : process.argv.slice(0, flagIdx);
  const flag = (name: string) => {
    const i = process.argv.indexOf(name);
    return i === -1 ? undefined : process.argv[i + 1];
  };
  const [, , pdfPath, firstPageArg, lastPageArg, examYearArg, outPathArg] = positional;
  const layout = (flag("--layout") ?? "regular") as LayoutName;
  const typeRanges: TypeRange[] = (flag("--types") ?? "")
    .split(",")
    .filter(Boolean)
    .map((t) => {
      const [range, label] = t.split(":");
      const [from, to] = range.split("-").map(Number);
      return { from, to, label };
    });
  // --segments 172-172:records,173-254:ministry  (several layouts in one workbook)
  type Segment = { layout: LayoutName; first: number; last: number };
  const refPath = flag("--ref") ?? `${process.env.HOME}/Downloads/majors-1405-phase1.xlsx`;
  const first = Number(firstPageArg ?? 1);
  const last = Number(lastPageArg ?? first);
  // The phase-1 workbook seeds the word vocabulary (split-word repair) and,
  // for the commitment layout, the university -> province map.
  const segments: Segment[] = flag("--segments")
    ? flag("--segments")!
        .split(",")
        .map((t) => {
          const [range, l] = t.split(":");
          const [from, to] = range.split("-").map(Number);
          return { layout: l as LayoutName, first: from, last: to };
        })
    : [{ layout, first, last }];
  const refMap = segments.every((sg) => sg.layout === "regular") ? null : await loadUniversityProvinces(refPath);
  if (segments.some((sg) => sg.layout !== "regular") && !refMap) {
    console.warn(`WARN: reference workbook ${refPath} not readable; vocabulary/province cross-check skipped`);
  }
  const examYear = Number(examYearArg ?? 1404);
  const outPath = outPathArg ?? "majors-output.xlsx";

  type Item = { row: ExtractedMajorRow; reasons: string[]; layout: LayoutName; opts: Options; segment: string };
  const items: Item[] = [];
  const extracted: ExtractedMajorRow[] = [];
  const report: ExtractionReport = { stoppedAt: null, missingCodes: [], unownedLines: [], notes: [], pageWarnings: [] };
  for (const sg of segments) {
    const opts: Options = {
      layout: sg.layout,
      firstPage: sg.first,
      lastPage: sg.last,
      typeRanges,
      universityProvinces: sg.layout === "commitment" ? refMap : null,
    };
    const res = extractMajorRows(pdfPath, sg.first, sg.last, sg.layout);
    if (sg.layout !== "regular") {
      addVocabulary(res.rows.flatMap((r) => [r.title, r.university, r.description, r.subheading, r.serviceLocation]));
      for (const r of res.rows) {
        const fixes: string[] = [];
        for (const key of ["title", "university", "description", "subheading", "serviceLocation"] as const) {
          const fixed = repairSplitWords(r[key]);
          r[key] = fixed.text;
          fixes.push(...fixed.repairs);
        }
        if (fixes.length) r.reasons.push(`اصلاح خودکار فاصله‌ی کلمه (متن خام در ستون «متن خام ردیف»): ${fixes.join("؛ ")}`);
        const lone = tokenize(`${r.title} ${r.university} ${r.description} ${r.subheading} ${r.serviceLocation}`).filter(
          (w) => w.length === 1 && /^[ء-ؿف-ۓ]$/.test(w) && w !== "و"
        );
        if (lone.length) r.reasons.push(`حرف تنها در متن (احتمال کلمه‌ی شکسته): ${lone.join(" ")}`);
      }
    }
    const reviewedSeg = reviewRows(res.rows, res.report, opts, pdfPath);
    for (const rv of reviewedSeg) {
      items.push({ ...rv, layout: sg.layout, opts, segment: segments.length > 1 ? ` [${sg.first}-${sg.last} ${sg.layout}]` : "" });
    }
    extracted.push(...res.rows);
    report.stoppedAt ??= res.report.stoppedAt;
    report.missingCodes.push(...res.report.missingCodes);
    report.unownedLines.push(...res.report.unownedLines);
    report.notes.push(...res.report.notes);
    report.pageWarnings.push(...res.report.pageWarnings);
  }

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
    { header: "سال ورود", key: "entryYear", width: 10 },
    { header: "نحوه پذیرش", key: "admissionMode", width: 14 },
    { header: "ظرفیت خام", key: "rawCells", width: 22 },
    { header: "متن نیمسال", key: "sectionText", width: 36 },
    { header: "دلیل بررسی", key: "reasons", width: 50 },
    { header: "نوع پذیرش", key: "admissionType", width: 14 },
    { header: "عنوان بخش", key: "subheading", width: 50 },
    { header: "متن خام ردیف", key: "rawCellText", width: 60 },
  ];
  sheet.getRow(1).font = { bold: true };

  type Stat = { source: number; flaggedSource: number; output: number; flaggedOutput: number };
  const stats = new Map<string, Stat>();
  const stat = (key: string) => {
    if (!stats.has(key)) stats.set(key, { source: 0, flaggedSource: 0, output: 0, flaggedOutput: 0 });
    return stats.get(key)!;
  };
  const reasonCounts = new Map<string, number>();
  const studyPeriodCounts = new Map<string, number>();
  let totalOutputRows = 0;
  let flaggedOutputRows = 0;

  for (const { row, reasons, layout, opts, segment } of items) {
    const flagged = reasons.length > 0;
    const entryYear = layout === "farhangian" || layout === "records" ? null : (row.sectionEntryYear ?? row.descriptionEntryYear);
    const range = `${typeOf(row.page, opts)} / ${row.sectionEntryYear ? "مهر ۱۴۰۶" : "۱۴۰۵"}${segment}`;
    const st = stat(range);
    st.source++;
    if (flagged) {
      st.flaggedSource++;
      for (const r of new Set(reasons.map((x) => x.replace(/[:：].*$/, "").replace(/\d+/g, "#")))) {
        reasonCounts.set(r, (reasonCounts.get(r) ?? 0) + 1);
      }
    }

    for (const r of resolveRow(row, layout)) {
      totalOutputRows++;
      st.output++;
      if (flagged) {
        flaggedOutputRows++;
        st.flaggedOutput++;
      }
      const excelRow = sheet.addRow({
        examYear,
        fieldGroup: deriveFieldGroup(row.title),
        province: provinceOf(row, opts).replace(/^استان\s*/, ""),
        university: row.university,
        studyPeriod: studyPeriodOf(row, layout, studyPeriodCounts),
        majorCode: row.majorCode,
        title: row.title,
        capacity: r.capacity,
        termType: r.termType,
        gender: r.gender,
        description: composeDescription(row, layout),
        needsReview: flagged ? "بله" : "",
        page: row.page,
        entryYear: entryYear ?? null,
        admissionMode: layout === "farhangian" ? "با آزمون" : row.admissionMode,
        rawCells: row.rawCells,
        sectionText: layout === "regular" || layout === "commitment" ? row.sectionText : "",
        reasons: reasons.join("؛ "),
        admissionType: typeOf(row.page, opts),
        subheading: row.subheading,
        rawCellText: row.rawCellText,
      });
      if (flagged) {
        excelRow.eachCell((cell) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF3CD" } };
        });
      }
    }
  }

  // Report sheet: everything the extractor saw but couldn't place in a row.
  const rep = workbook.addWorksheet("گزارش");
  rep.views = [{ rightToLeft: true }];
  rep.columns = [
    { header: "نوع", key: "kind", width: 18 },
    { header: "صفحه", key: "page", width: 8 },
    { header: "متن", key: "text", width: 90 },
    { header: "مربوط به", key: "ctx", width: 50 },
  ];
  rep.getRow(1).font = { bold: true };
  for (const n of report.notes) rep.addRow({ kind: "یادداشت جدول", page: n.page, text: n.text, ctx: n.before });
  for (const u of report.unownedLines) rep.addRow({ kind: "خط بدون مالک", page: u.page, text: u.text });
  for (const m of report.missingCodes) rep.addRow({ kind: "کد مفقود", page: m.page, text: m.code });
  for (const w of report.pageWarnings) rep.addRow({ kind: "هشدار", page: w.page, text: w.message });

  await workbook.xlsx.writeFile(outPath);

  console.log(`Pages ${segments.map((sg) => `${sg.first}-${sg.last}`).join(" + ")}${report.stoppedAt ? ` (stopped at page ${report.stoppedAt.page}: next-section heading)` : ""}`);
  for (const [k, v] of stats) {
    const pages = items.filter((it) => `${typeOf(it.row.page, it.opts)} / ${it.row.sectionEntryYear ? "مهر ۱۴۰۶" : "۱۴۰۵"}${it.segment}` === k).map((it) => it.row.page);
    console.log(
      `${k}: pages ${Math.min(...pages)}-${Math.max(...pages)}, ${v.source} source rows -> ${v.output} output rows, flagged ${v.flaggedSource} source / ${v.flaggedOutput} output`
    );
  }
  console.log(`Study period values: ${[...studyPeriodCounts].map(([k, v]) => `«${k}» ${v}`).join(", ")}`);
  console.log(`Total: ${extracted.length} source rows -> ${totalOutputRows} output rows; flagged ${flaggedOutputRows} output rows.`);
  console.log(
    `Notes: ${report.notes.length}, unowned lines: ${report.unownedLines.length}, missing codes: ${report.missingCodes.length}, page warnings: ${report.pageWarnings.length}`
  );
  const top = [...reasonCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  if (top.length) console.log("Top flag reasons:\n" + top.map(([r, c]) => `  ${c}\t${r}`).join("\n"));
  console.log(`Written to ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
