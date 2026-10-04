import { ADMISSION_METHOD_LABELS, RECORDS_ONLY_BADGE, TINT_LEGEND } from "@/lib/format";

export function MajorTintLegend() {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white/90 px-4 py-3 shadow-sm">
    <div className="mb-2.5 flex items-center gap-2 text-xs font-bold text-slate-800">
      <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[#dfff4f] ring-2 ring-slate-800" />
      راهنمای نوع پذیرش و ورودی
    </div>
    <ul className="flex flex-wrap items-center gap-2 text-[11px] leading-5 text-slate-600" aria-label="راهنمای رنگ‌ها">
      {TINT_LEGEND.map((t) => (
        <li key={t.key} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/70 px-2.5 py-1">
          <span aria-hidden="true" className={`inline-block h-3.5 w-1.5 shrink-0 rounded-full ${t.swatch}`} />
          {t.label}
        </li>
      ))}
      <li className="flex items-center gap-1.5">
        <span className={`inline-block rounded-lg px-2.5 py-1 text-[11px] font-semibold ${RECORDS_ONLY_BADGE}`}>
          {ADMISSION_METHOD_LABELS.RECORDS_ONLY}
        </span>
      </li>
    </ul>
    </div>
  );
}
