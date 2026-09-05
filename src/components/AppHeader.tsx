"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, LogOut, Menu, Sparkles, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { signOutAction } from "@/app/actions/auth";

export type NavLink = { href: string; label: string; icon: ReactNode };

export function AppHeader({ title, userName, links }: { title: string; userName: string; links: NavLink[] }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const activeHref = links.map((link) => link.href).filter((href) => pathname === href || pathname.startsWith(`${href}/`)).sort((a, b) => b.length - a.length)[0];
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) { setLastPathname(pathname); setMenuOpen(false); }

  const navigation = (
    <nav className="flex flex-col gap-1.5">
      <p className="mb-2 px-3 text-[10px] font-bold tracking-[0.18em] text-white/35">منوی اصلی</p>
      {links.map((link) => {
        const isActive = link.href === activeHref;
        return (
          <Link key={link.href} href={link.href} className={`group flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-medium transition-all ${isActive ? "bg-white text-slate-950 shadow-lg shadow-black/10" : "text-white/65 hover:bg-white/8 hover:text-white"}`}>
            <span className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${isActive ? "bg-[#dfff4f] text-slate-950" : "bg-white/8 text-white/70 group-hover:bg-white/12"}`}>{link.icon}</span>
            <span className="flex-1">{link.label}</span>
            {isActive && <ChevronLeft className="h-4 w-4 text-slate-400" />}
          </Link>
        );
      })}
    </nav>
  );

  const account = (
    <div className="rounded-[1.4rem] border border-white/10 bg-white/6 p-3">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#dfff4f] text-sm font-black text-slate-950">{userName.trim().charAt(0) || "ک"}</div>
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-white">{userName}</p><p className="mt-0.5 text-[10px] text-white/40">حساب کاربری فعال</p></div>
      </div>
      <form action={signOutAction}>
        <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-medium text-white/60 transition hover:border-rose-400/30 hover:bg-rose-400/10 hover:text-rose-200"><LogOut className="h-3.5 w-3.5" /> خروج از حساب</button>
      </form>
    </div>
  );

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-[#f6f7f2]/90 px-4 py-3 backdrop-blur-xl lg:fixed lg:inset-y-0 lg:right-0 lg:flex lg:w-72 lg:flex-col lg:overflow-hidden lg:border-b-0 lg:bg-[#111827] lg:p-5 lg:text-white lg:shadow-2xl lg:shadow-slate-900/15">
        <div className="flex items-center justify-between lg:block">
          <Link href="/" className="flex items-center gap-3 lg:mb-9 lg:px-1">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm lg:h-12 lg:w-12"><Image src="/logo.png" alt="لوگو" width={42} height={28} className="h-auto w-auto object-contain" loading="eager" /></span>
            <span><span className="block text-sm font-black tracking-tight text-slate-950 lg:text-white">انتخاب هوشمند</span><span className="mt-0.5 block text-[10px] font-medium text-slate-400 lg:text-white/35">{title}</span></span>
          </Link>
          <button type="button" onClick={() => setMenuOpen((value) => !value)} aria-label={menuOpen ? "بستن منو" : "باز کردن منو"} aria-expanded={menuOpen} className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm lg:hidden">{menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
        </div>
        <div className="hidden min-h-0 flex-1 flex-col lg:flex">
          <div className="mb-5 rounded-2xl bg-gradient-to-l from-violet-500/20 to-cyan-400/10 p-3.5 text-xs leading-6 text-white/65"><div className="mb-1 flex items-center gap-2 font-bold text-[#dfff4f]"><Sparkles className="h-3.5 w-3.5" /> مسیر آینده از اینجا شروع می‌شود</div>انتخاب‌ها را دقیق، ساده و آگاهانه مدیریت کنید.</div>
          <div className="min-h-0 flex-1 overflow-y-auto">{navigation}</div>
          <div className="mt-5">{account}</div>
        </div>
      </header>
      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-sm lg:hidden" onClick={() => setMenuOpen(false)}>
          <div className="absolute inset-x-3 top-20 rounded-[1.75rem] bg-[#111827] p-4 shadow-2xl" onClick={(event) => event.stopPropagation()}>{navigation}<div className="mt-4">{account}</div></div>
        </div>
      )}
    </>
  );
}
