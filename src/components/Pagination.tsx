import Link from "next/link";
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
    <div className="flex items-center justify-center gap-2 py-4 text-sm">
      <Link
        href={buildHref(Math.max(1, page - 1))}
        className={`rounded-lg border border-slate-300 px-3 py-1.5 ${
          page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-slate-50"
        }`}
      >
        قبلی
      </Link>
      <span className="text-slate-500">
        صفحه {toPersianDigits(page)} از {toPersianDigits(pageCount)}
      </span>
      <Link
        href={buildHref(Math.min(pageCount, page + 1))}
        className={`rounded-lg border border-slate-300 px-3 py-1.5 ${
          page >= pageCount ? "pointer-events-none opacity-40" : "hover:bg-slate-50"
        }`}
      >
        بعدی
      </Link>
    </div>
  );
}
