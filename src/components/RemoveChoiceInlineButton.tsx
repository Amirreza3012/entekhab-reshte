import { Trash2 } from "lucide-react";

export function RemoveChoiceInlineButton({
  action,
  choiceId,
  extraHiddenFields,
}: {
  action: (formData: FormData) => void | Promise<void>;
  choiceId: string;
  extraHiddenFields?: Record<string, string>;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs text-slate-500">
        انتخاب شده
      </span>
      <form action={action}>
        {Object.entries(extraHiddenFields ?? {}).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <input type="hidden" name="choiceId" value={choiceId} />
        <button
          type="submit"
          className="flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1.5 text-xs text-red-600 transition hover:bg-red-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
          حذف
        </button>
      </form>
    </div>
  );
}
