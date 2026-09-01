"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/session";
import { addChoice, moveChoice, removeChoice, ChoiceError } from "@/lib/choices";
import { getMenteeOrThrow } from "@/lib/mentor";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/client";

export type ActionResult = { error?: string };

export async function addChoiceForStudentAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const mentor = await requireRole(Role.MENTOR);
  const studentId = String(formData.get("studentId") ?? "");
  const majorId = String(formData.get("majorId") ?? "");

  try {
    await addChoice({ studentId, majorId, actorId: mentor.id, actorRole: Role.MENTOR });
  } catch (error) {
    if (error instanceof ChoiceError) return { error: error.message };
    throw error;
  }

  revalidatePath(`/mentor/students/${studentId}`);
  return {};
}

export async function removeChoiceForStudentAction(formData: FormData) {
  const mentor = await requireRole(Role.MENTOR);
  const choiceId = String(formData.get("choiceId") ?? "");
  const studentId = String(formData.get("studentId") ?? "");

  await removeChoice({ choiceId, actorId: mentor.id, actorRole: Role.MENTOR });

  revalidatePath(`/mentor/students/${studentId}`);
}

export async function moveChoiceForStudentAction(formData: FormData) {
  const mentor = await requireRole(Role.MENTOR);
  const choiceId = String(formData.get("choiceId") ?? "");
  const direction = String(formData.get("direction") ?? "") as "up" | "down";
  const studentId = String(formData.get("studentId") ?? "");

  await moveChoice({ choiceId, direction, actorId: mentor.id, actorRole: Role.MENTOR });

  revalidatePath(`/mentor/students/${studentId}`);
}

export async function addMentorNoteAction(formData: FormData) {
  const mentor = await requireRole(Role.MENTOR);
  const studentId = String(formData.get("studentId") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  await getMenteeOrThrow(mentor.id, studentId);
  if (!note) return;

  await prisma.mentorLog.create({
    data: {
      mentorId: mentor.id,
      studentId,
      action: "NOTE",
      detail: note,
    },
  });

  revalidatePath(`/mentor/students/${studentId}`);
}
