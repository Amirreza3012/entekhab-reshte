import ExcelJS from "exceljs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { AdmissionMethod, AdmissionType, Gender, Prisma, TermType } from "@/generated/prisma/client";

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
  // undefined = the file has no «سال ورود» column (leave stored value alone);
  // null = column present but empty (regular entry).
  entryYear?: number | null;
  // undefined = no «نوع پذیرش» column (leave the stored value alone);
  // an empty cell means REGULAR.
  admissionType?: AdmissionType;
  admissionMethod?: AdmissionMethod;
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

// Persian labels (incl. spelling variants) and the enum names themselves.
const ADMISSION_TYPE_VALUE_MAP: Record<string, AdmissionType> = {
  REGULAR: AdmissionType.REGULAR,
  "عادی": AdmissionType.REGULAR,
  SERVICE_COMMITMENT: AdmissionType.SERVICE_COMMITMENT,
  "تعهد خدمت": AdmissionType.SERVICE_COMMITMENT,
  NATIVE_COMMITMENT: AdmissionType.NATIVE_COMMITMENT,
  "تعهد بومی استان": AdmissionType.NATIVE_COMMITMENT,
  "تعهد بومی": AdmissionType.NATIVE_COMMITMENT,
  FARHANGIAN: AdmissionType.FARHANGIAN,
  "فرهنگیان": AdmissionType.FARHANGIAN,
};

// Collapse spacing/ZWNJ, strip Arabic diacritics («صرفاً» -> «صرفا») and
// normalise ي/ك before the lookup.
function normalizeAdmissionType(raw: string): AdmissionType | null {
  if (!raw) return AdmissionType.REGULAR;
  const key = raw
    .replace(/[ً-ٟ]/g, "")
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\s‌_]+/g, " ")
    .trim();
  return ADMISSION_TYPE_VALUE_MAP[key] ?? ADMISSION_TYPE_VALUE_MAP[key.toUpperCase().replace(/ /g, "_")] ?? null;
}

const ADMISSION_METHOD_VALUE_MAP: Record<string, AdmissionMethod> = {
  WITH_EXAM: AdmissionMethod.WITH_EXAM,
  "با آزمون": AdmissionMethod.WITH_EXAM,
  RECORDS_ONLY: AdmissionMethod.RECORDS_ONLY,
  "صرفا با سوابق تحصیلی": AdmissionMethod.RECORDS_ONLY,
  "صرفا با سوابق": AdmissionMethod.RECORDS_ONLY,
};

function normalizeAdmissionMethod(raw: string): AdmissionMethod | null {
  if (!raw) return AdmissionMethod.WITH_EXAM;
  const key = raw
    .replace(/[ً-ٟ]/g, "")
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\s‌_]+/g, " ")
    .trim();
  return ADMISSION_METHOD_VALUE_MAP[key] ?? ADMISSION_METHOD_VALUE_MAP[key.toUpperCase().replace(/ /g, "_")] ?? null;
}

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
  entryYear: ["سال ورود"],
  admissionType: ["نوع پذیرش"],
  admissionMethod: ["نحوه پذیرش"],
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
    entryYear: 0,
    admissionType: 0,
    admissionMethod: 0,
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
    const entryYearRaw = cellText("entryYear");
    const admissionTypeRaw = cellText("admissionType");
    const admissionMethodRaw = cellText("admissionMethod");

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

    let entryYear: number | null | undefined = undefined;
    if (columnIndex.entryYear) {
      entryYear = null;
      if (entryYearRaw) {
        const n = Number(entryYearRaw);
        if (!Number.isInteger(n) || n < 1300 || n > 1600) {
          errors.push({ row: rowNumber, message: `سال ورود «${entryYearRaw}» نامعتبر است.` });
          return;
        }
        entryYear = n;
      }
    }

    let admissionType: AdmissionType | undefined = undefined;
    if (columnIndex.admissionType) {
      const parsedType = normalizeAdmissionType(admissionTypeRaw);
      if (!parsedType) {
        errors.push({
          row: rowNumber,
          message: `نوع پذیرش «${admissionTypeRaw}» نامعتبر است. مقادیر مجاز: عادی، تعهد خدمت، تعهد بومی استان، فرهنگیان.`,
        });
        return;
      }
      admissionType = parsedType;
    }

    let admissionMethod: AdmissionMethod | undefined = undefined;
    if (columnIndex.admissionMethod) {
      const parsedMethod = normalizeAdmissionMethod(admissionMethodRaw);
      if (!parsedMethod) {
        errors.push({
          row: rowNumber,
          message: `نحوه پذیرش «${admissionMethodRaw}» نامعتبر است. مقادیر مجاز: با آزمون، صرفا با سوابق تحصیلی.`,
        });
        return;
      }
      admissionMethod = parsedMethod;
    }

    rows.push({
      row: rowNumber,
      examYear,
      ...parsed.data,
      capacity,
      termType,
      gender,
      description: descriptionRaw || null,
      entryYear,
      admissionType,
      admissionMethod,
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
    select: { id: true, examYear: true, majorCode: true, gender: true, termType: true },
  });
  const existingIdByKey = new Map(
    existing.map((m) => [`${m.examYear}|${m.majorCode}|${m.gender}|${m.termType}`, m.id])
  );

  const rowData = (row: ParsedMajorRow) => ({
    fieldGroup: row.fieldGroup,
    province: row.province,
    university: row.university,
    studyPeriod: row.studyPeriod,
    title: row.title,
    capacity: row.capacity,
    description: row.description,
    // Omitted (not nulled) when the file has no «سال ورود» column.
    ...(row.entryYear !== undefined ? { entryYear: row.entryYear } : {}),
    ...(row.admissionType !== undefined ? { admissionType: row.admissionType } : {}),
    ...(row.admissionMethod !== undefined ? { admissionMethod: row.admissionMethod } : {}),
  });
  const rowKey = (row: ParsedMajorRow) => ({
    examYear: row.examYear,
    majorCode: row.majorCode,
    gender: row.gender,
    termType: row.termType,
  });

  const toCreate: ParsedMajorRow[] = [];
  const toUpdate: { id: string; row: ParsedMajorRow }[] = [];
  for (const row of deduped) {
    const id = existingIdByKey.get(`${row.examYear}|${row.majorCode}|${row.gender}|${row.termType}`);
    if (id) toUpdate.push({ id, row });
    else toCreate.push(row);
  }

  // A re-upload of a corrected file still overwrites the stored data for the
  // same examYear/majorCode/gender/termType (rows that exist are updated, not
  // skipped). New rows go in with createMany and existing ones are updated in
  // chunked transactions — thousands of single upserts take minutes.
  const CREATE_CHUNK = 1000;
  for (let i = 0; i < toCreate.length; i += CREATE_CHUNK) {
    const chunk = toCreate.slice(i, i + CREATE_CHUNK);
    try {
      await prisma.major.createMany({ data: chunk.map((row) => ({ ...rowKey(row), ...rowData(row) })) });
    } catch {
      // A concurrent upload inserted some of these keys first: fall back to
      // per-row upserts for this chunk so none is lost or duplicated.
      for (const row of chunk) {
        await prisma.major.upsert({
          where: { examYear_majorCode_gender_termType: rowKey(row) },
          create: { ...rowKey(row), ...rowData(row) },
          update: rowData(row),
        });
      }
    }
  }

  // Existing rows: one set-based UPDATE ... FROM unnest(...) per chunk instead
  // of one statement per row. Optional columns (entry year / admission type /
  // method) are only written when the file has that column, like rowData().
  const UPDATE_CHUNK = 500;
  for (let i = 0; i < toUpdate.length; i += UPDATE_CHUNK) {
    const chunk = toUpdate.slice(i, i + UPDATE_CHUNK);
    const first = chunk[0].row;
    const cols: { name: string; type: string; cast?: string; values: (string | number | null)[] }[] = [
      { name: "fieldGroup", type: "text", values: chunk.map((c) => c.row.fieldGroup) },
      { name: "province", type: "text", values: chunk.map((c) => c.row.province) },
      { name: "university", type: "text", values: chunk.map((c) => c.row.university) },
      { name: "studyPeriod", type: "text", values: chunk.map((c) => c.row.studyPeriod) },
      { name: "title", type: "text", values: chunk.map((c) => c.row.title) },
      { name: "capacity", type: "int", values: chunk.map((c) => c.row.capacity) },
      { name: "description", type: "text", values: chunk.map((c) => c.row.description) },
    ];
    if (first.entryYear !== undefined) {
      cols.push({ name: "entryYear", type: "int", values: chunk.map((c) => c.row.entryYear ?? null) });
    }
    if (first.admissionType !== undefined) {
      cols.push({ name: "admissionType", type: "text", cast: '"AdmissionType"', values: chunk.map((c) => c.row.admissionType ?? null) });
    }
    if (first.admissionMethod !== undefined) {
      cols.push({ name: "admissionMethod", type: "text", cast: '"AdmissionMethod"', values: chunk.map((c) => c.row.admissionMethod ?? null) });
    }

    const ident = (name: string) => Prisma.raw(`"${name}"`);
    const setSql = Prisma.join(
      cols.map((c) =>
        Prisma.sql`${ident(c.name)} = v.${ident(c.name)}${c.cast ? Prisma.raw(`::${c.cast}`) : Prisma.empty}`
      )
    );
    const arraysSql = Prisma.join([
      Prisma.sql`${chunk.map((c) => c.id)}::text[]`,
      ...cols.map((c) => Prisma.sql`${c.values}::${Prisma.raw(c.type === "int" ? "integer" : "text")}[]`),
    ]);
    const aliasSql = Prisma.join([Prisma.raw('"id"'), ...cols.map((c) => ident(c.name))]);

    await prisma.$executeRaw`
      UPDATE "Major" AS m
      SET ${setSql}, "updatedAt" = (NOW() AT TIME ZONE 'UTC')
      FROM unnest(${arraysSql}) AS v(${aliasSql})
      WHERE m."id" = v."id"
    `;
  }

  return { created: toCreate.length, updated: toUpdate.length, errors };
}
