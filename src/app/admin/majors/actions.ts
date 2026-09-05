"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/session";
import { Role } from "@/generated/prisma/client";
import {
  parseMajorsWorkbook,
  createMajorsFromRows,
  type BulkRowError,
} from "@/lib/bulkMajors";

const DEFAULT_EXAM_YEAR = 1404;

export type BulkCreateMajorsResult = {
  error?: string;
  successCount?: number;
  rowErrors?: BulkRowError[];
};

export async function bulkCreateMajorsAction(
  _prev: BulkCreateMajorsResult,
  formData: FormData
): Promise<BulkCreateMajorsResult> {
  await requireRole(Role.ADMIN);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "فایلی انتخاب نشده است." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let parsed;
  try {
    parsed = await parseMajorsWorkbook(buffer, DEFAULT_EXAM_YEAR);
  } catch {
    return { error: "فایل اکسل قابل خواندن نیست. لطفاً فرمت فایل را بررسی کنید." };
  }

  const { created, errors: createErrors } = await createMajorsFromRows(parsed.rows);
  const rowErrors = [...parsed.errors, ...createErrors].sort((a, b) => a.row - b.row);

  revalidatePath("/admin/majors");

  if (created === 0 && rowErrors.length > 0) {
    return { error: "هیچ رشته‌ای ایجاد نشد.", rowErrors };
  }

  return {
    successCount: created,
    rowErrors: rowErrors.length > 0 ? rowErrors : undefined,
  };
}
