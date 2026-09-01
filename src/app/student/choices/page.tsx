import { requireRole } from "@/lib/session";
import { Role } from "@/generated/prisma/client";
import { getStudentChoices, MAX_CHOICES } from "@/lib/choices";
import { ChoiceList } from "@/components/ChoiceList";
import { moveChoiceAction, removeChoiceAction } from "@/app/student/actions";
import { toPersianDigits } from "@/lib/format";

export default async function StudentChoicesPage() {
  const user = await requireRole(Role.STUDENT);
  const choices = await getStudentChoices(user.id);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-900">انتخاب‌های من</h1>
        <span className="text-sm text-slate-500">
          {toPersianDigits(choices.length)} از {toPersianDigits(MAX_CHOICES)}
        </span>
      </div>

      <ChoiceList
        choices={choices}
        moveAction={moveChoiceAction}
        removeAction={removeChoiceAction}
      />
    </div>
  );
}
