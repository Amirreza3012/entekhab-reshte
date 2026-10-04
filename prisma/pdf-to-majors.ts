import { execFileSync } from "node:child_process";

type Word = { x0: number; x1: number; y0: number; y1: number; text: string };
type Line = { y0: number; y1: number; words: Word[] };
type PageLines = { height: number; lines: Line[]; rawCodes: Set<string>; ruleYs: number[]; ruleXs: Map<number, number> };

// Poppler reverses each Persian/Arabic-script run to visual order, but a
// word glued to a paren/quote (e.g. an opening "(" before a university's
// location qualifier) comes out as one token mixing script and punctuation
// — reverse it too, since it's still visually-ordered as a whole.
// Digits are the exception: poppler keeps digit runs in logical order even
// when the font draws a digit with a Persian glyph (e.g. «۵» for 5), so a
// token whose only Arabic-block characters are digits must NOT be reversed.
const ARABIC_DIGITS = /[٠-٩۰-۹]/g;
const HAS_PERSIAN_LETTER = /[؀-ۿ]/;

function reverseIfPersian(text: string): string {
  return HAS_PERSIAN_LETTER.test(text.replace(ARABIC_DIGITS, ""))
    ? [...text].reverse().join("")
    : text;
}

function toAsciiDigits(text: string): string {
  return text.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(
    /[۰-۹]/g,
    (d) => String(d.charCodeAt(0) - 0x06f0)
  );
}

// Lam ("ل") immediately followed by Alef ("ا") is a mandatory ligature in
// Arabic/Persian script, which poppler keeps in its fixed visual order even
// while reversing everything else — so a naive char-by-char reverse of a
// word containing a genuine ligature splits it apart (سلامت -> سالمت). This
// is only detectable per-word (the same raw "لا" substring also arises, by
// coincidence, from reversing an unrelated ا-ل pair, e.g. سال -> لاس), so
// fix it as a targeted dictionary correction on known affected words
// instead of a general (and therefore ambiguous) reversal rule.
const KNOWN_LIGATURE_FIXES: [RegExp, string][] = [
  [/سالمت/g, "سلامت"],
  [/اطالعات/g, "اطلاعات"],
  [/اطالع/g, "اطلاع"],
  [/اسالم/g, "اسلام"],
  [/الزم/g, "لازم"],
  [/اعالم/g, "اعلام"],
  [/انقالب/g, "انقلاب"],
  [/انتقاالت/g, "انتقالات"],
  [/االنبیاء/g, "الانبیاء"],
  [/ایالم/g, "ایلام"],
  [/گیالن/g, "گیلان"],
  [/هالل/g, "هلال"],
  [/کالس/g, "کلاس"],
  [/محالت/g, "محلات"],
  [/الرستان/g, "لارستان"],
  [/^المرد$/, "لامرد"],
  [/^الر$/, "لار"],
  [/^اله(?=\(|$)/, "الله"],
];

function fixKnownLigatureWords(text: string): string {
  return KNOWN_LIGATURE_FIXES.reduce((t, [pattern, fix]) => t.replace(pattern, fix), text);
}

// The PDF's font encodes Persian text with Arabic-presentation letterforms
// (ي, ك) rather than the Persian-standard ones (ی, ک) the rest of the app
// uses — normalize so stored text matches what a user actually types.
function normalizeArabicToPersian(text: string): string {
  return text.replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/ة/g, "ه");
}

// A trailing "." / "،" of a Persian word comes out of poppler's visual order as
// a LEADING one («.ناحيه»); move it back to the end where it logically is.
function fixLeadingPunctuation(text: string): string {
  const m = text.match(/^([.،؛:]+)([ء-ۓ][^\s]*)$/);
  return m ? m[2] + m[1] : text;
}

function cleanToken(raw: string): string {
  return fixLeadingPunctuation(fixKnownLigatureWords(
    normalizeArabicToPersian(
      toAsciiDigits(
        reverseIfPersian(
          raw
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
        )
      )
    )
  ));
}

// Codes are 5 digits; the main series is 316xx-340xx but some majors carry
// codes from other blocks (357xx, 366xx, 1xxxx, ...). This range is only used
// for the independent raw-text code scan, never for the extraction itself.
const RAW_CODE_RE = /(?<!\d)\d{5}(?!\d)/g;
const RAW_CODE_MIN = 10000;
const RAW_CODE_MAX = 99999;

// Independent of the bbox/line reconstruction: every 5-digit token that
// appears anywhere in the page's plain text. A «۵»-glyph digit makes the
// raw token non-ASCII, so normalize digits first.
function rawCodeSets(pdfPath: string, firstPage: number, lastPage: number): Set<string>[] {
  const text = execFileSync(
    "pdftotext",
    ["-f", String(firstPage), "-l", String(lastPage), "-raw", pdfPath, "-"],
    { maxBuffer: 1024 * 1024 * 64, stdio: ["ignore", "pipe", "ignore"] }
  ).toString("utf-8");
  return text
    .split("\f")
    .slice(0, lastPage - firstPage + 1)
    .map((pageText) => {
      const set = new Set<string>();
      for (const m of toAsciiDigits(pageText).matchAll(RAW_CODE_RE)) {
        const n = Number(m[0]);
        if (n >= RAW_CODE_MIN && n <= RAW_CODE_MAX) set.add(m[0]);
      }
      return set;
    });
}

// y positions of the table's horizontal rules (thin filled rectangles in the
// page's vector drawing). Row bands = the spans between consecutive rules; a
// row's own wrapped title/description lines always lie in its band, whatever
// the vertical alignment, which text positions alone can't tell.
function pageRules(pdfPath: string, page: number): { ys: number[]; xs: Map<number, number> } {
  const svg = execFileSync("pdftocairo", ["-svg", "-f", String(page), "-l", String(page), pdfPath, "-"], {
    maxBuffer: 1024 * 1024 * 256,
    stdio: ["ignore", "pipe", "ignore"],
  }).toString("utf-8");
  const body = svg.slice(Math.max(0, svg.indexOf("</defs>")));
  const ys: number[] = [];
  const xCount = new Map<number, number>(); // vertical rules: x (0.1pt) -> count
  for (const m of body.matchAll(/<path([^>]*?)\sd="([^"]*)"([^>]*)>/g)) {
    const attrs = m[1] + m[3];
    const d = m[2];
    if (attrs.includes("clip-rule") || attrs.includes('fill="none"') || /[CQ]/.test(d)) continue;
    const nums = (d.match(/-?\d+\.?\d*/g) ?? []).map(Number);
    if (nums.length < 8) continue;
    let xs = nums.filter((_, i) => i % 2 === 0);
    let yv = nums.filter((_, i) => i % 2 === 1);
    const tr = attrs.match(/transform="matrix\(([^)]*)\)"/);
    if (tr) {
      const [a, , , dd, e, f] = tr[1].split(",").map(Number);
      xs = xs.map((x) => a * x + e);
      yv = yv.map((y) => dd * y + f);
    }
    const w = Math.max(...xs) - Math.min(...xs);
    const h = Math.max(...yv) - Math.min(...yv);
    if (h < 1.5 && w > 15) ys.push(Math.min(...yv));
    if (w < 1.5 && h > 8) {
      const x = Math.round(Math.min(...xs) * 10) / 10;
      xCount.set(x, (xCount.get(x) ?? 0) + 1);
    }
  }
  const sorted = [...ys].sort((a, b) => a - b);
  const merged: number[] = [];
  for (const y of sorted) if (merged.length === 0 || y - merged[merged.length - 1] > 1.5) merged.push(y);
  return { ys: merged, xs: xCount };
}

function extractPageLines(pdfPath: string, firstPage: number, lastPage: number): PageLines[] {
  const xml = execFileSync(
    "pdftotext",
    ["-f", String(firstPage), "-l", String(lastPage), "-bbox", pdfPath, "-"],
    { maxBuffer: 1024 * 1024 * 64, stdio: ["ignore", "pipe", "ignore"] }
  ).toString("utf-8");
  const rawCodes = rawCodeSets(pdfPath, firstPage, lastPage);

  const pages: PageLines[] = [];
  const pageRe = /<page width="([\d.]+)" height="([\d.]+)">([\s\S]*?)<\/page>/g;
  const wordRe =
    /<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)<\/word>/g;

  let pageMatch: RegExpExecArray | null;
  while ((pageMatch = pageRe.exec(xml))) {
    const body = pageMatch[3];
    const words: Word[] = [];
    let wordMatch: RegExpExecArray | null;
    wordRe.lastIndex = 0;
    while ((wordMatch = wordRe.exec(body))) {
      words.push({
        x0: Number(wordMatch[1]),
        y0: Number(wordMatch[2]),
        x1: Number(wordMatch[3]),
        y1: Number(wordMatch[4]),
        text: cleanToken(wordMatch[5]),
      });
    }

    const sorted = [...words].sort((a, b) => a.y0 - b.y0);
    const lines: Word[][] = [];
    const TOLERANCE = 3.5;
    for (const w of sorted) {
      const cy = (w.y0 + w.y1) / 2;
      let line = lines.find((l) => {
        const lcy = (l[0].y0 + l[0].y1) / 2;
        return Math.abs(lcy - cy) <= TOLERANCE;
      });
      if (!line) {
        line = [];
        lines.push(line);
      }
      line.push(w);
    }
    for (const line of lines) line.sort((a, b) => b.x0 - a.x0);
    lines.sort((a, b) => a[0].y0 - b[0].y0);

    pages.push({
      height: Number(pageMatch[2]),
      rawCodes: rawCodes[pages.length] ?? new Set(),
      ...(() => {
        const r = pageRules(pdfPath, firstPage + pages.length);
        return { ruleYs: r.ys, ruleXs: r.xs };
      })(),
      lines: lines.map((ws) => ({
        y0: Math.min(...ws.map((w) => w.y0)),
        y1: Math.max(...ws.map((w) => w.y1)),
        words: ws,
      })),
    });
  }
  return pages;
}

export type ExtractedMajorRow = {
  page: number;
  province: string;
  university: string;
  admissionMode: string;
  studyPeriod: string;
  majorCode: string;
  title: string;
  description: string;
  aval: string;
  dom: string;
  zan: string;
  mard: string;
  // The 4 capacity cells as read (digits normalized), "45 | - | زن | مرد".
  rawCells: string;
  // Text of the "رشته محل های پذیرش نیم‌سال ..." heading in force for this row.
  sectionText: string;
  // 1406 when the row sits under the mehr-1406 section heading.
  sectionEntryYear: number | null;
  // 1406 when the description says «شروع تحصیل مهرماه 1406».
  descriptionEntryYear: number | null;
  splitMargin: number | null;
  // Commitment layout only: the section sub-heading in force («پذیرش از تمام
  // متقاضیان سراسر کشور، با اولویت ...» / «مخصوص متقاضیان بومی استان X») and
  // the verbatim text of the combined «دانشگاه محل تحصیل / توضیحات» cell.
  subheading: string;
  rawCellText: string;
  // Farhangian: «محل خدمت» (service place) as printed.
  serviceLocation: string;
  reasons: string[];
  needsReview: boolean;
};

export type ExtractionReport = {
  stoppedAt: { page: number; text: string } | null;
  // Codes found in a page's raw text but not extracted as a row.
  missingCodes: { page: number; code: string }[];
  // Lines of a page's body that no row claimed (text silently dropped).
  unownedLines: { page: number; text: string }[];
  // Free-standing note lines inside the table (own band, no data row).
  notes: { page: number; text: string; before: string }[];
  pageWarnings: { page: number; message: string }[];
};

const CODE_RE = /^\d{5}$/;

// Table geometry differs per booklet part. "regular" = phase 1 (university
// as a group header above its rows, separate study-period and description
// columns). "commitment" = تعهد خدمت / تعهد بومی: no study-period column, and
// the university name sits inside the description cell, below a
// sub-heading naming the native province.
export type LayoutName = "regular" | "commitment" | "farhangian" | "records" | "ministry";
type Layout = {
  name: LayoutName;
  codeX: { min: number; max: number };
  admissionModeMinX: number;
  titleMinX: number;
  cellColumnMinX: number[]; // aval, dom, zan, mard
  cellsMinX: number;
  hasStudyPeriod: boolean;
  extraHeaderWords: string[];
  stop: RegExp | null;
  // Sub-heading layouts (commitment, farhangian): sections open with a
  // «پذیرش از تمام ...» / «مخصوص متقاضیان بومی استان X» line instead of an
  // «استان X - دانشگاه Y» group heading.
  subheadings: boolean;
  // Farhangian: words whose centre is left of this x belong to «محل خدمت».
  serviceMaxCx?: number;
};
const LAYOUTS: Record<LayoutName, Layout> = {
  regular: {
    name: "regular",
    codeX: { min: 330, max: 410 },
    admissionModeMinX: 440,
    titleMinX: 262,
    cellColumnMinX: [240, 222, 203, 186],
    cellsMinX: 186,
    hasStudyPeriod: true,
    extraHeaderWords: [],
    // Past this heading the booklet switches to the service-commitment
    // majors, a later import phase that must never be extracted here.
    stop: /^رشته\s*محل.*تعهد\s*خدمت/,
    subheadings: false,
  },
  commitment: {
    name: "commitment",
    codeX: { min: 425, max: 470 },
    admissionModeMinX: 470,
    titleMinX: 332,
    // The right-aligned description column ends at x≈268, so its narrowest
    // words start as far right as ~260; capacity cells start at ≥263.
    cellColumnMinX: [318, 298, 278, 263],
    cellsMinX: 263,
    hasStudyPeriod: false,
    extraHeaderWords: ["دانشگاه", "علوم", "پزشکی", "تحصیل", "/"],
    // Page 172+: non-profit universities, a different layout.
    stop: /^رشته\s*محل.*(غیردولتی|غیرانتفاعی)/,
    subheadings: true,
  },
  // Farhangian (page 267+): محل خدمت | دانشگاه/پردیس محل تحصیل / دامنه پذیرش |
  // ظرفیت | جنس | عنوان رشته | کدرشته. Column rules (x): 509.5 | 480 | 387 |
  // 370 | 353 | 125 | 85. One capacity cell and one gender cell per row.
  farhangian: {
    name: "farhangian",
    codeX: { min: 478, max: 510 },
    admissionModeMinX: 10000,
    titleMinX: 386,
    // Wrapped cell text starts as far right as x≈352, gender words at ≥357.
    cellColumnMinX: [368, 10000, 354, 10000], // capacity -> aval, gender -> zan slot
    cellsMinX: 354,
    hasStudyPeriod: false,
    extraHeaderWords: ["دانشگاه", "يا", "یا", "پردیس", "محل", "تحصیل", "/", "دامنه", "خدمت", "کدرشته", "عنوان"],
    stop: null,
    subheadings: true,
    serviceMaxCx: 125,
  },
  // Ministry-of-Science universities and Azad units (phase 4, pages 173-254):
  // the phase-1 table (study-period column, per-row «نحوه پذیرش»), with column
  // positions read from each page's 10 vertical rules.
  ministry: {
    name: "ministry",
    codeX: { min: 330, max: 410 },
    admissionModeMinX: 440,
    titleMinX: 262,
    cellColumnMinX: [240, 222, 203, 186],
    cellsMinX: 186,
    hasStudyPeriod: true,
    extraHeaderWords: [],
    // Page 255+: quota sections for deprived / disaster areas.
    stop: /^رشته\s*محل.*سهمیه/,
    subheadings: false,
  },
  // Records-only institutions (page 446+): phase-1 table without the
  // study-period column. Rules (x): 509.5 | 448 | 415 | 313 | 275 | 237.
  records: {
    name: "records",
    codeX: { min: 413, max: 448 },
    admissionModeMinX: 448,
    titleMinX: 306,
    cellColumnMinX: [292, 274, 254, 236],
    cellsMinX: 236,
    hasStudyPeriod: false,
    extraHeaderWords: [],
    stop: null,
    subheadings: false,
  },
};
let L: Layout = LAYOUTS.regular;
const CELL_TOKEN_RE = /^(\d+|-|زن|مرد)$/;
const HEADER_WORDS = new Set([
  "ظرفیت",
  "کدرشته",
  "جنس",
  "پذیرش",
  "نحوه",
  "دوره",
  "تحصیلی",
  "عنوان",
  "رشته",
  "نیم",
  "سال",
  "توضیحات",
  "محل",
  "اول",
  "دوم",
  "زن",
  "مرد",
]);
const MEHR_1406_HEADING_RE = /^رشته\s*محل.*پذیرش.*مهرماه.*1406/;
// Any «رشته محل های ...» heading starts a new section and resets the entry year.
const SECTION_HEADING_RE = /^رشته\s*محل\s*های/;
// Commitment layout: the sub-heading above each group of rows.
const SUBHEADING_RE = /^(پذیرش\s+از\s+تمام\s+متقاضیان|مخصوص\s+متقاضیان)/;
// Footnotes that share the university heading's physical line.
const NOTE_INLINE_RE = /\s*\*?\s*(اسامی\s+چند\s+برابر|باتوجه\s+به\s+تفاوت)/;
const DESC_MEHR_1406_RE = /شروع\s*تحصیل\s*مهرماه\s*1406/;

function lineText(line: Line): string {
  return line.words.map((w) => w.text).join(" ");
}

function isSectionHeader(line: Line): boolean {
  const text = lineText(line).replace(/^ادامه\s*/, "");
  if (L.subheadings) return SUBHEADING_RE.test(text);
  if (L.name === "records") {
    // «استان X - موسسه ...», «دانشگاه آزاد اسلامی استان X - واحد Y»,
    // «دانشگاه پیام نور استان X - مرکز/واحد Y»: a far-right heading.
    return (
      line.words[0].x0 > 250 &&
      /^(استان\s.+?\s-\s|دانشگاه\s+(آزاد\s+اسلامی|پیام\s+نور)\s+استان\s.+?\s-\s)/.test(text)
    );
  }
  // The university heading starts at the far-right margin; a description
  // line that merely begins with «استان X - ...» sits in the left columns.
  return line.words[0].x0 > 300 && text.startsWith("استان ") && text.includes(" - ");
}

function isDataLine(line: Line): boolean {
  return line.words.some(
    (w) => CODE_RE.test(w.text) && w.x0 >= L.codeX.min && w.x0 <= L.codeX.max
  );
}

function isColumnHeaderLine(line: Line): boolean {
  // The main column-header line can carry split-glyph words («مح ل»), so
  // recognise it by its fixed opening and closing labels as well.
  if (/^نحوه\s+پذیرش\s+.*توضیحات$/.test(lineText(line))) return true;
  return line.words.every((w) => HEADER_WORDS.has(w.text) || L.extraHeaderWords.includes(w.text));
}

function endsColumnHeader(line: Line): boolean {
  // Farhangian's column header has no «اول دوم زن مرد» row; it ends with a
  // lone «محل» line (the second half of «کدرشته محل»).
  if (L.name === "farhangian") return lineText(line) === "محل";
  const set = new Set(line.words.map((w) => w.text));
  return ["اول", "دوم", "زن", "مرد"].every((t) => set.has(t));
}

function parseSectionHeader(line: Line): { province: string; university: string } {
  const full = lineText(line).replace(/^ادامه\s*/, "");
  // Azad / Payam-Noor headings carry the province INSIDE the heading.
  const inner = full.match(/^دانشگاه\s+(?:آزاد\s+اسلامی|پیام\s+نور)\s+استان\s+(.+?)\s+-\s+/);
  if (inner) return { province: inner[1].trim(), university: full.trim() };
  const text = full.replace(/^استان\s+/, "");
  // Split at the FIRST " - " only: the university part can itself contain
  // one (e.g. "... هرمزگان - بندرعباس").
  const idx = text.indexOf(" - ");
  return {
    province: text.slice(0, idx).trim(),
    university: text.slice(idx + 3).trim(),
  };
}

type ParsedData = {
  majorCode: string;
  admissionMode: string;
  studyPeriod: string;
  title: string;
  // [aval, dom, zan, mard] by column position; "" where the cell is blank.
  cells: string[];
  inlineDescription: string;
  serviceWords: string[];
};

// Column geometry (x of a word's left edge, PDF points). The booklet is a
// fixed-width table: title | ظرفیت اول | دوم | زن | مرد | توضیحات.
// (see LAYOUTS above for the per-layout x thresholds)
function cellColumn(w: Word): number {
  for (let c = 0; c < L.cellColumnMinX.length; c++) if (w.x0 >= L.cellColumnMinX[c]) return c;
  return -1;
}

type Zone = "mode" | "service" | "title" | "cell" | "desc" | "stray";
function zoneOf(w: Word): Zone {
  if (w.x0 >= L.admissionModeMinX) return "mode";
  if (L.serviceMaxCx !== undefined && (w.x0 + w.x1) / 2 < L.serviceMaxCx) return "service";
  if (w.x0 >= L.titleMinX) return "title";
  // A cell word can arrive split into glyph fragments («ز» «ن»); those are
  // re-joined per column, so short Persian fragments count as cell words too.
  if (w.x0 >= L.cellsMinX) return CELL_TOKEN_RE.test(w.text) || /^[ء-ۓ]{1,2}$/.test(w.text) ? "cell" : "stray";
  return "desc";
}

function parseDataLine(line: Line): ParsedData | null {
  const idx = line.words.findIndex(
    (w) => CODE_RE.test(w.text) && w.x0 >= L.codeX.min && w.x0 <= L.codeX.max
  );
  if (idx === -1) return null;
  const majorCode = line.words[idx].text;

  const before = line.words.slice(0, idx);
  const admissionMode = before
    .filter((w) => w.x0 >= L.admissionModeMinX)
    .map((w) => w.text)
    .join(" ");
  const studyPeriod = before
    .filter((w) => w.x0 < L.admissionModeMinX && L.hasStudyPeriod)
    .map((w) => w.text)
    .join(" ");

  const after = line.words.slice(idx + 1);
  const cells = ["", "", "", ""];
  const titleWords: string[] = [];
  const descWords: string[] = [];
  const serviceWords: string[] = [];
  for (const w of after) {
    const zone = zoneOf(w);
    if (zone === "service") serviceWords.push(w.text);
    else if (zone === "title") titleWords.push(w.text);
    else if (zone === "cell") {
      const c = cellColumn(w);
      cells[c] = cells[c] + w.text; // fragments of one cell join without a space
    } else descWords.push(w.text); // desc, or a stray word: kept, never dropped
  }

  return {
    majorCode,
    admissionMode,
    studyPeriod,
    title: titleWords.join(" "),
    cells,
    inlineDescription: descWords.join(" "),
    serviceWords,
  };
}

// Whitespace gap between two vertically-adjacent lines.
const gapBetween = (upper: Line, lower: Line) => lower.y0 - upper.y1;

// A run of non-data lines sitting between two data rows: split it at the
// largest vertical gap (a row's own lines are packed tighter than the white
// space between rows). Returns how many of the run's lines go to the upper
// row, and how decisive the split was (best gap minus runner-up).
function splitRun(prev: Line, run: Line[], next: Line): { toPrev: number; margin: number } {
  const seq = [prev, ...run, next];
  const gaps = seq.slice(0, -1).map((l, i) => gapBetween(l, seq[i + 1]));
  let best = 0;
  gaps.forEach((g, i) => {
    if (g > gaps[best]) best = i;
  });
  const others = gaps.filter((_, i) => i !== best);
  return { toPrev: best, margin: gaps[best] - Math.max(...others) };
}

// «دانشگاه علوم پزشکی ... (محل تحصیل ...) - داراي تعهد خدمت ...»: the
// university is the text up to the first " - " outside parentheses. Anything
// before the university name (e.g. «شروع تحصیل مهرماه 1406 - ») stays in the
// description, in its original order.
function splitUniversityCell(text: string): { university: string; description: string; separated: boolean } {
  const start = text.search(/(دانشگاه|دانشکده|مؤسسه|موسسه)/);
  if (start === -1) return { university: "", description: text, separated: false };
  const prefix = text.slice(0, start).replace(/[\s-]+$/, "").trim();
  const rest = text.slice(start);
  // The university name can itself contain " - " («... هرمزگان - بندرعباس»),
  // so first split before the standard «داراي تعهد خدمت ...» phrase.
  const commit = rest.search(/(?:\s+-)?\s+(?:دارای|داراي)\s+تعهد/);
  if (commit > 0) {
    return {
      university: rest.slice(0, commit).trim(),
      description: [prefix, rest.slice(commit).replace(/^\s*-\s*/, "").trim()].filter(Boolean).join(" - "),
      separated: true,
    };
  }
  let depth = 0;
  let cut = -1;
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === "(") depth++;
    else if (rest[i] === ")") depth = Math.max(0, depth - 1);
    else if (depth === 0 && rest.startsWith(" - ", i)) {
      cut = i;
      break;
    }
  }
  if (cut === -1) {
    // Some cells run the name straight into the description («... اهواز دارای
    // تعهد خدمت ...»): split before the first commitment phrase.
    const m = rest.match(/\s+(?=(?:دارای|داراي)\s+تعهد|تعهد\s+خدمت)/);
    if (m?.index !== undefined) {
      return {
        university: rest.slice(0, m.index).trim(),
        description: [prefix, rest.slice(m.index).trim()].filter(Boolean).join(" - "),
        separated: true,
      };
    }
    return { university: rest.trim(), description: prefix, separated: false };
  }
  return {
    university: rest.slice(0, cut).trim(),
    description: [prefix, rest.slice(cut + 3).trim()].filter(Boolean).join(" - "),
    separated: true,
  };
}

// Native province named by a sub-heading: a quoted «استان X» (the
// Sistan-Baluchestan special areas list «... » و بعد « استان X » و در آخر
// « سایر استان ها »), else the «بومی استان X» phrase up to any «با اولویت».
function provinceFromSubheading(text: string): string {
  const quoted = text.match(/«\s*استان\s+([^«»]+?)\s*»/);
  if (quoted) return quoted[1].trim();
  const plain = text.match(/بومی\s+استان\s+(.+?)(?:\s+با\s+(?:ترتیب\s+)?اولویت.*)?$/);
  return plain?.[1]?.trim() ?? "";
}

// Records pages: the column positions shift between institution kinds
// (e.g. Payam-Noor tables sit ~10pt further right), so read them from the
// page's vertical rules: 9 rules = mode | code | title | aval | dom | zan |
// mard | description. Returns null if the page doesn't show exactly 9.
function columnRules(xs: Map<number, number>): number[] {
  // Rule x positions drift by ~0.1-0.3pt between rows: cluster, then keep the
  // clusters present on a good share of the rows (full-height column rules).
  const clusters: { x: number; n: number }[] = [];
  for (const [x, n] of [...xs.entries()].sort((a, b) => b[0] - a[0])) {
    const last = clusters[clusters.length - 1];
    if (last && last.x - x <= 1.2) last.n += n;
    else clusters.push({ x, n });
  }
  const max = Math.max(0, ...clusters.map((c) => c.n));
  return clusters.filter((c) => c.n >= max * 0.4).map((c) => c.x);
}

function recordsGeometry(xs: Map<number, number>): Partial<Layout> | null {
  const merged = columnRules(xs);
  if (merged.length !== 9) return null;
  const [, m1, m2, m3, m4, m5, m6, m7] = merged;
  return {
    admissionModeMinX: m1,
    codeX: { min: m2, max: m1 },
    titleMinX: m3,
    cellColumnMinX: [m4, m5, m6, m7],
    cellsMinX: m7,
  };
}

// 10 rules = mode | period | code | title | aval | dom | zan | mard | desc.
function ministryGeometry(xs: Map<number, number>): Partial<Layout> | null {
  const merged = columnRules(xs);
  if (merged.length !== 10) return null;
  const [, m1, m2, m3, m4, m5, m6, m7, m8] = merged;
  return {
    admissionModeMinX: m1,
    codeX: { min: m3, max: m2 },
    titleMinX: m4,
    cellColumnMinX: [m5, m6, m7, m8],
    cellsMinX: m8,
  };
}

export function extractMajorRows(
  pdfPath: string,
  firstPage: number,
  lastPage: number,
  layout: LayoutName = "regular"
): { rows: ExtractedMajorRow[]; report: ExtractionReport } {
  L = LAYOUTS[layout];
  const pages = extractPageLines(pdfPath, firstPage, lastPage);
  const rows: ExtractedMajorRow[] = [];
  const report: ExtractionReport = {
    stoppedAt: null,
    missingCodes: [],
    unownedLines: [],
    notes: [],
    pageWarnings: [],
  };

  let province = "";
  let university = "";
  let sectionText = "";
  let sectionEntryYear: number | null = null;
  let subheading = "";
  const pendingHeaderNotes: string[] = [];

  outer: for (let pageOffset = 0; pageOffset < pages.length; pageOffset++) {
    const pageNumber = firstPage + pageOffset;
    const page = pages[pageOffset];
    let lines = page.lines;
    if (layout === "records" || layout === "ministry") {
      const geom = layout === "records" ? recordsGeometry(page.ruleXs) : ministryGeometry(page.ruleXs);
      L = { ...LAYOUTS[layout], ...(geom ?? {}) };
      if (!geom) report.pageWarnings.push({ page: pageNumber, message: `column rules not found (${layout === "records" ? 9 : 10} expected); default ${layout} geometry used` });
    }

    // Stop cleanly at the first heading of a later part of the booklet.
    const stopIdx = L.stop ? lines.findIndex((l) => L.stop!.test(lineText(l))) : -1;
    if (stopIdx !== -1) {
      report.stoppedAt = { page: pageNumber, text: lineText(lines[stopIdx]) };
      lines = lines.slice(0, stopIdx);
    }

    const pageRowStart = rows.length;
    const warn = (message: string) => report.pageWarnings.push({ page: pageNumber, message });

    // --- classify lines -------------------------------------------------
    type Kind = "skip" | "header" | "data" | "candidate";
    const kinds: Kind[] = lines.map(() => "candidate");
    const headerExtra = new Map<number, string>(); // header idx -> continuation text
    const sectionHeadingAt = new Map<number, string>(); // line idx -> heading text

    const firstHeader = lines.findIndex(isSectionHeader);
    const firstData = lines.findIndex(isDataLine);
    const preambleEnd = Math.min(
      firstHeader === -1 ? lines.length : firstHeader,
      firstData === -1 ? lines.length : firstData
    );
    for (let i = 0; i < preambleEnd; i++) {
      kinds[i] = "skip";
      const t = lineText(lines[i]);
      if (SECTION_HEADING_RE.test(t)) sectionHeadingAt.set(i, t);
    }
    if (firstHeader === -1) warn("no university header on page");
    else if (firstData !== -1 && firstData < firstHeader) warn("data row above first header");

    for (let i = 0; i < lines.length; i++) {
      if (isDataLine(lines[i])) kinds[i] = "data";
    }
    // Footer: a bare page number at the bottom.
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].y0 > page.height - 100 && lines[i].words.every((w) => /^\d+$/.test(w.text))) {
        kinds[i] = "skip";
      }
    }
    for (let i = 0; i < lines.length; i++) {
      if (!isSectionHeader(lines[i])) continue;
      kinds[i] = "header";
      // Column-header block: runs through the first line holding
      // «اول دوم زن مرد». Anything in it that isn't pure column-header
      // words is a wrapped continuation of the university name.
      let end = -1;
      for (let k = i + 1; k < Math.min(lines.length, i + 9); k++) {
        if (isDataLine(lines[k]) || isSectionHeader(lines[k])) break;
        if (endsColumnHeader(lines[k])) {
          end = k;
          break;
        }
      }
      if (end === -1) {
        // Mid-page headers are followed directly by data rows (the column
        // header is only printed at the top of a page) — that's normal.
        if (!lines.slice(i + 1, i + 10).some(isDataLine)) {
          warn(`header at y=${Math.round(lines[i].y0)} has no data row below it`);
        }
        continue;
      }
      const extra: string[] = [];
      for (let k = i + 1; k <= end; k++) {
        kinds[k] = "skip";
        if (!isColumnHeaderLine(lines[k])) extra.push(lineText(lines[k]));
      }
      if (extra.length) headerExtra.set(i, extra.join(" "));
    }

    // --- own the candidate lines ---------------------------------------
    const rules = page.ruleYs;
    const bandOf = (l: Line) => {
      const cy = (l.y0 + l.y1) / 2;
      let b = 0;
      while (b < rules.length && rules[b] <= cy) b++;
      return b;
    };
    const bandData = new Map<number, number[]>();
    for (let i = 0; i < lines.length; i++) {
      if (kinds[i] !== "data") continue;
      const b = bandOf(lines[i]);
      bandData.set(b, [...(bandData.get(b) ?? []), i]);
    }
    if (rules.length < 3) warn(`only ${rules.length} table rules found; using gap heuristic`);
    type Owned = { before: Line[]; after: Line[]; ambiguous: boolean; margin: number };
    const owned = new Map<number, Owned>();
    for (let i = 0; i < lines.length; i++) if (kinds[i] === "data") owned.set(i, { before: [], after: [], ambiguous: false, margin: Infinity });

    const headerBands = new Map<number, number>(); // band -> header line idx
    for (let i = 0; i < lines.length; i++) if (kinds[i] === "header") headerBands.set(bandOf(lines[i]), i);
    const noteLinesAfterHeader = new Map<number, Line[]>(); // header idx -> other lines in its band
    const noteBefore = new Map<number, string[]>(); // data idx -> note texts directly above it

    type Cls = { kind: "owner"; idx: number } | { kind: "header"; idx: number } | { kind: "note" } | { kind: "multi" };
    const classify = (i: number): Cls => {
      const b = bandOf(lines[i]);
      const dataIdxs = bandData.get(b) ?? [];
      if (rules.length < 3) return { kind: "multi" };
      if (dataIdxs.length === 1) return { kind: "owner", idx: dataIdxs[0] };
      if (dataIdxs.length === 0 && headerBands.has(b)) return { kind: "header", idx: headerBands.get(b)! };
      if (dataIdxs.length === 0) return { kind: "note" };
      return { kind: "multi" };
    };

    for (let i = 0; i < lines.length; i++) {
      if (kinds[i] !== "candidate") continue;
      const cls = classify(i);
      if (cls.kind === "owner") {
        const o = owned.get(cls.idx)!;
        (i < cls.idx ? o.before : o.after).push(lines[i]);
        continue;
      }
      if (cls.kind === "header") {
        noteLinesAfterHeader.set(cls.idx, [...(noteLinesAfterHeader.get(cls.idx) ?? []), lines[i]]);
        continue;
      }
      if (cls.kind === "note") {
        const t = lineText(lines[i]);
        let j = i + 1;
        while (j < lines.length && kinds[j] !== "data") j++;
        const below = j < lines.length ? lineText(lines[j]) : "";
        report.notes.push({ page: pageNumber, text: t, before: below.slice(0, 40) });
        if (j < lines.length) noteBefore.set(j, [...(noteBefore.get(j) ?? []), t]);
        continue;
      }
      // "multi": more than one data row shares the band (or no rules at all):
      // fall back to splitting the run of such lines at the largest gap.
      let runEnd = i;
      while (runEnd + 1 < lines.length && kinds[runEnd + 1] === "candidate" && classify(runEnd + 1).kind === "multi") runEnd++;
      const run = lines.slice(i, runEnd + 1);
      const prevIdx = i - 1 >= 0 && kinds[i - 1] === "data" ? i - 1 : -1;
      const nextIdx = runEnd + 1 < lines.length && kinds[runEnd + 1] === "data" ? runEnd + 1 : -1;

      if (prevIdx !== -1 && nextIdx !== -1) {
        const { toPrev, margin } = splitRun(lines[prevIdx], run, lines[nextIdx]);
        const ambiguous = true; // band lookup failed, so the gap split is only a guess
        const p = owned.get(prevIdx)!;
        const n = owned.get(nextIdx)!;
        p.after.push(...run.slice(0, toPrev));
        n.before.push(...run.slice(toPrev));
        p.margin = Math.min(p.margin, margin);
        n.margin = Math.min(n.margin, margin);
        if (ambiguous) {
          p.ambiguous = true;
          n.ambiguous = true;
        }
      } else if (prevIdx !== -1) {
        owned.get(prevIdx)!.after.push(...run);
        owned.get(prevIdx)!.ambiguous = true;
      } else if (nextIdx !== -1) {
        owned.get(nextIdx)!.before.push(...run);
        owned.get(nextIdx)!.ambiguous = true;
      } else {
        for (const l of run) report.unownedLines.push({ page: pageNumber, text: lineText(l) });
      }
      i = runEnd;
    }

    // --- emit rows ------------------------------------------------------
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (sectionHeadingAt.has(i)) {
        sectionText = sectionHeadingAt.get(i)!;
        sectionEntryYear = MEHR_1406_HEADING_RE.test(sectionText) ? 1406 : null;
      }
      if (kinds[i] === "header" && L.subheadings) {
        // Sub-heading (possibly wrapped): verbatim text + the province it names.
        subheading = [lineText(line), headerExtra.get(i), ...(noteLinesAfterHeader.get(i) ?? []).map(lineText)]
          .filter(Boolean)
          .join(" ")
          .replace(/^ادامه\s+/, "")
          .replace(/\s+/g, " ")
          .trim();
        province = provinceFromSubheading(subheading);
        continue;
      }
      if (kinds[i] === "header") {
        const parsed = parseSectionHeader(line);
        province = parsed.province;
        university = [parsed.university, headerExtra.get(i)].filter(Boolean).join(" ");
        // The heading text can carry an inline footnote.
        const inlineNote = university.match(NOTE_INLINE_RE);
        const noteTexts: string[] = [];
        if (inlineNote?.index !== undefined) {
          noteTexts.push(university.slice(inlineNote.index).replace(/^\s*\*\s*/, ""));
          university = university.slice(0, inlineNote.index).trim();
        }
        // Other lines in the heading's band: the heading is centred, so a
        // wrapped name continues on one shorter centred line right under a
        // full-width first line; every other line is a free-standing note.
        // Only the first extra line can be a continuation of the name.
        const extras = noteLinesAfterHeader.get(i) ?? [];
        extras.forEach((l, k) => {
          const wrapped = Math.min(...line.words.map((w) => w.x0)) <= 140;
          if (k === 0 && wrapped && l.words[0].x0 < 450) university = `${university} ${lineText(l)}`;
          else noteTexts.push(lineText(l));
        });
        for (const t of noteTexts) {
          report.notes.push({ page: pageNumber, text: t, before: `${province} - ${university}`.slice(0, 60) });
          pendingHeaderNotes.push(t);
        }
        continue;
      }
      if (kinds[i] !== "data") continue;

      const parsed = parseDataLine(line);
      if (!parsed) continue;
      const own = owned.get(i)!;
      const reasons: string[] = [];
      const strayWords: string[] = [];
      const modeParts: { y: number; text: string }[] = [];
      const serviceParts: { y: number; text: string }[] = [];

      // A physical line can split in two when the capacity glyphs ("-", digits)
      // sit ~1pt off the text baseline; their cell tokens then land on a
      // wrap line of the same band and must be folded back into the cells.
      function splitWrapLine(wrapLine: Line): { titlePart: string; descPart: string } {
        const titleWords: string[] = [];
        const descWords: string[] = [];
        for (const w of wrapLine.words) {
          const zone = zoneOf(w);
          if (zone === "mode") modeParts.push({ y: wrapLine.y0, text: w.text });
          else if (zone === "service") serviceParts.push({ y: wrapLine.y0, text: w.text });
          else if (zone === "title") titleWords.push(w.text);
          else if (zone === "desc") descWords.push(w.text);
          else if (zone === "cell") {
            const c = cellColumn(w);
            if (!parsed!.cells[c]) parsed!.cells[c] = w.text;
            else if (parsed!.cells[c] !== w.text) strayWords.push(w.text);
          } else strayWords.push(w.text);
        }
        return { titlePart: titleWords.join(" "), descPart: descWords.join(" ") };
      }

      const beforeSplit = own.before.map(splitWrapLine);
      const afterSplit = own.after.map(splitWrapLine);

      const title = [
        ...beforeSplit.map((s) => s.titlePart),
        parsed.title,
        ...afterSplit.map((s) => s.titlePart),
      ]
        .filter(Boolean)
        .join(" ")
        .trim();

      const description = [
        ...beforeSplit.map((s) => s.descPart),
        parsed.inlineDescription,
        ...afterSplit.map((s) => s.descPart),
      ]
        .filter(Boolean)
        .join(" ")
        .trim();

      if (own.ambiguous) reasons.push("خطوط توضیحات با ردیف‌بندی جدول تطبیق نکرد");
      if (strayWords.length > 0) reasons.push(`کلمه‌ی ناهمخوان در ستون ظرفیت: ${strayWords.join(" ")}`);
      if (noteBefore.has(i) || pendingHeaderNotes.length > 0) {
        reasons.push("یادداشت مستقل جدول بالای این ردیف (برگه گزارش)");
        pendingHeaderNotes.length = 0;
      }
      if (parsed.cells.every((c) => !c)) reasons.push("سلول‌های ظرفیت یافت نشد");
      for (const c of parsed.cells) if (c && !CELL_TOKEN_RE.test(c)) reasons.push(`مقدار سلول ظرفیت نامعتبر: ${c}`);
      if (!title) reasons.push("عنوان خالی");
      const yJitter = Math.max(...line.words.map((w) => w.y0)) - Math.min(...line.words.map((w) => w.y0));
      if (yJitter > 2.5) reasons.push("ناهمترازی عمودی کلمات خط");

      let rowUniversity = university;
      let rowDescription = description;
      const rawCellText = description;
      if (L.name === "commitment") {
        const split = splitUniversityCell(description);
        rowUniversity = split.university;
        rowDescription = split.description;
        if (!split.university) reasons.push("نام دانشگاه در ستون توضیحات یافت نشد");
        else if (!split.separated) reasons.push("جداکننده « - » بین نام دانشگاه و توضیحات یافت نشد");
        if (!subheading) reasons.push("عنوان بخش (استان بومی) یافت نشد");
        else if (!province) reasons.push("استان از عنوان بخش استخراج نشد");
      }

      let serviceLocation = "";
      if (L.name === "farhangian") {
        // «<campus>/<دامنه پذیرش>»: the university is the text before the
        // first "/" (it can be glued to the next word: «تهران /اولویت»).
        const slash = description.indexOf("/");
        rowUniversity = (slash === -1 ? description : description.slice(0, slash)).trim();
        rowDescription = slash === -1 ? "" : description.slice(slash + 1).trim();
        if (slash === -1) reasons.push("جداکننده «/» بین دانشگاه و دامنه پذیرش یافت نشد");
        else if (description.indexOf("/", slash + 1) !== -1) reasons.push("بیش از یک «/» در ستون دانشگاه / دامنه پذیرش");
        serviceLocation = [...serviceParts, { y: line.y0, text: parsed.serviceWords.join(" ") }]
          .filter((m) => m.text)
          .sort((a, b) => a.y - b.y)
          .map((m) => m.text)
          .join(" ");
        if (!serviceLocation) reasons.push("محل خدمت یافت نشد");
        if (!subheading) reasons.push("عنوان بخش (استان بومی) یافت نشد");
        else if (!province) reasons.push("استان از عنوان بخش استخراج نشد");
      }

      const descriptionEntryYear = DESC_MEHR_1406_RE.test(rowDescription) ? 1406 : null;

      rows.push({
        page: pageNumber,
        province,
        university: rowUniversity,
        admissionMode: [...modeParts, { y: line.y0, text: parsed.admissionMode }]
          .filter((m) => m.text)
          .sort((a, b) => a.y - b.y)
          .map((m) => m.text)
          .join(" "),
        studyPeriod: parsed.studyPeriod,
        majorCode: parsed.majorCode,
        title,
        description: rowDescription,
        aval: parsed.cells[0],
        dom: parsed.cells[1],
        zan: parsed.cells[2],
        mard: parsed.cells[3],
        rawCells: parsed.cells.join(" | "),
        sectionText,
        sectionEntryYear,
        descriptionEntryYear,
        splitMargin: Number.isFinite(own.margin) ? Math.round(own.margin * 10) / 10 : null,
        subheading,
        rawCellText,
        serviceLocation,
        reasons,
        needsReview: false,
      });
    }

    // Independent check: every code seen in the page's raw text must have
    // produced a row; flag the neighbours of a missing one.
    const pageRows = rows.slice(pageRowStart);
    const got = new Set(pageRows.map((r) => r.majorCode));
    for (const code of [...page.rawCodes].sort()) {
      if (got.has(code)) continue;
      report.missingCodes.push({ page: pageNumber, code });
    }
    for (const r of pageRows) {
      if (!page.rawCodes.has(r.majorCode)) r.reasons.push("کد در متن خام صفحه یافت نشد");
    }

    if (report.stoppedAt) break outer;
  }

  for (const r of rows) r.needsReview = r.reasons.length > 0;
  return { rows, report };
}

if (require.main === module) {
  const [, , pdfPath, firstPageArg, lastPageArg, layoutArg] = process.argv;
  const first = Number(firstPageArg ?? 1);
  const last = Number(lastPageArg ?? first);
  const { rows, report } = extractMajorRows(pdfPath, first, last, (layoutArg as LayoutName) ?? "regular");
  console.log(JSON.stringify({ rows, report }, null, 2));
  console.error(`\n${rows.length} data rows extracted.`);
}
