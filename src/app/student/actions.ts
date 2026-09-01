"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/session";
import { addChoice, moveChoice, removeChoice, ChoiceError } from "@/lib/choices";
import { Role } from "@/generated/prisma/client";

export type ActionResult = { error?: string };

export async function addChoiceAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireRole(Role.STUDENT);
  const majorId = String(formData.get("majorId") ?? "");

  try {
    await addChoice({ studentId: user.id, majorId, actorId: user.id, actorRole: Role.STUDENT });
  } catch (error) {
    if (error instanceof ChoiceError) return { error: error.message };
    throw error;
  }

  revalidatePath("/student");
  revalidatePath("/student/choices");
  return {};
}

export async function removeChoiceAction(formData: FormData) {
  const user = await requireRole(Role.STUDENT);
  const choiceId = String(formData.get("choiceId") ?? "");

  await removeChoice({ choiceId, actorId: user.id, actorRole: Role.STUDENT });

  revalidatePath("/student");
  revalidatePath("/student/choices");
}

export async function moveChoiceAction(formData: FormData) {
  const user = await requireRole(Role.STUDENT);
  const choiceId = String(formData.get("choiceId") ?? "");
  const direction = String(formData.get("direction") ?? "") as "up" | "down";

  await moveChoice({ choiceId, direction, actorId: user.id, actorRole: Role.STUDENT });

  revalidatePath("/student/choices");
}
