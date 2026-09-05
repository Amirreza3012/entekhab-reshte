import Link from "next/link";
import { ArrowLeft, BookOpenCheck, GraduationCap, ShieldCheck, Users, UsersRound } from "lucide-react";
import { getOverviewStats, getMentors } from "@/lib/admin";
import { toPersianDigits } from "@/lib/format";

export default async function AdminHomePage() {
  const [stats, mentors] = await Promise.all([getOverviewStats(), getMentors()]);

  const cards = [
    { label: "دانش‌آموزان", value: stats.students, icon: UsersRound, color: "text-white bg-[#5b5cf0]" },
    { label: "منتورها", value: stats.mentors, icon: Users, color: "text-slate-950 bg-[#dfff4f]" },
    { label: "ادمین‌ها", value: stats.admins, icon: ShieldCheck, color: "text-white bg-[#111827]" },
    { label: "رشته‌های ثبت‌شده", value: stats.majors, icon: GraduationCap, color: "text-white bg-cyan-500" },
    { label: "مجموع انتخاب‌ها", value: stats.choices, icon: BookOpenCheck, color: "text-white bg-fuchsia-500" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="relative overflow-hidden rounded-[2rem] bg-[#111827] p-6 text-white shadow-xl sm:p-8">
        <div className="absolute -left-16 -top-20 h-64 w-64 rounded-full bg-violet-500/25 blur-3xl" />
        <div className="absolute bottom-0 left-12 h-24 w-24 rounded-full bg-[#dfff4f]/10 blur-2xl" />
        <div className="relative"><p className="mb-2 flex items-center gap-2 text-xs font-bold text-[#dfff4f]"><span className="h-2 w-2 rounded-full bg-[#dfff4f]" /> مرکز کنترل سامانه</p><h1 className="!text-white">تصویر کامل، تصمیم دقیق‌تر</h1><p className="mt-3 max-w-xl text-sm leading-7 text-white/45">آمار کاربران، رشته‌ها و انتخاب‌ها را در یک نگاه ببینید و جریان فعالیت سامانه را مدیریت کنید.</p></div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="group rounded-[1.4rem] border border-white bg-white/90 p-5 shadow-sm shadow-slate-200/60 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/60"
            >
              <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-[.9rem] shadow-sm ${card.color}`}><Icon className="h-5 w-5" /></div>
              <div className="text-right text-3xl font-black text-slate-950">
                {toPersianDigits(card.value)}
              </div>
              <div className="mt-1 text-right text-xs font-medium text-slate-500">{card.label}</div>
            </div>
          );
        })}
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div><p className="text-[10px] font-bold text-violet-600">گزارش تیم</p><h2 className="font-semibold text-slate-800">فعالیت منتورها</h2></div>
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
