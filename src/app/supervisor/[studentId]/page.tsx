import { notFound } from "next/navigation";
import { requireRole } from "@/lib/session";
import { Role } from "@/generated/prisma/client";
import { getUserById } from "@/lib/admin";
import { getStudentChoices, MAX_CHOICES } from "@/lib/choices";
import { BackLink } from "@/components/BackLink";
import { choicesPageHref, paginateChoices } from "@/lib/choicePaging";
import { ChoiceList } from "@/components/ChoiceList";
import { Pagination } from "@/components/Pagination";
import { PdfExportButton } from "@/components/PdfExportButton";
import { ViewAllChoicesLink } from "@/components/ViewAllChoicesLink";
import { StudentMajorSearch } from "@/components/StudentMajorSearch";
import { ChoiceHistory } from "@/components/ChoiceHistory";
import {
  removeChoiceForAdminAction,
  reorderChoicesForAdminAction,
} from "@/app/admin/actions";
import { toPersianDigits } from "@/lib/format";

type SearchParams = Record<string, string | undefined>;

export default async function SupervisorStudentActivityPage({
  params,
  searchParams,
}: {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<SearchParams>;
}) {
  await requireRole(Role.SUPERVISOR);
  const { studentId } = await params;
  const sp = await searchParams;

  const student = await getUserById(studentId);
  if (!student || student.role !== Role.STUDENT) notFound();

  const choices = await getStudentChoices(studentId);
  const paged = paginateChoices(choices, sp.choicesPage);
  const basePath = `/supervisor/${studentId}`;

  return (
    <div className="flex flex-col gap-4">
      <BackLink href="/supervisor" label="بازگشت به فعالیت‌های کاربران" />

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
        <div className="flex flex-wrap items-center gap-2">
          <PdfExportButton
            studentName={student.name}
            choices={choices}
            fileName={`انتخاب-های-${student.name}.pdf`}
          />
          <ViewAllChoicesLink href={`${basePath}/choices`} />
        </div>
      </div>

      <div className="min-w-0 w-full">
        <div className="min-w-0 flex-1">
          <ChoiceList
            choices={paged.items}
            allChoices={choices}
            studentId={studentId}
            reorderAction={reorderChoicesForAdminAction}
            removeAction={removeChoiceForAdminAction}
            extraHiddenFields={{ studentId }}
          />
          <Pagination
            page={paged.page}
            pageCount={paged.pageCount}
            buildHref={(page) => choicesPageHref(basePath, sp, page)}
          />
        </div>
      </div>

      <StudentMajorSearch
        basePath={basePath}
        studentId={studentId}
        searchParams={sp}
        choices={choices}
      />

      <ChoiceHistory studentId={studentId} />
    </div>
  );
}
