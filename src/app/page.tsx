import Image from "next/image";
import Link from "next/link";
import { LogIn } from "lucide-react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ROLE_HOME } from "@/lib/roles";

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    redirect(ROLE_HOME[session.user.role]);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-50 px-4 text-center">
      <Image
        src="/logo.svg"
        alt="لوگوی سامانه انتخاب رشته"
        width={110}
        height={110}
        className="rounded-3xl shadow-sm"
        priority
      />

      <div className="flex max-w-lg flex-col gap-2">
        <h1 className="text-2xl font-bold text-slate-900">
          سامانه انتخاب رشته
        </h1>
        <p className="text-sm leading-7 text-slate-600">
          این نرم‌افزار متعلق به امیررضا ابراهیمی است و به‌صورت اختصاصی برای
          مجموعه‌ی باورنو و دکتر ماهده خداپرست طراحی و توسعه داده شده است.
        </p>
      </div>

      <Link
        href="/login"
        className="flex items-center gap-2 rounded-lg bg-slate-900 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700"
      >
        <LogIn className="h-4 w-4" />
        ورود به سامانه
      </Link>
    </div>
  );
}
