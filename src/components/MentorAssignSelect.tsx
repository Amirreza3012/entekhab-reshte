"use client";

import { assignMentorAction } from "@/app/admin/actions";
import { Check, ChevronDown, LoaderCircle } from "lucide-react";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

export function MentorAssignSelect({
  studentId,
  mentors,
  currentMentorId,
}: {
  studentId: string;
  mentors: { id: string; name: string }[];
  currentMentorId: string | null;
}) {
  const listId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [pending, startTransition] = useTransition();
  const options = [{ id: "", name: "بدون منتور" }, ...mentors];
  const selectedId = currentMentorId ?? "";

  function close(restoreFocus = false) {
    setPosition(null);
    if (restoreFocus) trigger.current?.focus();
  }

  function open(last = false) {
    if (!trigger.current || pending) return;
    if (window.innerHeight - trigger.current.getBoundingClientRect().bottom < 160) {
      trigger.current.scrollIntoView({ block: "center", behavior: "instant" });
    }
    const rect = trigger.current.getBoundingClientRect();
    const width = Math.min(Math.max(rect.width, 220), window.innerWidth - 24);
    setPosition({
      top: rect.bottom + 8,
      left: Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12)),
      width,
      height: Math.max(48, Math.min(280, window.innerHeight - rect.bottom - 20)),
    });
    requestAnimationFrame(() => {
      const buttons = menu.current?.querySelectorAll<HTMLButtonElement>("[role=option]");
      const index = last ? options.length - 1 : Math.max(0, options.findIndex((option) => option.id === selectedId));
      buttons?.[index]?.focus();
    });
  }

  useEffect(() => {
    if (!position) return;
    function outside(event: Event) {
      const target = event.target as Node;
      if (!menu.current?.contains(target) && !trigger.current?.contains(target)) setPosition(null);
    }
    function onScroll(event: Event) {
      if (!menu.current?.contains(event.target as Node)) setPosition(null);
    }
    function onResize() { setPosition(null); }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", outside);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("focusin", outside);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [position]);

  function assign(id: string) {
    close(true);
    if (id === selectedId) return;
    const data = new FormData();
    data.set("studentId", studentId);
    data.set("mentorId", id);
    startTransition(async () => {
      try {
        await assignMentorAction(data);
      } catch {
        toast.error("تخصیص منتور انجام نشد. دوباره تلاش کنید.");
      }
    });
  }

  return (
    <div className="min-w-36">
      <button
        ref={trigger}
        type="button"
        aria-label="اختصاص منتور"
        aria-haspopup="listbox"
        aria-expanded={!!position}
        aria-controls={position ? listId : undefined}
        disabled={pending}
        onClick={() => position ? close() : open()}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            open(event.key === "ArrowUp");
          }
        }}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-right text-xs font-medium text-slate-700 transition hover:border-violet-300 hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
      >
        <span className="truncate">{pending ? "در حال ذخیره…" : options.find((option) => option.id === selectedId)?.name ?? "بدون منتور"}</span>
        {pending ? <LoaderCircle aria-hidden="true" className="h-4 w-4 shrink-0 animate-spin text-violet-600" /> : <ChevronDown aria-hidden="true" className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${position ? "rotate-180" : ""}`} />}
      </button>
      {position && createPortal(
        <div
          ref={menu}
          id={listId}
          role="listbox"
          aria-label="انتخاب منتور"
          dir="rtl"
          style={{ top: position.top, left: position.left, width: position.width, maxHeight: position.height }}
          className="fixed z-[100] overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 bg-white p-1.5 text-sm text-slate-700 shadow-xl shadow-slate-900/15"
          onKeyDown={(event) => {
            if (event.key === "Escape") { event.preventDefault(); close(true); }
            const keys = ["ArrowDown", "ArrowUp", "Home", "End"];
            if (!keys.includes(event.key)) return;
            event.preventDefault();
            const buttons = Array.from(menu.current?.querySelectorAll<HTMLButtonElement>("[role=option]") ?? []);
            const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
            const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length;
            buttons[next]?.focus();
          }}
        >
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              role="option"
              aria-selected={option.id === selectedId}
              tabIndex={-1}
              onClick={() => assign(option.id)}
              className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-right text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-500 ${option.id === selectedId ? "bg-violet-50 font-semibold text-violet-900" : "text-slate-700 hover:bg-slate-50 focus:bg-slate-50"}`}
            >
              <span>{option.name}</span>
              {option.id === selectedId && <Check aria-hidden="true" className="h-4 w-4 shrink-0 text-violet-600" />}
            </button>
          ))}
        </div>, document.body,
      )}
    </div>
  );
}
