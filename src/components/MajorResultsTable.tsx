import type { Major } from "@/generated/prisma/client";
import { GENDER_LABELS, TERM_LABELS, toPersianDigits } from "@/lib/format";
import type { ReactNode } from "react";

export function MajorResultsTable({
  items,
  isChosen,
  renderAction,
}: {
  items: Major[];
  isChosen?: (major: Major) => boolean;
  renderAction: (major: Major) => ReactNode;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-10 text-center text-sm text-slate-500 shadow-sm">
        رشته‌ای با این فیلترها پیدا نشد.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-white bg-white/90 shadow-sm shadow-slate-200/70">
      <table className="w-full min-w-[1600px] text-sm">
        <thead className="bg-slate-50/80 text-xs text-slate-500">
          <tr className="text-right">
            <th className="whitespace-nowrap px-3 py-2 font-medium"></th>
            <th className="whitespace-nowrap px-3 py-2 font-medium">رشته</th>
            <th className="whitespace-nowrap px-3 py-2 font-medium">استان / دانشگاه</th>
            <th className="whitespace-nowrap px-3 py-2 font-medium">دوره تحصیلی</th>
            <th className="whitespace-nowrap px-3 py-2 font-medium">کدرشته‌محل</th>
            <th className="whitespace-nowrap px-3 py-2 font-medium">ظرفیت</th>
            <th className="whitespace-nowrap px-3 py-2 font-medium">جنسیت</th>
            <th className="whitespace-nowrap px-3 py-2 font-medium">توضیحات</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((major) => {
            const chosen = isChosen?.(major) ?? false;
            return (
              <tr key={major.id} className={`transition-colors hover:bg-violet-50/40 ${chosen ? "bg-slate-50 opacity-60" : ""}`}>
                <td className="whitespace-nowrap px-3 py-3 align-top">
                  {renderAction(major)}
                </td>
                <td className="whitespace-nowrap px-3 py-3 align-top">
                  <div className="font-semibold text-slate-900">{major.title}</div>
                  <div className="text-xs text-slate-500">{major.fieldGroup}</div>
                </td>
                <td className="whitespace-nowrap px-3 py-3 align-top text-slate-700">
                  <div>{major.province}</div>
                  <div className="text-xs text-slate-500">{major.university}</div>
                </td>
                <td className="whitespace-nowrap px-3 py-3 align-top text-slate-700">
                  {major.studyPeriod}
                  <div className="text-xs text-slate-400">
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
                <td className="whitespace-nowrap px-3 py-3 align-top text-xs text-slate-500">
                  {major.description ?? "-"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
