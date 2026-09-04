import { notFound } from "next/navigation";
import { requireRole } from "@/lib/session";
import { Role } from "@/generated/prisma/client";
import { getUserById } from "@/lib/admin";
import { getStudentChoices, MAX_CHOICES } from "@/lib/choices";
import { BackLink } from "@/components/BackLink";
import { ChoiceList } from "@/components/ChoiceList";
import { PdfExportButton } from "@/components/PdfExportButton";
import { DragReorderPanel } from "@/components/DragReorderPanel";
import {
  moveChoiceForAdminAction,
  removeChoiceForAdminAction,
  reorderChoicesForAdminAction,
} from "@/app/admin/actions";
import { toPersianDigits } from "@/lib/format";

export default async function AdminStudentActivityPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  await requireRole(Role.ADMIN);
  const { studentId } = await params;

  const student = await getUserById(studentId);
  if (!student || student.role !== Role.STUDENT) notFound();

  const choices = await getStudentChoices(studentId);

  return (
    <div className="flex flex-col gap-4">
      <BackLink href="/admin/activity" label="بازگشت به فعالیت‌های کاربران" />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold text-slate-900">
            انتخاب‌های {student.name}
          </h1>
          <p className="text-right text-sm text-slate-500" dir="ltr">
            {student.email}
          </p>
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

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <ChoiceList
            choices={choices}
            moveAction={moveChoiceForAdminAction}
            removeAction={removeChoiceForAdminAction}
            extraHiddenFields={{ studentId }}
          />
        </div>
        <DragReorderPanel
          studentId={studentId}
          choices={choices}
          reorderAction={reorderChoicesForAdminAction}
          removeAction={removeChoiceForAdminAction}
          extraHiddenFields={{ studentId }}
        />
      </div>
    </div>
  );
}
