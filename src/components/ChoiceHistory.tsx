import { getChoiceHistory, HISTORY_LIMIT } from "@/lib/mentor";
import { toPersianDigits } from "@/lib/format";
import { ChoiceHistoryItem } from "@/components/ChoiceHistoryItem";

// «تاریخچه تغییرات» for admins and supervisors: every change to the student's
// list, whoever made it (student, mentor, admin or supervisor).
export async function ChoiceHistory({ studentId }: { studentId: string }) {
  const { logs, total } = await getChoiceHistory(studentId);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-semibold text-slate-800">تاریخچه تغییرات</h2>
      {logs.length === 0 ? (
        <p className="text-sm text-slate-500">هنوز تغییری ثبت نشده است.</p>
      ) : (
        <>
          {total > HISTORY_LIMIT && (
            <p className="text-xs text-slate-500">
              {toPersianDigits(HISTORY_LIMIT)} تغییر آخر از {toPersianDigits(total)} تغییر نمایش داده می‌شود.
            </p>
          )}
          <div className="flex flex-col gap-2">
            {logs.map((log) => (
              <ChoiceHistoryItem key={log.id} log={log} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
