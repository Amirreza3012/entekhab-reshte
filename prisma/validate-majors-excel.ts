// Offline validator: no model/API calls, no Prisma imports, and no database access.
// Reads inputs only. The sole persistent output is the requested CSV report.
// Usage: npx tsx prisma/validate-majors-excel.ts new.xlsx --pdf booklet.pdf --pages 103-132,133-140,142-171
//        [--reference reference.xlsx] [--seed 42] [--out report.csv]
import ExcelJS from "exceljs";
import { execFileSync } from "node:child_process";
import { writeFile, realpath } from "node:fs/promises";
import { homedir } from "node:os";
import { resolve, join } from "node:path";

type Severity = "error" | "review" | "info";
type Issue = { row: string; majorCode: string; page: string; type: string; severity: Severity; current: string; reference: string };
type Row = { row: number; values: Record<string, string> };
type Book = { rows: Row[]; columns: Set<string> };
type Word = { text: string; x: number; y: number; right: number; bottom: number };
type PdfPage = { page: number; width: number; height: number; words: Word[]; codes: Map<string, number>; reliable: boolean; reason: string };
type Derived = { gender: string; term: string; capacity: number | null };
type PageRange = { first: number; last: number };
type Heading = { text: string; y: number; province: string; kind: "eligibility" | "institution" };
const isFarhangian = (page: number) => page >= 267 && page <= 445;
const isRecords = (page: number) => page >= 446 && page <= 612;
const isPhase4 = (page: number) => page >= 172 && page <= 254;
const noRowPages = new Set([266, 613]);
const H = {
  year: "سال کنکور", group: "گروه آزمایشی", province: "استان", university: "دانشگاه",
  period: "دوره تحصیلی", code: "کدرشته محل", title: "عنوان رشته", capacity: "ظرفیت",
  term: "نیمسال", gender: "جنسیت", description: "توضیحات", review: "بررسی لازم",
  page: "صفحه منبع", entry: "سال ورود", admission: "نحوه پذیرش",
  raw: "ظرفیت خام", termText: "متن نیمسال", reason: "دلیل بررسی",
  admissionType: "نوع پذیرش", rawText: "متن خام",
  section: "عنوان بخش",
};
const digits = (s: string) => s.replace(/[۰-۹٠-٩]/g, (c) => String(c.charCodeAt(0) - (c >= "۰" ? 0x6f0 : 0x660)));
const normalize = (s: string) => digits(s).normalize("NFKC").replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/ة/g, "ه")
  .replace(/[\u200c\u200d\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, " ").replace(/\s+/g, " ").trim();
const compact = (s: string) => normalize(s).replace(/\s/g, "");
const get = (r: Row, key: string) => r.values[key] ?? "";
const codeOf = (r: Row) => compact(get(r, H.code));
const pageOf = (r: Row) => Number(normalize(get(r, H.page)));
const numberOf = (s: string): number | null => {
  const text = normalize(s);
  return /^\d+$/.test(text) && Number.isSafeInteger(Number(text)) ? Number(text) : null;
};
const genderOf = (s: string) => ({ زن: "FEMALE", مرد: "MALE", هردو: "BOTH", مختلط: "BOTH", "زن/مرد": "BOTH", "زنومرد": "BOTH", FEMALE: "FEMALE", MALE: "MALE", BOTH: "BOTH" }[compact(s).toUpperCase()] ?? "");
const termOf = (s: string) => ({ اول: "FIRST_TERM", نیمسالاول: "FIRST_TERM", دوم: "SECOND_TERM", نیمسالدوم: "SECOND_TERM", نامشخص: "UNSPECIFIED", FIRST_TERM: "FIRST_TERM", SECOND_TERM: "SECOND_TERM", UNSPECIFIED: "UNSPECIFIED" }[compact(s).toUpperCase()] ?? "");

function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    if ("richText" in value) return value.richText.map((part) => part.text).join("").trim();
    if ("text" in value) return String(value.text).trim();
    if ("result" in value) return cellText(value.result as ExcelJS.CellValue);
    return "";
  }
  return String(value).trim();
}

async function readBook(path: string): Promise<Book> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error(`No first worksheet: ${path}`);
  const headers = new Map<number, string>();
  const columns = new Set<string>();
  const aliases = new Map(Object.values(H).map((header) => [compact(header), header]));
  for (const header of ["متن خام ردیف", "متن خام توضیحات", "توضیحات خام"]) aliases.set(compact(header), H.rawText);
  sheet.getRow(1).eachCell((cell, index) => {
    const raw = cellText(cell.value);
    const header = aliases.get(compact(raw)) ?? normalize(raw);
    if (!header) return;
    if (columns.has(header)) throw new Error(`Duplicate header '${header}' in ${path}`);
    columns.add(header);
    headers.set(index, header);
  });
  const rows: Row[] = [];
  sheet.eachRow((row, index) => {
    if (index === 1) return;
    const values: Record<string, string> = {};
    for (const [column, header] of headers) values[header] = cellText(row.getCell(column).value);
    if (Object.values(values).some(Boolean)) rows.push({ row: index, values });
  });
  return { rows, columns };
}

function options() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    console.log("Usage: npx tsx prisma/validate-majors-excel.ts <new.xlsx> --pdf <pdf> --pages <first-last[,first-last,...]> [--reference <ref.xlsx>] [--seed N] [--out report.csv]");
    process.exit(0);
  }
  const excel = args.shift();
  if (!excel || excel.startsWith("--")) throw new Error("An Excel input is required; see --help.");
  const flags = new Map<string, string>();
  while (args.length) {
    const flag = args.shift()!;
    if (!["--pdf", "--pages", "--reference", "--seed", "--out"].includes(flag) || flags.has(flag)) throw new Error(`Unknown or repeated argument: ${flag}`);
    const value = args.shift();
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${flag}`);
    flags.set(flag, value);
  }
  if (!flags.get("--pdf") || !flags.get("--pages")) throw new Error("--pdf and --pages are required.");
  const ranges: PageRange[] = digits(flags.get("--pages")!).split(",").map((part) => {
    const range = part.trim().match(/^(\d+)-(\d+)$/);
    if (!range) throw new Error(`Invalid physical page range: ${part}`);
    const first = Number(range[1]), last = Number(range[2]);
    if (!Number.isSafeInteger(first) || !Number.isSafeInteger(last) || first < 1 || last < first) throw new Error("Invalid physical page range.");
    return { first, last };
  }).sort((a, b) => a.first - b.first);
  for (let i = 1; i < ranges.length; i++) if (ranges[i].first <= ranges[i - 1].last) throw new Error("Page ranges must not overlap.");
  const seedText = digits(flags.get("--seed") ?? "42");
  if (!/^-?\d+$/.test(seedText) || !Number.isSafeInteger(Number(seedText))) throw new Error("--seed must be a safe integer.");
  const path = (s: string) => resolve(s.startsWith("~/") ? join(homedir(), s.slice(2)) : s);
  return { excel: path(excel), pdf: path(flags.get("--pdf")!), ranges, seed: Number(seedText),
    reference: flags.has("--reference") ? path(flags.get("--reference")!) : undefined,
    out: path(flags.get("--out") ?? join(homedir(), "Downloads", "majors-validation-report.csv")) };
}

function decodeXml(s: string) {
  return s.replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
}

// Independent bbox extraction. Column discovery uses PDF header geometry only,
// never Excel codes, a fixed code range, or the project's extraction pipeline.
function readPdf(pdf: string, first: number, last: number): PdfPage[] {
  let xml: string;
  try {
    xml = execFileSync("pdftotext", ["-f", String(first), "-l", String(last), "-bbox", "-enc", "UTF-8", pdf, "-"],
      { encoding: "utf8", maxBuffer: 256 * 1024 * 1024, timeout: 120_000, stdio: ["ignore", "pipe", "pipe"] });
  } catch (error) {
    throw new Error(`Cannot run pdftotext (install Poppler, check PDF/range): ${error instanceof Error ? error.message : String(error)}`);
  }
  const pages: PdfPage[] = [];
  for (const match of xml.matchAll(/<page\b[^>]*width="([\d.]+)"[^>]*height="([\d.]+)"[^>]*>([\s\S]*?)<\/page>/g)) {
    const words: Word[] = [];
    for (const word of match[3].matchAll(/<word\b[^>]*xMin="([\d.-]+)"[^>]*yMin="([\d.-]+)"[^>]*xMax="([\d.-]+)"[^>]*yMax="([\d.-]+)"[^>]*>([\s\S]*?)<\/word>/g)) {
      words.push({ x: +word[1], y: +word[2], right: +word[3], bottom: +word[4], text: decodeXml(word[5]) });
    }
    pages.push({ page: first + pages.length, width: +match[1], height: +match[2], words, codes: new Map(), reliable: false, reason: "" });
  }
  if (pages.length !== last - first + 1) throw new Error(`PDF returned ${pages.length} pages, expected ${last - first + 1}. Check physical page range.`);
  type Band = { left: number; right: number; top: number };
  const bands = new Map<number, Band[]>();
  for (const page of pages) {
    const found: Band[] = [];
    for (const word of page.words) {
      const forms = [compact(word.text), compact([...word.text].reverse().join(""))];
      let header = forms.some((text) => /^(کدرشته(?:محل)?|کدرشته.?محل)$/.test(text));
      if (!header && forms.includes("کد")) {
        header = page.words.some((other) => Math.abs(other.y - word.y) < 15 && Math.abs(other.x - word.x) < 48 &&
          [compact(other.text), compact([...other.text].reverse().join(""))].some((text) => text.includes("رشته")));
      }
      if (!header || word.right - word.x > page.width * .17) continue;
      // A two-line column heading can have «محل» below «کدرشته».
      const below = page.words.filter((other) => other.y >= word.y && other.y < word.bottom + 19 &&
        Math.abs((other.x + other.right) / 2 - (word.x + word.right) / 2) < 12 &&
        [compact(other.text), compact([...other.text].reverse().join(""))].includes("محل"));
      const top = Math.max(word.bottom, ...below.map((other) => other.bottom));
      const band = { left: word.x - 5, right: word.right + 5, top };
      // Narrative references to codes are rejected unless actual five-digit
      // cells align below this narrow heading. Empty tables are still uncertain.
      if (page.words.some((other) => /^\d{5}$/.test(compact(other.text)) && other.x >= band.left && other.right <= band.right && other.y > top && other.y < page.height * .95)) found.push(band);
    }
    if (found.length) bands.set(page.page, found);
  }
  for (const page of pages) {
    if (!page.words.some((word) => /[\p{L}\p{N}]/u.test(word.text))) {
      page.reason = "independent check not possible: no extractable text (possibly scanned PDF)";
      continue;
    }
    let columns = bands.get(page.page);
    if (!columns) {
      // Only inherit from a neighbouring page when a continuing table has
      // several aligned numeric cells AND same-line text in an adjacent column.
      const neighbor = pages.find((p) => p.page === page.page - 1 && bands.has(p.page)) ?? pages.find((p) => p.page === page.page + 1 && bands.has(p.page));
      const inherited = (neighbor ? bands.get(neighbor.page) : undefined)?.map((band) => ({
        left: band.left / neighbor!.width * page.width, right: band.right / neighbor!.width * page.width, top: page.height * .065,
      }));
      columns = inherited?.filter((band) => page.words.filter((word) => /^\d{5}$/.test(compact(word.text)) && word.x >= band.left && word.right <= band.right && word.y > band.top &&
        page.words.some((other) => /\p{L}/u.test(other.text) && other.right < band.left && band.left - other.right < page.width * .3 && Math.abs(other.y - word.y) < 6)).length >= 3);
    }
    if (!columns?.length) {
      page.reason = "independent check not possible: major-code column could not be located confidently";
      continue;
    }
    page.reliable = true;
    for (const word of page.words) {
      const code = compact(word.text);
      if (/^\d{5}$/.test(code) && word.y < page.height * .95 && columns.some((band) => word.x >= band.left && word.right <= band.right && word.y > band.top)) {
        page.codes.set(code, Math.min(page.codes.get(code) ?? Infinity, word.y));
      }
    }
  }
  return pages;
}

function capacityFromRaw(raw: string): { expected?: Derived[]; totalMismatch?: string; uncertain?: string } {
  const cells = raw.split("|").map(normalize);
  if (cells.length !== 4) return { uncertain: "Expected four raw cells: first-term | second-term | زن | مرد" };
  const [first, second, female, male] = cells;
  const terms = [{ term: "FIRST_TERM", capacity: numberOf(first) }, { term: "SECOND_TERM", capacity: numberOf(second) }].filter((t) => t.capacity !== null);
  const genders = [{ gender: "FEMALE", capacity: numberOf(female) }, { gender: "MALE", capacity: numberOf(male) }].filter((g) => g.capacity !== null);
  const blank = (s: string) => /^(?:|-|–|—)$/.test(s);
  if (!cells.every((cell, i) => numberOf(cell) !== null || blank(cell) || (i === 2 && cell === "زن") || (i === 3 && cell === "مرد"))) return { uncertain: "Unrecognized raw capacity/gender cell" };
  if (genders.length) {
    const total = terms.reduce((sum, item) => sum + item.capacity!, 0);
    const split = genders.reduce((sum, item) => sum + item.capacity!, 0);
    const totalMismatch = terms.length && total !== split ? `Term total ${total}; female+male total ${split}` : undefined;
    if (terms.length > 1) return { totalMismatch, uncertain: "Both terms and gender splits have numbers; joint allocation cannot be inferred without source detail" };
    if (female === "زن" || male === "مرد") return { totalMismatch, uncertain: "Mixed word/numeric gender cells; shared and split capacity are ambiguous" };
    return { totalMismatch, expected: genders.map((g) => ({ ...g, term: terms[0]?.term ?? "UNSPECIFIED" })) };
  }
  const gender = female === "زن" && male === "مرد" ? "BOTH" : female === "زن" ? "FEMALE" : male === "مرد" ? "MALE" : "";
  if (!gender || !terms.length) return { uncertain: "Gender or term capacity cannot be inferred from raw cells" };
  return { expected: terms.map((t) => ({ ...t, gender })) };
}

function repeatFragment(text: string, long: boolean): string | undefined {
  const words = normalize(text).split(" ").filter(Boolean);
  const n = long ? 6 : 3;
  for (let i = 1; i < words.length; i++) if (words[i] === words[i - 1] && words[i].length >= 2) return `${words[i]} ${words[i]}`;
  const seen = new Set<string>();
  for (let i = 0; i + n <= words.length; i++) {
    const fragment = words.slice(i, i + n).join(" ");
    if (seen.has(fragment)) return fragment;
    seen.add(fragment);
  }
}

function distance(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 4) return Infinity;
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    previous = current;
  }
  return previous[b.length];
}

// PDF text can encode each Persian word in visual (reversed) order. Build
// geometry-based RTL lines, trying both token directions, independently of Excel.
const PROVINCES = ["آذربایجان شرقی", "آذربایجان غربی", "اردبیل", "اصفهان", "البرز", "ایلام", "بوشهر", "تهران", "چهارمحال و بختیاری", "خراسان جنوبی", "خراسان رضوی", "خراسان شمالی", "خوزستان", "زنجان", "سمنان", "سیستان و بلوچستان", "فارس", "قزوین", "قم", "کردستان", "کرمان", "کرمانشاه", "کهگیلویه و بویراحمد", "گلستان", "گیلان", "لرستان", "مازندران", "مرکزی", "هرمزگان", "همدان", "یزد"];
const plainText = (s: string) => normalize(s).replace(/[\u064b-\u065f]/g, "");
function headingProvince(text: string): string | undefined {
  const tail = plainText(text).split(/استان\s*/).at(-1) ?? "";
  // Longest first: کرمانشاه must not be mistaken for کرمان.
  return [...PROVINCES].sort((a, b) => compact(b).length - compact(a).length).find((province) => compact(tail).startsWith(compact(province)));
}

function pdfHeadings(page: PdfPage): Heading[] {
  const lines: Word[][] = [];
  for (const word of [...page.words].sort((a, b) => a.y - b.y)) {
    const last = lines.at(-1);
    if (last && Math.abs(last[0].y - word.y) < 4) last.push(word);
    else lines.push([word]);
  }
  const headings = new Map<string, Heading>();
  for (let i = 0; i < lines.length; i++) {
    for (const reversed of [false, true]) {
      const render = (line: Word[]) => normalize([...line].sort((a, b) => b.x - a.x).map((word) => reversed ? [...word.text].reverse().join("") : word.text).join(" "));
      let text = render(lines[i]);
      const starts = /(?:پذیرش از تمام متقاضیان سراسر کشور|مخصوص متقاضیان بومی استان)/;
      const institution = /^(?:ادامه\s+)?(?:استان\s+|دانشگاه\s+(?:آزاد اسلامی|پیام نور)\s+استان\s+)/.test(text);
      if (!starts.test(text) && !institution) continue;
      // Eligibility phrases also occur inside description cells. They are
      // not section headings when aligned with a major-code table row.
      if (!institution && [...page.codes.values()].some((y) => Math.abs(y - lines[i][0].y) < 6)) continue;
      if (!headingProvince(text) && lines[i + 1] && lines[i + 1][0].y - lines[i][0].y < 24) text += " " + render(lines[i + 1]);
      const match = text.match(/(?:پذیرش از تمام متقاضیان سراسر کشور[،,\s]*با اولویت متقاضیان بومی استان|مخصوص متقاضیان بومی استان)\s+(.+)$/);
      // Poppler's visual-order lam/alef ligature is transposed in these
      // province tokens. Correct only these known PDF spellings, not arbitrary
      // text or Excel values; otherwise valid headings become false positives.
      let heading = (match?.[0] ?? (institution ? text : "")).trim().replace(/استان ایالم/g, "استان ایلام").replace(/استان گیالن/g, "استان گیلان");
      if (!heading) continue;
      const province = headingProvince(heading);
      // A partial phrase from a wrapped row can join the next numeric row.
      // Such text is not an independently located section sub-heading.
      if (match && !province && /\d{5}/.test(heading)) continue;
      // Stop an eligibility heading at its province. Other cells on the same
      // visual line (e.g. محل خدمت) must not become part of the heading.
      if (match && province) heading = heading.slice(0, heading.indexOf("استان") + "استان".length) + " " + province;
      headings.set(`${lines[i][0].y}|${heading}`, { text: heading, y: lines[i][0].y, province: province ?? "", kind: match ? "eligibility" : "institution" });
    }
  }
  return [...headings.values()].sort((a, b) => a.y - b.y);
}

function serviceText(raw: string): string | undefined {
  const match = plainText(raw).match(/محل\s*خدمت\s*[:：]?\s*(.+?)(?=\s*(?:\||\/|[—–;؛]|(?:دانشگاه|پردیس|ظرفیت|جنسیت|دامنه پذیرش)\s*[:：])|$)/);
  return match?.[1].trim();
}

// Admission labels are in the PDF columns to the right of the code column.
// Bound the vertical band by neighbouring code baselines to avoid borrowing
// a label from the next row, including wrapped titles/method cells. No Excel
// values or project importer output are used to infer the expected method.
function pdfAdmissionMethod(page: PdfPage, code: string): string | undefined {
  const y = page.codes.get(code);
  if (!page.reliable || y === undefined) return undefined;
  const anchor = page.words.find((word) => compact(word.text) === code && Math.abs(word.y - y) < 1);
  if (!anchor) return undefined;
  const baselines = [...new Set(page.codes.values())].sort((a, b) => a - b);
  const index = baselines.indexOf(y);
  const top = Math.max(y - 18, index > 0 ? (baselines[index - 1] + y) / 2 : -Infinity);
  const bottom = Math.min(y + 24, index + 1 < baselines.length ? (baselines[index + 1] + y) / 2 : Infinity);
  const words = page.words.filter((word) => word.x > anchor.right + 2 && word.y >= top && word.y < bottom);
  const lines: Word[][] = [];
  for (const word of words.sort((a, b) => a.y - b.y)) {
    const line = lines.at(-1);
    if (line && Math.abs(line[0].y - word.y) < 4) line.push(word);
    else lines.push([word]);
  }
  const found = new Set<string>();
  for (const reversed of [false, true]) {
    const text = comparisonText(lines.map((line) => [...line].sort((a, b) => b.x - a.x).map((word) => reversed ? [...word.text].reverse().join("") : word.text).join(" ")).join(" "));
    if (text.includes(comparisonText("با آزمون"))) found.add("با آزمون");
    if (text.includes(comparisonText("صرفا با سوابق تحصیلی"))) found.add("صرفا با سوابق تحصیلی");
  }
  return found.size === 1 ? [...found][0] : undefined;
}

const comparisonText = (s: string) => compact(s).replace(/[\p{P}\p{S}\p{M}]/gu, "");

function universityInRaw(university: string, raw: string): boolean {
  const name = comparisonText(university);
  const source = comparisonText(raw);
  if (!name || !source) return false;
  // Campus qualifiers are legitimate, but must still be present in source text.
  // Leading eligibility headings are permitted before the university name.
  const position = source.indexOf(name);
  if (position < 0) return false;
  const prefix = source.slice(0, position);
  return !prefix.includes("دانشگاه") && !prefix.includes("دانشکده");
}

async function main() {
  const opt = options();
  // Resolve symlinks too: --out must never overwrite an input.
  const inputs = await Promise.all([opt.excel, opt.pdf, ...(opt.reference ? [opt.reference] : [])].map((path) => realpath(path)));
  const output = await realpath(opt.out).catch(() => opt.out);
  if (inputs.includes(output) || !/\.csv$/i.test(opt.out)) throw new Error("--out must be a CSV path distinct from all inputs.");
  const book = await readBook(opt.excel);
  const reference = opt.reference ? await readBook(opt.reference) : undefined;
  const issues: Issue[] = [];
  const uncommonInstitutions: { label: string; rows: number; pages: number[] }[] = [];
  const badRows = new Set<number>();
  const badPages = new Set<number>();
  const add = (r: Row | undefined, type: string, severity: Severity, current: string, ref = "", page?: number, code?: string) => {
    const p = page ?? (r ? pageOf(r) : undefined);
    issues.push({ row: r ? String(r.row) : "", majorCode: code ?? (r ? codeOf(r) : ""), page: p && Number.isFinite(p) ? String(p) : "", type, severity, current, reference: ref });
    if (r) badRows.add(r.row);
    else if (p && severity !== "info") badPages.add(p);
  };
  const farhangianOnly = opt.ranges.every(({ first, last }) => isFarhangian(first) && isFarhangian(last));
  const noPeriodColumn = farhangianOnly || opt.ranges.every(({ first, last }) => first === 172 && last === 172);
  const required = [H.year, H.group, H.province, H.university, H.code, H.title, H.capacity, H.gender, H.page, ...(noPeriodColumn ? [] : [H.period]), ...(farhangianOnly ? [] : [H.term])];
  const missingHeaders = required.filter((h) => !book.columns.has(h));
  for (const header of missingHeaders) add(undefined, "missing_required_column", "error", header);
  if (reference) for (const header of [H.code, H.title, H.university, H.province]) {
    if (!reference.columns.has(header)) throw new Error(`Reference is missing required header: ${header}`);
  }
  const rows = book.rows.filter((r) => {
    const p = pageOf(r);
    return !Number.isInteger(p) || p < 1 || opt.ranges.some(({ first, last }) => p >= first && p <= last);
  });
  const rangeLabel = opt.ranges.map(({ first, last }) => `${first}-${last}`).join(",");
  console.log(`Excel rows: ${book.rows.length}; in physical pages ${rangeLabel} (or invalid page): ${rows.length}; ignored outside range: ${book.rows.length - rows.length}`);
  const keys = new Map<string, Row[]>();
  const rawGroups = new Map<string, Row[]>();
  const referenceCodes = new Map<string, Row[]>();
  for (const r of reference?.rows ?? []) referenceCodes.set(codeOf(r), [...(referenceCodes.get(codeOf(r)) ?? []), r]);
  for (const column of [H.raw, H.entry, H.description, H.termText, H.admissionType]) {
    if (!book.columns.has(column)) add(undefined, "check_skipped_missing_column", "info", column, `Checks requiring '${column}' skipped`);
  }
  const farhangianRows = rows.filter((r) => isFarhangian(pageOf(r)));
  if (farhangianRows.length) {
    add(undefined, "check_skipped_farhangian_layout", "info", `${farhangianRows.length} rows`, "PDF has no term/study-period/admission-method columns; raw capacity/term derivation skipped. Explicit file-level admission labels are still checked.");
    if (!book.columns.has(H.rawText)) add(undefined, "check_skipped_missing_column", "info", H.rawText, "Farhangian service-text check skipped");
    else {
      const absent = farhangianRows.filter((r) => !serviceText(get(r, H.rawText)));
      if (absent.length) add(undefined, "service_source_check_skipped", "info", `${absent.length} rows have no labelled محل خدمت in raw row text`, "Cannot infer service location from a campus name or eligibility city; add original service-cell text to raw row text.");
    }
  }
  if (rows.some((r) => isFarhangian(pageOf(r)) || isRecords(pageOf(r))) && !book.columns.has(H.admission)) add(undefined, "check_skipped_missing_column", "info", H.admission, "Phase-3 admission-method check skipped");
  if (rows.some((r) => isPhase4(pageOf(r))) && !book.columns.has(H.admission)) add(undefined, "check_skipped_missing_column", "info", H.admission, "Phase-4 independent PDF admission-method check skipped");
  if (rows.some((r) => pageOf(r) === 172)) add(undefined, "check_skipped_page172_period", "info", H.period, "Physical page 172 has no study-period column; its derived value is not validated", 172);
  for (const r of rows) {
    for (const header of [H.year, H.group, H.province, H.university, H.period, H.code, H.title, H.term, H.gender, H.page]) {
      if (isFarhangian(pageOf(r)) && (header === H.period || header === H.term)) continue;
      if (pageOf(r) === 172 && header === H.period) continue;
      if (book.columns.has(header) && !get(r, header)) add(r, "invalid_empty_value", "error", header);
    }
    const code = codeOf(r), year = numberOf(get(r, H.year)), p = pageOf(r);
    const gender = genderOf(get(r, H.gender)), term = termOf(get(r, H.term)) || (isFarhangian(p) && !get(r, H.term) ? "UNSPECIFIED" : "");
    if (book.columns.has(H.code) && !/^\d{5}$/.test(code)) add(r, "invalid_major_code", "error", get(r, H.code), "Exactly five digits (mixed Persian/Arabic/ASCII accepted)");
    if (book.columns.has(H.year) && (year === null || year < 1300 || year > 1600)) add(r, "invalid_year", "error", get(r, H.year));
    if (book.columns.has(H.page) && (!Number.isInteger(p) || p < 1)) add(r, "invalid_source_page", "error", get(r, H.page));
    if (book.columns.has(H.gender) && !gender) add(r, "invalid_gender", "error", get(r, H.gender), "زن / مرد / هردو");
    if (book.columns.has(H.term) && !term) add(r, "invalid_term", "error", get(r, H.term), "اول / دوم / نامشخص");
    if (get(r, H.capacity) && numberOf(get(r, H.capacity)) === null) add(r, "invalid_capacity", "error", get(r, H.capacity), "Non-negative integer or empty");
    if (get(r, H.entry) && !isPhase4(p) && (numberOf(get(r, H.entry)) === null || Number(normalize(get(r, H.entry))) < 1300 || Number(normalize(get(r, H.entry))) > 1600)) add(r, "invalid_entry_year", "error", get(r, H.entry));
    if (book.columns.has(H.admissionType)) {
      const value = normalize(get(r, H.admissionType)).replace(/[\u064b-\u065f]/g, "");
      if (!["عادی", "تعهد خدمت", "تعهد بومی استان", "صرفا با سوابق تحصیلی", "فرهنگیان"].includes(value)) add(r, "invalid_admission_type", "error", get(r, H.admissionType), "عادی | تعهد خدمت | تعهد بومی استان | صرفاً با سوابق تحصیلی | فرهنگیان");
      else {
        const expected = isFarhangian(p) ? "فرهنگیان" : isRecords(p) || isPhase4(p) ? "عادی" : p >= 103 && p <= 140 ? "تعهد خدمت" : p >= 142 && p <= 171 ? "تعهد بومی استان" : undefined;
        if (expected && value !== expected) add(r, "admission_type_section_mismatch", "review", get(r, H.admissionType), expected);
      }
    }
    if ((isFarhangian(p) || isRecords(p)) && book.columns.has(H.admission)) {
      const expected = isFarhangian(p) ? "با آزمون" : "صرفا با سوابق تحصیلی";
      const method = plainText(get(r, H.admission));
      if (!["با آزمون", "صرفا با سوابق تحصیلی"].includes(method)) add(r, "invalid_admission_method", "error", get(r, H.admission), "با آزمون | صرفاً با سوابق تحصیلی");
      else if (method !== expected) add(r, "admission_method_section_mismatch", "review", get(r, H.admission), expected);
    }
    if (isFarhangian(p)) {
      const service = serviceText(get(r, H.rawText));
      if (service && !comparisonText(get(r, H.description)).includes(comparisonText(`محل خدمت ${service}`))) add(r, "service_text_missing", "review", get(r, H.description), `محل خدمت: ${service}`);
    }
    if (isRecords(p) && /دانشگاه\s+(?:آزاد اسلامی|پیام نور)\s+استان/.test(plainText(get(r, H.university)))) {
      const expected = headingProvince(get(r, H.university));
      if (expected && compact(get(r, H.province)) !== compact(expected)) add(r, "province_institution_mismatch", "review", get(r, H.province), expected);
    }
    if (p >= 103 && p <= 171 && book.columns.has(H.rawText)) {
      if (!get(r, H.rawText)) add(r, "university_source_check_skipped", "info", "Raw source text empty");
      else if (!universityInRaw(get(r, H.university), get(r, H.rawText))) add(r, "university_source_mismatch", "review", get(r, H.university), get(r, H.rawText));
    }
    if (year !== null && /^\d{5}$/.test(code) && gender && term) {
      const key = `${year}|${code}|${gender}|${term}`;
      keys.set(key, [...(keys.get(key) ?? []), r]);
    }
    if (reference && /^\d{5}$/.test(code)) {
      const candidates = referenceCodes.get(code) ?? [];
      for (const header of [H.title, H.university, H.province]) {
        if (candidates.length && !candidates.some((c) => compact(get(c, header)) === compact(get(r, header)))) add(r, `reference_difference:${header}`, "review", get(r, header), [...new Set(candidates.map((c) => get(c, header)))].join(" | "));
      }
    }
    for (const [header, text] of Object.entries(r.values)) {
      if (/[يكة]/.test(text)) add(r, `arabic_letters:${header}`, "review", text, text.replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/ة/g, "ه"));
    }
    for (const header of [H.title, H.university, H.description, H.group]) {
      const text = get(r, header), fragment = repeatFragment(text, header === H.description);
      if (fragment) add(r, `duplicated_fragment:${header}`, "review", text, `Repeated fragment: ${fragment}`);
      if ((header === H.title && normalize(text).length > 120) || (header === H.university && normalize(text).length > 220)) add(r, `abnormally_long:${header}`, "review", text);
    }
    if (/^(?:گروه\s*(?:آزمایشی\s*)?)?(?:علوم تجربی|تجربی|ریاضی(?: و فیزیک)?|علوم ریاضی و فنی|علوم انسانی|انسانی|هنر|زبان(?: های خارجی)?|زبان های خارجه)$/.test(normalize(get(r, H.group)))) add(r, "broad_field_group", "review", get(r, H.group), "Specific discipline derived from title");
    const derivedGroup = normalize(get(r, H.title)).replace(/^دکتری عمومی\s+/, "");
    if (get(r, H.group) && get(r, H.title) && compact(get(r, H.group)) !== compact(derivedGroup)) add(r, "discipline_title_mismatch", "review", get(r, H.group), derivedGroup);
    if (book.columns.has(H.entry) && isPhase4(p)) {
      if (get(r, H.entry)) add(r, "entry_year_inconsistency", "review", get(r, H.entry), "Physical pages 172-254 require an empty entry year");
    } else if (book.columns.has(H.entry)) {
      const entry = numberOf(get(r, H.entry));
      const descriptionSignal = /شروع\s*تحصیل\s*مهر\s*ماه\s*1406/.test(normalize(get(r, H.description)));
      const sectionSignal = p >= 94 && p <= 101;
      const headerOnly1406 = p >= 133 && p <= 140;
      const mustNotBe1406 = (p >= 103 && p <= 132) || (p >= 142 && p <= 171);
      const mismatch = headerOnly1406 ? entry !== 1406 :
        (book.columns.has(H.description) && descriptionSignal !== (entry === 1406)) || (sectionSignal && entry !== 1406) || (mustNotBe1406 && entry === 1406);
      if (mismatch) add(r, "entry_year_inconsistency", "review", `entry=${get(r, H.entry) || "empty"}; page=${p}; description=${get(r, H.description)}`,
        headerOnly1406 ? "Physical pages 133-140 require entry=1406; description signal not required" : mustNotBe1406 ? "This section must not have entry=1406; description and entry signals must agree" : "Description signal and entry=1406 must agree; physical pages 94-101 require 1406");
    }
    if (book.columns.has(H.raw) && !isFarhangian(p)) {
      if (!get(r, H.raw)) add(r, "raw_capacity_missing", "info", "Raw capacity empty; check skipped");
      else {
        const group = `${year}|${code}|${p}|${normalize(get(r, H.raw))}`;
        rawGroups.set(group, [...(rawGroups.get(group) ?? []), r]);
      }
    }
    if (/^(بله|yes|true|1)$/i.test(normalize(get(r, H.review))) || get(r, H.reason)) add(r, "source_review_flag", "review", `${get(r, H.review)}; ${get(r, H.reason)}`);
  }
  for (const [key, duplicates] of keys) if (duplicates.length > 1) for (const r of duplicates) add(r, "duplicate_key", "error", key, `Excel rows: ${duplicates.map((d) => d.row).join(", ")}`);
  for (const group of rawGroups.values()) {
    const result = capacityFromRaw(get(group[0], H.raw));
    for (const r of group) {
      if (result.totalMismatch) add(r, "raw_capacity_total_mismatch", "review", get(r, H.raw), result.totalMismatch);
      if (result.uncertain) add(r, "raw_capacity_ambiguous", "review", get(r, H.raw), result.uncertain);
      if (result.expected) {
        const stored = { gender: genderOf(get(r, H.gender)), term: termOf(get(r, H.term)), capacity: numberOf(get(r, H.capacity)) };
        if (!result.expected.some((e) => e.gender === stored.gender && e.term === stored.term && e.capacity === stored.capacity)) add(r, "raw_derived_mismatch", "review", JSON.stringify(stored), JSON.stringify(result.expected));
      }
    }
    for (const expected of result.expected ?? []) if (!group.some((r) => genderOf(get(r, H.gender)) === expected.gender && termOf(get(r, H.term)) === expected.term && numberOf(get(r, H.capacity)) === expected.capacity)) add(group[0], "raw_derived_row_missing", "review", get(group[0], H.raw), JSON.stringify(expected));
  }
  for (const header of [H.university, H.province]) {
    const counts = new Map<string, { label: string; codes: Set<string> }>();
    for (const r of rows) {
      const value = compact(get(r, header));
      if (!value) continue;
      const item = counts.get(value) ?? { label: get(r, header), codes: new Set<string>() };
      item.codes.add(`${normalize(get(r, H.year))}|${codeOf(r)}`);
      counts.set(value, item);
    }
    const frequent = [...counts].filter(([, value]) => value.codes.size >= 3);
    const groups = new Map<string, Row[]>();
    for (const r of rows) {
      const value = compact(get(r, header));
      if (!value || (counts.get(value)?.codes.size ?? 0) >= 3 || !frequent.length) continue;
      const group = groups.get(value) ?? []; group.push(r); groups.set(value, group);
    }
    for (const [value, group] of groups) {
      const similar = frequent.map(([key, data]) => ({ key, label: data.label, distance: distance(value, key) })).sort((a, b) => a.distance - b.distance)[0];
      const reason = similar.distance <= Math.min(4, Math.max(1, Math.floor(value.length * .12))) ? `Possible frequent spelling: ${similar.label}` : "Seen in fewer than 3 distinct codes; may be a legitimate rare institution/province";
      if (header === H.university && rows.some((r) => isFarhangian(pageOf(r)) || isRecords(pageOf(r)) || isPhase4(pageOf(r)))) {
        const sourcePages = [...new Set(group.map(pageOf))].sort((a, b) => a - b);
        // One CSV finding and console line per institution, but every affected
        // row remains flagged and is excluded from the clean random sample.
        add(undefined, `uncommon_value:${header}`, "review", get(group[0], header), `${reason}; Excel rows=${group.map((r) => r.row).join(",")}; physical pages=${sourcePages.join(",")}`);
        for (const r of group) badRows.add(r.row);
        uncommonInstitutions.push({ label: get(group[0], header), rows: group.length, pages: sourcePages });
      } else for (const r of group) add(r, `uncommon_value:${header}`, "review", get(r, header), reason);
    }
  }
  const byYear = new Map<string, Set<number>>();
  for (const r of rows) if (/^\d{5}$/.test(codeOf(r))) {
    const year = normalize(get(r, H.year));
    const codes = byYear.get(year) ?? new Set<number>(); codes.add(Number(codeOf(r))); byYear.set(year, codes);
  }
  for (const [year, codes] of byYear) {
    const sorted = [...codes].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) if (sorted[i] > sorted[i - 1] + 1) add(undefined, "code_sequence_gap", "info", `year=${year}; absent range=${sorted[i - 1] + 1}-${sorted[i] - 1}; count=${sorted[i] - sorted[i - 1] - 1}`, "Informational only: code blocks need not be consecutive");
  }
  if (rows.some((r) => pageOf(r) >= 103 && pageOf(r) <= 171) && !book.columns.has(H.rawText)) add(undefined, "check_skipped_missing_column", "info", H.rawText, "University/source-text consistency check skipped");
  console.log(`Independently reading physical PDF pages ${rangeLabel} with pdftotext -bbox…`);
  // Extract each requested range separately: excluded pages never enter any
  // reconciliation, heading check, or cross-boundary lookup.
  const pages = opt.ranges.flatMap(({ first, last }) => readPdf(opt.pdf, first, last)).filter((page) => !noRowPages.has(page.page));
  const excelPages = new Map<number, Map<string, Row[]>>();
  for (const r of rows) if (/^\d{5}$/.test(codeOf(r)) && Number.isInteger(pageOf(r))) {
    const codes = excelPages.get(pageOf(r)) ?? new Map<string, Row[]>();
    codes.set(codeOf(r), [...(codes.get(codeOf(r)) ?? []), r]); excelPages.set(pageOf(r), codes);
  }
  for (const page of pages) if (isPhase4(page.page) && book.columns.has(H.admission)) {
    for (const [code, codeRows] of excelPages.get(page.page) ?? []) {
      const expected = pdfAdmissionMethod(page, code);
      for (const r of codeRows) {
        if (!expected) add(r, "pdf_admission_check_not_possible", "info", get(r, H.admission), "PDF row admission label could not be read unambiguously; no mismatch conclusion made");
        else if (comparisonText(get(r, H.admission)) !== comparisonText(expected)) add(r, "pdf_admission_method_mismatch", "review", get(r, H.admission), expected);
      }
    }
  }
  let matched = 0, uncertain = 0;
  let headingPages = 0;
  let carriedHeading: Heading | undefined;
  let previousPage = 0;
  for (const page of pages) {
    const allHeadings = pdfHeadings(page);
    const headings = allHeadings.filter((h) => h.kind === "eligibility");
    if (headings.length) headingPages++;
    const pageRows = rows.filter((r) => pageOf(r) === page.page);
    if (book.columns.has(H.description)) {
      const missing = headings.filter((heading) => !pageRows.some((r) => comparisonText(get(r, H.description)).includes(comparisonText(heading.text))));
      if (missing.length) add(undefined, "section_heading_missing", "review", `No Excel description contains: ${missing.map((h) => h.text).join(" | ")}`, "PDF eligibility sub-headings must be preserved in applicable row descriptions", page.page);
    }
    // Match headings to code-cell geometry, not Excel row counts/order. A
    // heading carries only across consecutive pages of the same section.
    if (page.page !== previousPage + 1 || isFarhangian(page.page) !== isFarhangian(previousPage) || isRecords(page.page) !== isRecords(previousPage)) carriedHeading = undefined;
    const relevant = allHeadings.filter((h) => isFarhangian(page.page) ? h.kind === "eligibility" : isRecords(page.page) ? h.kind === "institution" : false);
    for (const r of pageRows) {
      const y = page.codes.get(codeOf(r));
      if (y === undefined) continue; // Reconciliation separately reports missing code geometry.
      const heading = relevant.filter((h) => h.y < y).at(-1) ?? carriedHeading;
      if (!heading) continue;
      if (!heading.province) {
        add(r, "heading_province_check_skipped", "info", heading.text, "PDF heading province could not be parsed confidently");
        continue;
      }
      if (book.columns.has(H.province) && compact(get(r, H.province)) !== compact(heading.province)) add(r, "province_heading_mismatch", "review", get(r, H.province), heading.text);
      if (isFarhangian(page.page) && book.columns.has(H.description) && !comparisonText(get(r, H.description)).includes(comparisonText(heading.text))) add(r, "row_section_heading_missing", "review", get(r, H.description), heading.text);
    }
    carriedHeading = relevant.at(-1) ?? carriedHeading;
    previousPage = page.page;
  }
  const boundaryPairs = new Set<string>();
  for (const page of pages) {
    if (!page.reliable) { uncertain++; add(undefined, "independent_check_not_possible", "review", page.reason, "No missing/extra-code conclusions made", page.page); continue; }
    const excelCodes = excelPages.get(page.page) ?? new Map<string, Row[]>();
    const missing = [...page.codes.keys()].filter((code) => !excelCodes.has(code));
    const extra = [...excelCodes.keys()].filter((code) => !page.codes.has(code));
    if (!missing.length && !extra.length) matched++;
    // Page attribution can move at a boundary. Do not silently bless any code
    // merely because it occurs on an adjacent page: require an edge row and
    // keep a review warning explaining the possible continuation.
    for (const code of extra) {
      const neighbor = pages.find((p) => Math.abs(p.page - page.page) === 1 && p.reliable && p.codes.has(code) && !excelPages.get(p.page)?.has(code));
      if (neighbor) {
        const sorted = [...neighbor.codes].sort((a, b) => a[1] - b[1]);
        const edge = neighbor.page < page.page ? sorted.at(-1)?.[0] === code : sorted[0]?.[0] === code;
        if (edge) {
          boundaryPairs.add(`${neighbor.page}|${code}`);
          for (const r of excelCodes.get(code)!) add(r, "source_page_boundary", "review", `Excel page ${page.page}; code located on PDF page ${neighbor.page}`, "Possible row continuing across physical page boundary; verify source-page attribution");
          continue;
        }
      }
      for (const r of excelCodes.get(code)!) add(r, "pdf_extra_in_excel", "review", code, "Not found in this physical page's PDF code column", page.page);
    }
  }
  for (const page of pages) if (page.reliable) {
    for (const code of page.codes.keys()) if (!excelPages.get(page.page)?.has(code) && !boundaryPairs.has(`${page.page}|${code}`)) add(undefined, "pdf_missing_from_excel", "review", `PDF code ${code} absent from Excel source page`, "Check source PDF row", page.page, code);
  }
  issues.sort((a, b) => Number(a.page || 0) - Number(b.page || 0) || Number(a.row || 0) - Number(b.row || 0) || a.type.localeCompare(b.type));
  // BOM for Persian Excel compatibility; quote RFC4180 fields and neutralize
  // spreadsheet formula prefixes in untrusted cell text (report only).
  const quote = (value: string) => '"' + (/^[\s]*[=+@-]/.test(value) ? "'" + value : value).replace(/"/g, '""') + '"';
  const records = [["row", "majorCode", "source page", "issue type", "severity", "current value", "reference value"],
    ...issues.map((i) => [i.row, i.majorCode, i.page, i.type, i.severity, i.current, i.reference])];
  await writeFile(opt.out, "\uFEFF" + records.map((record) => record.map(quote).join(",")).join("\r\n") + "\r\n", "utf8");
  const clean = missingHeaders.length ? [] : rows.filter((r) => !badRows.has(r.row) && !badPages.has(pageOf(r)) && pages.some((p) => p.page === pageOf(r) && p.reliable));
  // Mulberry32 + Fisher-Yates: reproducible samples without replacement.
  let state = opt.seed >>> 0;
  const random = () => { state = (state + 0x6d2b79f5) >>> 0; let t = Math.imul(state ^ state >>> 15, 1 | state); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  for (let i = clean.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [clean[i], clean[j]] = [clean[j], clean[i]]; }
  console.log(`\nManual PDF sample: ${Math.min(20, clean.length)} of ${clean.length} rows without issues; seed=${opt.seed}. Not proof of accuracy.`);
  for (const r of clean.slice(0, 20)) console.log(JSON.stringify({ row: r.row, majorCode: codeOf(r), physicalPage: pageOf(r), ...r.values }));
  console.log(`\nPDF: ${matched}/${pages.length} page code sets match; ${uncertain} pages could not be reconciled confidently.`);
  console.log(`PDF eligibility headings detected on ${headingPages} pages.`);
  console.log(`Report: ${opt.out}`);
  console.log(`Issues: ${issues.length}; flagged Excel rows: ${badRows.size}`);
  for (const severity of ["error", "review", "info"] as const) console.log(`${severity}: ${issues.filter((i) => i.severity === severity).length}`);
  const counts = new Map<string, number>();
  for (const i of issues) {
    const type = i.type.startsWith("duplicated_fragment:") ? "duplicated_fragment (all columns)" : i.type === `uncommon_value:${H.university}` ? "uncommon_university" : i.type;
    const key = `${i.severity} / ${type}`; counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  for (const [type, count] of [...counts].sort((a, b) => a[0].localeCompare(b[0]))) console.log(`${type}: ${count}`);
  for (const institution of uncommonInstitutions) console.log(`review / uncommon university: ${institution.label}; rows=${institution.rows}; physical pages=${institution.pages.join(",")}`);
  console.log("\nSummary per physical page range (flagged rows include page-level review/error findings):");
  for (const { first, last } of opt.ranges) {
    const selected = rows.filter((r) => pageOf(r) >= first && pageOf(r) <= last);
    const unique = new Set(selected.map(codeOf).filter((code) => /^\d{5}$/.test(code)));
    console.log(`${first}-${last}: rows=${selected.length}; unique codes=${unique.size}; flagged rows=${selected.filter((r) => badRows.has(r.row) || badPages.has(pageOf(r))).length}`);
  }
  // Validation errors have a distinct exit status, after the report is written.
  if (issues.some((i) => i.severity === "error")) process.exitCode = 2;
}

main().catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
