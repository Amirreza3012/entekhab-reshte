import type { Choice, Major } from "@/generated/prisma/client";
import { MAX_CHOICES } from "@/lib/choices";
import { toPersianDigits } from "@/lib/format";
import { ChoiceList } from "@/components/ChoiceList";
import { PdfExportButton } from "@/components/PdfExportButton";

// «مشاهده کامل»: every choice of one student on a single page, for all roles.
export function AllChoicesView({
  title,
  studentName,
  studentId,
  choices,
  reorderAction,
  removeAction,
  extraHiddenFields,
  fileName,
}: {
  title: string;
  studentName: string;
  studentId: string;
  choices: (Choice & { major: Major })[];
  reorderAction: (studentId: string, orderedChoiceIds: string[]) => Promise<{ error?: string } | undefined | void>;
  removeAction: (formData: FormData) => void | Promise<void>;
  extraHiddenFields?: Record<string, string>;
  fileName?: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold text-slate-900">{title}</h1>
          <p className="text-sm text-slate-500">
            {toPersianDigits(choices.length)}/{toPersianDigits(MAX_CHOICES)}
          </p>
        </div>
        <PdfExportButton
          studentName={studentName}
          choices={choices}
          fileName={fileName ?? `انتخاب-های-${studentName}.pdf`}
        />
      </div>

      <div className="min-w-0 w-full">
        <ChoiceList
          choices={choices}
          studentId={studentId}
          reorderAction={reorderAction}
          removeAction={removeAction}
          extraHiddenFields={extraHiddenFields}
        />
      </div>
    </div>
  );
}
