import ExcelJS from "exceljs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Gender, TermType } from "@/generated/prisma/client";

export type BulkRowError = { row: number; message: string };

export type ParsedMajorRow = {
  row: number;
  examYear: number;
  fieldGroup: string;
  province: string;
  university: string;
  studyPeriod: string;
  majorCode: string;
  title: string;
  capacity: number | null;
  termType: TermType;
  gender: Gender;
  description: string | null;
};

const GENDER_VALUE_MAP: Record<string, Gender> = {
  FEMALE: Gender.FEMALE,
  "زن": Gender.FEMALE,
  MALE: Gender.MALE,
  "مرد": Gender.MALE,
  BOTH: Gender.BOTH,
  "هردو": Gender.BOTH,
  "مختلط": Gender.BOTH,
};

const TERM_VALUE_MAP: Record<string, TermType> = {
  FIRST_TERM: TermType.FIRST_TERM,
  "اول": TermType.FIRST_TERM,
  "نیمسال اول": TermType.FIRST_TERM,
  SECOND_TERM: TermType.SECOND_TERM,
  "دوم": TermType.SECOND_TERM,
  "نیمسال دوم": TermType.SECOND_TERM,
  UNSPECIFIED: TermType.UNSPECIFIED,
  "نامشخص": TermType.UNSPECIFIED,
};

function normalizeGender(raw: string): Gender | null {
  if (!raw) return Gender.BOTH;
  const key = raw.trim();
  return GENDER_VALUE_MAP[key] ?? GENDER_VALUE_MAP[key.toUpperCase()] ?? null;
}

function normalizeTermType(raw: string): TermType | null {
  if (!raw) return TermType.UNSPECIFIED;
  const key = raw.trim();
  return TERM_VALUE_MAP[key] ?? TERM_VALUE_MAP[key.toUpperCase()] ?? null;
}

const rowSchema = z.object({
  fieldGroup: z.string().min(1, "گروه آزمایشی نمی‌تواند خالی باشد."),
  province: z.string().min(1, "استان نمی‌تواند خالی باشد."),
  university: z.string().min(1, "دانشگاه نمی‌تواند خالی باشد."),
  studyPeriod: z.string().min(1, "دوره تحصیلی نمی‌تواند خالی باشد."),
  majorCode: z.string().min(1, "کدرشته‌محل نمی‌تواند خالی باشد."),
  title: z.string().min(1, "عنوان رشته نمی‌تواند خالی باشد."),
});

const HEADER_ALIASES = {
  examYear: ["سال کنکور"],
  fieldGroup: ["گروه آزمایشی"],
  province: ["استان"],
  university: ["دانشگاه"],
  studyPeriod: ["دوره تحصیلی"],
  majorCode: ["کدرشته محل", "کدرشته‌محل"],
  title: ["عنوان رشته"],
  capacity: ["ظرفیت"],
  termType: ["نیمسال"],
  gender: ["جنسیت"],
  description: ["توضیحات"],
} as const;

type ColumnKey = keyof typeof HEADER_ALIASES;
const REQUIRED_COLUMNS: ColumnKey[] = [
  "fieldGroup",
  "province",
  "university",
  "studyPeriod",
  "majorCode",
  "title",
];

// Excel auto-converts things like hyperlinks/rich text, and formula cells
// expose their value as { formula, result }, so a plain String(cell.value)
// would stringify those as "[object Object]".
function cellToText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join("").trim();
    }
    if ("text" in value && typeof value.text === "string") {
      return value.text.trim();
    }
    if ("result" in value) {
      return cellToText(value.result as ExcelJS.CellValue);
    }
    return "";
  }
  return String(value).trim();
}

export async function parseMajorsWorkbook(
  buffer: Buffer,
  defaultExamYear: number
): Promise<{ rows: ParsedMajorRow[]; errors: BulkRowError[] }> {
  const workbook = new ExcelJS.Workbook();
  // exceljs's ambient `Buffer` type declaration (index.d.ts) conflicts with
  // Node's own Buffer type, so a real Buffer never structurally matches it.
  await workbook.xlsx.load(buffer as never);
  const sheet = workbook.worksheets[0];

  if (!sheet) {
    return { rows: [], errors: [{ row: 0, message: "فایل اکسل خالی است." }] };
  }

  const columnIndex: Record<ColumnKey, number> = {
    examYear: 0,
    fieldGroup: 0,
    province: 0,
    university: 0,
    studyPeriod: 0,
    majorCode: 0,
    title: 0,
    capacity: 0,
    termType: 0,
    gender: 0,
    description: 0,
  };

  sheet.getRow(1).eachCell((cell, colNumber) => {
    const text = cellToText(cell.value);
    for (const key of Object.keys(HEADER_ALIASES) as ColumnKey[]) {
      if ((HEADER_ALIASES[key] as readonly string[]).includes(text)) {
        columnIndex[key] = colNumber;
      }
    }
  });

  const missingColumns = REQUIRED_COLUMNS.filter((key) => columnIndex[key] === 0);
  if (missingColumns.length > 0) {
    return {
      rows: [],
      errors: [
        {
          row: 1,
          message: `ستون‌های مورد نیاز در سطر اول یافت نشد: ${missingColumns
            .map((key) => HEADER_ALIASES[key][0])
            .join("، ")}`,
        },
      ],
    };
  }

  const rows: ParsedMajorRow[] = [];
  const errors: BulkRowError[] = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const cellText = (key: ColumnKey) =>
      columnIndex[key] ? cellToText(row.getCell(columnIndex[key]).value) : "";

    const fieldGroup = cellText("fieldGroup");
    const province = cellText("province");
    const university = cellText("university");
    const studyPeriod = cellText("studyPeriod");
    const majorCode = cellText("majorCode");
    const title = cellText("title");
    const capacityRaw = cellText("capacity");
    const termRaw = cellText("termType");
    const genderRaw = cellText("gender");
    const descriptionRaw = cellText("description");
    const examYearRaw = cellText("examYear");

    if (!fieldGroup && !province && !university && !majorCode && !title) return;

    const parsed = rowSchema.safeParse({
      fieldGroup,
      province,
      university,
      studyPeriod,
      majorCode,
      title,
    });
    if (!parsed.success) {
      errors.push({
        row: rowNumber,
        message: parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است.",
      });
      return;
    }

    const gender = normalizeGender(genderRaw);
    if (!gender) {
      errors.push({
        row: rowNumber,
        message: `جنسیت «${genderRaw}» نامعتبر است. مقادیر مجاز: زن، مرد، هردو.`,
      });
      return;
    }

    const termType = normalizeTermType(termRaw);
    if (!termType) {
      errors.push({
        row: rowNumber,
        message: `نیمسال «${termRaw}» نامعتبر است. مقادیر مجاز: اول، دوم، نامشخص.`,
      });
      return;
    }

    let capacity: number | null = null;
    if (capacityRaw) {
      const n = Number(capacityRaw);
      if (!Number.isFinite(n) || n < 0) {
        errors.push({ row: rowNumber, message: `ظرفیت «${capacityRaw}» نامعتبر است.` });
        return;
      }
      capacity = Math.trunc(n);
    }

    let examYear = defaultExamYear;
    if (examYearRaw) {
      const n = Number(examYearRaw);
      if (!Number.isInteger(n)) {
        errors.push({ row: rowNumber, message: `سال کنکور «${examYearRaw}» نامعتبر است.` });
        return;
      }
      examYear = n;
    }

    rows.push({
      row: rowNumber,
      examYear,
      ...parsed.data,
      capacity,
      termType,
      gender,
      description: descriptionRaw || null,
    });
  });

  return { rows, errors };
}

export async function createMajorsFromRows(
  rows: ParsedMajorRow[]
): Promise<{ created: number; updated: number; errors: BulkRowError[] }> {
  const errors: BulkRowError[] = [];

  const seenKeys = new Map<string, number>();
  const deduped: ParsedMajorRow[] = [];
  for (const row of rows) {
    const key = `${row.examYear}|${row.majorCode}|${row.gender}|${row.termType}`;
    const firstRow = seenKeys.get(key);
    if (firstRow) {
      errors.push({
        row: row.row,
        message: `ردیف تکراری در فایل (مشابه سطر ${firstRow} — همان کدرشته‌محل/جنسیت/نیمسال).`,
      });
      continue;
    }
    seenKeys.set(key, row.row);
    deduped.push(row);
  }

  if (deduped.length === 0) {
    return { created: 0, updated: 0, errors };
  }

  const examYears = [...new Set(deduped.map((r) => r.examYear))];
  const existing = await prisma.major.findMany({
    where: { examYear: { in: examYears } },
    select: { examYear: true, majorCode: true, gender: true, termType: true },
  });
  const existingKeys = new Set(
    existing.map((m) => `${m.examYear}|${m.majorCode}|${m.gender}|${m.termType}`)
  );

  let created = 0;
  let updated = 0;

  // Upsert row-by-row (rather than createMany) so a re-upload of a
  // corrected file overwrites the previously-imported data for the same
  // majorCode/gender/termType instead of being skipped as a duplicate.
  for (const row of deduped) {
    const key = `${row.examYear}|${row.majorCode}|${row.gender}|${row.termType}`;
    const data = {
      fieldGroup: row.fieldGroup,
      province: row.province,
      university: row.university,
      studyPeriod: row.studyPeriod,
      title: row.title,
      capacity: row.capacity,
      description: row.description,
    };
    await prisma.major.upsert({
      where: {
        examYear_majorCode_gender_termType: {
          examYear: row.examYear,
          majorCode: row.majorCode,
          gender: row.gender,
          termType: row.termType,
        },
      },
      create: {
        examYear: row.examYear,
        majorCode: row.majorCode,
        gender: row.gender,
        termType: row.termType,
        ...data,
      },
      update: data,
    });
    if (existingKeys.has(key)) updated += 1;
    else created += 1;
  }

  return { created, updated, errors };
}
