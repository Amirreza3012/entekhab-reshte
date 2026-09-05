import { getStudentsWithChoices, getMentors } from "@/lib/admin";
import { MAX_CHOICES } from "@/lib/choices";
import { AdminActivityList } from "@/components/AdminActivityList";
import { PageHero } from "@/components/PageHero";

export default async function AdminActivityPage() {
  const [students, mentors] = await Promise.all([
    getStudentsWithChoices(),
    getMentors(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <PageHero eyebrow="گزارش لحظه‌ای" title="فعالیت‌های کاربران" description="انتخاب‌های دانش‌آموزان و وضعیت همراهی منتورها را بررسی کنید." />

      {students.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          هنوز هیچ دانش‌آموزی انتخاب رشته‌ای ثبت نکرده است.
        </div>
      ) : (
        <AdminActivityList
          students={students.map((student) => ({
            id: student.id,
            name: student.name,
            email: student.email,
            mentor: student.mentor,
            choicesCount: student._count.choices,
          }))}
          mentors={mentors.map((mentor) => ({
            id: mentor.id,
            name: mentor.name,
          }))}
          maxChoices={MAX_CHOICES}
        />
      )}
    </div>
  );
}
