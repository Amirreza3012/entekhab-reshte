import Link from "next/link";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { PageJump } from "@/components/PageJump";

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

  // The dropdown navigates on the client, where buildHref is not available, so
  // hand it the pieces of the link: the path, the page parameter (the one that
  // differs between two pages) and everything else in the query.
  const first = new URL(buildHref(1), "http://local");
  const second = new URL(buildHref(2), "http://local");
  const pageParam =
    [...second.searchParams.keys()].find(
      (key) => first.searchParams.get(key) !== second.searchParams.get(key)
    ) ?? "page";
  const query = [...first.searchParams].filter(([key]) => key !== pageParam);

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 py-5 text-sm">
      <Link
        href={buildHref(Math.max(1, page - 1))}
        className={`flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm ${
          page <= 1 ? "pointer-events-none opacity-40" : "hover:border-violet-200 hover:text-violet-600"
        }`}
      >
        <ChevronRight className="h-3.5 w-3.5" />
        قبلی
      </Link>
      <PageJump
        page={page}
        pageCount={pageCount}
        path={first.pathname}
        query={query}
        pageParam={pageParam}
      />
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
