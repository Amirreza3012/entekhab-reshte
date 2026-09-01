import { requireRole } from "@/lib/session";
import { Role } from "@/generated/prisma/client";
import { getMenteeOrThrow, getMentorLogsForStudent } from "@/lib/mentor";
import { getMajorFilterOptions, searchMajors } from "@/lib/majors";
import { getStudentChoices, MAX_CHOICES } from "@/lib/choices";
import { MajorFilters } from "@/components/MajorFilters";
import { MajorResultsTable } from "@/components/MajorResultsTable";
import { Pagination } from "@/components/Pagination";
import { MentorAddChoiceButton } from "@/components/MentorAddChoiceButton";
import { RemoveChoiceInlineButton } from "@/components/RemoveChoiceInlineButton";
import { ChoiceList } from "@/components/ChoiceList";
import { MentorLogItem } from "@/components/MentorLogItem";
import { NotebookPen } from "lucide-react";
import {
  moveChoiceForStudentAction,
  removeChoiceForStudentAction,
  addMentorNoteAction,
} from "@/app/mentor/actions";
import { toPersianDigits } from "@/lib/format";

type SearchParams = {
  q?: string;
  fieldGroup?: string;
  province?: string;
  studyPeriod?: string;
  gender?: string;
  page?: string;
};

export default async function MentorStudentPage({
  params,
  searchParams,
}: {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const mentor = await requireRole(Role.MENTOR);
  const { studentId } = await params;
  const sp = await searchParams;

  const student = await getMenteeOrThrow(mentor.id, studentId);

  const [options, results, choices, logs] = await Promise.all([
    getMajorFilterOptions(),
    searchMajors({
      q: sp.q,
      fieldGroup: sp.fieldGroup,
      province: sp.province,
      studyPeriod: sp.studyPeriod,
      gender: sp.gender,
      page: sp.page ? Number(sp.page) : 1,
    }),
    getStudentChoices(studentId),
    getMentorLogsForStudent(mentor.id, studentId),
  ]);

  const choiceIdByMajorId = new Map(choices.map((c) => [c.majorId, c.id]));
  const atLimit = choices.length >= MAX_CHOICES;

  const buildHref = (page: number) => {
    const p = new URLSearchParams();
    if (sp.q) p.set("q", sp.q);
    if (sp.fieldGroup) p.set("fieldGroup", sp.fieldGroup);
    if (sp.province) p.set("province", sp.province);
    if (sp.studyPeriod) p.set("studyPeriod", sp.studyPeriod);
    if (sp.gender) p.set("gender", sp.gender);
    p.set("page", String(page));
    return `/mentor/students/${studentId}?${p.toString()}`;
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-lg font-bold text-slate-900">{student.name}</h1>
        <p className="text-sm text-slate-500" dir="ltr">
          {student.email}
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">
            انتخاب‌های دانش‌آموز ({toPersianDigits(choices.length)}/
            {toPersianDigits(MAX_CHOICES)})
          </h2>
        </div>
        <ChoiceList
          choices={choices}
          moveAction={moveChoiceForStudentAction}
          removeAction={removeChoiceForStudentAction}
          extraHiddenFields={{ studentId }}
        />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-semibold text-slate-800">افزودن رشته جدید</h2>
        <MajorFilters
          action={`/mentor/students/${studentId}`}
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
                  action={removeChoiceForStudentAction}
                  choiceId={choiceId}
                  extraHiddenFields={{ studentId }}
                />
              );
            }
            if (atLimit) {
              return (
                <MentorAddChoiceButton
                  studentId={studentId}
                  majorId={major.id}
                  disabled
                  disabledReason="سقف تکمیل است"
                />
              );
            }
            return <MentorAddChoiceButton studentId={studentId} majorId={major.id} />;
          }}
        />
        <Pagination page={results.page} pageCount={results.pageCount} buildHref={buildHref} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-semibold text-slate-800">یادداشت و تاریخچه منتورینگ</h2>
        <form action={addMentorNoteAction} className="flex flex-col gap-2">
          <input type="hidden" name="studentId" value={studentId} />
          <textarea
            name="note"
            required
            rows={3}
            placeholder="یادداشتی درباره جلسه مشاوره یا وضعیت این دانش‌آموز بنویسید..."
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
          <button
            type="submit"
            className="flex items-center gap-1.5 self-start rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            <NotebookPen className="h-4 w-4" />
            ثبت یادداشت
          </button>
        </form>

        <div className="flex flex-col gap-2">
          {logs.length === 0 ? (
            <p className="text-sm text-slate-500">هنوز فعالیتی ثبت نشده است.</p>
          ) : (
            logs.map((log) => (
              <MentorLogItem key={log.id} log={log} studentId={studentId} />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
