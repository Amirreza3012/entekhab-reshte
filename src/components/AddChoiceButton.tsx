"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { addChoiceAction, type ActionResult } from "@/app/student/actions";

const initialState: ActionResult = {};

export function AddChoiceButton({
  majorId,
  disabled,
  disabledReason,
}: {
  majorId: string;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const [state, formAction, pending] = useActionState(
    addChoiceAction,
    initialState
  );

  useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state.error]);

  if (disabled) {
    return (
      <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs text-slate-500">
        {disabledReason}
      </span>
    );
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="majorId" value={majorId} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
      >
        {pending ? "..." : "افزودن به انتخاب‌ها"}
      </button>
    </form>
  );
}
