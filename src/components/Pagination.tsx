import Link from "next/link";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { toPersianDigits } from "@/lib/format";

export function Pagination({
  page,
  pageCount,
  buildHref,
}: {
  page: number;
  pageCount: number;
  buildHref: (page: number) => string;
}) {
  if (pageCount <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 py-5 text-sm">
      <Link
        href={buildHref(Math.max(1, page - 1))}
        className={`flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm ${
          page <= 1 ? "pointer-events-none opacity-40" : "hover:border-violet-200 hover:text-violet-600"
        }`}
      >
        <ChevronRight className="h-3.5 w-3.5" />
        قبلی
      </Link>
      <span className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white">
        صفحه {toPersianDigits(page)} از {toPersianDigits(pageCount)}
      </span>
      <Link
        href={buildHref(Math.min(pageCount, page + 1))}
        className={`flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm ${
          page >= pageCount ? "pointer-events-none opacity-40" : "hover:border-violet-200 hover:text-violet-600"
        }`}
      >
        بعدی
        <ChevronLeft className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
