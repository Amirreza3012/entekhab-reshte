import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { requireRole } from "@/lib/session";
import { Role } from "@/generated/prisma/client";
import { getMajorFilterOptions, searchMajors } from "@/lib/majors";
import { getStudentChoices, MAX_CHOICES } from "@/lib/choices";
import { MajorFilters } from "@/components/MajorFilters";
import { MajorResultsTable } from "@/components/MajorResultsTable";
import { Pagination } from "@/components/Pagination";
import { ChoiceToggleButton } from "@/components/ChoiceToggleButton";
import { addChoiceAction, removeChoiceAction } from "@/app/student/actions";
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
      <div className="relative overflow-hidden rounded-[2rem] bg-[#111827] p-6 text-white shadow-xl sm:p-8">
        <div className="absolute -left-10 -top-16 h-52 w-52 rounded-full bg-violet-500/30 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-5">
        <div><p className="mb-2 text-xs font-bold text-[#dfff4f]">بانک جامع رشته‌محل‌ها</p><h1 className="!text-white">رشته مناسب تو همین‌جاست</h1><p className="mt-2 text-sm text-white/45">جست‌وجو کن، مقایسه کن و بهترین‌ها را به لیستت اضافه کن.</p></div>
        <Link
          href="/student/choices"
          className="flex items-center gap-2 rounded-xl bg-[#dfff4f] px-4 py-3 text-sm font-black text-slate-950 shadow-sm hover:bg-white"
        >
          <ClipboardList className="h-4 w-4" />
          انتخاب‌های من ({toPersianDigits(currentChoices.length)}/{toPersianDigits(MAX_CHOICES)})
        </Link>
        </div>
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
        isChosen={(major) => choiceIdByMajorId.has(major.id)}
        renderAction={(major) => (
          <ChoiceToggleButton
            majorId={major.id}
            choiceId={choiceIdByMajorId.get(major.id) ?? null}
            addAction={addChoiceAction}
            removeAction={removeChoiceAction}
            disabled={atLimit}
            disabledReason="سقف تکمیل است"
          />
        )}
      />

      <Pagination page={results.page} pageCount={results.pageCount} buildHref={buildHref} />
    </div>
  );
}
