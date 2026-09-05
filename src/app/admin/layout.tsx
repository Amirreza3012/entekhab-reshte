import { LayoutDashboard, UsersRound, Activity, GraduationCap } from "lucide-react";
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
    <div className="min-h-screen">
      <AppHeader
        title="پنل ادمین"
        userName={user.name ?? ""}
        links={[
          {
            href: "/admin",
            label: "نمای کلی",
            icon: <LayoutDashboard className="h-4 w-4" />,
          },
          {
            href: "/admin/users",
            label: "مدیریت کاربران",
            icon: <UsersRound className="h-4 w-4" />,
          },
          {
            href: "/admin/activity",
            label: "فعالیت‌های کاربران",
            icon: <Activity className="h-4 w-4" />,
          },
          {
            href: "/admin/majors",
            label: "مدیریت رشته‌ها",
            icon: <GraduationCap className="h-4 w-4" />,
          },
        ]}
      />
      <main className="app-main min-h-screen px-4 py-6 sm:px-7 sm:py-8 lg:py-10 lg:pl-10 lg:pr-[20.5rem] xl:pl-14 xl:pr-[21.5rem]">
        {children}
      </main>
    </div>
  );
}
