type Options = {
  fieldGroups: string[];
  provinces: string[];
  studyPeriods: string[];
};

export function MajorFilters({
  action,
  options,
  defaults,
}: {
  action: string;
  options: Options;
  defaults: {
    q?: string;
    fieldGroup?: string;
    province?: string;
    studyPeriod?: string;
    gender?: string;
  };
}) {
  return (
    <form
      action={action}
      method="get"
      className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5"
    >
      <input
        type="text"
        name="q"
        placeholder="جستجو در عنوان رشته، دانشگاه یا کدرشته"
        defaultValue={defaults.q}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 lg:col-span-2"
      />

      <select
        name="fieldGroup"
        defaultValue={defaults.fieldGroup ?? ""}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
      >
        <option value="">همه رشته‌ها</option>
        {options.fieldGroups.map((f) => (
          <option key={f} value={f}>
            {f}
          </option>
        ))}
      </select>

      <select
        name="province"
        defaultValue={defaults.province ?? ""}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
      >
        <option value="">همه استان‌ها</option>
        {options.provinces.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>

      <select
        name="studyPeriod"
        defaultValue={defaults.studyPeriod ?? ""}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
      >
        <option value="">همه دوره‌ها</option>
        {options.studyPeriods.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <select
        name="gender"
        defaultValue={defaults.gender ?? "ANY"}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
      >
        <option value="ANY">هر جنسیتی</option>
        <option value="FEMALE">زن</option>
        <option value="MALE">مرد</option>
      </select>

      <button
        type="submit"
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
      >
        اعمال فیلتر
      </button>
    </form>
  );
}
