import { auth } from "@/auth";
import { Role } from "@/generated/prisma/client";

export async function requireRole(role: Role | Role[]) {
  const allowed = Array.isArray(role) ? role : [role];
  const session = await auth();
  if (!session?.user || !allowed.includes(session.user.role)) {
    throw new Error("دسترسی غیرمجاز");
  }
  return session.user;
}

export async function requireSession() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("دسترسی غیرمجاز");
  }
  return session.user;
}
