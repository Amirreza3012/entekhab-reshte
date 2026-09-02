import type { Major } from "@/generated/prisma/client";
import { GENDER_LABELS, TERM_LABELS, toPersianDigits } from "@/lib/format";
import type { ReactNode } from "react";

export function MajorResultsTable({
  items,
  renderAction,
}: {
  items: Major[];
  renderAction: (major: Major) => ReactNode;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
        رشته‌ای با این فیلترها پیدا نشد.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full min-w-[900px] text-sm">
        <thead className="bg-slate-50 text-slate-500">
          <tr className="text-right">
            <th className="px-3 py-2 font-medium">رشته</th>
            <th className="px-3 py-2 font-medium">استان / دانشگاه</th>
            <th className="px-3 py-2 font-medium">دوره تحصیلی</th>
            <th className="px-3 py-2 font-medium">کدرشته‌محل</th>
            <th className="px-3 py-2 font-medium">ظرفیت</th>
            <th className="whitespace-nowrap px-3 py-2 font-medium">جنسیت</th>
            <th className="px-3 py-2 font-medium">توضیحات</th>
            <th className="px-3 py-2 font-medium"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((major) => (
            <tr key={major.id}>
              <td className="px-3 py-3 align-top">
                <div className="font-medium text-slate-900">{major.title}</div>
                <div className="text-xs text-slate-500">{major.fieldGroup}</div>
              </td>
              <td className="px-3 py-3 align-top text-slate-700">
                <div>{major.province}</div>
                <div className="text-xs text-slate-500">{major.university}</div>
              </td>
              <td className="px-3 py-3 align-top text-slate-700">
                {major.studyPeriod}
                <div className="text-xs text-slate-400">
                  {TERM_LABELS[major.termType]}
                </div>
              </td>
              <td className="px-3 py-3 align-top text-right text-slate-700" dir="ltr">
                {toPersianDigits(major.majorCode)}
              </td>
              <td className="px-3 py-3 align-top text-slate-700">
                {major.capacity != null ? toPersianDigits(major.capacity) : "-"}
              </td>
              <td className="whitespace-nowrap px-3 py-3 align-top text-slate-700">
                {GENDER_LABELS[major.gender]}
              </td>
              <td className="px-3 py-3 align-top text-xs text-slate-500">
                {major.description ?? "-"}
              </td>
              <td className="whitespace-nowrap px-3 py-3 align-top">
                {renderAction(major)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
