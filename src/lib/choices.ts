import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/client";

export const MAX_CHOICES = 150;

class ChoiceError extends Error {}

async function assertMentorOwnsStudent(mentorId: string, studentId: string) {
  const student = await prisma.user.findUnique({ where: { id: studentId } });
  if (!student || student.role !== Role.STUDENT || student.mentorId !== mentorId) {
    throw new ChoiceError("این دانش‌آموز به شما تخصیص داده نشده است.");
  }
}

async function authorize(
  studentId: string,
  actorId: string,
  actorRole: Role
) {
  if (actorRole === Role.STUDENT) {
    if (actorId !== studentId) {
      throw new ChoiceError("دسترسی غیرمجاز.");
    }
    return;
  }
  if (actorRole === Role.MENTOR) {
    await assertMentorOwnsStudent(actorId, studentId);
    return;
  }
  throw new ChoiceError("دسترسی غیرمجاز.");
}

export function getStudentChoices(studentId: string) {
  return prisma.choice.findMany({
    where: { studentId },
    include: { major: true },
    orderBy: { rank: "asc" },
  });
}

export async function addChoice({
  studentId,
  majorId,
  actorId,
  actorRole,
}: {
  studentId: string;
  majorId: string;
  actorId: string;
  actorRole: Role;
}) {
  await authorize(studentId, actorId, actorRole);

  return prisma.$transaction(async (tx) => {
    const count = await tx.choice.count({ where: { studentId } });
    if (count >= MAX_CHOICES) {
      throw new ChoiceError(`سقف ${MAX_CHOICES} انتخاب پر شده است.`);
    }

    const existing = await tx.choice.findUnique({
      where: { studentId_majorId: { studentId, majorId } },
    });
    if (existing) {
      throw new ChoiceError("این رشته قبلاً انتخاب شده است.");
    }

    const major = await tx.major.findUnique({ where: { id: majorId } });
    if (!major) throw new ChoiceError("رشته یافت نشد.");

    const choice = await tx.choice.create({
      data: { studentId, majorId, rank: count + 1 },
    });

    if (actorRole === Role.MENTOR) {
      await tx.mentorLog.create({
        data: {
          mentorId: actorId,
          studentId,
          action: "ADD_CHOICE",
          detail: `افزودن «${major.title} - ${major.university}» در رتبه ${count + 1}`,
        },
      });
    }

    return choice;
  });
}

export async function removeChoice({
  choiceId,
  actorId,
  actorRole,
}: {
  choiceId: string;
  actorId: string;
  actorRole: Role;
}) {
  return prisma.$transaction(async (tx) => {
    const choice = await tx.choice.findUnique({
      where: { id: choiceId },
      include: { major: true },
    });
    if (!choice) throw new ChoiceError("انتخاب یافت نشد.");

    await authorize(choice.studentId, actorId, actorRole);

    await tx.choice.delete({ where: { id: choiceId } });

    // Compact ranks so remaining choices stay contiguous starting at 1.
    const remaining = await tx.choice.findMany({
      where: { studentId: choice.studentId },
      orderBy: { rank: "asc" },
    });
    for (const [index, c] of remaining.entries()) {
      const newRank = index + 1;
      if (c.rank !== newRank) {
        await tx.choice.update({
          where: { id: c.id },
          data: { rank: newRank },
        });
      }
    }

    if (actorRole === Role.MENTOR) {
      await tx.mentorLog.create({
        data: {
          mentorId: actorId,
          studentId: choice.studentId,
          action: "REMOVE_CHOICE",
          detail: `حذف «${choice.major.title} - ${choice.major.university}»`,
        },
      });
    }
  });
}

export async function moveChoice({
  choiceId,
  direction,
  actorId,
  actorRole,
}: {
  choiceId: string;
  direction: "up" | "down";
  actorId: string;
  actorRole: Role;
}) {
  return prisma.$transaction(async (tx) => {
    const choice = await tx.choice.findUnique({
      where: { id: choiceId },
      include: { major: true },
    });
    if (!choice) throw new ChoiceError("انتخاب یافت نشد.");

    await authorize(choice.studentId, actorId, actorRole);

    const neighbor = await tx.choice.findFirst({
      where: {
        studentId: choice.studentId,
        rank: direction === "up" ? { lt: choice.rank } : { gt: choice.rank },
      },
      orderBy: { rank: direction === "up" ? "desc" : "asc" },
    });
    if (!neighbor) return;

    await tx.choice.update({ where: { id: choice.id }, data: { rank: -1 } });
    await tx.choice.update({
      where: { id: neighbor.id },
      data: { rank: choice.rank },
    });
    await tx.choice.update({
      where: { id: choice.id },
      data: { rank: neighbor.rank },
    });

    if (actorRole === Role.MENTOR) {
      await tx.mentorLog.create({
        data: {
          mentorId: actorId,
          studentId: choice.studentId,
          action: "REORDER_CHOICE",
          detail: `جابجایی «${choice.major.title}» به رتبه ${neighbor.rank}`,
        },
      });
    }
  });
}

export { ChoiceError };
