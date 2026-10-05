import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/client";

export const MAX_CHOICES = 150;

class ChoiceError extends Error {}

type ChoiceLogAction = "ADD_CHOICE" | "REMOVE_CHOICE" | "REORDER_CHOICE";

// Every change to a student's list is logged, whoever makes it (student,
// mentor, admin or supervisor), so the history can answer "who changed what".
function logChoiceChange(
  tx: Pick<typeof prisma, "mentorLog">,
  entry: { actorId: string; actorRole: Role; studentId: string; action: ChoiceLogAction; detail: string }
) {
  return tx.mentorLog.create({
    data: {
      mentorId: entry.actorId,
      actorRole: entry.actorRole,
      studentId: entry.studentId,
      action: entry.action,
      detail: entry.detail,
    },
  });
}

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
  if (actorRole === Role.ADMIN || actorRole === Role.SUPERVISOR) {
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

    await logChoiceChange(tx, {
      actorId,
      actorRole,
      studentId,
      action: "ADD_CHOICE",
      detail: `افزودن «${major.title} - ${major.university}» در رتبه ${count + 1}`,
    });

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

    await logChoiceChange(tx, {
      actorId,
      actorRole,
      studentId: choice.studentId,
      action: "REMOVE_CHOICE",
      detail: `حذف «${choice.major.title} - ${choice.major.university}»`,
    });
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

    await logChoiceChange(tx, {
      actorId,
      actorRole,
      studentId: choice.studentId,
      action: "REORDER_CHOICE",
      detail: `جابجایی «${choice.major.title}» به رتبه ${neighbor.rank}`,
    });
  });
}

export async function reorderAllChoices({
  studentId,
  orderedChoiceIds,
  actorId,
  actorRole,
}: {
  studentId: string;
  orderedChoiceIds: string[];
  actorId: string;
  actorRole: Role;
}) {
  await authorize(studentId, actorId, actorRole);

  return prisma.$transaction(async (tx) => {
    const existing = await tx.choice.findMany({ where: { studentId } });
    const existingIds = new Set(existing.map((c) => c.id));

    if (
      orderedChoiceIds.length !== existing.length ||
      !orderedChoiceIds.every((id) => existingIds.has(id))
    ) {
      throw new ChoiceError("لیست انتخاب‌ها با وضعیت فعلی هم‌خوانی ندارد.");
    }

    // Two-phase update: first move every row to a temporary negative rank so
    // no intermediate write collides with the unique (studentId, rank) index.
    await Promise.all(
      orderedChoiceIds.map((id, index) =>
        tx.choice.update({ where: { id }, data: { rank: -(index + 1) } })
      )
    );
    await Promise.all(
      orderedChoiceIds.map((id, index) =>
        tx.choice.update({ where: { id }, data: { rank: index + 1 } })
      )
    );

    await logChoiceChange(tx, {
      actorId,
      actorRole,
      studentId,
      action: "REORDER_CHOICE",
      detail: "ترتیب انتخاب‌ها با کشیدن و رها کردن بازچینی شد.",
    });
  });
}

export { ChoiceError };
