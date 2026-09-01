import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/client";

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

export function getMentorLogsForStudent(mentorId: string, studentId: string) {
  return prisma.mentorLog.findMany({
    where: { mentorId, studentId },
    orderBy: { createdAt: "desc" },
  });
}
