import { Role } from "@/generated/prisma/client";

export const ROLE_HOME: Record<Role, string> = {
  ADMIN: "/admin",
  SUPERVISOR: "/supervisor",
  MENTOR: "/mentor",
  STUDENT: "/student",
};

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "ادمین",
  SUPERVISOR: "ناظر",
  MENTOR: "منتور",
  STUDENT: "دانش‌آموز",
};
