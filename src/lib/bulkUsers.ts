import ExcelJS from "exceljs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { Role } from "@/generated/prisma/client";

export type BulkRowError = { row: number; message: string };

export type ParsedUserRow = {
  row: number;
  name: string;
  email: string;
  password: string;
  role: Role;
};

const ROLE_VALUE_MAP: Record<string, Role> = {
  ADMIN: Role.ADMIN,
  "ادمین": Role.ADMIN,
  SUPERVISOR: Role.SUPERVISOR,
  "ناظر": Role.SUPERVISOR,
  MENTOR: Role.MENTOR,
  "منتور": Role.MENTOR,
  STUDENT: Role.STUDENT,
  "دانش‌آموز": Role.STUDENT,
  "دانش آموز": Role.STUDENT,
};

function normalizeRole(raw: string): Role | null {
  const key = raw.trim();
  return ROLE_VALUE_MAP[key] ?? ROLE_VALUE_MAP[key.toUpperCase()] ?? null;
}

const rowSchema = z.object({
  name: z.string().min(2, "نام باید حداقل ۲ حرف باشد."),
  email: z.string().email("ایمیل معتبر نیست."),
  password: z.string().min(6, "رمز عبور باید حداقل ۶ کاراکتر باشد."),
});

const HEADER_ALIASES = {
  name: ["نام و نام خانوادگی"],
  email: ["ایمیل"],
  password: ["رمز عبور"],
  role: ["نقش"],
} as const;

type ColumnKey = keyof typeof HEADER_ALIASES;

// Excel auto-converts things like typed email addresses into hyperlink
// objects, and formula cells expose their value as { formula, result }, so a
// plain String(cell.value) would stringify those as "[object Object]".
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

export async function parseUsersWorkbook(
  buffer: Buffer
): Promise<{ rows: ParsedUserRow[]; errors: BulkRowError[] }> {
  const workbook = new ExcelJS.Workbook();
  // exceljs's ambient `Buffer` type declaration (index.d.ts) conflicts with
  // Node's own Buffer type, so a real Buffer never structurally matches it.
  await workbook.xlsx.load(buffer as never);
  const sheet = workbook.worksheets[0];

  if (!sheet) {
    return { rows: [], errors: [{ row: 0, message: "فایل اکسل خالی است." }] };
  }

  const columnIndex: Record<ColumnKey, number> = {
    name: 0,
    email: 0,
    password: 0,
    role: 0,
  };

  sheet.getRow(1).eachCell((cell, colNumber) => {
    const text = cellToText(cell.value);
    for (const key of Object.keys(HEADER_ALIASES) as ColumnKey[]) {
      if ((HEADER_ALIASES[key] as readonly string[]).includes(text)) {
        columnIndex[key] = colNumber;
      }
    }
  });

  const missingColumns = (Object.keys(columnIndex) as ColumnKey[]).filter(
    (key) => columnIndex[key] === 0
  );
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

  const rows: ParsedUserRow[] = [];
  const errors: BulkRowError[] = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const cellText = (col: number) => cellToText(row.getCell(col).value);
    const name = cellText(columnIndex.name);
    const email = cellText(columnIndex.email);
    const password = cellText(columnIndex.password);
    const roleRaw = cellText(columnIndex.role);

    if (!name && !email && !password && !roleRaw) return;

    const parsed = rowSchema.safeParse({ name, email, password });
    if (!parsed.success) {
      errors.push({
        row: rowNumber,
        message: parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است.",
      });
      return;
    }

    const role = normalizeRole(roleRaw);
    if (!role) {
      errors.push({
        row: rowNumber,
        message: `نقش «${roleRaw}» نامعتبر است. مقادیر مجاز: دانش‌آموز، منتور، ناظر، ادمین.`,
      });
      return;
    }

    rows.push({ row: rowNumber, ...parsed.data, role });
  });

  return { rows, errors };
}

export async function createUsersFromRows(
  rows: ParsedUserRow[]
): Promise<{ created: number; errors: BulkRowError[] }> {
  const errors: BulkRowError[] = [];

  const seenEmails = new Map<string, number>();
  const deduped: ParsedUserRow[] = [];
  for (const row of rows) {
    const key = row.email.toLowerCase();
    const firstRow = seenEmails.get(key);
    if (firstRow) {
      errors.push({
        row: row.row,
        message: `ایمیل تکراری در فایل (مشابه سطر ${firstRow}).`,
      });
      continue;
    }
    seenEmails.set(key, row.row);
    deduped.push(row);
  }

  if (deduped.length === 0) {
    return { created: 0, errors };
  }

  const existing = await prisma.user.findMany({
    where: { email: { in: deduped.map((row) => row.email) } },
    select: { email: true },
  });
  const existingEmails = new Set(existing.map((u) => u.email.toLowerCase()));

  const toCreate = deduped.filter((row) => {
    if (existingEmails.has(row.email.toLowerCase())) {
      errors.push({
        row: row.row,
        message: "کاربری با این ایمیل قبلاً ثبت شده است.",
      });
      return false;
    }
    return true;
  });

  if (toCreate.length === 0) {
    return { created: 0, errors };
  }

  const data = await Promise.all(
    toCreate.map(async (row) => ({
      name: row.name,
      email: row.email,
      passwordHash: await hashPassword(row.password),
      role: row.role,
    }))
  );

  const result = await prisma.user.createMany({ data });

  return { created: result.count, errors };
}
