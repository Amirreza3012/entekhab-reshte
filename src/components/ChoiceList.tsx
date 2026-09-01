import type { Choice, Major } from "@/generated/prisma/client";
import { toPersianDigits } from "@/lib/format";

type ChoiceWithMajor = Choice & { major: Major };

export function ChoiceList({
  choices,
  moveAction,
  removeAction,
  readOnly,
  extraHiddenFields,
}: {
  choices: ChoiceWithMajor[];
  moveAction?: (formData: FormData) => void | Promise<void>;
  removeAction?: (formData: FormData) => void | Promise<void>;
  readOnly?: boolean;
  extraHiddenFields?: Record<string, string>;
}) {
  const extraInputs = Object.entries(extraHiddenFields ?? {}).map(
    ([name, value]) => <input key={name} type="hidden" name={name} value={value} />
  );

  if (choices.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
        هنوز هیچ رشته‌ای انتخاب نشده است.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full min-w-[800px] text-sm">
        <thead className="bg-slate-50 text-slate-500">
          <tr className="text-right">
            <th className="w-14 px-3 py-2 font-medium">رتبه</th>
            <th className="px-3 py-2 font-medium">رشته</th>
            <th className="px-3 py-2 font-medium">استان / دانشگاه</th>
            <th className="px-3 py-2 font-medium">کدرشته‌محل</th>
            {!readOnly && <th className="px-3 py-2 font-medium"></th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {choices.map((choice, index) => (
            <tr key={choice.id}>
              <td className="px-3 py-3 font-medium text-slate-900">
                {toPersianDigits(choice.rank)}
              </td>
              <td className="px-3 py-3">
                <div className="font-medium text-slate-900">
                  {choice.major.title}
                </div>
                <div className="text-xs text-slate-500">
                  {choice.major.fieldGroup}
                </div>
              </td>
              <td className="px-3 py-3 text-slate-700">
                <div>{choice.major.province}</div>
                <div className="text-xs text-slate-500">
                  {choice.major.university}
                </div>
              </td>
              <td className="px-3 py-3 text-slate-700" dir="ltr">
                {toPersianDigits(choice.major.majorCode)}
              </td>
              {!readOnly && (
                <td className="px-3 py-3">
                  <div className="flex items-center gap-1">
                    <form action={moveAction}>
                      {extraInputs}
                      <input type="hidden" name="choiceId" value={choice.id} />
                      <input type="hidden" name="direction" value="up" />
                      <button
                        type="submit"
                        disabled={index === 0}
                        className="rounded-lg border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-30"
                        title="بالا"
                      >
                        ▲
                      </button>
                    </form>
                    <form action={moveAction}>
                      {extraInputs}
                      <input type="hidden" name="choiceId" value={choice.id} />
                      <input type="hidden" name="direction" value="down" />
                      <button
                        type="submit"
                        disabled={index === choices.length - 1}
                        className="rounded-lg border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-30"
                        title="پایین"
                      >
                        ▼
                      </button>
                    </form>
                    <form action={removeAction}>
                      {extraInputs}
                      <input type="hidden" name="choiceId" value={choice.id} />
                      <button
                        type="submit"
                        className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                      >
                        حذف
                      </button>
                    </form>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
