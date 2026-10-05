import { prisma } from "@/lib/prisma";
import { MentorAction, Role } from "@/generated/prisma/client";

export async function getMentees(mentorId: string) {
  const students = await prisma.user.findMany({
    where: { mentorId, role: Role.STUDENT },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { choices: true } },
      mentorLogsAsStudent: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  return students;
}

export async function getMenteeOrThrow(mentorId: string, studentId: string) {
  const student = await prisma.user.findFirst({
    where: { id: studentId, mentorId, role: Role.STUDENT },
  });
  if (!student) {
    throw new Error("این دانش‌آموز به شما تخصیص داده نشده است.");
  }
  return student;
}

// What a mentor sees for a student: their own notes/changes plus every change
// made by the student, admins and supervisors (not other mentors' private logs).
export function getMentorLogsForStudent(mentorId: string, studentId: string) {
  return prisma.mentorLog.findMany({
    where: { studentId, OR: [{ mentorId }, { actorRole: { not: Role.MENTOR } }] },
    orderBy: { createdAt: "desc" },
    include: { mentor: { select: { name: true } } },
  });
}

export const HISTORY_LIMIT = 100;

// Full change history (no private notes) for admins and supervisors.
export async function getChoiceHistory(studentId: string) {
  const where = { studentId, action: { not: MentorAction.NOTE } };
  const [logs, total] = await Promise.all([
    prisma.mentorLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: HISTORY_LIMIT,
      include: { mentor: { select: { name: true } } },
    }),
    prisma.mentorLog.count({ where }),
  ]);
  return { logs, total };
}
