"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { Role } from "@/generated/prisma/client";
import {
  moveChoice,
  removeChoice,
  reorderAllChoices,
  ChoiceError,
} from "@/lib/choices";
import {
  parseUsersWorkbook,
  createUsersFromRows,
  type BulkRowError,
} from "@/lib/bulkUsers";

export type ActionResult = { error?: string; success?: string };

const createUserSchema = z.object({
  name: z.string().min(2, "نام باید حداقل ۲ حرف باشد."),
  email: z.string().email("ایمیل معتبر نیست."),
  password: z.string().min(6, "رمز عبور باید حداقل ۶ کاراکتر باشد."),
  role: z.enum(["ADMIN", "SUPERVISOR", "MENTOR", "STUDENT"]),
});

export async function createUserAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireRole(Role.ADMIN);

  const parsed = createUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است." };
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (existing) {
    return { error: "کاربری با این ایمیل قبلاً ثبت شده است." };
  }

  const passwordHash = await hashPassword(parsed.data.password);

  await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      role: parsed.data.role as Role,
    },
  });

  revalidatePath("/admin/users");
  return { success: "کاربر با موفقیت ایجاد شد." };
}

const updateUserSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(2, "نام باید حداقل ۲ حرف باشد."),
  email: z.string().email("ایمیل معتبر نیست."),
  role: z.enum(["ADMIN", "SUPERVISOR", "MENTOR", "STUDENT"]),
});

export async function updateUserAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireRole(Role.ADMIN);

  const parsed = updateUserSchema.safeParse({
    userId: formData.get("userId"),
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است." };
  }

  const rawPassword = String(formData.get("password") ?? "").trim();
  if (rawPassword && rawPassword.length < 6) {
    return { error: "رمز عبور جدید باید حداقل ۶ کاراکتر باشد." };
  }

  const { userId, name, email, role } = parsed.data;

  const emailOwner = await prisma.user.findUnique({ where: { email } });
  if (emailOwner && emailOwner.id !== userId) {
    return { error: "کاربر دیگری با این ایمیل ثبت شده است." };
  }

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) {
    return { error: "کاربر یافت نشد." };
  }

  await prisma.$transaction(async (tx) => {
    if (target.role === Role.MENTOR && role !== "MENTOR") {
      await tx.user.updateMany({
        where: { mentorId: userId },
        data: { mentorId: null },
      });
    }

    await tx.user.update({
      where: { id: userId },
      data: {
        name,
        email,
        role: role as Role,
        ...(rawPassword ? { passwordHash: await hashPassword(rawPassword) } : {}),
      },
    });
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  return { success: "تغییرات با موفقیت ذخیره شد." };
}

export async function deleteUserAction(formData: FormData) {
  const admin = await requireRole(Role.ADMIN);

  const userId = String(formData.get("userId") ?? "");
  if (!userId || userId === admin.id) return;

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return;

  if (target.role === Role.ADMIN) {
    const adminCount = await prisma.user.count({ where: { role: Role.ADMIN } });
    if (adminCount <= 1) return;
  }

  await prisma.user.delete({ where: { id: userId } });

  revalidatePath("/admin/users");
  revalidatePath("/admin");
}

const ACTIVITY_VIEWER_ROLES = [Role.ADMIN, Role.SUPERVISOR];

function revalidateActivityPaths(studentId: string) {
  revalidatePath(`/admin/activity/${studentId}`);
  revalidatePath(`/supervisor/${studentId}`);
}

export async function moveChoiceForAdminAction(formData: FormData) {
  const actor = await requireRole(ACTIVITY_VIEWER_ROLES);
  const choiceId = String(formData.get("choiceId") ?? "");
  const direction = String(formData.get("direction") ?? "") as "up" | "down";
  const studentId = String(formData.get("studentId") ?? "");

  await moveChoice({ choiceId, direction, actorId: actor.id, actorRole: actor.role });

  revalidateActivityPaths(studentId);
}

export async function removeChoiceForAdminAction(formData: FormData) {
  const actor = await requireRole(ACTIVITY_VIEWER_ROLES);
  const choiceId = String(formData.get("choiceId") ?? "");
  const studentId = String(formData.get("studentId") ?? "");

  await removeChoice({ choiceId, actorId: actor.id, actorRole: actor.role });

  revalidateActivityPaths(studentId);
}

export async function reorderChoicesForAdminAction(
  studentId: string,
  orderedChoiceIds: string[]
): Promise<ActionResult> {
  const actor = await requireRole(ACTIVITY_VIEWER_ROLES);

  try {
    await reorderAllChoices({
      studentId,
      orderedChoiceIds,
      actorId: actor.id,
      actorRole: actor.role,
    });
  } catch (error) {
    if (error instanceof ChoiceError) return { error: error.message };
    throw error;
  }

  revalidateActivityPaths(studentId);
  return {};
}

export type BulkCreateResult = {
  error?: string;
  successCount?: number;
  rowErrors?: BulkRowError[];
};

export async function bulkCreateUsersAction(
  _prev: BulkCreateResult,
  formData: FormData
): Promise<BulkCreateResult> {
  await requireRole(Role.ADMIN);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "فایلی انتخاب نشده است." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let parsed;
  try {
    parsed = await parseUsersWorkbook(buffer);
  } catch {
    return { error: "فایل اکسل قابل خواندن نیست. لطفاً فرمت فایل را بررسی کنید." };
  }

  const { created, errors: createErrors } = await createUsersFromRows(parsed.rows);
  const rowErrors = [...parsed.errors, ...createErrors].sort((a, b) => a.row - b.row);

  revalidatePath("/admin/users");

  if (created === 0 && rowErrors.length > 0) {
    return { error: "هیچ کاربری ایجاد نشد.", rowErrors };
  }

  return {
    successCount: created,
    rowErrors: rowErrors.length > 0 ? rowErrors : undefined,
  };
}

export async function assignMentorAction(formData: FormData) {
  await requireRole(Role.ADMIN);

  const studentId = String(formData.get("studentId") ?? "");
  const mentorId = String(formData.get("mentorId") ?? "");

  await prisma.user.update({
    where: { id: studentId, role: Role.STUDENT },
    data: { mentorId: mentorId || null },
  });

  revalidatePath("/admin/users");
}
