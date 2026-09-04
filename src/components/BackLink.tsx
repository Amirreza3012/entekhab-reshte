import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-indigo-600 px-3 py-1.5 text-sm font-medium text-indigo-600 transition hover:bg-indigo-50"
    >
      <ArrowRight className="h-4 w-4" />
      {label}
    </Link>
  );
}
