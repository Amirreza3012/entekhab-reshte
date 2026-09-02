"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { signOutAction } from "@/app/actions/auth";

export type NavLink = {
  href: string;
  label: string;
  icon: ReactNode;
};

export function AppHeader({
  title,
  userName,
  links,
}: {
  title: string;
  userName: string;
  links: NavLink[];
}) {
  const pathname = usePathname();

  const activeHref = links
    .map((l) => l.href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="لوگو"
              width={42}
              height={28}
              className="object-contain"
            />
            <span className="text-base font-bold text-slate-900">
              {title}
            </span>
          </Link>
          <nav className="flex items-center gap-1">
            {links.map((link) => {
              const isActive = link.href === activeHref;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition ${
                    isActive
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {link.icon}
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">{userName}</span>
          <form action={signOutAction}>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50"
            >
              <LogOut className="h-4 w-4" />
              خروج
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
