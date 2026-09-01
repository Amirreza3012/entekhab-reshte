import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/client";

export async function getOverviewStats() {
  const [students, mentors, admins, majors, choices] = await Promise.all([
    prisma.user.count({ where: { role: Role.STUDENT } }),
    prisma.user.count({ where: { role: Role.MENTOR } }),
    prisma.user.count({ where: { role: Role.ADMIN } }),
    prisma.major.count(),
    prisma.choice.count(),
  ]);
  return { students, mentors, admins, majors, choices };
}

export function getMentors() {
  return prisma.user.findMany({
    where: { role: Role.MENTOR },
    orderBy: { name: "asc" },
    include: { _count: { select: { mentees: true, mentorLogsAsMentor: true } } },
  });
}

export function getUserById(id: string) {
  return prisma.user.findUnique({ where: { id } });
}

export function getStudents() {
  return prisma.user.findMany({
    where: { role: Role.STUDENT },
    orderBy: { name: "asc" },
    include: {
      mentor: { select: { id: true, name: true } },
      _count: { select: { choices: true } },
    },
  });
}
