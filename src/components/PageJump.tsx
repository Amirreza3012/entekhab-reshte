"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { NativeSelect } from "@/components/NativeSelect";
import { toPersianDigits } from "@/lib/format";

// «صفحه [n] از m» with a dropdown, to jump straight to any page.
export function PageJump({
  page,
  pageCount,
  path,
  query,
  pageParam,
}: {
  page: number;
  pageCount: number;
  path: string;
  /** Every query parameter of the current list except the page itself. */
  query: [string, string][];
  pageParam: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <label className="flex items-center gap-2 rounded-xl bg-slate-900 py-1 pr-3 pl-1 text-xs font-bold text-white">
      صفحه
      <NativeSelect
        // Remount on navigation so the dropdown shows the page that was loaded.
        key={page}
        density="sm"
        wrapperClassName="w-[4.5rem]"
        className="!min-h-8 font-bold text-slate-900"
        defaultValue={page}
        disabled={pending}
        aria-label="رفتن به صفحه"
        onChange={(event) => {
          const params = new URLSearchParams(query);
          params.set(pageParam, event.target.value);
          startTransition(() => router.push(`${path}?${params.toString()}`));
        }}
      >
        {Array.from({ length: pageCount }, (_, index) => (
          <option key={index + 1} value={index + 1}>
            {toPersianDigits(index + 1)}
          </option>
        ))}
      </NativeSelect>
      <span className="pl-2">از {toPersianDigits(pageCount)}</span>
    </label>
  );
}
