import { getStudents, getMentors, getSupervisors } from "@/lib/admin";
import { CreateUserForm } from "@/components/CreateUserForm";
import { BulkCreateUsersForm } from "@/components/BulkCreateUsersForm";
import { PageHero } from "@/components/PageHero";
import { AdminUsersTable, type AdminUserRow } from "@/components/AdminUsersTable";
import { MAX_CHOICES } from "@/lib/choices";

export default async function AdminUsersPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const value = (key: string) => typeof params[key] === "string" ? params[key] as string : "";
  const [students, mentors, supervisors] = await Promise.all([
    getStudents(),
    getMentors(),
    getSupervisors(),
  ]);
  const role = ["STUDENT", "MENTOR", "SUPERVISOR"].includes(value("role")) ? value("role") : "";
  const choices = ["HAS_CHOICES", "NO_CHOICES"].includes(value("choices")) ? value("choices") : "";
  const mentor = ["NONE", "ASSIGNED", ...mentors.map((item) => item.id)].includes(value("mentor")) ? value("mentor") : "";

  // Only send the fields shown in the table to the client, never password hashes.
  const users: AdminUserRow[] = [
    ...students.map((student) => ({
      id: student.id, name: student.name, email: student.email, role: "STUDENT" as const,
      mentorId: student.mentorId, _count: { choices: student._count.choices, mentees: 0 },
    })),
    ...mentors.map((item) => ({
      id: item.id, name: item.name, email: item.email, role: "MENTOR" as const,
      mentorId: null, _count: { choices: 0, mentees: item._count.mentees },
    })),
    ...supervisors.map((item) => ({
      id: item.id, name: item.name, email: item.email, role: "SUPERVISOR" as const,
      mentorId: null, _count: { choices: 0, mentees: 0 },
    })),
  ];

  return (
    <div className="flex flex-col gap-8">
      <PageHero eyebrow="مدیریت دسترسی" title="کاربران سامانه" description="حساب‌های جدید بسازید، نقش‌ها را مدیریت کنید و هر دانش‌آموز را به منتور مناسب بسپارید." />
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold text-slate-900">ایجاد کاربر جدید</h2>
        <CreateUserForm />
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="font-semibold text-slate-800">افزودن گروهی کاربران از اکسل</h2>
        <BulkCreateUsersForm />
      </section>
      <AdminUsersTable users={users} maxChoices={MAX_CHOICES} initialFilters={{ query: value("q"), role, mentor, choices }} />
    </div>
  );
}
