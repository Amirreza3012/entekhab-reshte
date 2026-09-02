import { requireRole } from "@/lib/session";
import { Role } from "@/generated/prisma/client";
import { getMenteeOrThrow } from "@/lib/mentor";
import { getStudentChoices, MAX_CHOICES } from "@/lib/choices";
import { ChoiceList } from "@/components/ChoiceList";
import { PdfExportButton } from "@/components/PdfExportButton";
import {
  moveChoiceForStudentAction,
  removeChoiceForStudentAction,
} from "@/app/mentor/actions";
import { toPersianDigits } from "@/lib/format";

export default async function MentorStudentAllChoicesPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const mentor = await requireRole(Role.MENTOR);
  const { studentId } = await params;

  const student = await getMenteeOrThrow(mentor.id, studentId);
  const choices = await getStudentChoices(studentId);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold text-slate-900">
            همه‌ی انتخاب‌های {student.name}
          </h1>
          <p className="text-sm text-slate-500">
            {toPersianDigits(choices.length)}/{toPersianDigits(MAX_CHOICES)}
          </p>
        </div>
        <PdfExportButton
          studentName={student.name}
          choices={choices}
          fileName={`انتخاب-های-${student.name}.pdf`}
        />
      </div>

      <ChoiceList
        choices={choices}
        moveAction={moveChoiceForStudentAction}
        removeAction={removeChoiceForStudentAction}
        extraHiddenFields={{ studentId }}
      />
    </div>
  );
}
