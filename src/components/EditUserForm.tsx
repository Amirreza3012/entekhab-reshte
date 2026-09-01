"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { updateUserAction, type ActionResult } from "@/app/admin/actions";

const initialState: ActionResult = {};

export function EditUserForm({
  userId,
  defaultName,
  defaultEmail,
  defaultRole,
}: {
  userId: string;
  defaultName: string;
  defaultEmail: string;
  defaultRole: "ADMIN" | "MENTOR" | "STUDENT";
}) {
  const [state, formAction, pending] = useActionState(
    updateUserAction,
    initialState
  );

  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [role, setRole] = useState(defaultRole);
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (state.error) toast.error(state.error);
    if (state.success) {
      toast.success(state.success);
      setPassword("");
    }
  }, [state]);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4"
    >
      <input type="hidden" name="userId" value={userId} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700">
            نام و نام خانوادگی
          </label>
          <input
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700">ایمیل</label>
          <input
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700">نقش</label>
          <select
            name="role"
            value={role}
            onChange={(e) =>
              setRole(e.target.value as "ADMIN" | "MENTOR" | "STUDENT")
            }
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
          >
            <option value="STUDENT">دانش‌آموز</option>
            <option value="MENTOR">منتور</option>
            <option value="ADMIN">ادمین</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700">
            رمز عبور جدید (اختیاری)
          </label>
          <input
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="برای عدم تغییر خالی بگذارید"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-60"
      >
        {pending ? "در حال ذخیره..." : "ذخیره تغییرات"}
      </button>
    </form>
  );
}
