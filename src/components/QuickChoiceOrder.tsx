"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AlertCircle, ArrowLeftRight, Check, Grid2X2, GripVertical, LoaderCircle, X } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toPersianDigits } from "@/lib/format";
import styles from "./QuickChoiceOrder.module.css";

type NumberedChoice = { id: string; rank: number; major: { title: string; university: string } };

export function QuickChoiceOrder({ choices, disabled, status, failed, onMove, onRemove }: {
  choices: NumberedChoice[];
  disabled: boolean;
  status: string;
  failed: boolean;
  onMove: (sourceId: string, targetId: string) => void;
  onRemove?: (choiceId: string) => void;
}) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const selected = choices.find((choice) => choice.id === selectedId);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // Short swipes scroll the compact list; a deliberate hold starts touch dragging.
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    if (!open) return;
    const element = dialog.current;
    element?.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  function close() {
    setOpen(false);
    setSelectedId(null);
    setDragging(false);
  }

  function choose(choiceId: string) {
    if (disabled || dragging) return;
    if (!selected) setSelectedId(choiceId);
    else {
      if (selected.id !== choiceId) onMove(selected.id, choiceId);
      setSelectedId(null);
    }
  }

  function dragEnd({ active, over }: DragEndEvent) {
    setDragging(false);
    setSelectedId(null);
    if (!disabled && over && active.id !== over.id) onMove(String(active.id), String(over.id));
  }

  return <>
    <button type="button" disabled={disabled} onClick={() => { setSelectedId(null); setOpen(true); }}
      aria-haspopup="dialog" aria-expanded={open} aria-controls={`${id}-dialog`}
      className="inline-flex items-center gap-2 rounded-xl bg-[#111827] px-4 py-2.5 text-xs font-bold text-[#dfff4f] shadow-sm transition hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 disabled:cursor-wait disabled:opacity-50">
      <Grid2X2 className="h-4 w-4" aria-hidden="true" />جابه‌جایی سریع
    </button>
    <dialog ref={dialog} id={`${id}-dialog`} dir="rtl" className={styles.dialog}
      aria-labelledby={`${id}-title`} aria-describedby={`${id}-help`}
      onCancel={close} onClose={close}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) close();
      }}>
      {open && <>
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 px-5 py-5 sm:px-6">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#dfff4f]">
              <Grid2X2 className="h-4 w-4" aria-hidden="true" />{toPersianDigits(choices.length)} انتخاب؛ یک نمای جمع‌وجور
            </div>
            <h2 id={`${id}-title`} className="!m-0 !text-xl !font-bold !text-white">جابه‌جایی سریع اولویت‌ها</h2>
            <p id={`${id}-help`} className="mb-0 mt-2 text-xs leading-6 text-slate-300">شمارهٔ مبدأ و سپس مقصد را بزنید؛ یا شماره‌ها را بگیرید و بکشید.</p>
          </div>
          <button type="button" onClick={close} aria-label="بستن جابه‌جایی سریع" className={styles.close}>
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>
        <div className="flex shrink-0 items-center justify-between gap-3 px-5 py-3 text-xs sm:px-6" role="status" aria-live="polite">
          <span className={`flex items-center gap-2 ${selected ? "text-[#dfff4f]" : "text-slate-400"}`}>
            <ArrowLeftRight className="h-4 w-4 shrink-0" aria-hidden="true" />
            {selected ? `انتخاب ${toPersianDigits(selected.rank)} انتخاب شد؛ شمارهٔ مقصد را بزنید.` : "جابجایی به مقصد؛ شمارهٔ بقیهٔ انتخاب‌ها خودکار تغییر می‌کند."}
          </span>
          {selected && <button type="button" className="shrink-0 rounded-lg px-2 py-1 text-slate-300 hover:bg-white/10" onClick={() => setSelectedId(null)}>انصراف</button>}
        </div>
        <DndContext id={`${id}-grid`} sensors={sensors} collisionDetection={closestCenter}
          onDragStart={() => { setDragging(true); setSelectedId(null); }} onDragCancel={() => setDragging(false)} onDragEnd={dragEnd}
          accessibility={{ screenReaderInstructions: { draggable: "برای گرفتن شماره فاصله، برای حرکت کلیدهای جهت، برای رهاکردن فاصله و برای انصراف Escape را بزنید." } }}>
          <div className={styles.scroll}>
            <SortableContext items={choices.map((choice) => choice.id)} strategy={rectSortingStrategy}>
              <div className={styles.grid} role="list" aria-label="جدول شمارهٔ انتخاب‌ها" aria-busy={disabled}>
                {choices.map((choice) => <QuickNumber key={choice.id} choice={choice} selected={selectedId === choice.id} target={!!selected}
                  disabled={disabled} removeDisabled={disabled || dragging} onChoose={() => choose(choice.id)}
                  onRemove={onRemove ? () => { if (selectedId === choice.id) setSelectedId(null); onRemove(choice.id); } : undefined} />)}
              </div>
            </SortableContext>
          </div>
        </DndContext>
        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-white/10 px-5 py-4 text-xs sm:px-6">
          <span className={`flex items-center gap-2 ${failed && !disabled ? "text-rose-300" : "text-slate-300"}`} role="status" aria-live="polite">
            {disabled ? <LoaderCircle className="h-4 w-4 animate-spin text-[#dfff4f]" aria-hidden="true" /> : failed ? <AlertCircle className="h-4 w-4" aria-hidden="true" /> : <Check className="h-4 w-4 text-[#dfff4f]" aria-hidden="true" />}
            {disabled ? "در حال ذخیره…" : status || "هر تغییر به‌صورت خودکار ذخیره می‌شود."}
          </span>
          <button type="button" onClick={close} className="rounded-xl bg-[#dfff4f] px-5 py-2.5 font-bold text-[#111827] transition hover:bg-lime-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#dfff4f]">تمام</button>
        </footer>
      </>}
    </dialog>
  </>;
}

function QuickNumber({ choice, selected, target, disabled, removeDisabled, onChoose, onRemove }: {
  choice: NumberedChoice;
  selected: boolean;
  target: boolean;
  disabled: boolean;
  removeDisabled: boolean;
  onChoose: () => void;
  onRemove?: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: choice.id, disabled, transition: { duration: 180, easing: "ease-out" },
  });
  const description = `${toPersianDigits(choice.rank)}: ${choice.major.title}؛ ${choice.major.university}`;
  return <div ref={setNodeRef} role="listitem" className={styles.tile} data-selected={selected || undefined} data-target={target || undefined} data-dragging={isDragging || undefined}
    style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 2 : undefined }}>
    <button ref={setActivatorNodeRef} type="button" {...attributes} {...listeners} disabled={disabled} onClick={onChoose}
      className={styles.number} aria-pressed={selected || isDragging} aria-label={`انتخاب ${description}`} title={description}>
      {toPersianDigits(choice.rank)}
      <GripVertical aria-hidden="true" className={styles.grip} />
    </button>
    {onRemove && <button type="button" disabled={removeDisabled} onClick={onRemove} className={styles.remove}
      aria-label={`حذف انتخاب ${description}`} title={`حذف انتخاب ${toPersianDigits(choice.rank)}`}>
      <X className="h-3.5 w-3.5" aria-hidden="true" />
    </button>}
  </div>;
}
