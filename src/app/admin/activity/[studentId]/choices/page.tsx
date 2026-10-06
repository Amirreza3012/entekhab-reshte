import { notFound } from "next/navigation";
import { requireRole } from "@/lib/session";
import { Role } from "@/generated/prisma/client";
import { getUserById } from "@/lib/admin";
import { getStudentChoices } from "@/lib/choices";
import { AllChoicesView } from "@/components/AllChoicesView";
import {
  removeChoiceForAdminAction,
  reorderChoicesForAdminAction,
} from "@/app/admin/actions";

export default async function AdminStudentAllChoicesPage({
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
    <AllChoicesView
      title={`همه‌ی انتخاب‌های ${student.name}`}
      studentName={student.name}
      studentId={studentId}
      choices={choices}
      reorderAction={reorderChoicesForAdminAction}
      removeAction={removeChoiceForAdminAction}
      extraHiddenFields={{ studentId }}
    />
  );
}
