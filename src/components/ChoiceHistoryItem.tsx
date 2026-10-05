import type { MentorAction, Role } from "@/generated/prisma/client";
import { MENTOR_ACTION_LABELS } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/roles";

const ACTOR_STYLE: Record<Role, { badge: string; card: string }> = {
  STUDENT: { badge: "bg-sky-100 text-sky-800", card: "border-sky-100 bg-sky-50/60" },
  MENTOR: { badge: "bg-slate-100 text-slate-700", card: "border-slate-200 bg-white" },
  ADMIN: { badge: "bg-violet-100 text-violet-800", card: "border-violet-100 bg-violet-50/50" },
  SUPERVISOR: { badge: "bg-amber-100 text-amber-900", card: "border-amber-100 bg-amber-50/50" },
};

export type ChoiceHistoryLog = {
  id: string;
  action: MentorAction;
  detail: string;
  createdAt: Date;
  actorRole: Role;
  mentor?: { name: string } | null;
};

// Read-only history row: a soft tint plus a badge tells who made the change.
export function ChoiceHistoryItem({ log }: { log: ChoiceHistoryLog }) {
  const style = ACTOR_STYLE[log.actorRole];
  const actorName = log.actorRole === "STUDENT" ? null : log.mentor?.name;
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${style.card}`}>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${style.badge}`}>
            {ROLE_LABELS[log.actorRole]}
          </span>
          <span className="font-medium text-slate-800">{MENTOR_ACTION_LABELS[log.action]}</span>
          {actorName && <span className="text-xs text-slate-500">{actorName}</span>}
        </div>
        <span className="text-xs text-slate-400">
          {new Date(log.createdAt).toLocaleString("fa-IR", { timeZone: "Asia/Tehran" })}
        </span>
      </div>
      <p className="text-slate-600">{log.detail}</p>
    </div>
  );
}
