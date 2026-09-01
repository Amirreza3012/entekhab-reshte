"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { createUserAction, type ActionResult } from "@/app/admin/actions";

const initialState: ActionResult = {};

export function CreateUserForm() {
  const [state, formAction, pending] = useActionState(
    createUserAction,
    initialState
  );

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("STUDENT");

  // Reset fields on a successful submission (but not on error) using React's
  // "adjust state during render" pattern, so it doesn't need an effect.
  const [lastHandledState, setLastHandledState] = useState(state);
  if (state !== lastHandledState) {
    setLastHandledState(state);
    if (state.success) {
      setName("");
      setEmail("");
      setPassword("");
      setRole("STUDENT");
    }
  }

  useEffect(() => {
    if (state.error) toast.error(state.error);
    if (state.success) toast.success(state.success);
  }, [state]);

  return (
    <form
      action={formAction}
      className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      <input
        name="name"
        placeholder="نام و نام خانوادگی"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
      />
      <input
        name="email"
        type="email"
        placeholder="ایمیل"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
      />
      <input
        name="password"
        type="password"
        placeholder="رمز عبور موقت"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
      />
      <select
        name="role"
        value={role}
        onChange={(e) => setRole(e.target.value)}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
      >
        <option value="STUDENT">دانش‌آموز</option>
        <option value="MENTOR">منتور</option>
        <option value="ADMIN">ادمین</option>
      </select>

      <button
        type="submit"
        disabled={pending}
        className="flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-60 lg:col-span-4"
      >
        <UserPlus className="h-4 w-4" />
        {pending ? "در حال ایجاد..." : "ایجاد کاربر"}
      </button>
    </form>
  );
}
