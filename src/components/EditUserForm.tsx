"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { PasswordInput } from "@/components/PasswordInput";
import { NativeSelect } from "@/components/NativeSelect";
import { updateUserAction, type ActionResult } from "@/app/admin/actions";

const initialState: ActionResult = {};

export function EditUserForm({
  userId,
  defaultName,
  defaultEmail,
  defaultRole,
  defaultNationalId,
}: {
  userId: string;
  defaultName: string;
  defaultEmail: string;
  defaultRole: "ADMIN" | "SUPERVISOR" | "MENTOR" | "STUDENT";
  defaultNationalId: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    updateUserAction,
    initialState
  );

  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [role, setRole] = useState(defaultRole);
  const [nationalId, setNationalId] = useState(defaultNationalId ?? "");
  const [password, setPassword] = useState("");

  // Clear the password field on a successful save, using React's "adjust
  // state during render" pattern instead of setState inside an effect.
  const [lastHandledState, setLastHandledState] = useState(state);
  if (state !== lastHandledState) {
    setLastHandledState(state);
    if (state.success) setPassword("");
  }

  useEffect(() => {
    if (state.error) toast.error(state.error);
    if (state.success) toast.success(state.success);
  }, [state]);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-5 rounded-[1.5rem] border border-white bg-white/90 p-6 shadow-lg shadow-slate-200/40"
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
            dir="ltr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700">کد ملی (اختیاری)</label>
          <input
            name="nationalId"
            value={nationalId}
            onChange={(e) => setNationalId(e.target.value)}
            inputMode="numeric"
            dir="ltr"
            maxLength={10}
            placeholder="۱۰ رقم"
            className="rounded-lg border border-slate-300 px-3 py-2 text-left text-sm outline-none focus:border-slate-500"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700">نقش</label>
          <NativeSelect
            name="role"
            value={role}
            onChange={(e) =>
              setRole(
                e.target.value as "ADMIN" | "SUPERVISOR" | "MENTOR" | "STUDENT"
              )
            }
          >
            <option value="STUDENT">دانش‌آموز</option>
            <option value="MENTOR">منتور</option>
            <option value="SUPERVISOR">ناظر</option>
            <option value="ADMIN">ادمین</option>
          </NativeSelect>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700">
            رمز عبور جدید (اختیاری)
          </label>
          <PasswordInput
            name="password"
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
        className="flex items-center gap-2 self-start rounded-xl bg-[#5b5cf0] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-violet-200 transition hover:-translate-y-0.5 hover:bg-[#5051dc] disabled:opacity-60"
      >
        <Save className="h-4 w-4" />
        {pending ? "در حال ذخیره..." : "ذخیره تغییرات"}
      </button>
    </form>
  );
}
