"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import { LogIn } from "lucide-react";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(
    loginAction,
    initialState
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-3 flex justify-center">
          <Image
            src="/logo.png"
            alt="لوگو"
            width={96}
            height={64}
            className="object-contain"
          />
        </div>
        <h1 className="mb-1 text-center text-xl font-bold text-slate-900">
          سامانه انتخاب رشته
        </h1>
        <p className="mb-6 text-center text-sm text-slate-500">
          برای ورود، ایمیل و رمز عبور خود را وارد کنید
        </p>

        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-slate-700">
              ایمیل
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              placeholder="you@example.com"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="password"
              className="text-sm font-medium text-slate-700"
            >
              رمز عبور
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              placeholder="••••••••"
            />
          </div>

          {state.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="mt-2 flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-60"
          >
            <LogIn className="h-4 w-4" />
            {pending ? "در حال ورود..." : "ورود"}
          </button>
        </form>
      </div>
    </div>
  );
}
