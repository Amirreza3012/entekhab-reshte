import { Activity } from "lucide-react";
import { requireRole } from "@/lib/session";
import { Role } from "@/generated/prisma/client";
import { AppHeader } from "@/components/AppHeader";

export default async function SupervisorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole(Role.SUPERVISOR);

  return (
    <div className="min-h-screen">
      <AppHeader
        title="پنل ناظر"
        userName={user.name ?? ""}
        links={[
          {
            href: "/supervisor",
            label: "فعالیت‌های کاربران",
            icon: <Activity className="h-4 w-4" />,
          },
        ]}
      />
      <main className="app-main min-h-screen px-4 py-6 sm:px-7 sm:py-8 lg:py-10 lg:pl-10 lg:pr-[20.5rem] xl:pl-14 xl:pr-[21.5rem]">
        {children}
      </main>
    </div>
  );
}
