"use client";

import { assignMentorAction } from "@/app/admin/actions";
import { NativeSelect } from "@/components/NativeSelect";

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
      <NativeSelect
        density="sm"
        wrapperClassName="min-w-36"
        key={currentMentorId ?? "none"}
        name="mentorId"
        defaultValue={currentMentorId ?? ""}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
      >
        <option value="">بدون منتور</option>
        {mentors.map((mentor) => (
          <option key={mentor.id} value={mentor.id}>
            {mentor.name}
          </option>
        ))}
      </NativeSelect>
    </form>
  );
}
