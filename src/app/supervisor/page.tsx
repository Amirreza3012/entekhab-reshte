import { getStudentsWithChoices, getMentors } from "@/lib/admin";
import { MAX_CHOICES } from "@/lib/choices";
import { AdminActivityList } from "@/components/AdminActivityList";

export default async function SupervisorActivityPage() {
  const [students, mentors] = await Promise.all([
    getStudentsWithChoices(),
    getMentors(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[2rem] bg-[#111827] p-6 text-white shadow-xl sm:p-8"><p className="mb-2 text-xs font-bold text-[#dfff4f]">نمای نظارتی</p><h1 className="!text-white">فعالیت‌های کاربران</h1><p className="mt-2 text-sm text-white/45">وضعیت انتخاب‌های دانش‌آموزان و عملکرد منتورها را رصد کنید.</p></div>

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
          basePath="/supervisor"
        />
      )}
    </div>
  );
}
