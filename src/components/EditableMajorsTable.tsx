"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, ArrowUpDown, Check, Pencil, X } from "lucide-react";
import type { Major } from "@/generated/prisma/client";
import { AdmissionMethod, AdmissionType, Gender, TermType } from "@/generated/prisma/enums";
import {
  ADMISSION_METHOD_LABELS,
  ADMISSION_TYPE_LABELS,
  GENDER_LABELS,
  TERM_LABELS,
  majorTint,
  toPersianDigits,
} from "@/lib/format";
import { MajorBadges } from "@/components/MajorBadges";
import { NativeSelect } from "@/components/NativeSelect";
import { resolveMajorSort, majorSortHref, type MajorSortField } from "@/lib/majorSorting";
import { updateMajorAction } from "@/app/admin/majors/actions";

type Draft = {
  majorCode: string;
  title: string;
  fieldGroup: string;
  province: string;
  university: string;
  studyPeriod: string;
  termType: TermType;
  gender: Gender;
  capacity: string;
  admissionType: AdmissionType;
  admissionMethod: AdmissionMethod;
  entryYear: string;
  description: string;
};

const toDraft = (m: Major): Draft => ({
  majorCode: m.majorCode,
  title: m.title,
  fieldGroup: m.fieldGroup,
  province: m.province,
  university: m.university,
  studyPeriod: m.studyPeriod,
  termType: m.termType,
  gender: m.gender,
  capacity: m.capacity === null ? "" : String(m.capacity),
  admissionType: m.admissionType,
  admissionMethod: m.admissionMethod,
  entryYear: m.entryYear === null ? "" : String(m.entryYear),
  description: m.description ?? "",
});

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs outline-none focus:border-slate-500";

export function EditableMajorsTable({
  items,
  basePath,
  searchParams,
}: {
  items: Major[];
  basePath: string;
  searchParams: Record<string, string | undefined>;
}) {
  const selected = resolveMajorSort(searchParams.sort, searchParams.sortDirection);
  const heading = (label: string, field: MajorSortField) => {
    const active = selected.field === field;
    const next = active && selected.direction === "asc" ? "desc" : "asc";
    const Icon = active ? (selected.direction === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
    return (
      <th
        scope="col"
        className="whitespace-nowrap px-3 py-2 font-medium"
        aria-sort={active ? (selected.direction === "asc" ? "ascending" : "descending") : "none"}
      >
        <Link
          href={majorSortHref(basePath, searchParams, field, next)}
          scroll={false}
          prefetch={false}
          aria-label={`مرتب‌سازی ${label}؛ ${next === "asc" ? "صعودی" : "نزولی"}`}
          className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 transition-colors ${
            active ? "bg-violet-100 text-violet-800" : "text-slate-600 hover:bg-violet-50 hover:text-violet-700"
          }`}
        >
          {label}
          <Icon aria-hidden="true" className="h-3.5 w-3.5" />
        </Link>
      </th>
    );
  };

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-10 text-center text-sm text-slate-500 shadow-sm">
        رشته‌ای با این فیلترها پیدا نشد.
      </div>
    );
  }

  return (
    <div className="max-w-full overflow-x-auto rounded-2xl border border-white bg-white/90 shadow-sm shadow-slate-200/70">
      <table className="w-full min-w-[2200px] text-sm">
        <thead className="bg-slate-50/80 text-xs text-slate-500">
          <tr className="text-right">
            <th className="px-3 py-2 font-medium">ویرایش</th>
            {heading("کدرشته‌محل", "majorCode")}
            {heading("عنوان رشته", "title")}
            {heading("گروه رشته", "fieldGroup")}
            {heading("استان", "province")}
            {heading("دانشگاه", "university")}
            {heading("دوره تحصیلی", "studyPeriod")}
            {heading("نیمسال", "termType")}
            {heading("جنسیت", "gender")}
            {heading("ظرفیت", "capacity")}
            {heading("نوع پذیرش", "admissionType")}
            {heading("نحوه پذیرش", "admissionMethod")}
            {heading("ورودی", "entryYear")}
            {heading("توضیحات", "description")}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((major) => (
            <MajorEditRow key={`${major.id}:${major.updatedAt.getTime()}`} major={major} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MajorEditRow({ major }: { major: Major }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => toDraft(major));
  const [pending, startTransition] = useTransition();
  const tint = majorTint(major.admissionType, major.entryYear);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const text = (key: keyof Draft, extra = "") => (
    <input
      value={draft[key]}
      onChange={(e) => set(key, e.target.value as never)}
      className={`${inputClass} ${extra}`}
    />
  );

  function startEdit() {
    setDraft(toDraft(major));
    setEditing(true);
  }

  function save() {
    startTransition(async () => {
      const result = await updateMajorAction({ id: major.id, ...draft });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("تغییرات ذخیره شد.");
      setEditing(false);
      router.refresh();
    });
  }

  if (!editing) {
    return (
      <tr className={`[&>td]:transition-colors ${tint.row}`}>
        <td className={`whitespace-nowrap border-r-4 px-3 py-3 align-top ${tint.accent}`}>
          <button
            type="button"
            onClick={startEdit}
            title="ویرایش این رشته"
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:border-violet-300 hover:text-violet-700"
          >
            <Pencil className="h-3.5 w-3.5" />
            ویرایش
          </button>
        </td>
        <td className="whitespace-nowrap px-3 py-3 align-top text-right text-slate-700" dir="ltr">
          {toPersianDigits(major.majorCode)}
        </td>
        <td className="min-w-[16rem] px-3 py-3 align-top font-semibold text-slate-900">{major.title}</td>
        <td className="min-w-[10rem] px-3 py-3 align-top text-slate-700">{major.fieldGroup}</td>
        <td className="whitespace-nowrap px-3 py-3 align-top text-slate-700">{major.province}</td>
        <td className="min-w-[16rem] px-3 py-3 align-top text-slate-700">{major.university}</td>
        <td className="whitespace-nowrap px-3 py-3 align-top text-slate-700">{major.studyPeriod}</td>
        <td className="whitespace-nowrap px-3 py-3 align-top text-slate-700">{TERM_LABELS[major.termType]}</td>
        <td className="whitespace-nowrap px-3 py-3 align-top text-slate-700">{GENDER_LABELS[major.gender]}</td>
        <td className="whitespace-nowrap px-3 py-3 align-top text-slate-700">
          {major.capacity !== null ? toPersianDigits(major.capacity) : "-"}
        </td>
        <td className="min-w-[10rem] px-3 py-3 align-top">
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold leading-5">
            <MajorBadges major={major} />
            {major.admissionType === "REGULAR" && major.admissionMethod === "WITH_EXAM" && major.entryYear === null && (
              <span className="text-xs font-normal text-slate-500">{ADMISSION_TYPE_LABELS.REGULAR}</span>
            )}
          </div>
        </td>
        <td className="whitespace-nowrap px-3 py-3 align-top text-slate-700">
          {ADMISSION_METHOD_LABELS[major.admissionMethod]}
        </td>
        <td className="whitespace-nowrap px-3 py-3 align-top text-slate-700">
          {major.entryYear !== null ? toPersianDigits(major.entryYear) : "-"}
        </td>
        <td className="min-w-[22rem] max-w-md whitespace-normal px-3 py-3 align-top text-xs leading-6 text-slate-600">
          {major.description ?? "-"}
        </td>
      </tr>
    );
  }

  return (
    <tr className="[&>td]:bg-violet-50/70">
      <td className="whitespace-nowrap border-r-4 border-r-violet-500! px-3 py-3 align-top">
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-[#5b5cf0] px-2.5 py-1.5 text-xs font-bold text-white hover:bg-[#5051dc] disabled:opacity-60"
          >
            <Check className="h-3.5 w-3.5" />
            {pending ? "در حال ذخیره..." : "ذخیره"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            disabled={pending}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          >
            <X className="h-3.5 w-3.5" />
            انصراف
          </button>
        </div>
      </td>
      <td className="px-3 py-3 align-top">{text("majorCode", "w-24 text-left")}</td>
      <td className="px-3 py-3 align-top">{text("title", "min-w-[14rem]")}</td>
      <td className="px-3 py-3 align-top">{text("fieldGroup", "min-w-[9rem]")}</td>
      <td className="px-3 py-3 align-top">{text("province", "min-w-[8rem]")}</td>
      <td className="px-3 py-3 align-top">{text("university", "min-w-[14rem]")}</td>
      <td className="px-3 py-3 align-top">{text("studyPeriod", "min-w-[7rem]")}</td>
      <td className="px-3 py-3 align-top">
        <NativeSelect density="sm" wrapperClassName="min-w-28" value={draft.termType} onChange={(e) => set("termType", e.target.value as TermType)}>
          {Object.values(TermType).map((t) => (
            <option key={t} value={t}>
              {TERM_LABELS[t] === "-" ? "نامشخص" : TERM_LABELS[t]}
            </option>
          ))}
        </NativeSelect>
      </td>
      <td className="px-3 py-3 align-top">
        <NativeSelect density="sm" wrapperClassName="min-w-28" value={draft.gender} onChange={(e) => set("gender", e.target.value as Gender)}>
          {Object.values(Gender).map((g) => (
            <option key={g} value={g}>
              {GENDER_LABELS[g]}
            </option>
          ))}
        </NativeSelect>
      </td>
      <td className="px-3 py-3 align-top">
        <input
          type="number"
          min={0}
          value={draft.capacity}
          onChange={(e) => set("capacity", e.target.value)}
          className={`${inputClass} w-20`}
        />
      </td>
      <td className="px-3 py-3 align-top">
        <NativeSelect density="sm" wrapperClassName="min-w-36" value={draft.admissionType} onChange={(e) => set("admissionType", e.target.value as AdmissionType)}>
          {Object.values(AdmissionType).map((t) => (
            <option key={t} value={t}>
              {ADMISSION_TYPE_LABELS[t]}
            </option>
          ))}
        </NativeSelect>
      </td>
      <td className="px-3 py-3 align-top">
        <NativeSelect density="sm" wrapperClassName="min-w-36" value={draft.admissionMethod} onChange={(e) => set("admissionMethod", e.target.value as AdmissionMethod)}>
          {Object.values(AdmissionMethod).map((m) => (
            <option key={m} value={m}>
              {ADMISSION_METHOD_LABELS[m]}
            </option>
          ))}
        </NativeSelect>
      </td>
      <td className="px-3 py-3 align-top">
        <input
          type="number"
          value={draft.entryYear}
          placeholder="خالی = عادی"
          onChange={(e) => set("entryYear", e.target.value)}
          className={`${inputClass} w-24`}
        />
      </td>
      <td className="px-3 py-3 align-top">
        <textarea
          value={draft.description}
          onChange={(e) => set("description", e.target.value)}
          rows={4}
          className={`${inputClass} min-w-[20rem] leading-6`}
        />
      </td>
    </tr>
  );
}
