"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/session";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  AdmissionMethod,
  AdmissionType,
  Gender,
  Prisma,
  Role,
  TermType,
} from "@/generated/prisma/client";
import {
  parseMajorsWorkbook,
  createMajorsFromRows,
  type BulkRowError,
} from "@/lib/bulkMajors";

const DEFAULT_EXAM_YEAR = 1404;

export type BulkCreateMajorsResult = {
  error?: string;
  successCount?: number;
  updatedCount?: number;
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

  const { created, updated, errors: createErrors } = await createMajorsFromRows(
    parsed.rows
  );
  const rowErrors = [...parsed.errors, ...createErrors].sort((a, b) => a.row - b.row);

  revalidatePath("/admin/majors");

  if (created === 0 && updated === 0 && rowErrors.length > 0) {
    return { error: "هیچ رشته‌ای ایجاد یا به‌روزرسانی نشد.", rowErrors };
  }

  return {
    successCount: created,
    updatedCount: updated,
    rowErrors: rowErrors.length > 0 ? rowErrors : undefined,
  };
}

const optionalInt = (min: number, max: number, label: string) =>
  z
    .union([z.string(), z.number(), z.null()])
    .transform((v) => (v === null || String(v).trim() === "" ? null : Number(v)))
    .refine((v) => v === null || (Number.isInteger(v) && v >= min && v <= max), {
      message: `${label} نامعتبر است.`,
    });

const updateMajorSchema = z.object({
  id: z.string().min(1),
  fieldGroup: z.string().trim().min(1, "گروه رشته نمی‌تواند خالی باشد."),
  province: z.string().trim().min(1, "استان نمی‌تواند خالی باشد."),
  university: z.string().trim().min(1, "دانشگاه نمی‌تواند خالی باشد."),
  studyPeriod: z.string().trim().min(1, "دوره تحصیلی نمی‌تواند خالی باشد."),
  majorCode: z.string().trim().min(1, "کدرشته‌محل نمی‌تواند خالی باشد."),
  title: z.string().trim().min(1, "عنوان رشته نمی‌تواند خالی باشد."),
  capacity: optionalInt(0, 100000, "ظرفیت"),
  termType: z.enum(TermType),
  gender: z.enum(Gender),
  description: z
    .string()
    .nullable()
    .transform((v) => (v && v.trim() ? v.trim() : null)),
  entryYear: optionalInt(1300, 1600, "سال ورود"),
  admissionType: z.enum(AdmissionType),
  admissionMethod: z.enum(AdmissionMethod),
});

export type UpdateMajorInput = z.input<typeof updateMajorSchema>;

// Inline edit from the admin table (the booklet can be amended after release).
export async function updateMajorAction(
  input: UpdateMajorInput
): Promise<{ error?: string }> {
  await requireRole(Role.ADMIN);

  const parsed = updateMajorSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است." };
  }
  const { id, ...data } = parsed.data;

  try {
    await prisma.major.update({ where: { id }, data });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return {
          error:
            "رشته‌ای با همین کدرشته‌محل، جنسیت و نیمسال در همین سال کنکور از قبل وجود دارد.",
        };
      }
      if (error.code === "P2025") return { error: "این رشته دیگر وجود ندارد." };
    }
    return { error: "ذخیره‌ی تغییرات انجام نشد." };
  }

  revalidatePath("/admin/majors");
  return {};
}
