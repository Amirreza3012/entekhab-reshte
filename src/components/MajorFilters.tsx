"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { NativeSelect } from "@/components/NativeSelect";
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
    sort?: string;
    sortDirection?: string;
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
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Apply the filters with a client-side navigation instead of a full page
  // load: the server re-renders with fresh data, but the scroll position (and
  // the rest of the page) stay put, so the next filter is right where you are.
  const submit = () => {
    const form = formRef.current;
    if (!form) return;
    const params = new URLSearchParams();
    for (const [key, value] of new FormData(form)) {
      if (typeof value !== "string" || !value) continue;
      if (key === "gender" && value === "ANY") continue;
      params.set(key, value);
    }
    const query = params.toString();
    startTransition(() => router.push(query ? `${action}?${query}` : action, { scroll: false }));
  };

  return (
    <form
      // Remount when the applied filters change so the inputs show the new
      // defaults (including after a reset).
      key={JSON.stringify(defaults)}
      ref={formRef}
      action={action}
      method="get"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      aria-busy={pending}
      className={`grid grid-cols-1 gap-3 rounded-[1.5rem] border border-white bg-white/90 p-5 shadow-lg shadow-slate-200/40 backdrop-blur transition-opacity sm:grid-cols-2 lg:grid-cols-4 ${pending ? "opacity-70" : ""}`}
    >
      {defaults.sort && <input type="hidden" name="sort" value={defaults.sort} />}
      {defaults.sortDirection && <input type="hidden" name="sortDirection" value={defaults.sortDirection} />}
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
        onClick={() => startTransition(() => router.push(action, { scroll: false }))}
        title="پاک کردن همه فیلترها"
        className="flex items-center justify-center gap-2 rounded-xl bg-[#5b5cf0] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-200 transition hover:-translate-y-0.5 hover:bg-[#5051dc] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:bg-[#5b5cf0]"
      >
        <RotateCcw className="h-4 w-4" />
        بازنشانی فیلترها
      </button>
    </form>
  );
}
