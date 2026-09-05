"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Eye, Search } from "lucide-react";
import { toPersianDigits } from "@/lib/format";

type StudentRow = {
  id: string;
  name: string;
  email: string;
  mentor: { id: string; name: string } | null;
  choicesCount: number;
};

export function AdminActivityList({
  students,
  mentors,
  maxChoices,
  basePath = "/admin/activity",
}: {
  students: StudentRow[];
  mentors: { id: string; name: string }[];
  maxChoices: number;
  basePath?: string;
}) {
  const [query, setQuery] = useState("");
  const [mentorFilter, setMentorFilter] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students.filter((student) => {
      const matchesQuery =
        !q ||
        student.name.toLowerCase().includes(q) ||
        student.email.toLowerCase().includes(q);

      const matchesMentor =
        !mentorFilter ||
        (mentorFilter === "NONE"
          ? !student.mentor
          : student.mentor?.id === mentorFilter);

      return matchesQuery && matchesMentor;
    });
  }, [students, query, mentorFilter]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-white bg-white/85 p-4 shadow-sm shadow-slate-200/60 sm:flex-row">
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جستجو در نام یا ایمیل دانش‌آموز"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-3 pr-9 text-sm outline-none"
          />
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </div>

        <select
          value={mentorFilter}
          onChange={(e) => setMentorFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-sm outline-none sm:w-56"
        >
          <option value="">همه منتورها</option>
          <option value="NONE">بدون منتور</option>
          {mentors.map((mentor) => (
            <option key={mentor.id} value={mentor.id}>
              {mentor.name}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          موردی مطابق با جستجو/فیلتر یافت نشد.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white bg-white/90 shadow-sm shadow-slate-200/70">
          <table className="w-full min-w-[700px] text-sm">
            <thead className="bg-slate-50/80 text-xs text-slate-500">
              <tr className="text-right">
                <th className="px-3 py-2 font-medium">نام دانش‌آموز</th>
                <th className="px-3 py-2 font-medium">ایمیل</th>
                <th className="px-3 py-2 font-medium">منتور</th>
                <th className="px-3 py-2 font-medium">تعداد انتخاب‌ها</th>
                <th className="px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((student) => (
                <tr key={student.id} className="transition-colors hover:bg-indigo-50/35">
                  <td className="px-3 py-3 font-medium text-slate-900">
                    {student.name}
                  </td>
                  <td className="px-3 py-3 text-right text-slate-600" dir="ltr">
                    {student.email}
                  </td>
                  <td className="px-3 py-3 text-slate-700">
                    {student.mentor ? (
                      student.mentor.name
                    ) : (
                      <span className="text-slate-400">بدون منتور</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-slate-700">
                    {toPersianDigits(student.choicesCount)} /{" "}
                    {toPersianDigits(maxChoices)}
                  </td>
                  <td className="px-3 py-3">
                    <Link
                      href={`${basePath}/${student.id}`}
                      className="flex w-fit items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      مشاهده انتخاب‌ها
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
