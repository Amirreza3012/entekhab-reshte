"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useState } from "react";
import { ArrowLeft, ArrowRight, Check, LogIn, ShieldCheck, Sparkles } from "lucide-react";
import { PasswordInput } from "@/components/PasswordInput";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <main className="grid min-h-screen bg-[#f6f7f2] lg:grid-cols-[1.05fr_.95fr]">
      <section className="relative hidden overflow-hidden bg-[#111827] p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div className="absolute -left-32 -top-24 h-96 w-96 rounded-full bg-violet-600/25 blur-3xl" />
        <div className="absolute -bottom-20 right-0 h-80 w-80 rounded-full bg-[#dfff4f]/10 blur-3xl" />
        <Link href="/" className="relative z-10 flex w-fit items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white"><Image src="/logo.png" alt="لوگوی باورنو" width={42} height={28} className="h-auto w-auto object-contain" loading="eager" /></span><span><span className="block text-sm font-black">انتخاب هوشمند</span><span className="text-[10px] text-white/35">سامانه تخصصی انتخاب رشته</span></span></Link>
        <div className="relative z-10 max-w-lg">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#dfff4f] px-4 py-2 text-[10px] font-black text-slate-950"><Sparkles className="h-3.5 w-3.5" /> فضای اختصاصی شما</span>
          <h1 className="text-5xl font-black leading-[1.3] tracking-[-0.05em]">همه‌چیز برای یک انتخاب <span className="text-[#dfff4f]">آگاهانه</span></h1>
          <p className="mt-6 text-sm leading-8 text-white/50">جست‌وجو، مقایسه و اولویت‌بندی رشته‌ها در یک محیط ساده؛ همراه با بازخورد مستقیم منتور شما.</p>
          <div className="mt-8 grid grid-cols-2 gap-3">
            {["دسترسی به بانک رشته‌ها", "ذخیره امن انتخاب‌ها", "همراهی منتور", "خروجی PDF نهایی"].map((item) => <div key={item} className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/5 px-3 py-3 text-xs text-white/60"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#dfff4f]/15"><Check className="h-3 w-3 text-[#dfff4f]" /></span>{item}</div>)}
          </div>
        </div>
        <p className="relative z-10 text-[10px] text-white/25">باورنو × دکتر ماهده خداپرست</p>
      </section>

      <section className="relative flex items-center justify-center px-5 py-16 sm:px-10">
        <Link href="/" className="absolute right-5 top-5 flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold text-slate-500 shadow-sm transition hover:text-violet-600 sm:right-8 sm:top-8"><ArrowRight className="h-4 w-4" /> بازگشت</Link>
        <div className="w-full max-w-md">
          <div className="mb-9 lg:hidden"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm"><Image src="/logo.png" alt="لوگو" width={45} height={30} className="h-auto w-auto object-contain" loading="eager" /></span></div>
          <p className="mb-2 text-xs font-black text-violet-600">ورود به حساب کاربری</p>
          <h2 className="text-3xl font-black tracking-[-0.04em] text-slate-950 sm:text-4xl">خوش برگشتی!</h2>
          <p className="mt-3 text-sm leading-7 text-slate-500">ایمیل و رمز عبور خود را وارد کنید تا از همان‌جایی که بودید ادامه دهید.</p>

          <form action={formAction} className="mt-9 flex flex-col gap-5">
            <div className="flex flex-col gap-2"><label htmlFor="email" className="text-xs font-bold text-slate-700">آدرس ایمیل</label><input id="email" name="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="h-13 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none shadow-sm placeholder:text-slate-300" placeholder="name@example.com" dir="ltr" /></div>
            <div className="flex flex-col gap-2"><label htmlFor="password" className="text-xs font-bold text-slate-700">رمز عبور</label><PasswordInput id="password" name="password" required value={password} onChange={(event) => setPassword(event.target.value)} className="h-13 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none shadow-sm placeholder:text-slate-300" placeholder="••••••••" /></div>
            {state.error && <p className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-600">{state.error}</p>}
            <button type="submit" disabled={pending} className="group mt-1 flex h-13 items-center justify-center gap-2 rounded-2xl bg-[#5b5cf0] text-sm font-black text-white shadow-xl shadow-violet-200 transition hover:-translate-y-0.5 hover:bg-[#5051dc] disabled:translate-y-0 disabled:opacity-60"><LogIn className="h-4 w-4" />{pending ? "در حال ورود..." : "ورود به سامانه"}<ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-1" /></button>
          </form>
          <div className="mt-7 flex items-center justify-center gap-2 border-t border-slate-200 pt-6 text-[11px] text-slate-400"><ShieldCheck className="h-4 w-4 text-emerald-500" /> اطلاعات شما نزد ما امن است</div>
        </div>
      </section>
    </main>
  );
}
