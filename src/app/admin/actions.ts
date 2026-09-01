"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { Role } from "@/generated/prisma/client";

export type ActionResult = { error?: string; success?: string };

const createUserSchema = z.object({
  name: z.string().min(2, "نام باید حداقل ۲ حرف باشد."),
  email: z.string().email("ایمیل معتبر نیست."),
  password: z.string().min(6, "رمز عبور باید حداقل ۶ کاراکتر باشد."),
  role: z.enum(["ADMIN", "MENTOR", "STUDENT"]),
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
  role: z.enum(["ADMIN", "MENTOR", "STUDENT"]),
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
