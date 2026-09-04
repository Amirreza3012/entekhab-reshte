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

  // Reset the file input after a run that created at least one user, using
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
          ? `${toPersianDigits(state.successCount)} کاربر با موفقیت ایجاد شد.`
          : "هیچ کاربر جدیدی ایجاد نشد."
      );
    }
  }, [state]);

  return (
    <form
      key={formKey}
      action={formAction}
      className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4"
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
          className="flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-60"
        >
          <Upload className="h-4 w-4" />
          {pending ? "در حال بررسی و ایجاد..." : "آپلود و ایجاد کاربران"}
        </button>
        <Link
          href="/admin/users/template"
          className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
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
