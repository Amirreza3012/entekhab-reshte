import Link from "next/link";
import { Pencil, Search, X } from "lucide-react";
import { getStudents, getMentors, getSupervisors } from "@/lib/admin";
import { CreateUserForm } from "@/components/CreateUserForm";
import { BulkCreateUsersForm } from "@/components/BulkCreateUsersForm";
import { MentorAssignSelect } from "@/components/MentorAssignSelect";
import { DeleteUserButton } from "@/components/DeleteUserButton";
import { MAX_CHOICES } from "@/lib/choices";
import { toPersianDigits } from "@/lib/format";
import { PageHero } from "@/components/PageHero";
import { NativeSelect } from "@/components/NativeSelect";
import { filterAdminUsers } from "@/lib/adminUserFilters";

export default async function AdminUsersPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const value = (key: string) => typeof params[key] === "string" ? params[key] as string : "";
  const query = value("q").trim();
  const role = ["STUDENT", "MENTOR", "SUPERVISOR"].includes(value("role")) ? value("role") : "";
  const choices = ["HAS_CHOICES", "NO_CHOICES"].includes(value("choices")) ? value("choices") : "";
  const [students, mentors, supervisors] = await Promise.all([
    getStudents(),
    getMentors(),
    getSupervisors(),
  ]);
  const mentor = ["NONE", "ASSIGNED", ...mentors.map((item) => item.id)].includes(value("mentor")) ? value("mentor") : "";
  const filteredStudents = filterAdminUsers(students, { query, mentor, choices });
  const filteredMentors = filterAdminUsers(mentors, { query });
  const filteredSupervisors = filterAdminUsers(supervisors, { query });
  const total = students.length + mentors.length + supervisors.length;
  const visibleCount = (!role || role === "STUDENT" ? filteredStudents.length : 0)
    + (!role || role === "MENTOR" ? filteredMentors.length : 0)
    + (!role || role === "SUPERVISOR" ? filteredSupervisors.length : 0);
  const hasFilters = !!(query || role || mentor || choices);

  return (
    <div className="flex flex-col gap-8">
      <PageHero eyebrow="مدیریت دسترسی" title="کاربران سامانه" description="حساب‌های جدید بسازید، نقش‌ها را مدیریت کنید و هر دانش‌آموز را به منتور مناسب بسپارید." />
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold text-slate-900">ایجاد کاربر جدید</h2>
        <CreateUserForm />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold text-slate-800">
          افزودن گروهی کاربران از اکسل
        </h2>
        <BulkCreateUsersForm />
      </section>

      <div className="flex flex-col gap-4 rounded-2xl border border-white bg-white/90 p-4 shadow-sm shadow-slate-200/60 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-slate-900">جست‌وجو و فیلتر کاربران</h2>
          <p role="status" className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-900">
            {toPersianDigits(visibleCount)} نتیجه از {toPersianDigits(total)} کاربر
          </p>
        </div>
        <form action="/admin/users" method="get" key={JSON.stringify([query, role, mentor, choices])} className="grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_1fr_auto]">
          <label className="flex flex-col gap-2 text-xs font-medium text-slate-600">
            نام یا ایمیل
            <span className="relative">
              <Search aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input type="search" name="q" defaultValue={query} placeholder="جست‌وجوی کاربران…" className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-3 pr-9 text-sm outline-none focus-visible:ring-2 focus-visible:ring-violet-500" />
            </span>
          </label>
          <label className="flex flex-col gap-2 text-xs font-medium text-slate-600">
            نقش کاربر
            <NativeSelect name="role" defaultValue={role}>
              <option value="">همه نقش‌ها</option>
              <option value="STUDENT">دانش‌آموز</option>
              <option value="MENTOR">منتور</option>
              <option value="SUPERVISOR">ناظر</option>
            </NativeSelect>
          </label>
          <label className="flex flex-col gap-2 text-xs font-medium text-slate-600">
            منتور دانش‌آموز
            <NativeSelect name="mentor" defaultValue={mentor}>
              <option value="">همه دانش‌آموزان</option>
              <option value="NONE">بدون منتور</option>
              <option value="ASSIGNED">دارای منتور</option>
              {mentors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </NativeSelect>
          </label>
          <label className="flex flex-col gap-2 text-xs font-medium text-slate-600">
            وضعیت انتخاب‌های دانش‌آموز
            <NativeSelect name="choices" defaultValue={choices}>
              <option value="">همه وضعیت‌ها</option>
              <option value="HAS_CHOICES">دارای انتخاب</option>
              <option value="NO_CHOICES">بدون انتخاب</option>
            </NativeSelect>
          </label>
          <button type="submit" className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2">اعمال فیلتر</button>
        </form>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>فیلتر منتور و وضعیت انتخاب‌ها فقط روی دانش‌آموزان اعمال می‌شود.</span>
          {hasFilters && <Link href="/admin/users" className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-violet-700 hover:bg-violet-50"><X aria-hidden="true" className="h-3.5 w-3.5" />پاک کردن فیلترها</Link>}
        </div>
      </div>

      {(!role || role === "STUDENT") && <section className="flex flex-col gap-3">
        <h2 className="font-semibold text-slate-800">
          دانش‌آموزان و تخصیص منتور <span className="mr-2 text-xs font-normal text-slate-500">{toPersianDigits(filteredStudents.length)} از {toPersianDigits(students.length)} نفر</span>
        </h2>
        {filteredStudents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            {students.length === 0 ? "هنوز دانش‌آموزی ثبت نشده است." : "دانش‌آموزی مطابق با جست‌وجو و فیلترها یافت نشد."}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr className="text-right">
                  <th scope="col" className="w-14 px-3 py-2 font-medium">ردیف</th>
                  <th className="px-3 py-2 font-medium">نام</th>
                  <th className="px-3 py-2 font-medium">ایمیل</th>
                  <th className="px-3 py-2 font-medium">تعداد انتخاب‌ها</th>
                  <th className="px-3 py-2 font-medium">منتور</th>
                  <th className="px-3 py-2 font-medium">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((student, index) => (
                  <tr key={student.id}>
                    <td className="px-3 py-3 text-xs tabular-nums text-slate-500">{toPersianDigits(index + 1)}</td>
                    <td className="px-3 py-3 font-medium text-slate-900">
                      {student.name}
                    </td>
                    <td className="px-3 py-3 text-right text-slate-600" dir="ltr">
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
      </section>}

      {(!role || role === "MENTOR") && <section className="flex flex-col gap-3">
        <h2 className="font-semibold text-slate-800">منتورها <span className="mr-2 text-xs font-normal text-slate-500">{toPersianDigits(filteredMentors.length)} از {toPersianDigits(mentors.length)} نفر</span></h2>
        {filteredMentors.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            {mentors.length === 0 ? "هنوز منتوری ثبت نشده است." : "منتوری مطابق با جست‌وجو یافت نشد."}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full min-w-[500px] text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr className="text-right">
                  <th scope="col" className="w-14 px-3 py-2 font-medium">ردیف</th>
                  <th className="px-3 py-2 font-medium">نام</th>
                  <th className="px-3 py-2 font-medium">ایمیل</th>
                  <th className="px-3 py-2 font-medium">تعداد دانش‌آموزان</th>
                  <th className="px-3 py-2 font-medium">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMentors.map((mentor, index) => (
                  <tr key={mentor.id}>
                    <td className="px-3 py-3 text-xs tabular-nums text-slate-500">{toPersianDigits(index + 1)}</td>
                    <td className="px-3 py-3 font-medium text-slate-900">
                      {mentor.name}
                    </td>
                    <td className="px-3 py-3 text-right text-slate-600" dir="ltr">
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
      </section>}

      {(!role || role === "SUPERVISOR") && <section className="flex flex-col gap-3">
        <h2 className="font-semibold text-slate-800">ناظران <span className="mr-2 text-xs font-normal text-slate-500">{toPersianDigits(filteredSupervisors.length)} از {toPersianDigits(supervisors.length)} نفر</span></h2>
        {filteredSupervisors.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            {supervisors.length === 0 ? "هنوز ناظری ثبت نشده است." : "ناظری مطابق با جست‌وجو یافت نشد."}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full min-w-[500px] text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr className="text-right">
                  <th scope="col" className="w-14 px-3 py-2 font-medium">ردیف</th>
                  <th className="px-3 py-2 font-medium">نام</th>
                  <th className="px-3 py-2 font-medium">ایمیل</th>
                  <th className="px-3 py-2 font-medium">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSupervisors.map((supervisor, index) => (
                  <tr key={supervisor.id}>
                    <td className="px-3 py-3 text-xs tabular-nums text-slate-500">{toPersianDigits(index + 1)}</td>
                    <td className="px-3 py-3 font-medium text-slate-900">
                      {supervisor.name}
                    </td>
                    <td className="px-3 py-3 text-right text-slate-600" dir="ltr">
                      {supervisor.email}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/admin/users/${supervisor.id}`}
                          className="flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          ویرایش
                        </Link>
                        <DeleteUserButton
                          userId={supervisor.id}
                          userName={supervisor.name}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>}
    </div>
  );
}
