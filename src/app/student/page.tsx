import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { requireRole } from "@/lib/session";
import { Role } from "@/generated/prisma/client";
import { getMajorFilterOptions, searchMajors } from "@/lib/majors";
import { getStudentChoices, MAX_CHOICES } from "@/lib/choices";
import { MajorFilters } from "@/components/MajorFilters";
import { MajorResultsTable } from "@/components/MajorResultsTable";
import { Pagination } from "@/components/Pagination";
import { AddChoiceButton } from "@/components/AddChoiceButton";
import { RemoveChoiceInlineButton } from "@/components/RemoveChoiceInlineButton";
import { removeChoiceAction } from "@/app/student/actions";
import { toPersianDigits } from "@/lib/format";

type SearchParams = {
  q?: string;
  fieldGroup?: string;
  province?: string;
  studyPeriod?: string;
  gender?: string;
  page?: string;
};

export default async function StudentSearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireRole(Role.STUDENT);
  const sp = await searchParams;

  const [options, results, currentChoices] = await Promise.all([
    getMajorFilterOptions(),
    searchMajors({
      q: sp.q,
      fieldGroup: sp.fieldGroup,
      province: sp.province,
      studyPeriod: sp.studyPeriod,
      gender: sp.gender,
      page: sp.page ? Number(sp.page) : 1,
    }),
    getStudentChoices(user.id),
  ]);

  const choiceIdByMajorId = new Map(
    currentChoices.map((c) => [c.majorId, c.id])
  );
  const atLimit = currentChoices.length >= MAX_CHOICES;

  const buildHref = (page: number) => {
    const params = new URLSearchParams();
    if (sp.q) params.set("q", sp.q);
    if (sp.fieldGroup) params.set("fieldGroup", sp.fieldGroup);
    if (sp.province) params.set("province", sp.province);
    if (sp.studyPeriod) params.set("studyPeriod", sp.studyPeriod);
    if (sp.gender) params.set("gender", sp.gender);
    params.set("page", String(page));
    return `/student?${params.toString()}`;
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-bold text-slate-900">جستجوی رشته‌ها</h1>
        <Link
          href="/student/choices"
          className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
        >
          <ClipboardList className="h-4 w-4" />
          انتخاب‌های من ({toPersianDigits(currentChoices.length)}/{toPersianDigits(MAX_CHOICES)})
        </Link>
      </div>

      <MajorFilters
        action="/student"
        options={options}
        defaults={{
          q: sp.q,
          fieldGroup: sp.fieldGroup,
          province: sp.province,
          studyPeriod: sp.studyPeriod,
          gender: sp.gender,
        }}
      />

      <p className="text-sm text-slate-500">
        {toPersianDigits(results.total)} رشته یافت شد
      </p>

      <MajorResultsTable
        items={results.items}
        renderAction={(major) => {
          const choiceId = choiceIdByMajorId.get(major.id);
          if (choiceId) {
            return (
              <RemoveChoiceInlineButton
                action={removeChoiceAction}
                choiceId={choiceId}
              />
            );
          }
          if (atLimit) {
            return (
              <AddChoiceButton
                majorId={major.id}
                disabled
                disabledReason="سقف تکمیل است"
              />
            );
          }
          return <AddChoiceButton majorId={major.id} />;
        }}
      />

      <Pagination page={results.page} pageCount={results.pageCount} buildHref={buildHref} />
    </div>
  );
}
