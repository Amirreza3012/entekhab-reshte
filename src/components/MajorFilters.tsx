import { Filter } from "lucide-react";
import { SearchableSelect } from "@/components/SearchableSelect";

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
      className="grid grid-cols-1 gap-3 rounded-[1.5rem] border border-white bg-white/90 p-5 shadow-lg shadow-slate-200/40 backdrop-blur sm:grid-cols-2 lg:grid-cols-5"
    >
      <input
        type="text"
        name="q"
        placeholder="جستجو در عنوان رشته، دانشگاه یا کدرشته"
        defaultValue={defaults.q}
        className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-sm outline-none lg:col-span-2"
      />

      <SearchableSelect
        name="fieldGroup"
        options={options.fieldGroups}
        placeholder="همه رشته‌ها"
        defaultValue={defaults.fieldGroup}
      />

      <SearchableSelect
        name="province"
        options={options.provinces}
        placeholder="همه استان‌ها"
        defaultValue={defaults.province}
      />

      <SearchableSelect
        name="studyPeriod"
        options={options.studyPeriods}
        placeholder="همه دوره‌ها"
        defaultValue={defaults.studyPeriod}
      />

      <select
        name="gender"
        defaultValue={defaults.gender ?? "ANY"}
        className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-sm outline-none"
      >
        <option value="ANY">هر جنسیتی</option>
        <option value="FEMALE">زن</option>
        <option value="MALE">مرد</option>
      </select>

      <button
        type="submit"
        className="flex items-center justify-center gap-2 rounded-xl bg-[#5b5cf0] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-200 transition hover:-translate-y-0.5 hover:bg-[#5051dc]"
      >
        <Filter className="h-4 w-4" />
        اعمال فیلتر
      </button>
    </form>
  );
}
