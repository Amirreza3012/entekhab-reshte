import Link from "next/link";
import { Eye } from "lucide-react";
import { requireRole } from "@/lib/session";
import { Role } from "@/generated/prisma/client";
import { getMentees } from "@/lib/mentor";
import { MAX_CHOICES } from "@/lib/choices";
import { toPersianDigits } from "@/lib/format";

export default async function MentorHomePage() {
  const mentor = await requireRole(Role.MENTOR);
  const mentees = await getMentees(mentor.id);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-bold text-slate-900">دانش‌آموزان من</h1>

      {mentees.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          هنوز دانش‌آموزی به شما تخصیص داده نشده است.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[700px] text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr className="text-right">
                <th className="px-3 py-2 font-medium">نام دانش‌آموز</th>
                <th className="px-3 py-2 font-medium">ایمیل</th>
                <th className="px-3 py-2 font-medium">تعداد انتخاب‌ها</th>
                <th className="px-3 py-2 font-medium">آخرین فعالیت منتور</th>
                <th className="px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mentees.map((student) => (
                <tr key={student.id}>
                  <td className="px-3 py-3 font-medium text-slate-900">
                    {student.name}
                  </td>
                  <td className="px-3 py-3 text-slate-600" dir="ltr">
                    {student.email}
                  </td>
                  <td className="px-3 py-3 text-slate-700">
                    {toPersianDigits(student._count.choices)} / {toPersianDigits(MAX_CHOICES)}
                  </td>
                  <td className="px-3 py-3 text-xs text-slate-500">
                    {student.mentorLogsAsStudent[0]
                      ? new Date(
                          student.mentorLogsAsStudent[0].createdAt
                        ).toLocaleDateString("fa-IR")
                      : "بدون فعالیت"}
                  </td>
                  <td className="px-3 py-3">
                    <Link
                      href={`/mentor/students/${student.id}`}
                      className="flex w-fit items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      مشاهده و ویرایش
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
