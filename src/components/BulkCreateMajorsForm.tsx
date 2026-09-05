"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Upload, Download } from "lucide-react";
import {
  bulkCreateMajorsAction,
  type BulkCreateMajorsResult,
} from "@/app/admin/majors/actions";
import { toPersianDigits } from "@/lib/format";

const initialState: BulkCreateMajorsResult = {};

export function BulkCreateMajorsForm() {
  const [state, formAction, pending] = useActionState(
    bulkCreateMajorsAction,
    initialState
  );

  // Reset the file input after a run that created at least one major, using
  // React's "adjust state during render" pattern instead of an effect.
  const [formKey, setFormKey] = useState(0);
  const [lastHandledState, setLastHandledState] = useState(state);
  if (state !== lastHandledState) {
    setLastHandledState(state);
    if (state.successCount) setFormKey((k) => k + 1);
  }

  useEffect(() => {
    if (state.error) toast.error(state.error);
    else if (state.successCount !== undefined) {
      toast.success(
        state.successCount > 0
          ? `${toPersianDigits(state.successCount)} رشته با موفقیت ایجاد شد.`
          : "هیچ رشته‌ی جدیدی ایجاد نشد."
      );
    }
  }, [state]);

  return (
    <form
      key={formKey}
      action={formAction}
      className="flex flex-col gap-4 rounded-[1.5rem] border border-white bg-white/90 p-5 shadow-lg shadow-slate-200/40"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="file"
          name="file"
          accept=".xlsx,.xls"
          required
          className="flex-1 text-sm text-slate-600 file:ml-3 file:rounded-lg file:border file:border-slate-300 file:bg-slate-50 file:px-3 file:py-1.5 file:text-sm file:text-slate-700 file:transition hover:file:bg-slate-100"
        />
        <button
          type="submit"
          disabled={pending}
          className="flex items-center justify-center gap-2 rounded-xl bg-[#111827] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-violet-600 disabled:opacity-60"
        >
          <Upload className="h-4 w-4" />
          {pending ? "در حال بررسی و ایجاد..." : "آپلود و ایجاد رشته‌ها"}
        </button>
        <Link
          href="/admin/majors/template"
          className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-[#f6f7f2] px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-violet-200 hover:text-violet-600"
        >
          <Download className="h-4 w-4" />
          دانلود قالب نمونه
        </Link>
      </div>

      <p className="text-xs text-slate-500">
        ستون‌های الزامی: گروه آزمایشی، استان، دانشگاه، دوره تحصیلی، کدرشته
        محل، عنوان رشته. ستون‌های اختیاری: سال کنکور (پیش‌فرض ۱۴۰۴)، ظرفیت،
        نیمسال (اول/دوم/نامشخص)، جنسیت (زن/مرد/هردو)، توضیحات. اگر یک
        کدرشته‌محل برای دو جنسیت ظرفیت جدا دارد، برایش دو سطر جدا بنویسید.
      </p>

      {state.rowErrors && state.rowErrors.length > 0 && (
        <div className="max-h-56 overflow-y-auto rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <p className="mb-1 font-medium">
            {toPersianDigits(state.rowErrors.length)} ردیف نادیده گرفته شد:
          </p>
          <ul className="flex flex-col gap-0.5">
            {state.rowErrors.map((rowError, index) => (
              <li key={index}>
                سطر {toPersianDigits(rowError.row)}: {rowError.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </form>
  );
}
