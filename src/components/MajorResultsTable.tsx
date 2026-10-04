import type { Major } from "@/generated/prisma/client";
import { GENDER_LABELS, TERM_LABELS, majorTint, toPersianDigits } from "@/lib/format";
import { MajorBadges } from "@/components/MajorBadges";
import { MajorTintLegend } from "@/components/MajorTintLegend";
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown } from "lucide-react";
import { MAJOR_SORT_OPTIONS, majorSortHref, resolveMajorSort, type MajorSortField } from "@/lib/majorSorting";

export function MajorResultsTable({
  items,
  isChosen,
  renderAction,
  basePath = "/student",
  searchParams = {},
}: {
  items: Major[];
  isChosen?: (major: Major) => boolean;
  renderAction: (major: Major) => ReactNode;
  basePath?: string;
  searchParams?: Record<string, string | undefined>;
}) {
  const selected = resolveMajorSort(searchParams.sort, searchParams.sortDirection);
  const heading = (label: string, field: MajorSortField) => {
    const active = selected.field === field;
    const next = active && selected.direction === "asc" ? "desc" : "asc";
    const Icon = active ? selected.direction === "asc" ? ArrowUp : ArrowDown : ArrowUpDown;
    return (
      <th scope="col" className="whitespace-nowrap px-3 py-2 font-medium" aria-sort={active ? selected.direction === "asc" ? "ascending" : "descending" : "none"}>
        <Link href={majorSortHref(basePath, searchParams, field, next)} scroll={false} prefetch={false}
          aria-label={`مرتب‌سازی ${label}؛ ${next === "asc" ? "صعودی" : "نزولی"}`}
          className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 ${active ? "bg-violet-100 text-violet-800" : "text-slate-600 hover:bg-violet-50 hover:text-violet-700"}`}>
          {label}<Icon aria-hidden="true" className="h-3.5 w-3.5" />
        </Link>
      </th>
    );
  };
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-10 text-center text-sm text-slate-500 shadow-sm">
        رشته‌ای با این فیلترها پیدا نشد.
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-3">
    <MajorTintLegend />
    <form key={`${selected.field}:${selected.direction}`} action={basePath} method="get" className="flex flex-wrap items-center gap-2 rounded-2xl border border-white bg-white/90 p-3 text-xs shadow-sm">
      {Object.entries(searchParams).filter(([key, value]) => typeof value === "string" && value && !["page", "sort", "sortDirection"].includes(key))
        .map(([key, value]) => <input key={key} type="hidden" name={key} value={value} />)}
      <label className="flex flex-wrap items-center gap-2 font-semibold text-slate-700">مرتب‌سازی بر اساس
        <span className="relative block min-w-0 max-w-full">
          <select name="sort" defaultValue={selected.field} className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pr-3 pl-8 text-sm text-slate-800 outline-none">
            {MAJOR_SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <ChevronDown aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </span>
      </label>
      <div className="relative min-w-[7rem]">
        <select name="sortDirection" aria-label="جهت مرتب‌سازی" defaultValue={selected.direction} className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pr-3 pl-8 text-sm text-slate-800 outline-none">
          <option value="asc">صعودی</option><option value="desc">نزولی</option>
        </select>
        <ChevronDown aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>
      <button type="submit" className="rounded-xl bg-violet-600 px-3 py-2 font-semibold text-white hover:bg-violet-700">اعمال مرتب‌سازی</button>
      <span className="text-slate-500">روی تمام نتایج جست‌وجو</span>
    </form>
    <div className="max-w-full overflow-x-auto rounded-2xl border border-white bg-white/90 shadow-sm shadow-slate-200/70">
      <table className="w-full min-w-[1600px] text-sm">
        <thead className="bg-slate-50/80 text-xs text-slate-500">
          <tr className="text-right">
            <th className="whitespace-nowrap px-3 py-2 font-medium"></th>
            {heading("رشته", "title")}
            {heading("استان / دانشگاه", "province")}
            {heading("دوره تحصیلی", "studyPeriod")}
            {heading("کدرشته‌محل", "majorCode")}
            {heading("ظرفیت", "capacity")}
            {heading("جنسیت", "gender")}
            {heading("توضیحات", "description")}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((major) => {
            const chosen = isChosen?.(major) ?? false;
            const tint = majorTint(major.admissionType, major.entryYear);
            return (
              <tr
                key={major.id}
                className={`[&>td]:transition-colors [&>td]:duration-150 motion-reduce:[&>td]:transition-none ${chosen ? "[&>td]:bg-slate-100 [&:hover>td]:bg-slate-100" : tint.row}`}
              >
                <td className="whitespace-nowrap px-3 py-3 align-top">
                  {renderAction(major)}
                </td>
                <td className="min-w-[21rem] max-w-[28rem] px-3 py-3 align-top">
                  <div className={`text-sm font-semibold leading-6 ${chosen ? "text-slate-600" : "text-slate-900"}`}>
                    {major.title}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] font-semibold leading-5">
                    <span className="me-1 text-xs font-normal text-slate-600">{major.fieldGroup}</span>
                    {chosen && <span className="rounded-md bg-slate-200 px-1.5 text-[10px] font-medium text-slate-700">انتخاب شده</span>}
                    <MajorBadges major={major} />
                  </div>
                </td>
                <td className="whitespace-nowrap px-3 py-3 align-top text-slate-700">
                  <div>{major.province}</div>
                  <div className="text-xs text-slate-600">{major.university}</div>
                </td>
                <td className="whitespace-nowrap px-3 py-3 align-top text-slate-700">
                  {major.studyPeriod}
                  <div className="text-xs text-slate-600">
                    {TERM_LABELS[major.termType]}
                  </div>
                </td>
                <td className="whitespace-nowrap px-3 py-3 align-top text-right text-slate-700" dir="ltr">
                  {toPersianDigits(major.majorCode)}
                </td>
                <td className="whitespace-nowrap px-3 py-3 align-top text-slate-700">
                  {major.capacity != null ? toPersianDigits(major.capacity) : "-"}
                </td>
                <td className="whitespace-nowrap px-3 py-3 align-top text-slate-700">
                  {GENDER_LABELS[major.gender]}
                </td>
                <td className="min-w-[22rem] max-w-md whitespace-normal px-3 py-3 align-top text-xs leading-6 text-slate-600">
                  {major.description ?? "-"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
    </div>
  );
}
