import type { Prisma } from "@/generated/prisma/client";

export const MAJOR_SORT_OPTIONS = [
  { value: "studyPeriod", label: "دوره تحصیلی" },
  { value: "admissionType", label: "نوع پذیرش" },
  { value: "admissionMethod", label: "نحوه پذیرش" },
  { value: "entryYear", label: "ورودی" },
  { value: "title", label: "عنوان رشته" },
  { value: "fieldGroup", label: "گروه رشته" },
  { value: "province", label: "استان" },
  { value: "university", label: "دانشگاه" },
  { value: "termType", label: "نیمسال" },
  { value: "majorCode", label: "کدرشته‌محل" },
  { value: "capacity", label: "ظرفیت" },
  { value: "gender", label: "جنسیت" },
  { value: "description", label: "توضیحات" },
] as const;

export type MajorSortField = (typeof MAJOR_SORT_OPTIONS)[number]["value"];
export type SortDirection = "asc" | "desc";

export function resolveMajorSort(sort?: string, direction?: string): { field: MajorSortField; direction: SortDirection } {
  return {
    field: MAJOR_SORT_OPTIONS.find((option) => option.value === sort)?.value ?? "fieldGroup",
    direction: direction === "desc" ? "desc" : "asc",
  };
}

export function majorOrderBy(sort?: string, direction?: string): Prisma.MajorOrderByWithRelationInput[] {
  const selected = resolveMajorSort(sort, direction);
  const nullable = selected.field === "entryYear" || selected.field === "capacity" || selected.field === "description";
  const primary: Prisma.MajorOrderByWithRelationInput = {
    [selected.field]: nullable
      ? { sort: selected.direction, nulls: selected.field === "entryYear" && selected.direction === "asc" ? "first" : "last" }
      : selected.direction,
  };
  // Deterministic ties prevent records moving between pages. Preserve the
  // original grouping for the default sort, without fetching all results.
  return [primary, ...(["fieldGroup", "province", "university", "majorCode", "id"] as const)
    .filter((field) => field !== selected.field).map((field) => ({ [field]: "asc" as const }))];
}

export function majorSortHref(path: string, params: Record<string, string | undefined>, field: MajorSortField, direction: SortDirection) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (typeof value === "string" && value && key !== "page") query.set(key, value);
  query.set("sort", field);
  query.set("sortDirection", direction);
  return `${path}?${query.toString()}`;
}
