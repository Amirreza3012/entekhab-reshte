import { Users } from "lucide-react";
import { requireRole } from "@/lib/session";
import { Role } from "@/generated/prisma/client";
import { AppHeader } from "@/components/AppHeader";

export default async function MentorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole(Role.MENTOR);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <AppHeader
        title="پنل منتور"
        userName={user.name ?? ""}
        links={[
          {
            href: "/mentor",
            label: "دانش‌آموزان من",
            icon: <Users className="h-4 w-4" />,
          },
        ]}
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  );
}
