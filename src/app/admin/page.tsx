import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getOverviewStats, getMentors } from "@/lib/admin";
import { toPersianDigits } from "@/lib/format";

export default async function AdminHomePage() {
  const [stats, mentors] = await Promise.all([getOverviewStats(), getMentors()]);

  const cards = [
    { label: "دانش‌آموزان", value: stats.students },
    { label: "منتورها", value: stats.mentors },
    { label: "ادمین‌ها", value: stats.admins },
    { label: "رشته‌های ثبت‌شده", value: stats.majors },
    { label: "مجموع انتخاب‌ها", value: stats.choices },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-bold text-slate-900">نمای کلی</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-slate-200 bg-white p-4 text-center"
          >
            <div className="text-2xl font-bold text-slate-900">
              {toPersianDigits(card.value)}
            </div>
            <div className="mt-1 text-xs text-slate-500">{card.label}</div>
          </div>
        ))}
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">فعالیت منتورها</h2>
          <Link
            href="/admin/users"
            className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
          >
            مدیریت کاربران
            <ArrowLeft className="h-3.5 w-3.5" />
          </Link>
        </div>

        {mentors.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            هنوز منتوری ثبت نشده است.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full min-w-[600px] text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr className="text-right">
                  <th className="px-3 py-2 font-medium">نام منتور</th>
                  <th className="px-3 py-2 font-medium">ایمیل</th>
                  <th className="px-3 py-2 font-medium">تعداد دانش‌آموزان</th>
                  <th className="px-3 py-2 font-medium">تعداد فعالیت‌های ثبت‌شده</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {mentors.map((mentor) => (
                  <tr key={mentor.id}>
                    <td className="px-3 py-3 font-medium text-slate-900">
                      {mentor.name}
                    </td>
                    <td className="px-3 py-3 text-right text-slate-600" dir="ltr">
                      {mentor.email}
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      {toPersianDigits(mentor._count.mentees)}
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      {toPersianDigits(mentor._count.mentorLogsAsMentor)}
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
