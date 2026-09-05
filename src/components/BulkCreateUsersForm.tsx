"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Upload, Download } from "lucide-react";
import { bulkCreateUsersAction, type BulkCreateResult } from "@/app/admin/actions";
import { toPersianDigits } from "@/lib/format";

const initialState: BulkCreateResult = {};

export function BulkCreateUsersForm() {
  const [state, formAction, pending] = useActionState(
    bulkCreateUsersAction,
    initialState
  );

  const [fileName, setFileName] = useState<string | null>(null);

  // Reset the file input after a run that created at least one user, using
  // React's "adjust state during render" pattern instead of an effect.
  const [formKey, setFormKey] = useState(0);
  const [lastHandledState, setLastHandledState] = useState(state);
  if (state !== lastHandledState) {
    setLastHandledState(state);
    if (state.successCount) {
      setFormKey((k) => k + 1);
      setFileName(null);
    }
  }

  useEffect(() => {
    if (state.error) toast.error(state.error);
    else if (state.successCount !== undefined) {
      toast.success(
        state.successCount > 0
          ? `${toPersianDigits(state.successCount)} کاربر با موفقیت ایجاد شد.`
          : "هیچ کاربر جدیدی ایجاد نشد."
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
        <label className="flex flex-1 cursor-pointer items-center gap-3 rounded-lg border border-slate-300 bg-white px-1.5 py-1.5 text-sm text-slate-600 transition hover:border-slate-400">
          <span className="shrink-0 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-100">
            انتخاب فایل
          </span>
          <span className="truncate">{fileName ?? "فایلی انتخاب نشده"}</span>
          <input
            type="file"
            name="file"
            accept=".xlsx,.xls"
            required
            className="sr-only"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="flex items-center justify-center gap-2 rounded-xl bg-[#111827] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-violet-600 disabled:opacity-60"
        >
          <Upload className="h-4 w-4" />
          {pending ? "در حال بررسی و ایجاد..." : "آپلود و ایجاد کاربران"}
        </button>
        <Link
          href="/admin/users/template"
          className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-[#f6f7f2] px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-violet-200 hover:text-violet-600"
        >
          <Download className="h-4 w-4" />
          دانلود قالب نمونه
        </Link>
      </div>

      <p className="text-xs text-slate-500">
        فایل باید ستون‌های «نام و نام خانوادگی»، «ایمیل»، «رمز عبور» و «نقش» را
        داشته باشد. مقدار نقش یکی از این‌ها: دانش‌آموز، منتور، ناظر، ادمین.
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
