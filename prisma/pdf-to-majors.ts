import { execFileSync } from "node:child_process";

type Word = { x0: number; x1: number; y0: number; y1: number; text: string };
type Line = { y0: number; y1: number; words: Word[] };
type PageLines = { lines: Line[] };

// Poppler reverses each Persian/Arabic-script run to visual order, but a
// word glued to a paren/quote (e.g. an opening "(" before a university's
// location qualifier) comes out as one token mixing script and punctuation
// — reverse it too, since it's still visually-ordered as a whole.
const HAS_PERSIAN = /[؀-ۿ]/;

function reverseIfPersian(text: string): string {
  return HAS_PERSIAN.test(text) ? [...text].reverse().join("") : text;
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

function extractPageLines(pdfPath: string, firstPage: number, lastPage: number): PageLines[] {
  const xml = execFileSync(
    "pdftotext",
    ["-f", String(firstPage), "-l", String(lastPage), "-bbox", pdfPath, "-"],
    { maxBuffer: 1024 * 1024 * 64 }
  ).toString("utf-8");

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
      const text = fixKnownLigatureWords(
        normalizeArabicToPersian(
          reverseIfPersian(
            wordMatch[5]
              .replace(/&amp;/g, "&")
              .replace(/&lt;/g, "<")
              .replace(/&gt;/g, ">")
              .replace(/&quot;/g, '"')
              .replace(/&#39;/g, "'")
          )
        )
      );
      words.push({
        x0: Number(wordMatch[1]),
        y0: Number(wordMatch[2]),
        x1: Number(wordMatch[3]),
        y1: Number(wordMatch[4]),
        text,
      });
    }

    const sorted = [...words].sort((a, b) => a.y0 - b.y0);
    const lines: Word[][] = [];
    const TOLERANCE = 4;
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
      lines: lines.map((words) => ({
        y0: Math.min(...words.map((w) => w.y0)),
        y1: Math.max(...words.map((w) => w.y1)),
        words,
      })),
    });
  }
  return pages;
}

export type ExtractedMajorRow = {
  page: number;
  province: string;
  university: string;
  studyPeriod: string;
  majorCode: string;
  title: string;
  description: string;
  aval: string;
  dom: string;
  zan: string;
  mard: string;
  needsReview: boolean;
};

const MAJOR_CODE_RE = /^\d{5}$/;
const CELL_TOKEN_RE = /^(\d+|-|زن|مرد)$/;
const HEADER_LINE_MARKERS = [
  "یادآوری",
  "متقاضیان",
  "ظرفیت",
  "جنس",
  "نحوه",
  "توضیحات",
  "عنوان رشته",
  "کدرشته",
];

function lineText(line: Line): string {
  return line.words.map((w) => w.text).join(" ");
}

function isSectionHeader(line: Line): boolean {
  const text = lineText(line);
  return text.includes("استان") && text.includes("دانشگاه");
}

function isDataLine(line: Line): boolean {
  return line.words.some((w) => MAJOR_CODE_RE.test(w.text));
}

function isHeaderOrBoilerplate(line: Line): boolean {
  const text = lineText(line);
  if (/^\d+\s*-\s*/.test(text)) return true; // numbered notes "1 - ..."
  if (text.includes("سراسری سال") && text.includes("دفترچه راهنمای")) return true;
  if (HEADER_LINE_MARKERS.some((marker) => text.includes(marker))) return true;
  // The repeated column sub-header line: "محل اول دوم زن مرد" — every word
  // is itself a cell-token, "اول"/"دوم", or the standalone word "محل".
  const words = line.words.map((w) => w.text);
  if (words.every((w) => CELL_TOKEN_RE.test(w) || w === "محل" || w === "اول" || w === "دوم"))
    return true;
  return false;
}

function parseSectionHeader(line: Line): { province: string; university: string } {
  const text = lineText(line).replace(/^ادامه\s*/, "");
  const [province, university] = text.split(" - ").map((s) => s.trim());
  return { province: province ?? "", university: university ?? text };
}

function parseDataLine(line: Line): {
  majorCode: string;
  studyPeriod: string;
  title: string;
  cells: string[];
  inlineDescription: string;
  // x-range spanned by the term/gender cell block, used to split wrapped
  // title/description continuation lines (which share this row's y-band)
  // into their title half (x to the right of the cells) and description
  // half (x to the left of them).
  cellsX: { min: number; max: number } | null;
} | null {
  const idx = line.words.findIndex((w) => MAJOR_CODE_RE.test(w.text));
  if (idx === -1) return null;
  const majorCode = line.words[idx].text;

  const before = line.words.slice(0, idx).map((w) => w.text);
  const studyPeriod = before[0] === "با" ? before.slice(2).join(" ") : before.join(" ");

  const after = line.words.slice(idx + 1);
  let titleEnd = 0;
  while (titleEnd < after.length && !CELL_TOKEN_RE.test(after[titleEnd].text)) titleEnd++;
  const title = after
    .slice(0, titleEnd)
    .map((w) => w.text)
    .join(" ");

  let cellEnd = titleEnd;
  while (
    cellEnd < after.length &&
    cellEnd - titleEnd < 4 &&
    CELL_TOKEN_RE.test(after[cellEnd].text)
  ) {
    cellEnd++;
  }
  const cellWords = after.slice(titleEnd, cellEnd);
  const cells = cellWords.map((w) => w.text);
  const inlineDescription = after
    .slice(cellEnd)
    .map((w) => w.text)
    .join(" ");
  const cellsX =
    cellWords.length > 0
      ? {
          min: Math.min(...cellWords.map((w) => w.x0)),
          max: Math.max(...cellWords.map((w) => w.x1)),
        }
      : null;

  return { majorCode, studyPeriod, title, cells, inlineDescription, cellsX };
}

// A line is a "boundary" if it is not itself candidate description text:
// a data row, a section header, or boilerplate/footer text.
function isBoundary(line: Line): boolean {
  return isDataLine(line) || isSectionHeader(line) || isHeaderOrBoilerplate(line);
}

export function extractMajorRows(pdfPath: string, firstPage: number, lastPage: number) {
  const pages = extractPageLines(pdfPath, firstPage, lastPage);
  const rows: ExtractedMajorRow[] = [];

  let province = "";
  let university = "";

  pages.forEach((page, pageOffset) => {
    const pageNumber = firstPage + pageOffset;
    const lines = page.lines;

    // Assign each maximal run of description-candidate lines to whichever
    // flanking data-line it is more tightly packed against (smallest, or
    // most negative/overlapping, vertical gap) — i.e. the row the run's
    // text visually hugs, not just literal reading order.
    const ownedBy = new Map<number, number>(); // description-line index -> owning data-line index
    for (let i = 0; i < lines.length; i++) {
      if (isBoundary(lines[i])) continue;
      let runEnd = i;
      while (runEnd + 1 < lines.length && !isBoundary(lines[runEnd + 1])) runEnd++;

      const beforeIdx = (() => {
        for (let k = i - 1; k >= 0; k--) {
          if (isDataLine(lines[k])) return k;
          if (isBoundary(lines[k])) return -1; // section header / boilerplate first
        }
        return -1;
      })();
      const afterIdx = (() => {
        for (let k = runEnd + 1; k < lines.length; k++) {
          if (isDataLine(lines[k])) return k;
          if (isBoundary(lines[k])) return -1;
        }
        return -1;
      })();

      let owner = -1;
      if (beforeIdx !== -1 && afterIdx === -1) owner = beforeIdx;
      else if (beforeIdx === -1 && afterIdx !== -1) owner = afterIdx;
      else if (beforeIdx !== -1 && afterIdx !== -1) {
        const gapToBefore = lines[i].y0 - lines[beforeIdx].y1;
        const gapToAfter = lines[afterIdx].y0 - lines[runEnd].y1;
        owner = gapToBefore <= gapToAfter ? beforeIdx : afterIdx;
      }

      if (owner !== -1) for (let k = i; k <= runEnd; k++) ownedBy.set(k, owner);
      i = runEnd;
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (isSectionHeader(line)) {
        const parsed = parseSectionHeader(line);
        province = parsed.province;
        university = parsed.university;
        continue;
      }
      if (!isDataLine(line)) continue;

      const parsed = parseDataLine(line);
      if (!parsed) continue;

      // A wrapped continuation line shares this row's y-band but spans two
      // *columns*: title (to the right of the cell block) and description
      // (to its left). Split each owned continuation line by x accordingly.
      function splitWrapLine(wrapLine: Line): { titlePart: string; descPart: string } {
        if (!parsed || !parsed.cellsX) return { titlePart: "", descPart: lineText(wrapLine) };
        const titleWords = wrapLine.words.filter((w) => w.x0 > parsed.cellsX!.max);
        const descWords = wrapLine.words.filter((w) => w.x1 < parsed.cellsX!.min);
        return {
          titlePart: titleWords.map((w) => w.text).join(" "),
          descPart: descWords.map((w) => w.text).join(" "),
        };
      }

      const beforeSplit = [...ownedBy.entries()]
        .filter(([descIdx, ownerIdx]) => ownerIdx === i && descIdx < i)
        .sort((a, b) => a[0] - b[0])
        .map(([descIdx]) => splitWrapLine(lines[descIdx]));
      const afterSplit = [...ownedBy.entries()]
        .filter(([descIdx, ownerIdx]) => ownerIdx === i && descIdx > i)
        .sort((a, b) => a[0] - b[0])
        .map(([descIdx]) => splitWrapLine(lines[descIdx]));

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

      rows.push({
        page: pageNumber,
        province,
        university,
        studyPeriod: parsed.studyPeriod,
        majorCode: parsed.majorCode,
        title,
        description,
        aval: parsed.cells[0] ?? "-",
        dom: parsed.cells[1] ?? "-",
        zan: parsed.cells[2] ?? "-",
        mard: parsed.cells[3] ?? "-",
        needsReview: beforeSplit.length > 0 || afterSplit.length > 0,
      });
    }
  });

  return rows;
}

if (require.main === module) {
  const [, , pdfPath, firstPageArg, lastPageArg] = process.argv;
  const first = Number(firstPageArg ?? 1);
  const last = Number(lastPageArg ?? first);
  const rows = extractMajorRows(pdfPath, first, last);
  console.log(JSON.stringify(rows, null, 2));
  console.error(`\n${rows.length} data rows extracted.`);
}
