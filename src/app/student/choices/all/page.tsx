import { requireRole } from "@/lib/session";
import { Role } from "@/generated/prisma/client";
import { getStudentChoices } from "@/lib/choices";
import { AllChoicesView } from "@/components/AllChoicesView";
import { removeChoiceAction, reorderChoicesAction } from "@/app/student/actions";

export default async function StudentAllChoicesPage() {
  const user = await requireRole(Role.STUDENT);
  const choices = await getStudentChoices(user.id);

  return (
    <AllChoicesView
      title="همه‌ی انتخاب‌های من"
      studentName={user.name ?? ""}
      studentId={user.id}
      choices={choices}
      reorderAction={reorderChoicesAction}
      removeAction={removeChoiceAction}
      fileName="انتخاب-های-من.pdf"
    />
  );
}
