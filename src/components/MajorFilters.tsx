"use client";

import { useRef } from "react";
import { ChevronDown, RotateCcw } from "lucide-react";
import { SearchableSelect } from "@/components/SearchableSelect";
import { ADMISSION_METHOD_FILTER_OPTIONS, ADMISSION_TYPE_FILTER_OPTIONS, ENTRY_FILTER_OPTIONS } from "@/lib/format";

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
    entryYear?: string;
    admissionType?: string;
    admissionMethod?: string;
  };
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const hasFilters = Boolean(
    defaults.q ||
      defaults.fieldGroup ||
      defaults.province ||
      defaults.studyPeriod ||
      (defaults.gender && defaults.gender !== "ANY") ||
      defaults.entryYear ||
      defaults.admissionType ||
      defaults.admissionMethod
  );
  // Re-submit on every change so the other dropdowns narrow down immediately.
  const submit = () => formRef.current?.requestSubmit();

  return (
    <form
      ref={formRef}
      action={action}
      method="get"
      className="grid grid-cols-1 gap-3 rounded-[1.5rem] border border-white bg-white/90 p-5 shadow-lg shadow-slate-200/40 backdrop-blur sm:grid-cols-2 lg:grid-cols-4"
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
        onValueChange={submit}
      />

      <SearchableSelect
        name="province"
        options={options.provinces}
        placeholder="همه استان‌ها"
        defaultValue={defaults.province}
        onValueChange={submit}
      />

      <SearchableSelect
        name="studyPeriod"
        options={options.studyPeriods}
        placeholder="همه دوره‌ها"
        defaultValue={defaults.studyPeriod}
        onValueChange={submit}
      />

      <NativeSelect
        name="gender"
        defaultValue={defaults.gender ?? "ANY"}
        onChange={submit}
      >
        <option value="ANY">هر جنسیتی</option>
        <option value="FEMALE">زن</option>
        <option value="MALE">مرد</option>
      </NativeSelect>

      <NativeSelect
        name="entryYear"
        defaultValue={defaults.entryYear ?? ""}
        onChange={submit}
        aria-label="ورودی"
      >
        {ENTRY_FILTER_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </NativeSelect>

      <NativeSelect
        name="admissionType"
        defaultValue={defaults.admissionType ?? ""}
        onChange={submit}
        aria-label="نوع پذیرش"
      >
        {ADMISSION_TYPE_FILTER_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </NativeSelect>

      <NativeSelect
        name="admissionMethod"
        defaultValue={defaults.admissionMethod ?? ""}
        onChange={submit}
        aria-label="نحوه پذیرش"
      >
        {ADMISSION_METHOD_FILTER_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </NativeSelect>

      {/* Hidden default button so pressing Enter in the search box still submits. */}
      <button type="submit" tabIndex={-1} aria-hidden="true" className="sr-only">
        جستجو
      </button>

      <button
        type="button"
        disabled={!hasFilters}
        onClick={() => window.location.assign(action)}
        title="پاک کردن همه فیلترها"
        className="flex items-center justify-center gap-2 rounded-xl bg-[#5b5cf0] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-200 transition hover:-translate-y-0.5 hover:bg-[#5051dc] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:bg-[#5b5cf0]"
      >
        <RotateCcw className="h-4 w-4" />
        بازنشانی فیلترها
      </button>
    </form>
  );
}

// Native <select> with the same chevron placement/size as SearchableSelect.
function NativeSelect({
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        {...props}
        className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 pl-8 text-sm outline-none"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </div>
  );
}
