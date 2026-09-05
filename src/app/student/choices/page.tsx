import { requireRole } from "@/lib/session";
import { Role } from "@/generated/prisma/client";
import { getStudentChoices, MAX_CHOICES } from "@/lib/choices";
import { ChoiceList } from "@/components/ChoiceList";
import { PdfExportButton } from "@/components/PdfExportButton";
import { DragReorderPanel } from "@/components/DragReorderPanel";
import {
  moveChoiceAction,
  removeChoiceAction,
  reorderChoicesAction,
} from "@/app/student/actions";
import { toPersianDigits } from "@/lib/format";
import { PageHero } from "@/components/PageHero";

export default async function StudentChoicesPage() {
  const user = await requireRole(Role.STUDENT);
  const choices = await getStudentChoices(user.id);

  return (
    <div className="flex flex-col gap-4">
      <PageHero eyebrow="لیست اولویت‌ها" title="انتخاب‌های من" description="ترتیب انتخاب‌ها را با کشیدن جابه‌جا کنید و نسخه نهایی را خروجی بگیرید." aside={<div className="flex items-center gap-2">
          <span className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white">
            {toPersianDigits(choices.length)} از {toPersianDigits(MAX_CHOICES)}
          </span>
          <PdfExportButton
            studentName={user.name ?? ""}
            choices={choices}
            fileName="انتخاب-های-من.pdf"
          />
        </div>} />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <ChoiceList
            choices={choices}
            moveAction={moveChoiceAction}
            removeAction={removeChoiceAction}
          />
        </div>
        <DragReorderPanel
          studentId={user.id}
          choices={choices}
          reorderAction={reorderChoicesAction}
          removeAction={removeChoiceAction}
        />
      </div>
    </div>
  );
}
