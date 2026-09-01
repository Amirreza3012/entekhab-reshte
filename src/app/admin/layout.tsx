import { requireRole } from "@/lib/session";
import { Role } from "@/generated/prisma/client";
import { AppHeader } from "@/components/AppHeader";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole(Role.ADMIN);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <AppHeader
        title="پنل ادمین"
        userName={user.name ?? ""}
        links={[
          { href: "/admin", label: "نمای کلی" },
          { href: "/admin/users", label: "مدیریت کاربران" },
        ]}
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  );
}
