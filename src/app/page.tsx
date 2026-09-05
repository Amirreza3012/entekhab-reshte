import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, BarChart3, Check, MoveUp, Search, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ROLE_HOME } from "@/lib/roles";

export default async function Home() {
  const session = await auth();
  if (session?.user) redirect(ROLE_HOME[session.user.role]);

  return (
    <main className="min-h-screen overflow-hidden bg-[#111827] text-white">
      <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white"><Image src="/logo.png" alt="لوگوی باورنو" width={42} height={28} className="h-auto w-auto object-contain" loading="eager" /></span>
          <span><span className="block text-sm font-black">انتخاب هوشمند</span><span className="text-[10px] text-white/40">باورنو × دکتر ماهده خداپرست</span></span>
        </Link>
        <Link href="/login" className="flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-white hover:text-slate-950">ورود کاربران <ArrowLeft className="h-4 w-4" /></Link>
      </header>

      <section className="relative mx-auto grid min-h-[calc(100vh-92px)] max-w-7xl items-center gap-12 px-5 pb-20 pt-10 sm:px-8 lg:grid-cols-[1fr_1.05fr] lg:px-12 lg:py-16">
        <div className="pointer-events-none absolute -left-40 top-10 h-[34rem] w-[34rem] rounded-full bg-violet-600/15 blur-3xl" />
        <div className="relative z-10 text-center lg:text-right">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#dfff4f] px-4 py-2 text-[11px] font-black text-slate-950"><Sparkles className="h-3.5 w-3.5" /> انتخاب درست، اتفاقی نیست</div>
          <h1 className="text-5xl font-black leading-[1.22] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
            آینده‌ات را
            <span className="relative block text-[#dfff4f]">با انتخاب بساز<span className="absolute -bottom-2 right-1/2 h-1.5 w-36 translate-x-1/2 rounded-full bg-violet-500 lg:right-0 lg:translate-x-0" /></span>
          </h1>
          <p className="mx-auto mt-9 max-w-xl text-base leading-8 text-white/55 lg:mx-0 lg:text-lg">از میان صدها رشته‌محل، مسیر مناسب خودت را پیدا کن؛ اولویت‌هایت را بچین و با همراهی منتور، تصمیمی بگیر که به آن مطمئنی.</p>
          <div className="mt-9 flex flex-col items-center gap-4 sm:flex-row lg:justify-start">
            <Link href="/login" className="group flex w-full items-center justify-center gap-3 rounded-2xl bg-[#5b5cf0] px-7 py-4 text-sm font-black shadow-2xl shadow-violet-950/40 transition hover:-translate-y-1 hover:bg-[#6b6cf5] sm:w-auto">شروع انتخاب رشته <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-1" /></Link>
            <span className="flex items-center gap-2 text-xs text-white/40"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10"><Check className="h-3.5 w-3.5 text-[#dfff4f]" /></span> ویژه اعضای مجموعه باورنو</span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-xl lg:mx-0">
          <div className="absolute -inset-16 rounded-full bg-[#dfff4f]/8 blur-3xl" />
          <div className="relative rotate-[-1.5deg] rounded-[2.2rem] border border-white/10 bg-white/[.07] p-3 shadow-2xl shadow-black/30 backdrop-blur-xl">
            <div className="overflow-hidden rounded-[1.65rem] bg-[#f6f7f2] p-4 text-slate-950 sm:p-6">
              <div className="mb-6 flex items-center justify-between"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm"><Image src="/logo.png" alt="" width={33} height={22} className="h-auto w-auto object-contain" loading="eager" /></span><div><p className="text-xs font-black">انتخاب‌های من</p><p className="text-[9px] text-slate-400">۳ انتخاب از ۱۵۰</p></div></div><span className="rounded-lg bg-slate-900 px-3 py-1.5 text-[9px] font-bold text-white">ذخیره شده</span></div>
              <div className="mb-3 flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-[10px] text-slate-400 shadow-sm"><Search className="h-4 w-4 text-violet-500" /> جست‌وجوی رشته یا دانشگاه...</div>
              <div className="space-y-2.5">
                {[{ n: "۰۱", title: "دندانپزشکی", uni: "دانشگاه علوم پزشکی تهران", color: "bg-violet-500" }, { n: "۰۲", title: "پزشکی", uni: "دانشگاه علوم پزشکی شهید بهشتی", color: "bg-cyan-500" }, { n: "۰۳", title: "داروسازی", uni: "دانشگاه علوم پزشکی ایران", color: "bg-amber-400" }].map((item) => (
                  <div key={item.n} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm"><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.color} text-xs font-black text-white`}>{item.n}</span><div className="flex-1"><p className="text-xs font-extrabold">{item.title}</p><p className="mt-1 text-[9px] text-slate-400">{item.uni}</p></div><MoveUp className="h-4 w-4 text-slate-300" /></div>
                ))}
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-[#111827] p-4 text-white"><BarChart3 className="mb-2 h-5 w-5 text-[#dfff4f]" /><p className="text-[10px] font-bold">بررسی توسط منتور</p><p className="mt-1 text-[8px] text-white/40">همراهی تا انتخاب نهایی</p></div><div className="rounded-2xl bg-[#dfff4f] p-4"><Check className="mb-2 h-5 w-5" /><p className="text-[10px] font-black">مرتب و آماده</p><p className="mt-1 text-[8px] text-slate-600">اولویت‌بندی آسان</p></div></div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/8 px-5 py-5 text-center text-[11px] leading-6 text-white/35">
        این نرم‌افزار متعلق به <Link href="https://t.me/Amir_13185458" className="font-bold text-white/60 transition hover:text-[#dfff4f]">امیررضا ابراهیمی</Link> است و به‌صورت اختصاصی برای مجموعه‌ی باورنو و دکتر ماهده خداپرست طراحی و توسعه داده شده است.
      </footer>
    </main>
  );
}
