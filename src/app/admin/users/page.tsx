import Link from "next/link";
import { Pencil } from "lucide-react";
import { getStudents, getMentors } from "@/lib/admin";
import { CreateUserForm } from "@/components/CreateUserForm";
import { MentorAssignSelect } from "@/components/MentorAssignSelect";
import { DeleteUserButton } from "@/components/DeleteUserButton";
import { MAX_CHOICES } from "@/lib/choices";
import { toPersianDigits } from "@/lib/format";

export default async function AdminUsersPage() {
  const [students, mentors] = await Promise.all([getStudents(), getMentors()]);

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h1 className="text-lg font-bold text-slate-900">ایجاد کاربر جدید</h1>
        <CreateUserForm />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold text-slate-800">
          دانش‌آموزان و تخصیص منتور
        </h2>
        {students.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            هنوز دانش‌آموزی ثبت نشده است.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr className="text-right">
                  <th className="px-3 py-2 font-medium">نام</th>
                  <th className="px-3 py-2 font-medium">ایمیل</th>
                  <th className="px-3 py-2 font-medium">تعداد انتخاب‌ها</th>
                  <th className="px-3 py-2 font-medium">منتور</th>
                  <th className="px-3 py-2 font-medium">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((student) => (
                  <tr key={student.id}>
                    <td className="px-3 py-3 font-medium text-slate-900">
                      {student.name}
                    </td>
                    <td className="px-3 py-3 text-slate-600" dir="ltr">
                      {student.email}
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      {toPersianDigits(student._count.choices)} /{" "}
                      {toPersianDigits(MAX_CHOICES)}
                    </td>
                    <td className="px-3 py-3">
                      <MentorAssignSelect
                        studentId={student.id}
                        mentors={mentors}
                        currentMentorId={student.mentorId}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/admin/users/${student.id}`}
                          className="flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          ویرایش
                        </Link>
                        <DeleteUserButton
                          userId={student.id}
                          userName={student.name}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold text-slate-800">منتورها</h2>
        {mentors.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            هنوز منتوری ثبت نشده است.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full min-w-[500px] text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr className="text-right">
                  <th className="px-3 py-2 font-medium">نام</th>
                  <th className="px-3 py-2 font-medium">ایمیل</th>
                  <th className="px-3 py-2 font-medium">تعداد دانش‌آموزان</th>
                  <th className="px-3 py-2 font-medium">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {mentors.map((mentor) => (
                  <tr key={mentor.id}>
                    <td className="px-3 py-3 font-medium text-slate-900">
                      {mentor.name}
                    </td>
                    <td className="px-3 py-3 text-slate-600" dir="ltr">
                      {mentor.email}
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      {toPersianDigits(mentor._count.mentees)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/admin/users/${mentor.id}`}
                          className="flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          ویرایش
                        </Link>
                        <DeleteUserButton
                          userId={mentor.id}
                          userName={mentor.name}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
