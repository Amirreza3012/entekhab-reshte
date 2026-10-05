import { getStudentNotes } from "@/lib/mentor";

// «یادداشت‌ها» as the student's mentors wrote them, read-only (admins).
export async function StudentNotes({ studentId }: { studentId: string }) {
  const notes = await getStudentNotes(studentId);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-semibold text-slate-800">یادداشت‌های منتور</h2>
      {notes.length === 0 ? (
        <p className="text-sm text-slate-500">هنوز یادداشتی ثبت نشده است.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {notes.map((note) => (
            <div key={note.id} className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm">
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">منتور</span>
                  <span className="text-xs text-slate-500">{note.mentor.name}</span>
                </div>
                <span className="text-xs text-slate-400">
                  {new Date(note.createdAt).toLocaleString("fa-IR", { timeZone: "Asia/Tehran" })}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-slate-600">{note.detail}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
