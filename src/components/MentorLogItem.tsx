"use client";

import { useState } from "react";
import { Pencil, Trash2, Check, X } from "lucide-react";
import type { MentorLog, MentorAction } from "@/generated/prisma/client";
import {
  updateMentorNoteAction,
  deleteMentorNoteAction,
} from "@/app/mentor/actions";
import { MENTOR_ACTION_LABELS } from "@/lib/format";

export function MentorLogItem({
  log,
  studentId,
}: {
  log: MentorLog;
  studentId: string;
}) {
  const [editing, setEditing] = useState(false);
  const isNote = log.action === ("NOTE" as MentorAction);

  if (editing) {
    return (
      <form
        action={updateMentorNoteAction}
        onSubmit={() => setEditing(false)}
        className="flex flex-col gap-2 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm"
      >
        <input type="hidden" name="logId" value={log.id} />
        <input type="hidden" name="studentId" value={studentId} />
        <textarea
          name="detail"
          defaultValue={log.detail}
          rows={3}
          autoFocus
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
        <div className="flex items-center gap-2">
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
          >
            <Check className="h-3.5 w-3.5" />
            ذخیره
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
          >
            <X className="h-3.5 w-3.5" />
            لغو
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm">
      <div className="mb-1 flex items-center justify-between">
        <span className="font-medium text-slate-800">
          {MENTOR_ACTION_LABELS[log.action]}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">
            {new Date(log.createdAt).toLocaleString("fa-IR")}
          </span>
          {isNote && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                title="ویرایش یادداشت"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <form action={deleteMentorNoteAction}>
                <input type="hidden" name="logId" value={log.id} />
                <input type="hidden" name="studentId" value={studentId} />
                <button
                  type="submit"
                  className="rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  title="حذف یادداشت"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
      <p className="text-slate-600">{log.detail}</p>
    </div>
  );
}
