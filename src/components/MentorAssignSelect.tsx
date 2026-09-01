"use client";

import { assignMentorAction } from "@/app/admin/actions";

export function MentorAssignSelect({
  studentId,
  mentors,
  currentMentorId,
}: {
  studentId: string;
  mentors: { id: string; name: string }[];
  currentMentorId: string | null;
}) {
  return (
    <form action={assignMentorAction}>
      <input type="hidden" name="studentId" value={studentId} />
      <select
        key={currentMentorId ?? "none"}
        name="mentorId"
        defaultValue={currentMentorId ?? ""}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs outline-none focus:border-slate-500"
      >
        <option value="">بدون منتور</option>
        {mentors.map((mentor) => (
          <option key={mentor.id} value={mentor.id}>
            {mentor.name}
          </option>
        ))}
      </select>
    </form>
  );
}
