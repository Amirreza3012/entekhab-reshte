"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { GripVertical, X } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Choice, Major } from "@/generated/prisma/client";
import { toPersianDigits } from "@/lib/format";

type ChoiceWithMajor = Choice & { major: Major };
type ReorderResult = { error?: string } | undefined | void;

export function DragReorderPanel({
  studentId,
  choices,
  reorderAction,
  removeAction,
  extraHiddenFields,
}: {
  studentId: string;
  choices: ChoiceWithMajor[];
  reorderAction: (
    studentId: string,
    orderedChoiceIds: string[]
  ) => Promise<ReorderResult>;
  removeAction: (formData: FormData) => void | Promise<void>;
  extraHiddenFields?: Record<string, string>;
}) {
  const router = useRouter();
  const [items, setItems] = useState(choices);
  const [pending, setPending] = useState(false);

  // Re-sync local order whenever the server-provided list changes (e.g.
  // after revalidation), using React's "adjust state during render" pattern
  // instead of an effect.
  const [lastChoices, setLastChoices] = useState(choices);
  if (choices !== lastChoices) {
    setLastChoices(choices);
    setItems(choices);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    })
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((c) => c.id === active.id);
    const newIndex = items.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(items, oldIndex, newIndex);
    setItems(reordered);
    setPending(true);

    const result = await reorderAction(
      studentId,
      reordered.map((c) => c.id)
    );

    setPending(false);

    if (result?.error) {
      toast.error(result.error);
      setItems(choices);
      return;
    }

    router.refresh();
  }

  async function handleRemove(choiceId: string) {
    setItems((prev) => prev.filter((c) => c.id !== choiceId));

    const formData = new FormData();
    Object.entries(extraHiddenFields ?? {}).forEach(([key, value]) =>
      formData.set(key, value)
    );
    formData.set("choiceId", choiceId);
    await removeAction(formData);

    router.refresh();
  }

  return (
    <div className="flex w-full flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 lg:w-80 lg:shrink-0">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-800">جابجایی با کشیدن</h2>
        <span className="text-xs text-slate-400">
          {toPersianDigits(items.length)} انتخاب
        </span>
      </div>
      <p className="text-xs text-slate-500">
        هر ردیف را با ماوس بکشید و در جایگاه جدید رها کنید.
      </p>

      <div className="max-h-[70vh] overflow-y-auto rounded-lg border border-slate-100">
        <DndContext
          id={`drag-reorder-${studentId}`}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={items.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="divide-y divide-slate-100">
              {items.map((choice, index) => (
                <DraggableRow
                  key={choice.id}
                  choice={choice}
                  rank={index + 1}
                  disabled={pending}
                  onRemove={() => handleRemove(choice.id)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}

function DraggableRow({
  choice,
  rank,
  disabled,
  onRemove,
}: {
  choice: ChoiceWithMajor;
  rank: number;
  disabled: boolean;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: choice.id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-2 bg-white px-2 py-2 text-sm"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none rounded-md p-1 text-slate-400 hover:bg-slate-100 active:cursor-grabbing"
        title="جابجا کردن"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="w-6 shrink-0 text-center text-xs font-medium text-slate-500">
        {toPersianDigits(rank)}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className="block truncate text-slate-800"
          title={choice.major.title}
        >
          {choice.major.title}
        </span>
        <span
          className="block truncate text-xs text-slate-400"
          title={choice.major.university}
        >
          {choice.major.university}
        </span>
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
        title="حذف"
      >
        <X className="h-4 w-4" />
      </button>
    </li>
  );
}
