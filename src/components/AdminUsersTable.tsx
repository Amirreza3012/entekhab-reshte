"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Pencil, RotateCcw, Search } from "lucide-react";
import { NativeSelect } from "@/components/NativeSelect";
import { MentorAssignSelect } from "@/components/MentorAssignSelect";
import { DeleteUserButton } from "@/components/DeleteUserButton";
import { filterAdminUsers } from "@/lib/adminUserFilters";
import { toPersianDigits } from "@/lib/format";

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  role: "STUDENT" | "MENTOR" | "SUPERVISOR";
  mentorId: string | null;
  _count: { choices: number; mentees: number };
};

type Filters = { query: string; role: string; mentor: string; choices: string };
const GROUPS = [
  { role: "STUDENT", title: "دانش‌آموزان و تخصیص منتور", empty: "هنوز دانش‌آموزی ثبت نشده است." },
  { role: "MENTOR", title: "منتورها", empty: "هنوز منتوری ثبت نشده است." },
  { role: "SUPERVISOR", title: "ناظران", empty: "هنوز ناظری ثبت نشده است." },
] as const;
const EMPTY_FILTERS: Filters = { query: "", role: "", mentor: "", choices: "" };

export function AdminUsersTable({ users, initialFilters, maxChoices }: {
  users: AdminUserRow[];
  initialFilters: Filters;
  maxChoices: number;
}) {
  const [filters, setFilters] = useState(initialFilters);
  const mentors = useMemo(() => users.filter((user) => user.role === "MENTOR"), [users]);
  const groups = useMemo(() => GROUPS.filter((group) => !filters.role || group.role === filters.role)
    .map((group) => {
      const all = users.filter((user) => user.role === group.role);
      return {
        ...group, total: all.length,
        rows: filterAdminUsers(all, group.role === "STUDENT" ? filters : { query: filters.query }),
      };
    }), [users, filters]);
  const visibleCount = groups.reduce((sum, group) => sum + group.rows.length, 0);
  const hasFilters = Object.values(filters).some(Boolean);
  const update = (field: keyof Filters, value: string) => setFilters((current) => ({ ...current, [field]: value }));

  return (
    <section aria-label="فهرست کاربران" className="min-w-0 rounded-2xl border border-white bg-white/90 shadow-sm shadow-slate-200/60">
      <div className="flex flex-col gap-4 rounded-t-2xl border-b border-slate-200/80 bg-slate-50/60 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-slate-900">فهرست کاربران</h2>
          <p role="status" aria-live="polite" aria-atomic="true" className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-900">
            {toPersianDigits(visibleCount)} نتیجه از {toPersianDigits(users.length)} کاربر
          </p>
        </div>
        <div className="grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_1fr]">
          <label className="flex min-w-0 flex-col gap-2 text-xs font-medium text-slate-600">
            نام یا ایمیل
            <span className="relative">
              <Search aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input type="search" value={filters.query} onChange={(event) => update("query", event.target.value)} placeholder="جست‌وجوی کاربران…" className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-3 pr-9 text-sm outline-none focus-visible:ring-2 focus-visible:ring-violet-500" />
            </span>
          </label>
          <label className="flex min-w-0 flex-col gap-2 text-xs font-medium text-slate-600">
            نقش کاربر
            <NativeSelect value={filters.role} onChange={(event) => update("role", event.target.value)}>
              <option value="">همه نقش‌ها</option>
              <option value="STUDENT">دانش‌آموز</option>
              <option value="MENTOR">منتور</option>
              <option value="SUPERVISOR">ناظر</option>
            </NativeSelect>
          </label>
          <label className="flex min-w-0 flex-col gap-2 text-xs font-medium text-slate-600">
            منتور دانش‌آموز
            <NativeSelect value={filters.mentor} onChange={(event) => update("mentor", event.target.value)} disabled={!!filters.role && filters.role !== "STUDENT"}>
              <option value="">همه دانش‌آموزان</option>
              <option value="NONE">بدون منتور</option>
              <option value="ASSIGNED">دارای منتور</option>
              {mentors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </NativeSelect>
          </label>
          <label className="flex min-w-0 flex-col gap-2 text-xs font-medium text-slate-600">
            وضعیت انتخاب‌های دانش‌آموز
            <NativeSelect value={filters.choices} onChange={(event) => update("choices", event.target.value)} disabled={!!filters.role && filters.role !== "STUDENT"}>
              <option value="">همه وضعیت‌ها</option>
              <option value="HAS_CHOICES">دارای انتخاب</option>
              <option value="NO_CHOICES">بدون انتخاب</option>
            </NativeSelect>
          </label>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>نتایج در لحظه به‌روز می‌شوند؛ فیلتر منتور و انتخاب‌ها فقط برای دانش‌آموزان است.</span>
          <button type="button" disabled={!hasFilters} onClick={() => setFilters(EMPTY_FILTERS)} className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 font-medium text-violet-700 transition hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"><RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />ریست فیلترها</button>
        </div>
      </div>

      {groups.map((group) => (
        <section key={group.role} aria-label={group.title} className="border-b border-slate-100 last:border-b-0">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-5">
            <h3 className="text-sm font-semibold text-slate-800">{group.title}</h3>
            <span className="text-xs text-slate-500">{toPersianDigits(group.rows.length)} از {toPersianDigits(group.total)} نفر</span>
          </div>
          {group.rows.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-500">{group.total === 0 ? group.empty : "کاربری مطابق با جست‌وجو و فیلترها یافت نشد."}</p>
          ) : (
            <div className="overflow-x-auto">
              <div className={group.role === "STUDENT" ? "min-w-[700px]" : "min-w-[500px]"}>
                <table className="w-full text-sm" aria-label={group.title}>
                  <thead className="bg-slate-50 text-slate-500">
                    <tr className="text-right">
                      <th scope="col" className="w-14 px-3 py-2 font-medium">ردیف</th>
                      <th scope="col" className="px-3 py-2 font-medium">نام</th>
                      <th scope="col" className="px-3 py-2 font-medium">ایمیل</th>
                      {group.role !== "SUPERVISOR" && <th scope="col" className="px-3 py-2 font-medium">{group.role === "STUDENT" ? "تعداد انتخاب‌ها" : "تعداد دانش‌آموزان"}</th>}
                      {group.role === "STUDENT" && <th scope="col" className="px-3 py-2 font-medium">منتور</th>}
                      <th scope="col" className="px-3 py-2 font-medium">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {group.rows.map((user, index) => (
                      <tr key={user.id}>
                        <td className="px-3 py-3 text-xs tabular-nums text-slate-500">{toPersianDigits(index + 1)}</td>
                        <td className="px-3 py-3 font-medium text-slate-900">{user.name}</td>
                        <td className="px-3 py-3 text-right text-slate-600" dir="ltr">{user.email}</td>
                        {group.role !== "SUPERVISOR" && <td className="px-3 py-3 text-slate-700">
                          {group.role === "STUDENT" ? <>{toPersianDigits(user._count.choices)} / {toPersianDigits(maxChoices)}</> : toPersianDigits(user._count.mentees)}
                        </td>}
                        {group.role === "STUDENT" && <td className="px-3 py-3"><MentorAssignSelect studentId={user.id} mentors={mentors} currentMentorId={user.mentorId} /></td>}
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1.5">
                            <Link href={`/admin/users/${user.id}`} className="flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-50">
                              <Pencil aria-hidden="true" className="h-3.5 w-3.5" />ویرایش
                            </Link>
                            <DeleteUserButton userId={user.id} userName={user.name} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      ))}
    </section>
  );
}
