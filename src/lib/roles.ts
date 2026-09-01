import { Role } from "@/generated/prisma/client";

export const ROLE_HOME: Record<Role, string> = {
  ADMIN: "/admin",
  MENTOR: "/mentor",
  STUDENT: "/student",
};

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "ادمین",
  MENTOR: "منتور",
  STUDENT: "دانش‌آموز",
};
