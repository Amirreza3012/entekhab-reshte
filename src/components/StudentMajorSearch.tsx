import { getMajorFilterOptions, searchMajors } from "@/lib/majors";
import { MAX_CHOICES } from "@/lib/choices";
import { toPersianDigits } from "@/lib/format";
import { MajorFilters } from "@/components/MajorFilters";
import { MajorResultsTable } from "@/components/MajorResultsTable";
import { Pagination } from "@/components/Pagination";
import { ChoiceToggleButton } from "@/components/ChoiceToggleButton";
import { addChoiceForAdminAction, removeChoiceForAdminAction } from "@/app/admin/actions";

// Major search with an add/remove toggle on every row, used by the admin and
// supervisor student pages to edit a student's list.
export async function StudentMajorSearch({
  basePath,
  studentId,
  searchParams,
  choices,
}: {
  basePath: string;
  studentId: string;
  searchParams: Record<string, string | undefined>;
  choices: { id: string; majorId: string }[];
}) {
  const sp = searchParams;
  const filters = {
    fieldGroup: sp.fieldGroup,
    province: sp.province,
    studyPeriod: sp.studyPeriod,
    gender: sp.gender,
    entryYear: sp.entryYear,
    admissionType: sp.admissionType,
    admissionMethod: sp.admissionMethod,
  };
  const [options, results] = await Promise.all([
    getMajorFilterOptions(filters),
    searchMajors({
      q: sp.q,
      ...filters,
      page: sp.page ? Number(sp.page) : 1,
      sort: sp.sort,
      sortDirection: sp.sortDirection,
    }),
  ]);

  const choiceIdByMajorId = new Map(choices.map((c) => [c.majorId, c.id]));
  const atLimit = choices.length >= MAX_CHOICES;

  const buildHref = (page: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(sp)) {
      if (typeof value === "string" && value && key !== "page") params.set(key, value);
    }
    params.set("page", String(page));
    return `${basePath}?${params.toString()}`;
  };

  return (
    <section className="flex min-w-0 flex-col gap-4">
      <h2 className="font-semibold text-slate-800">افزودن رشته جدید</h2>
      <MajorFilters
        action={basePath}
        options={options}
        defaults={{ q: sp.q, ...filters, sort: sp.sort, sortDirection: sp.sortDirection }}
      />
      <p className="text-sm text-slate-500">{toPersianDigits(results.total)} رشته یافت شد</p>
      <MajorResultsTable
        items={results.items}
        basePath={basePath}
        searchParams={sp}
        isChosen={(major) => choiceIdByMajorId.has(major.id)}
        renderAction={(major) => (
          <ChoiceToggleButton
            majorId={major.id}
            choiceId={choiceIdByMajorId.get(major.id) ?? null}
            addAction={addChoiceForAdminAction}
            removeAction={removeChoiceForAdminAction}
            disabled={atLimit}
            disabledReason="سقف تکمیل است"
            extraHiddenFields={{ studentId }}
          />
        )}
      />
      <Pagination page={results.page} pageCount={results.pageCount} buildHref={buildHref} />
    </section>
  );
}
