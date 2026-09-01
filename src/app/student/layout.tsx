import { requireRole } from "@/lib/session";
import { Role } from "@/generated/prisma/client";
import { AppHeader } from "@/components/AppHeader";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole(Role.STUDENT);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <AppHeader
        title="سامانه انتخاب رشته"
        userName={user.name ?? ""}
        links={[
          { href: "/student", label: "جستجوی رشته‌ها" },
          { href: "/student/choices", label: "انتخاب‌های من" },
        ]}
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  );
}
