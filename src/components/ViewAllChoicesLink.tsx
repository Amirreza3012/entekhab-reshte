import Link from "next/link";
import { ExternalLink } from "lucide-react";

// Opens the whole list on one page in a new tab (the list itself is paginated).
export function ViewAllChoicesLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 rounded-xl border border-white/15 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:text-violet-600"
    >
      <ExternalLink className="h-4 w-4" />
      مشاهده کامل
    </Link>
  );
}
