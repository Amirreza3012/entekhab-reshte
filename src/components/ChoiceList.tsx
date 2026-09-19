"use client";

import { useId, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronUp, ChevronDown, GripVertical, Trash2 } from "lucide-react";
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent, type Modifier } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, sortableKeyboardCoordinates, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Choice, Major } from "@/generated/prisma/client";
import { GENDER_LABELS, TERM_LABELS, toPersianDigits } from "@/lib/format";
import styles from "./ChoiceList.module.css";

type ChoiceWithMajor = Choice & { major: Major };
const verticalOnly: Modifier = ({ transform }) => ({ ...transform, x: 0 });

export function ChoiceList({
  choices,
  moveAction,
  removeAction,
  readOnly,
  extraHiddenFields,
  studentId,
  reorderAction,
}: {
  choices: ChoiceWithMajor[];
  moveAction?: (formData: FormData) => void | Promise<void>;
  removeAction?: (formData: FormData) => void | Promise<void>;
  readOnly?: boolean;
  extraHiddenFields?: Record<string, string>;
  studentId?: string;
  reorderAction?: (studentId: string, orderedChoiceIds: string[]) => Promise<{ error?: string } | undefined | void>;
}) {
  const router = useRouter();
  const id = useId();
  const [items, setItems] = useState(choices);
  const [lastChoices, setLastChoices] = useState(choices);
  const [pending, startTransition] = useTransition();
  const busy = useRef(false);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState("");
  if (choices !== lastChoices) {
    setLastChoices(choices);
    setItems(choices);
  }
  const sortable = !!reorderAction && !!studentId && !readOnly;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd({ active, over }: DragEndEvent) {
    setDragging(false);
    if (!sortable || !reorderAction || !studentId || busy.current || pending || !over || active.id === over.id) return;
    const from = items.findIndex((item) => item.id === active.id);
    const to = items.findIndex((item) => item.id === over.id);
    if (from < 0 || to < 0) return;
    const previous = items;
    const reordered = arrayMove(items, from, to).map((item, index) => ({ ...item, rank: index + 1 }));
    busy.current = true;
    setItems(reordered);
    setStatus("در حال ذخیره ترتیب…");
    startTransition(async () => {
      try {
        const result = await reorderAction(studentId, reordered.map((item) => item.id));
        if (result?.error) throw new Error(result.error);
        setStatus("ترتیب انتخاب‌ها ذخیره شد");
        router.refresh();
      } catch (error) {
        setItems(previous);
        setStatus("ذخیره انجام نشد؛ ترتیب قبلی بازگردانده شد");
        toast.error(error instanceof Error ? error.message : "ذخیره ترتیب انجام نشد؛ دوباره تلاش کنید.");
      } finally {
        busy.current = false;
      }
    });
  }

  function runAction(action: typeof removeAction, data: FormData) {
    if (!action || busy.current || pending || dragging) return;
    busy.current = true;
    startTransition(async () => {
      try {
        await action(data);
        router.refresh();
      } catch {
        toast.error("تغییر ذخیره نشد؛ دوباره تلاش کنید.");
      } finally {
        busy.current = false;
      }
    });
  }
  const extraInputs = Object.entries(extraHiddenFields ?? {}).map(
    ([name, value]) => <input key={name} type="hidden" name={name} value={value} />
  );

  if (choices.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-10 text-center text-sm text-slate-500 shadow-sm">
        هنوز هیچ رشته‌ای انتخاب نشده است.
      </div>
    );
  }

  return (
    <DndContext id={id} sensors={sensors} collisionDetection={closestCenter} modifiers={[verticalOnly]} onDragStart={() => setDragging(true)} onDragCancel={() => setDragging(false)} onDragEnd={handleDragEnd}
      accessibility={{ screenReaderInstructions: { draggable: "برای گرفتن ردیف کلید فاصله، برای جابه‌جایی کلیدهای بالا و پایین، برای رهاکردن دوباره فاصله و برای انصراف Escape را بزنید." } }}>
    <div className="min-w-0 max-w-full rounded-2xl border border-white bg-white/90 shadow-sm shadow-slate-200/70">
      {sortable && <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 text-xs text-slate-500">
        <span className="flex items-center gap-2"><GripVertical aria-hidden="true" className="h-4 w-4 text-violet-500" />برای جابه‌جایی، دستگیره‌ی نقطه‌ای کنار ردیف را بگیرید و بکشید.</span>
        <span role="status" aria-live="polite" className="text-violet-600">{pending ? "در حال ذخیره…" : status}</span>
      </div>}
      <div className="max-w-full overflow-x-auto rounded-2xl" tabIndex={0} role="region" aria-label="جدول انتخاب‌ها؛ قابل اسکرول افقی">
      <table className="w-full min-w-[1280px] text-sm" aria-busy={pending}>
        <thead className="bg-slate-50/80 text-xs text-slate-500">
          <tr className="text-right">
            {sortable && <th className="w-12 px-2 py-3"><span className="sr-only">جابه‌جایی</span></th>}
            <th className="w-14 px-3 py-2 font-medium">رتبه</th>
            <th className="px-3 py-2 font-medium">رشته</th>
            <th className="px-3 py-2 font-medium">استان / دانشگاه</th>
            <th className="whitespace-nowrap px-3 py-2 font-medium">دوره تحصیلی</th>
            <th className="px-3 py-2 font-medium">کدرشته‌محل</th>
            <th className="px-3 py-2 font-medium">ظرفیت</th>
            <th className="px-3 py-2 font-medium">جنسیت</th>
            <th className="px-3 py-2 font-medium">توضیحات</th>
            {!readOnly && <th className="px-3 py-2 font-medium"></th>}
          </tr>
        </thead>
        <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        <tbody className="divide-y divide-slate-100">
          {items.map((choice, index) => (
            <ChoiceRow key={choice.id} choice={choice} sortable={sortable} disabled={pending}>
              <td className="px-3 py-3 font-medium text-slate-900">
                {toPersianDigits(choice.rank)}
              </td>
              <td className="min-w-56 px-3 py-3">
                <div className="font-medium text-slate-900">
                  {choice.major.title}
                </div>
                <div className="text-xs text-slate-500">
                  {choice.major.fieldGroup}
                </div>
              </td>
              <td className="min-w-56 px-3 py-3 text-slate-700">
                <div>{choice.major.province}</div>
                <div className="text-xs text-slate-500">
                  {choice.major.university}
                </div>
              </td>
              <td className="whitespace-nowrap px-3 py-3 text-slate-700">
                {choice.major.studyPeriod || "—"}
                <div className="mt-1 text-xs text-slate-500">{TERM_LABELS[choice.major.termType]}</div>
              </td>
              <td className="px-3 py-3 text-right text-slate-700" dir="ltr">
                {toPersianDigits(choice.major.majorCode)}
              </td>
              <td className="px-3 py-3 text-slate-700">{choice.major.capacity != null ? toPersianDigits(choice.major.capacity) : "—"}</td>
              <td className="whitespace-nowrap px-3 py-3 text-slate-700">{GENDER_LABELS[choice.major.gender]}</td>
              <td className="min-w-56 max-w-sm break-words px-3 py-3 text-xs leading-6 text-slate-500">{choice.major.description || "—"}</td>
              {!readOnly && (
                <td className="px-3 py-3">
                  <div className="flex items-center gap-1">
                    {!sortable && moveAction && <><form action={(data) => runAction(moveAction, data)}>
                      {extraInputs}
                      <input type="hidden" name="choiceId" value={choice.id} />
                      <input type="hidden" name="direction" value="up" />
                      <button
                        type="submit"
                        disabled={pending || index === 0}
                        className="rounded-lg border border-slate-300 p-1 text-xs hover:bg-slate-50 disabled:opacity-30"
                        title="بالا"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                    </form>
                    <form action={(data) => runAction(moveAction, data)}>
                      {extraInputs}
                      <input type="hidden" name="choiceId" value={choice.id} />
                      <input type="hidden" name="direction" value="down" />
                      <button
                        type="submit"
                        disabled={pending || index === items.length - 1}
                        className="rounded-lg border border-slate-300 p-1 text-xs hover:bg-slate-50 disabled:opacity-30"
                        title="پایین"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                    </form></>}
                    <form action={(data) => runAction(removeAction, data)}>
                      {extraInputs}
                      <input type="hidden" name="choiceId" value={choice.id} />
                      <button
                        type="submit"
                        disabled={pending || dragging}
                        className="rounded-lg border border-red-200 p-2 text-xs text-red-600 hover:bg-red-50 disabled:opacity-30"
                        title="حذف"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </form>
                  </div>
                </td>
              )}
            </ChoiceRow>
          ))}
        </tbody>
        </SortableContext>
      </table>
      </div>
    </div>
    </DndContext>
  );
}

function ChoiceRow({ choice, sortable, disabled, children }: {
  choice: ChoiceWithMajor;
  sortable: boolean;
  disabled: boolean;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: choice.id,
    disabled: disabled || !sortable,
    transition: { duration: 220, easing: "cubic-bezier(0.2, 0, 0, 1)" },
  });
  return <tr ref={setNodeRef} data-dragging={isDragging || undefined} className={styles.row}
    style={{ transform: CSS.Translate.toString(transform), transition: [transition, "background-color 180ms ease", "box-shadow 180ms ease"].filter(Boolean).join(", "), position: "relative", zIndex: isDragging ? 10 : undefined }}>
    {sortable && <td className="w-12 px-2 py-3">
      <button ref={setActivatorNodeRef} type="button" {...attributes} {...listeners} disabled={disabled}
        className={styles.handle} aria-label={`جابه‌جایی انتخاب ${toPersianDigits(choice.rank)}: ${choice.major.title}`} title="برای جابه‌جایی بگیرید و بکشید">
        <GripVertical aria-hidden="true" className="h-5 w-5" />
      </button>
    </td>}
    {children}
  </tr>;
}
