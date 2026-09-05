"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";

type AddResult = { error?: string };

export function ChoiceToggleButton({
  majorId,
  choiceId,
  addAction,
  removeAction,
  disabled,
  disabledReason,
  extraHiddenFields,
}: {
  majorId: string;
  choiceId: string | null;
  addAction: (prev: AddResult, formData: FormData) => Promise<AddResult>;
  removeAction: (formData: FormData) => void | Promise<void>;
  disabled?: boolean;
  disabledReason?: string;
  extraHiddenFields?: Record<string, string>;
}) {
  const [addState, addFormAction, addPending] = useActionState(addAction, {});
  const [, removeFormAction, removePending] = useActionState(
    async (_prev: null, formData: FormData) => {
      await removeAction(formData);
      return null;
    },
    null
  );

  useEffect(() => {
    if (addState.error) toast.error(addState.error);
  }, [addState.error]);

  const extraInputs = Object.entries(extraHiddenFields ?? {}).map(
    ([name, value]) => (
      <input key={name} type="hidden" name={name} value={value} />
    )
  );

  if (choiceId) {
    return (
      <form action={removeFormAction}>
        {extraInputs}
        <input type="hidden" name="choiceId" value={choiceId} />
        <button
          type="submit"
          disabled={removePending}
          title="حذف از انتخاب‌ها"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-100 bg-rose-50 text-rose-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-rose-100 disabled:translate-y-0 disabled:opacity-60"
        >
          <X className="h-4 w-4" />
        </button>
      </form>
    );
  }

  if (disabled) {
    return (
      <span
        title={disabledReason}
        className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-300"
      >
        <Plus className="h-4 w-4" />
      </span>
    );
  }

  return (
    <form action={addFormAction}>
      {extraInputs}
      <input type="hidden" name="majorId" value={majorId} />
      <button
        type="submit"
        disabled={addPending}
        title="افزودن به انتخاب‌ها"
        className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#dfff4f] text-slate-950 shadow-sm transition hover:-translate-y-0.5 hover:bg-[#d3f63e] disabled:translate-y-0 disabled:opacity-60"
      >
        <Plus className="h-4 w-4" />
      </button>
    </form>
  );
}
