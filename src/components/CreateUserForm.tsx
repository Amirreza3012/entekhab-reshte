"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { PasswordInput } from "@/components/PasswordInput";
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
      className="grid grid-cols-1 gap-3 rounded-[1.5rem] border border-white bg-white/90 p-5 shadow-lg shadow-slate-200/40 sm:grid-cols-2 lg:grid-cols-4"
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
      <PasswordInput
        name="password"
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
        <option value="SUPERVISOR">ناظر</option>
        <option value="ADMIN">ادمین</option>
      </select>

      <button
        type="submit"
        disabled={pending}
        className="flex items-center justify-center gap-2 rounded-xl bg-[#5b5cf0] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-violet-200 transition hover:-translate-y-0.5 hover:bg-[#5051dc] disabled:opacity-60 lg:col-span-4"
      >
        <UserPlus className="h-4 w-4" />
        {pending ? "در حال ایجاد..." : "ایجاد کاربر"}
      </button>
    </form>
  );
}
